import nodemailer from "nodemailer";
import { config } from "../config";
import { HttpError } from "../errors";

const { host, port, user, pass, from } = config.smtp;

const transporter = host
  ? nodemailer.createTransport({ host, port, secure: port === 465, auth: { user: user!, pass: pass! } })
  : null;

export async function sendMail(to: string, subject: string, text: string) {
  if (!transporter) {
    // development only: print the email instead of sending it
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[DEV EMAIL] to: ${to}\n${subject}\n${text}\n`);
      return;
    }
    throw new HttpError(503, "Email service is not configured", "EMAIL_NOT_CONFIGURED");
  }
  try {
    await transporter.sendMail({ from, to, subject, text });
  } catch (e) {
    console.error("Email failed", e);
    throw new HttpError(502, "Couldn't send the email. Please try again.", "EMAIL_FAILED");
  }
}