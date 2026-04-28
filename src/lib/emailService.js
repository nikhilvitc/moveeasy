// src/lib/emailService.js
// ─────────────────────────────────────────────────────────────────────────────
// EmailJS integration — sends real emails from the browser (no backend needed).
// Free tier: 200 emails/month.
//
// Uses the EmailJS REST API directly — zero npm dependencies.
// ─────────────────────────────────────────────────────────────────────────────

const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "";
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || "";
const EMAILJS_WELCOME_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_WELCOME_TEMPLATE_ID || "";
const EMAILJS_ADMIN_NOTIFY_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_ADMIN_NOTIFY_TEMPLATE_ID || "";
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_NOTIFY_EMAIL || "jiyanshudhaka20@gmail.com";

const EMAILJS_API = "https://api.emailjs.com/api/v1.0/email/send";

async function sendEmail(templateId, templateParams) {
  if (!EMAILJS_PUBLIC_KEY || !EMAILJS_SERVICE_ID || !templateId) {
    console.warn("[EmailService] EmailJS not configured — skipping email.");
    return false;
  }
  try {
    const res = await fetch(EMAILJS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: templateId,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: templateParams,
      }),
    });
    if (!res.ok) {
      console.error("[EmailService] Failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[EmailService] Error:", err);
    return false;
  }
}

/**
 * Send a welcome email to a newly registered user.
 */
export async function sendWelcomeEmail({ email, name, role }) {
  return sendEmail(EMAILJS_WELCOME_TEMPLATE_ID, {
    to_email: email,
    to_name: name || email.split("@")[0],
    user_role: role === "seller" ? "Seller / Broker" : "Customer",
    from_name: "MovEazy Team",
    message: `Welcome to MovEazy! Your ${role === "seller" ? "Seller" : "Customer"} account has been created successfully. You can now explore properties, connect with brokers, and manage your move — all in one place.`,
  });
}

/**
 * Notify admin when a new user signs up.
 */
export async function sendAdminNotification({ email, name, role }) {
  return sendEmail(EMAILJS_ADMIN_NOTIFY_TEMPLATE_ID, {
    to_email: ADMIN_EMAIL,
    to_name: "Admin",
    user_email: email,
    user_name: name || email.split("@")[0],
    user_role: role === "seller" ? "Seller / Broker" : "Customer",
    from_name: "MovEazy System",
    message: `New ${role} signup: ${name} (${email}) just registered on MovEazy.`,
  });
}

/**
 * Send both welcome + admin notification in parallel.
 * Returns true if at least one EmailJS send succeeded (so caller can avoid duplicate retries).
 */
export async function sendSignupEmails({ email, name, role }) {
  try {
    const [w, a] = await Promise.all([
      sendWelcomeEmail({ email, name, role }),
      sendAdminNotification({ email, name, role }),
    ]);
    return !!(w || a);
  } catch {
    return false;
  }
}
