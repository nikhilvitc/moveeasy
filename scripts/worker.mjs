import { spawn } from "child_process";
import fs from "fs/promises";
import crypto from "crypto";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// --- Parity Helpers from firestoreStore.js ---
function normalizeAuthEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function shallowOmitUndefined(obj) {
  if (obj == null || typeof obj !== "object") return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function makePublicListingId(id) {
  const base = String(id || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (!base) return `MZ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return `MZ-${base.slice(0, 8)}`;
}
// --- End Parity Helpers ---

// Initialize Firebase Admin
initializeApp({
  credential: applicationDefault(),
});
const db = getFirestore();

/** One JSON line per entry — Cloud Logging parses `jsonPayload` for filtering (severity, jobId, …). */
function logStructured(severity, message, fields = {}) {
  let profileHost = null;
  try {
    profileHost = new URL(process.env.PROFILE_URL || "").hostname || null;
  } catch {
    profileHost = null;
  }
  const line = JSON.stringify({
    severity,
    message,
    time: new Date().toISOString(),
    component: "broker-import-worker",
    jobId: process.env.JOB_ID || null,
    brokerName: process.env.BROKER_NAME || null,
    profileHost,
    dryRun: process.env.DRY_RUN === "true",
    ...fields,
  });
  if (severity === "ERROR" || severity === "CRITICAL") {
    console.error(line);
  } else {
    console.log(line);
  }
}

// --- Normalization Logic (Copied from externalFeeds.js for Node compatibility) ---
function pickValue(row, keys, fallback = "") {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return fallback;
}

function normalizeRows(rawRows, brokerName) {
  const broker = String(brokerName || "").trim();
  return rawRows
    .map((row) => ({
      title: pickValue(row, ["title", "propertytitle", "name"], "Untitled listing"),
      monthlyRent: Number(pickValue(row, ["monthlyrent", "rent", "rentprice", "price"], 0)) || 0,
      priceLabel: pickValue(row, ["pricelabel", "price_label"]),
      bhk: pickValue(row, ["bhk", "bhktype", "bedrooms"], "1 BHK"),
      address: pickValue(row, ["address", "location", "locality"], "Bengaluru"),
      brokerName: pickValue(row, ["brokername", "seller", "sellername", "agentname"], broker || "Broker"),
      brokerEmail: pickValue(row, ["brokeremail", "selleremail", "email"]),
      contact: pickValue(row, ["contact", "phone", "mobile"]),
      lat: Number(pickValue(row, ["lat", "latitude"])),
      lng: Number(pickValue(row, ["lng", "longitude", "lon"])),
      sourceUrl: pickValue(row, ["sourceurl", "url", "listingurl"]),
      availability: pickValue(row, ["availability"], "Immediate"),
      propertyType: pickValue(row, ["propertytype", "proptype"], "Apartment"),
      furnishing: pickValue(row, ["furnishing"], "Semi"),
      image: pickValue(row, ["image", "photo", "thumbnail"]),
      images: pickValue(row, ["images", "photos", "gallery"]),
      description: pickValue(row, ["description", "details", "summary"]),
    }))
    .filter((row) => row.title && Number.isFinite(row.lat) && Number.isFinite(row.lng))
    .filter((row) => {
      if (!broker) return true;
      const rowBroker = String(row.brokerName || "").trim().toLowerCase();
      return rowBroker === broker.toLowerCase();
    });
}
// --- End Normalization Logic ---

async function main() {
  const jobId = process.env.JOB_ID;
  const brokerName = process.env.BROKER_NAME;
  const profileUrl = process.env.PROFILE_URL;
  const isDryRun = process.env.DRY_RUN === "true";

  if (!jobId || !brokerName || !profileUrl) {
    logStructured("ERROR", "missing_required_env", { missing: { jobId: !jobId, brokerName: !brokerName, profileUrl: !profileUrl } });
    process.exit(1);
  }

  const jobRef = db.collection("importJobs").doc(jobId);

  try {
    logStructured("INFO", "job_start", { phase: "scrape" });
    await jobRef.update({ status: "running", message: "Scraping browser started..." });

    const outFile = `/tmp/${jobId}.json`;

    // Run scraper without a shell (URLs may contain quotes / shell metacharacters).
    await new Promise((resolve, reject) => {
      const child = spawn(
        "node",
        ["scripts/scrape-housing-profile.mjs", "--profile", profileUrl, "--broker", brokerName, "--out", outFile],
        { stdio: "inherit", cwd: process.cwd(), env: process.env }
      );
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`scraper exited with code ${code}`));
      });
    });

    // Read the output
    const rawData = await fs.readFile(outFile, "utf8");
    const parsed = JSON.parse(rawData);
    const normalized = normalizeRows(parsed, brokerName);

    logStructured("INFO", "scrape_parse_done", {
      phase: "normalize",
      rawRowCount: parsed.length,
      normalizedCount: normalized.length,
    });

    if (isDryRun) {
      await jobRef.update({
        status: "succeeded",
        message: "Dry run completed successfully.",
        listingCount: normalized.length,
        finishedAt: new Date().toISOString()
      });
      logStructured("INFO", "dry_run_complete", { phase: "done", listingCount: normalized.length });
      return;
    }

    // Read job info to get actor/admin email
    const jobSnap = await jobRef.get();
    const jobData = jobSnap.data() || {};
    const startedByEmail = jobData.startedByEmail || "";

    // Upsert to Firestore
    await jobRef.update({ message: `Upserting ${normalized.length} listings to Firestore...` });

    let count = 0;

    for (const listing of normalized) {
      // Idempotency: Cryptographic hash of broker + canonical source URL
      const stableId = listing.sourceUrl
        ? `KP-${crypto.createHash("sha256").update(`${brokerName}:${listing.sourceUrl}`).digest("hex")}`
        : db.collection("listings").doc().id;
      
      const docRef = db.collection("listings").doc(stableId);
      
      const rawStatus = String(listing.marketStatus || "published").toLowerCase();
      const marketStatus = rawStatus === "withdrawn" || rawStatus === "archived" ? rawStatus : "published";
      
      // Match upsertListingData (admin actor): actorEmail + requestedSellerEmail = seller || actor.email
      const actorEmail = normalizeAuthEmail(startedByEmail || listing.ownerEmail || listing.sellerEmail || "");
      const requestedSellerEmail = normalizeAuthEmail(listing.sellerEmail || startedByEmail || "");
      const sellerEmail = requestedSellerEmail || actorEmail;
      
      const latN = Number(listing.lat);
      const lngN = Number(listing.lng);
      const rentN = Number(listing.monthlyRent);
      const publicListingId = String(listing.publicListingId || listing.publicId || "").trim() || makePublicListingId(stableId);
      
      const payload = shallowOmitUndefined({
        ...listing,
        id: stableId,
        publicListingId,
        ownerEmail: actorEmail,
        sellerEmail,
        lat: Number.isFinite(latN) ? latN : 12.9716,
        lng: Number.isFinite(lngN) ? lngN : 77.5946,
        monthlyRent: Number.isFinite(rentN) ? rentN : 0,
        marketStatus,
        updatedAt: FieldValue.serverTimestamp()
      });
      
      // Never store raw contact on public listing
      const rawContact = listing.contact;
      delete payload.contact;
      payload.contact = FieldValue.delete();
      
      await docRef.set(payload, { merge: true });
      
      if (rawContact) {
        // Field name must match `upsertListingPrivateData` / map & modal readers (`agentPhone`, not UI label `agentPhonePrivate`).
        await db.collection("listingPrivate").doc(stableId).set(
          {
            listingId: stableId,
            agentPhone: String(rawContact).trim(),
            ownerEmail: actorEmail,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
      
      count++;
    }

    await jobRef.update({
      status: "succeeded",
      message: "Import completed successfully.",
      listingCount: count,
      finishedAt: new Date().toISOString()
    });

    logStructured("INFO", "job_complete", { phase: "done", listingCount: count });
  } catch (error) {
    const errMsg = String(error?.message || error || "unknown_error");
    logStructured("ERROR", "job_failed", {
      phase: "error",
      error: errMsg,
      stack: typeof error?.stack === "string" ? error.stack.slice(0, 4000) : undefined,
    });
    let errorMessage = errMsg;
    if (errorMessage.includes("BOT_BLOCK")) {
      errorMessage = "Blocked by Housing.com Captcha or Security Check.";
    }
    await jobRef.update({
      status: "failed",
      message: "Worker execution failed.",
      error: errorMessage,
      finishedAt: new Date().toISOString()
    }).catch((e) => {
      logStructured("ERROR", "import_job_status_update_failed", { error: String(e?.message || e) });
    });
    process.exit(1);
  }
}

main();
