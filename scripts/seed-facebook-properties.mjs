/**
 * Seed Facebook-scraped properties into Firestore.
 *
 * USAGE
 * ─────
 *   node scripts/seed-facebook-properties.mjs
 *
 * It will ask for your admin email + password (the one you use to log into
 * the Moveazy site), then push all records from:
 *   scripts/data/facebook-properties.json
 *
 * Dry run (preview only, no writes):
 *   node scripts/seed-facebook-properties.mjs --dry-run
 *
 * ─── EXPECTED INPUT FORMAT (from your GPT scraper) ──────────────────────────
 * {
 *   "property_type": "2BHK",          -- or "2bhk", "4 BHK", "3 BHK" etc.
 *   "area": "Koramangala",            -- locality (null is ok)
 *   "rent": "18,000",                 -- string with commas, or just "26" = ₹26k
 *   "furnishing": "fully furnished",  -- any case
 *   "amenities": ["ac", "parking"],   -- lowercase ok
 *   "location": "5th Block...",       -- full address (garbage values skipped)
 *   "image_links": ["url1 | url2"]    -- pipe-separated URLs in array elements
 * }
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");

// ─── load .env ────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(__dirname, "../.env");
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadEnv();
const API_KEY    = env.VITE_FIREBASE_API_KEY;
const PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID || "moveazy-30eed";

if (!API_KEY) {
  console.error("❌  VITE_FIREBASE_API_KEY not found in .env");
  process.exit(1);
}

// ─── password prompt ──────────────────────────────────────────────────────────
function ask(question) {
  return new Promise((res) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (a) => { rl.close(); res(a.trim()); });
  });
}

function askHidden(question) {
  return new Promise((res) => {
    process.stdout.write(question);
    let input = "";
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    const onData = (ch) => {
      if (ch === "\n" || ch === "\r" || ch === "") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        process.stdout.write("\n");
        if (ch === "") process.exit();
        res(input);
      } else if (ch === "") {
        input = input.slice(0, -1);
      } else {
        input += ch;
      }
    };
    process.stdin.on("data", onData);
  });
}

// ─── Firebase Auth REST ───────────────────────────────────────────────────────
async function signIn(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || "Auth failed";
    throw new Error(
      msg === "INVALID_LOGIN_CREDENTIALS" ? "Wrong email or password." : msg
    );
  }
  return data.idToken;
}

// ─── Firestore REST ───────────────────────────────────────────────────────────
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function toFsVal(v) {
  if (v === null || v === undefined)  return { nullValue: null };
  if (typeof v === "boolean")          return { booleanValue: v };
  if (typeof v === "number")           return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string")           return { stringValue: v };
  if (v instanceof Date)               return { timestampValue: v.toISOString() };
  if (Array.isArray(v))                return { arrayValue: { values: v.map(toFsVal) } };
  const fields = {};
  for (const [k, val] of Object.entries(v)) fields[k] = toFsVal(val);
  return { mapValue: { fields } };
}

function toFsDoc(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) fields[k] = toFsVal(v);
  }
  return { fields };
}

async function writeDoc(idToken, data) {
  const res = await fetch(`${FS_BASE}/facebookProperties`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify(toFsDoc(data)),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
}

// ─── Field normalizers ────────────────────────────────────────────────────────

// "2BHK", "2bhk", "2 BHK", "4 bhk" → "2BHK" / "4BHK"
function normalizeBhkType(raw) {
  if (!raw) return null;
  const clean = String(raw).trim().toUpperCase().replace(/\s+/g, "");
  if (/^[1-4]BHK$/.test(clean)) return clean;
  if (clean === "STUDIO")        return "Studio";
  if (clean === "PG")            return "PG";
  return null;
}

// "18,000" → 18000 | "26" → 26000 (values < 1000 assumed to be in ₹k)
function normalizeRent(raw) {
  if (raw === null || raw === undefined || raw === "") return 0;
  const n = Number(String(raw).replace(/,/g, "").trim());
  if (isNaN(n) || n <= 0) return 0;
  return n < 1000 ? n * 1000 : n;
}

// "fully furnished" / "Fully Furnished" → "Fully Furnished"
function normalizeFurnishing(raw) {
  if (!raw) return null;
  const l = String(raw).toLowerCase().trim();
  if (l.includes("fully"))  return "Fully Furnished";
  if (l.includes("semi"))   return "Semi Furnished";
  if (l.includes("unfurn")) return "Unfurnished";
  return null;
}

// Amenity labels → Title Case & deduplicate
const AMENITY_MAP = {
  wifi: "WiFi", "wi-fi": "WiFi",
  ac: "AC", "air conditioning": "AC",
  parking: "Parking",
  gym: "Gym",
  "power backup": "Power Backup",
  security: "Security", "24×7 security": "Security",
  "swimming pool": "Swimming Pool", pool: "Swimming Pool",
  clubhouse: "Clubhouse",
  lift: "Lift", elevator: "Lift",
  garden: "Garden",
  cctv: "CCTV",
  fridge: "Fridge", refrigerator: "Fridge",
  "washing machine": "Washing Machine",
};
function normalizeAmenities(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  return raw
    .map((a) => AMENITY_MAP[String(a).toLowerCase().trim()] || (String(a).trim()))
    .filter((a) => { if (seen.has(a)) return false; seen.add(a); return a; });
}

// Garbage patterns for area / location
const GARBAGE_STARTS = [
  "a ", "our ", "by ", "good ", "is ", ", ", "s ", "s-",
  "looking for", "currently", "hi ", "hello ", "my roommate",
  "with good", "this doesn", "a gated", "a peaceful", "a pre",
  "a premium", "like brookefield",
];
const GARBAGE_EXACT = new Set(["a", "s", "the", "an"]);

function isGarbage(s) {
  if (!s) return true;
  const t = s.trim();
  if (t.length < 3) return true;
  if (GARBAGE_EXACT.has(t.toLowerCase())) return true;
  const lower = t.toLowerCase();
  return GARBAGE_STARTS.some((g) => lower.startsWith(g));
}

// Extract the useful part of a location string before sentence noise
function cleanLocation(raw) {
  if (!raw) return null;
  let s = raw.trim();
  // cut off at sentence-like noise
  const cutRe = /\s+(hi\b|hello\b|my roommate|looking for|currently|we |i am|call -)/i;
  const cut = s.search(cutRe);
  if (cut > 5) s = s.slice(0, cut).trim();
  // remove trailing punctuation
  s = s.replace(/[,.\s]+$/, "");
  return isGarbage(s) ? null : s;
}

// Parse area: if it's garbage but location has a known Bengaluru locality, extract from location
const BLR_AREAS = [
  "koramangala","hsr layout","whitefield","indiranagar","bellandur",
  "mahadevpura","marathahalli","kadubeesanahalli","frazer town","btm layout",
  "doddanekundi","kasturi nagar","yelahanka","electronic city","jp nagar",
  "jayanagar","hebbal","kr puram","banaswadi","cv raman nagar",
  "yemalur","harlur","sarjapur","brookefield","jigani","kadugodi",
  "new bel road","mg road","cubbon park","cox town","kalyan nagar",
];

function extractArea(rawArea, rawLocation) {
  if (!isGarbage(rawArea)) return rawArea.trim();
  // try to find a known Bengaluru area in the location string
  const haystack = (rawLocation || "").toLowerCase();
  for (const area of BLR_AREAS) {
    if (haystack.includes(area)) {
      return area.split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
    }
  }
  return null;
}

// Parse pipe-separated image_links into a clean URL array
function parseImages(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((item) => String(item).split("|").map((u) => u.trim()))
    .filter((u) => u.startsWith("http"));
}

// ─── Main normalise ───────────────────────────────────────────────────────────
function normalise(raw, idx) {
  // Accept both GPT format (property_type) and our format (bhkType)
  const bhkType = normalizeBhkType(raw.property_type ?? raw.bhkType);
  if (!bhkType) {
    console.log(`  skip [${idx}] — no valid property type ("${raw.property_type ?? raw.bhkType}")`);
    return null;
  }

  const area     = extractArea(raw.area, raw.location);
  const location = cleanLocation(raw.location);
  const rent     = normalizeRent(raw.rent);
  const images   = parseImages(raw.image_links ?? raw.images ?? []);

  return {
    bhkType,
    area:             area     || "",
    rent,
    deposit:          Number(raw.deposit) || 0,
    furnishing:       normalizeFurnishing(raw.furnishing) || "Unfurnished",
    amenities:        normalizeAmenities(raw.amenities),
    location:         location || "",
    description:      (raw.description || "").trim(),
    contactName:      (raw.contactName  || "").trim(),
    contactPhone:     (raw.contactPhone || "").replace(/\s/g, ""),
    preferredTenants: raw.preferredTenants || "Any",
    availableFrom:    raw.availableFrom   || "Immediate",
    images,                      // real photo URLs from FB
    source:           "facebook",
    sourcePostUrl:    raw.sourcePostUrl   || "",
    isActive:         true,
    createdAt:        new Date(),
  };
}

// ─── Load data ────────────────────────────────────────────────────────────────
const DATA_PATH = resolve(__dirname, "data/facebook-properties.json");
let rawProperties;
if (existsSync(DATA_PATH)) {
  rawProperties = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  console.log(`\nLoaded ${rawProperties.length} records from scripts/data/facebook-properties.json`);
} else {
  console.error("❌  scripts/data/facebook-properties.json not found.");
  process.exit(1);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const valid = rawProperties.map((r, i) => normalise(r, i)).filter(Boolean);
  console.log(`\n${valid.length}/${rawProperties.length} records passed validation.\n`);

  if (DRY_RUN) {
    console.log("── DRY RUN (nothing written) ──\n");
    valid.forEach((p, i) => {
      const { createdAt, images, ...rest } = p;
      console.log(`[${i + 1}] ${p.bhkType} | ${p.area || "(no area)"} | ₹${p.rent || "?"} | ${p.furnishing} | ${images.length} photos`);
    });
    return;
  }

  const email    = await ask("Admin email:    ");
  const password = await askHidden("Admin password: ");

  process.stdout.write("\nSigning in… ");
  let idToken;
  try {
    idToken = await signIn(email, password);
    console.log("✓\n");
  } catch (e) {
    console.error(`\n❌  Login failed: ${e.message}`);
    process.exit(1);
  }

  let written = 0, failed = 0;
  for (const doc of valid) {
    try {
      await writeDoc(idToken, doc);
      written++;
      process.stdout.write(`\r  Writing… ${written}/${valid.length}`);
    } catch (e) {
      failed++;
      console.error(`\n  ❌  Failed: ${e.message}`);
      if (e.message.includes("PERMISSION_DENIED")) {
        console.error("  → Make sure you sign in with an admin account.");
        process.exit(1);
      }
    }
  }

  console.log(`\n\n✅  Done! ${written} properties written${failed ? `, ${failed} failed` : ""}.`);
  console.log(`\n   View: https://console.firebase.google.com/project/${PROJECT_ID}/firestore/data/facebookProperties\n`);
}

main().catch((e) => {
  console.error("❌ Unexpected error:", e.message);
  process.exit(1);
});
