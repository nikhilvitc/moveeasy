import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import nodemailer from "nodemailer";
import Razorpay from "razorpay";
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

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getApp } from "firebase-admin/app";

const PROJECT_ID = process.env.GCLOUD_PROJECT;
const LOCATION = "us-central1"; // Adjust if necessary
const JOB_NAME = "broker-import-job";

export const triggerBrokerImport = onCall({ cors: true, region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }
  
  const { brokerName, profileUrl, dryRun } = request.data;
  if (!brokerName || !profileUrl) {
    throw new HttpsError("invalid-argument", "brokerName and profileUrl are required.");
  }

  const db = getFirestore();
  const authUid = request.auth.uid;
  const authEmail = String(request.auth.token.email || "").toLowerCase();
  
  const roleSnap = await db.collection("userRoles").doc(authUid).get();
  const accountRole = roleSnap.exists ? roleSnap.data().role : "customer";
  
  const emailSnap = await db.collection("emailRoles").doc(authEmail).get();
  const emailRole = emailSnap.exists ? emailSnap.data().role : "customer";
  
  const isDefaultAdmin = authEmail === "jiyanshudhaka20@gmail.com";
  
  const isAdmin = accountRole === "admin" || emailRole === "admin" || isDefaultAdmin;
  const isSubAdmin = accountRole === "sub_admin" || emailRole === "sub_admin";

  if (!isAdmin && !isSubAdmin) {
    throw new HttpsError("permission-denied", "Only admins or sub-admins can trigger imports.");
  }

  const jobId = `job-${Date.now()}`;
  const jobDoc = db.collection("importJobs").doc(jobId);

  await jobDoc.set({
    jobId,
    brokerName,
    sourceUrl: profileUrl,
    status: "queued",
    message: "Job queued, waiting for worker...",
    error: null,
    listingCount: 0,
    dryRun: Boolean(dryRun),
    startedByEmail: request.auth.token.email,
    startedAt: new Date().toISOString(),
    finishedAt: null
  });

  try {
    // Get access token for the Cloud Run Jobs API
    const credential = getApp().options.credential;
    let token = "";
    if (credential && credential.getAccessToken) {
      const tokenObj = await credential.getAccessToken();
      token = tokenObj.access_token;
    } else {
      // Fallback for some default credentials setups
      const { GoogleAuth } = await import("google-auth-library");
      const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();
      token = accessToken.token;
    }

    const apiUrl = `https://${LOCATION}-run.googleapis.com/v2/projects/${PROJECT_ID}/locations/${LOCATION}/jobs/${JOB_NAME}:run`;
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        overrides: {
          containerOverrides: [
            {
              env: [
                { name: "JOB_ID", value: jobId },
                { name: "BROKER_NAME", value: brokerName },
                { name: "PROFILE_URL", value: profileUrl },
                { name: "DRY_RUN", value: dryRun ? "true" : "false" }
              ]
            }
          ]
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Cloud Run Job trigger failed:", errText);
      await jobDoc.update({ status: "failed", message: "Failed to trigger worker", error: errText, finishedAt: new Date().toISOString() });
      throw new HttpsError("internal", "Failed to trigger Cloud Run job.");
    }
    
    return { ok: true, jobId };
  } catch (error) {
    console.error("Error triggering job:", error);
    await jobDoc.update({ status: "failed", message: "Error in trigger", error: error.message, finishedAt: new Date().toISOString() });
    throw new HttpsError("internal", "Failed to trigger Cloud Run job.");
  }
});

const RAZORPAY_KEY_ID = defineSecret("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = defineSecret("RAZORPAY_KEY_SECRET");

/** Allowed SKUs → amount in paise (must match src/config/paymentProducts.js). */
const RAZORPAY_SKU_PAISE = {
  "flat-search": 149900,
  guarantee: 199900,
  "deposit-saver": 199900,
  "personalized-match": 19900,
};

/** Razorpay order creation — set secrets RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET (Razorpay dashboard). */
export const createRazorpayOrder = onRequest(
  {
    cors: true,
    region: "asia-south1",
    secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET],
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }
    const body = typeof req.body === "object" && req.body != null ? req.body : {};
    const sku = String(body.sku || "guarantee").toLowerCase().trim();
    const amount = RAZORPAY_SKU_PAISE[sku];
    if (!amount) {
      res.status(400).json({ ok: false, error: "Unknown sku" });
      return;
    }
    const receipt = String(body.receipt || `mvz_${sku}_${Date.now()}`).replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 40);
    try {
      const razorpay = new Razorpay({
        key_id: RAZORPAY_KEY_ID.value(),
        key_secret: RAZORPAY_KEY_SECRET.value(),
      });
      const order = await razorpay.orders.create({
        amount,
        currency: "INR",
        receipt,
        notes: { sku },
      });
      res.status(200).json({
        ok: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: RAZORPAY_KEY_ID.value(),
        sku,
      });
    } catch (e) {
      console.error("createRazorpayOrder", e);
      res.status(500).json({ ok: false, error: "Order creation failed" });
    }
  },
);
