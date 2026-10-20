import { Router } from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { config } from "../config";
import { prisma } from "../prisma";
import { HttpError } from "../errors";
import { asyncHandler } from "../middleware/error";
import { googleLoginSchema } from "../utils/validators";

const router = Router();
const googleClient = new OAuth2Client(config.googleClientId);

function isAllowedEmail(email: string) {
  const domain = email.split("@")[1];
  return !!domain && config.allowedEmailDomains.includes(domain);
}

// POST /api/auth/google   body: { idToken }
router.post(
  "/google",
  asyncHandler(async (req, res) => {
    const { idToken } = googleLoginSchema.parse(req.body);

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: config.googleClientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new HttpError(401, "Invalid Google token", "INVALID_GOOGLE_TOKEN");
    }
    if (!payload?.email || !payload.email_verified) {
      throw new HttpError(401, "Google email not verified", "INVALID_GOOGLE_TOKEN");
    }

    const email = payload.email.toLowerCase();
    if (!isAllowedEmail(email)) {
      throw new HttpError(403, "Please use your VIT email ID", "EMAIL_NOT_ALLOWED");
    }

    const google = { email, name: payload.name ?? "", picture: payload.picture ?? null };
    const token = jwt.sign(google, config.jwtSecret, { expiresIn: "7d" });

    const user = await prisma.user.findUnique({ where: { email } });
    res.json({ token, registered: !!user, user, google });
  })
);

export default router;