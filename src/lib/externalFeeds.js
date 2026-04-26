import { upsertListing } from "./store";

// This module is intentionally legal-safe: it ingests partner-provided feed JSON.
// Do not scrape third-party portals without written permission and API terms.
export function ingestPartnerListings(feedRows = [], sourceName = "partner-feed") {
  if (!Array.isArray(feedRows)) return { imported: 0 };
  let imported = 0;
  for (const row of feedRows) {
    if (!row?.title || !row?.lat || !row?.lng) continue;
    upsertListing({
      id: row.id || Date.now() + imported,
      title: row.title,
      price: row.priceLabel || `₹ ${row.monthlyRent || 0}`,
      monthlyRent: Number(row.monthlyRent || 0),
      bhk: row.bhk || "1 BHK",
      address: row.address || "Bengaluru",
      seller: row.brokerName || row.seller || "Broker",
      sellerEmail: row.brokerEmail || row.sellerEmail || "",
      contact: row.contact || "",
      lat: Number(row.lat),
      lng: Number(row.lng),
      availability: row.availability || "Immediate",
      preferredTenants: row.preferredTenants || ["Family"],
      propertyType: row.propertyType || "Apartment",
      furnishing: row.furnishing || "Semi",
      parking: row.parking || ["2 Wheeler"],
      source: sourceName,
      sourceUrl: row.sourceUrl || "",
    });
    imported += 1;
  }
  return { imported };
}
