import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { config } from "../config";
import { prisma } from "../prisma";
import { HttpError } from "../errors";
import { asyncHandler } from "../middleware/error";
import { profileSchema } from "../utils/validators";
import { getConfig } from "../utils/recruitment";
import { createOtp, verifyOtp } from "../utils/otp";
import { sendMail } from "../utils/mailer";

const router = Router();

const BCRYPT_COST = 10;
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_COST); // keeps login timing equal for unknown users

function isAllowedEmail(email: string) {
  const domain = email.split("@")[1];
  return !!domain && config.allowedEmailDomains.includes(domain);
}

// Changes whenever the password changes, so an old reset code stops working
const versionOf = (hash: string) => crypto.createHash("sha256").update(hash).digest("hex").slice(0, 16);

const signToken = (u: { email: string; name: string; image: string | null }) =>
  jwt.sign({ email: u.email, name: u.name, picture: u.image ?? null }, config.jwtSecret, { expiresIn: "7d" });

// ---------- validation ----------
const email = z.string().trim().toLowerCase().email();
const password = z.string().min(8, "Use at least 8 characters").max(72, "Password is too long");
const code = z.string().regex(/^\d{6}$/, "Enter the 6 digit code");

const requestOtpSchema = z.object({ email, purpose: z.enum(["signup", "reset"]) });
const signupSchema = profileSchema.extend({
  email,
  password,
  otpToken: z.string().min(10),
  otp: code,
});
const loginSchema = z.object({
  id: z.string().trim().min(3), // VIT email or registration number
  password: z.string().min(1).max(200),
});
const resetSchema = z.object({ email, password, otpToken: z.string().min(10), otp: code });

// ---------- rate limits (per account, kept in server memory) ----------
// Not per IP: a whole hostel can share one IP address.
const limited = (windowMs: number, limit: number, keyField: "email" | "id", message: string) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${keyField}:${String(req.body?.[keyField] ?? "").toLowerCase()}`,
    message: { error: message, code: "RATE_LIMITED" },
  });

const otpRequestLimit = limited(10 * 60 * 1000, 3, "email", "Too many codes requested. Try again in a few minutes.");
const otpVerifyLimit = limited(10 * 60 * 1000, 6, "email", "Too many attempts. Try again in a few minutes.");
const loginLimit = limited(15 * 60 * 1000, 10, "id", "Too many login attempts. Try again in a few minutes.");

// ---------- POST /api/auth/request-otp   body: { email, purpose: "signup" | "reset" } ----------
router.post(
  "/request-otp",
  otpRequestLimit,
  asyncHandler(async (req, res) => {
    const { email: addr, purpose } = requestOtpSchema.parse(req.body);
    if (!isAllowedEmail(addr)) {
      throw new HttpError(403, "Please use your VIT email ID", "EMAIL_NOT_ALLOWED");
    }
    const user = await prisma.user.findUnique({ where: { email: addr }, omit: { passwordHash: false } });

    if (purpose === "signup") {
      if (user) throw new HttpError(409, "This email is already registered. Please log in.", "ALREADY_REGISTERED");
      const { code: otp, otpToken } = createOtp(addr, "signup");
      await sendMail(
        addr,
        "Your verification code",
        `Your verification code is ${otp}. It expires in 10 minutes.\n\nIf you didn't request it, ignore this email.`
      );
      res.json({ sent: true, otpToken });
      return;
    }

    // reset: answer the same way whether or not the account exists
    if (!user || !user.passwordHash) {
      res.json({ sent: true, otpToken: createOtp(addr, "reset", versionOf("")).otpToken });
      return;
    }
    const { code: otp, otpToken } = createOtp(addr, "reset", versionOf(user.passwordHash));
    await sendMail(
      addr,
      "Reset your password",
      `Your password reset code is ${otp}. It expires in 10 minutes.\n\nIf you didn't request it, ignore this email.`
    );
    res.json({ sent: true, otpToken });
  })
);

// ---------- POST /api/auth/signup ----------
// body: { email, otpToken, otp, password, name, phone, regNumber, domains[] }
router.post(
  "/signup",
  otpVerifyLimit,
  asyncHandler(async (req, res) => {
    const { email: addr, password: pw, otpToken, otp, domains, ...profile } = signupSchema.parse(req.body);
    if (!isAllowedEmail(addr)) {
      throw new HttpError(403, "Please use your VIT email ID", "EMAIL_NOT_ALLOWED");
    }
    verifyOtp(otpToken, otp, addr, "signup");

    const cfg = await getConfig();
    if (!cfg.isOpen) throw new HttpError(403, "Applications are closed", "FORM_CLOSED");

    const passwordHash = await bcrypt.hash(pw, BCRYPT_COST);
    // a duplicate email or registration number returns 409 DUPLICATE
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { ...profile, email: addr, passwordHash } });
      await tx.application.createMany({
        data: domains.map((domain) => ({ userId: created.id, domain })),
      });
      return created;
    });

    const applications = await prisma.application.findMany({ where: { userId: user.id } });
    res.status(201).json({
      token: signToken(user),
      user,
      applications: applications.map((a) => ({ domain: a.domain, stage: a.stage })),
    });
  })
);

// ---------- POST /api/auth/login   body: { id, password } ----------
router.post(
  "/login",
  loginLimit,
  asyncHandler(async (req, res) => {
    const { id, password: pw } = loginSchema.parse(req.body);

    const user = id.includes("@")
      ? await prisma.user.findUnique({ where: { email: id.toLowerCase() }, omit: { passwordHash: false } })
      : await prisma.user.findUnique({ where: { regNumber: id.toUpperCase() }, omit: { passwordHash: false } });

    const match = await bcrypt.compare(pw, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !user.passwordHash || !match) {
      throw new HttpError(401, "Wrong ID or password", "INVALID_CREDENTIALS");
    }
    const { passwordHash: _hash, ...safe } = user;
    res.json({ token: signToken(user), user: safe });
  })
);

// ---------- POST /api/auth/reset-password   body: { email, otpToken, otp, password } ----------
router.post(
  "/reset-password",
  otpVerifyLimit,
  asyncHandler(async (req, res) => {
    const { email: addr, password: pw, otpToken, otp } = resetSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: addr }, omit: { passwordHash: false } });
    if (!user || !user.passwordHash) throw new HttpError(400, "Invalid code", "OTP_INVALID");
    verifyOtp(otpToken, otp, addr, "reset", versionOf(user.passwordHash));

    const passwordHash = await bcrypt.hash(pw, BCRYPT_COST);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    res.json({ reset: true });
  })
);

export default router;