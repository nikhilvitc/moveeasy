import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import nodemailer from "nodemailer";
import { welcomeEmailTemplate } from "./templates.js";

initializeApp();

const SMTP_HOST = defineSecret("SMTP_HOST");
const SMTP_PORT = defineSecret("SMTP_PORT");
const SMTP_USER = defineSecret("SMTP_USER");
const SMTP_PASS = defineSecret("SMTP_PASS");
const SMTP_FROM = defineSecret("SMTP_FROM");

function buildTransport() {
  return nodemailer.createTransport({
    host: SMTP_HOST.value(),
    port: Number(SMTP_PORT.value() || 587),
    secure: false,
    auth: {
      user: SMTP_USER.value(),
      pass: SMTP_PASS.value(),
    },
  });
}

// Called from client immediately after verified login.
// Prevents duplicates with a custom claim.
export const sendWelcomeEmail = onRequest(
  { cors: true, secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }
    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      res.status(401).json({ ok: false, error: "Missing auth token" });
      return;
    }
    const { email, name, role } = req.body || {};
    if (!email) {
      res.status(400).json({ ok: false, error: "email is required" });
      return;
    }

    const auth = getAuth();
    const decoded = await auth.verifyIdToken(token);
    const user = await auth.getUser(decoded.uid);
    if (user.email?.toLowerCase() !== String(email).toLowerCase().trim()) {
      res.status(403).json({ ok: false, error: "Token/email mismatch" });
      return;
    }
    if (!user.emailVerified) {
      res.status(400).json({ ok: false, error: "Email not verified yet" });
      return;
    }

    const claims = user.customClaims || {};
    if (claims.welcomeEmailSent) {
      res.status(200).json({ ok: true, alreadySent: true });
      return;
    }

    const tpl = welcomeEmailTemplate({ name: name || user.displayName || user.email, role });
    const transport = buildTransport();
    await transport.sendMail({
      from: SMTP_FROM.value(),
      to: user.email,
      subject: tpl.subject,
      html: tpl.html,
    });

    await auth.setCustomUserClaims(user.uid, { ...claims, welcomeEmailSent: true });
    res.status(200).json({ ok: true, sent: true });
  },
);
