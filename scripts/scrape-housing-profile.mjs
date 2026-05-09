import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  const n = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Firestore import requires real coordinates; never treat null as 0. */
function hasValidLatLng(lat, lng) {
  if (lat == null || lng == null) return false;
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return false;
  // Reject (0,0) — means missing data, not Gulf of Guinea
  if (Math.abs(la) < 1e-5 && Math.abs(lo) < 1e-5) return false;
  return true;
}

function looksLikeBotBlock(title, pageText) {
  const t = normalizeText(title).toLowerCase();
  const body = normalizeText(pageText).toLowerCase();
  if (t.includes("security alert") || t.includes("access denied") || t.includes("just a moment")) return true;
  if (body.includes("security alert") && body.length < 1200) return true;
  if (body.includes("checking your browser") || body.includes("verify you are human")) return true;
  return false;
}

function uniqStrings(items) {
  const out = [];
  const seen = new Set();
  for (const item of items || []) {
    const v = normalizeText(item);
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

function flattenObjectStrings(obj, predicate) {
  const out = [];
  const visit = (v) => {
    if (v == null) return;
    if (typeof v === "string") {
      if (!predicate || predicate(v)) out.push(v);
      return;
    }
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    if (typeof v === "object") {
      Object.values(v).forEach(visit);
    }
  };
  visit(obj);
  return out;
}

function pickFirst(obj, keys) {
  for (const key of keys) {
    const v = obj?.[key];
    if (v === 0) return 0;
    if (v == null) continue;
    if (typeof v === "string" && !v.trim()) continue;
    return v;
  }
  return null;
}

async function extractFromLdJson(page) {
  const nodes = await page.locator('script[type="application/ld+json"]').all();
  const parsed = [];
  for (const node of nodes) {
    const txt = await node.textContent().catch(() => "");
    if (!txt) continue;
    try {
      parsed.push(JSON.parse(txt));
    } catch {
      // ignore
    }
  }
  return parsed;
}

function extractLatLngFromObject(obj) {
  // common patterns
  const lat = pickFirst(obj, ["lat", "latitude"]);
  const lng = pickFirst(obj, ["lng", "longitude", "lon"]);
  if (lat != null && lng != null) {
    const la = Number(lat);
    const lo = Number(lng);
    if (Number.isFinite(la) && Number.isFinite(lo)) return { lat: la, lng: lo };
  }

  // schema.org GeoCoordinates
  const geo = obj?.geo || obj?.geoCoordinates || obj?.geo_location || obj?.location?.geo;
  if (geo) return extractLatLngFromObject(geo);

  // walk deeper
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const r = extractLatLngFromObject(item);
      if (r) return r;
    }
  } else if (obj && typeof obj === "object") {
    for (const v of Object.values(obj)) {
      const r = extractLatLngFromObject(v);
      if (r) return r;
    }
  }

  return null;
}

function extractMediaUrlsFromObject(obj) {
  const urls = flattenObjectStrings(obj, (s) => /^https?:\/\//i.test(s));
  const media = urls.filter((u) => {
    const x = u.toLowerCase();
    // keep common image/video formats + known cdn patterns
    if (x.includes("housing.com")) return true;
    if (x.includes("cloudfront")) return true;
    if (/\.(jpg|jpeg|png|webp|gif)(\?|#|$)/i.test(x)) return true;
    if (/\.(mp4|webm|m3u8)(\?|#|$)/i.test(x)) return true;
    return false;
  });
  return uniqStrings(media);
}

async function scrapeListingDetail(context, url, brokerName) {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "load", timeout: 120000 });

  // Let client bundles + map widgets hydrate (bot walls often resolve to a thin shell early).
  await page.waitForTimeout(2800);

  const ld = await extractFromLdJson(page);
  const nextData = await page.evaluate(() => window.__NEXT_DATA__).catch(() => null);

  const latLng = extractLatLngFromObject(nextData) || extractLatLngFromObject(ld) || null;
  const allMedia = uniqStrings([
    ...extractMediaUrlsFromObject(nextData),
    ...extractMediaUrlsFromObject(ld),
  ]);

  const title =
    normalizeText(
      pickFirst(nextData, ["title", "propertyTitle", "name"]) ||
        pickFirst(ld?.[0], ["name", "headline"]) ||
        (await page.title().catch(() => ""))
    ) || "Untitled listing";

  // Heuristics for rent/price/BHK/address
  const pageText = normalizeText(await page.locator("body").innerText().catch(() => ""));

  if (looksLikeBotBlock(title, pageText)) {
    await page.close().catch(() => {});
    const err = new Error(`Blocked or empty listing page (title: "${title.slice(0, 80)}")`);
    err.code = "BOT_BLOCK";
    throw err;
  }
  const rentMatch = pageText.match(/₹\s?[\d,]+\s?\/\s?month/i) || pageText.match(/₹\s?[\d,]+/i);
  const bhkMatch = pageText.match(/\b(\d(\.\d)?)\s*BHK\b/i) || pageText.match(/\bStudio\b/i);

  const monthlyRent = toNumber(
    pickFirst(nextData, ["monthlyRent", "rent", "price", "priceValue"]) ||
      (rentMatch ? rentMatch[0] : "")
  );

  const priceLabel =
    normalizeText(pickFirst(nextData, ["priceLabel", "priceText", "priceDisplay"])) ||
    (rentMatch ? normalizeText(rentMatch[0]) : monthlyRent ? `₹ ${monthlyRent}` : "");

  const bhk = normalizeText(pickFirst(nextData, ["bhk", "bhkType", "bedrooms"])) || (bhkMatch ? normalizeText(bhkMatch[0]) : "1 BHK");

  const address =
    normalizeText(
      pickFirst(nextData, ["address", "locality", "location", "fullAddress"]) ||
        pickFirst(ld?.[0], ["address"]) ||
        ""
    ) || "Bengaluru";

  // Description / amenities: best-effort; keep extra fields for your import UI even if normalizePartnerListings ignores them today.
  const description =
    normalizeText(
      pickFirst(nextData, ["description", "details", "summary", "propertyDescription"]) ||
        pickFirst(ld?.[0], ["description"]) ||
        ""
    ) || "";

  const amenities = uniqStrings(
    flattenObjectStrings(nextData, (s) => typeof s === "string" && s.length < 80).filter((s) => /gym|lift|parking|power|water|security|pool|club|furnished|geyser/i.test(s))
  ).slice(0, 60);

  await page.close().catch(() => {});

  return {
    title,
    monthlyRent,
    priceLabel,
    bhk,
    address,
    description,
    amenities,
    brokerName,
    sourceUrl: url,
    lat: latLng?.lat ?? null,
    lng: latLng?.lng ?? null,
    image: allMedia[0] || "",
    images: allMedia,
  };
}

async function readUrlsFromFile(filePath) {
  const raw = await fs.readFile(path.resolve(process.cwd(), filePath), "utf8");
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .filter((l) => /^https?:\/\//i.test(l));
}

async function collectListingUrlsFromProfile(page, profileUrl) {
  await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 120000 });

  // Scroll to load more cards (infinite scroll pattern).
  const urls = new Set();
  let sameCount = 0;

  for (let i = 0; i < 40; i += 1) {
    const links = await page.locator('a[href*="/rent/"], a[href*="/in/rent/"], a[href*="/rent/"]').evaluateAll((els) =>
      els.map((a) => a.getAttribute("href")).filter(Boolean)
    );
    links.forEach((href) => {
      const u = href.startsWith("http") ? href : new URL(href, location.origin).toString();
      urls.add(u);
    });

    const before = urls.size;
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(900);
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(900);

    if (urls.size === before) sameCount += 1;
    else sameCount = 0;
    if (sameCount >= 4) break;
  }

  return Array.from(urls);
}

async function main() {
  const profileUrl = getArg("--profile") || process.env.HOUSING_PROFILE_URL;
  const urlsFile = getArg("--urls-file") || process.env.HOUSING_URLS_FILE;
  const brokerName = getArg("--broker") || "KeysPlease Ventures";
  const outFile = getArg("--out") || "KeysPlease_All_Listings.json";
  const limit = Number(getArg("--limit") || process.env.LISTING_LIMIT || 0) || 0;

  if (!profileUrl && !urlsFile) {
    // eslint-disable-next-line no-console
    console.error(
      "Provide either --profile (Housing broker/profile page) or --urls-file (one listing URL per line).\n" +
        "Examples:\n" +
        "  node scripts/scrape-housing-profile.mjs --profile \"https://housing.com/...\" --broker \"KeysPlease Ventures\" --out KeysPlease_All_Listings.json\n" +
        "  node scripts/scrape-housing-profile.mjs --urls-file scripts/data/keysplease-housing-urls.txt --broker \"KeysPlease Ventures\" --out KeysPlease_All_Listings.json\n"
    );
    process.exit(2);
  }

  const headed = process.argv.includes("--headed") || process.env.HEADED === "1";
  const browser = await chromium.launch({
    headless: !headed,
    channel: process.env.PW_CHROME_CHANNEL || undefined,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    locale: "en-IN",
    viewport: { width: 1365, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  let listingUrls;
  if (urlsFile) {
    listingUrls = await readUrlsFromFile(urlsFile);
    if (listingUrls.length === 0) {
      // eslint-disable-next-line no-console
      console.error(`No URLs found in ${urlsFile} (non-empty lines starting with http/https).`);
      process.exit(2);
    }
  } else {
    const page = await context.newPage();
    listingUrls = await collectListingUrlsFromProfile(page, profileUrl);
    await page.close().catch(() => {});
  }

  const urls = limit > 0 ? listingUrls.slice(0, limit) : listingUrls;

  const sourceLabel = urlsFile ? `file ${urlsFile}` : "profile page";
  // eslint-disable-next-line no-console
  console.log(`Found ${listingUrls.length} listing URLs from ${sourceLabel}. Scraping ${urls.length}...`);

  const rows = [];
  for (let i = 0; i < urls.length; i += 1) {
    const url = urls[i];
    // eslint-disable-next-line no-console
    console.log(`[${i + 1}/${urls.length}] ${url}`);
    try {
      const row = await scrapeListingDetail(context, url, brokerName);
      rows.push(row);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to scrape ${url}: ${String(err?.message || err)}`);
    }
    // Light pacing — reduces automated-request fingerprinting
    await new Promise((r) => setTimeout(r, 800 + Math.floor(Math.random() * 1200)));
  }

  await browser.close();

  // Filter to the schema minimum (title + real lat/lng required by normalizePartnerListings)
  const normalized = rows.filter(
    (r) =>
      r?.title &&
      !/security alert|access denied/i.test(String(r.title)) &&
      hasValidLatLng(r.lat, r.lng)
  );

  const outPath = path.resolve(process.cwd(), outFile);
  await fs.writeFile(outPath, JSON.stringify(normalized, null, 2), "utf8");
  // eslint-disable-next-line no-console
  console.log(`Wrote ${normalized.length} listings to ${outPath} (${rows.length} raw rows, ${rows.length - normalized.length} dropped)`);
  if (normalized.length === 0) {
    // eslint-disable-next-line no-console
    console.log(
      "No rows passed validation. Housing.com may be blocking headless Chrome.\n" +
        "Try on your PC with a real Chrome channel:\n" +
        "  set HEADED=1\n" +
        "  set PW_CHROME_CHANNEL=chrome\n" +
        "  npm run scrape:keysplease\n"
    );
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

