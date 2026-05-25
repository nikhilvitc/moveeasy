import rawData from "../../scripts/facebook.json";

const apartmentPhotos = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=900",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=900",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&q=80&w=900",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=900",
  "https://images.unsplash.com/photo-1560185127-6a1bdb9c7b63?auto=format&fit=crop&q=80&w=900",
  "https://images.unsplash.com/photo-1600607687939-ce8a6a8b9d1d?auto=format&fit=crop&q=80&w=900",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&q=80&w=900",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=900",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=900",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80&w=900",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=900",
  "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?auto=format&fit=crop&q=80&w=900",
];

const bengaluruCoords = {
  "Indiranagar":      [12.9719, 77.6412],
  "Koramangala":      [12.9352, 77.6245],
  "Whitefield":       [12.9698, 77.75],
  "HSR Layout":       [12.9141, 77.6411],
  "Bellandur":        [12.93,   77.6762],
  "Jayanagar":        [12.925,  77.5938],
  "Mahadevapura":     [12.9516, 77.68],
  "Kasturi Nagar":    [12.9704, 77.6531],
  "BTM Layout":       [12.9352, 77.6245],
  "Yehalanka":        [13.027,  77.569],
  "Doddanekundi":     [12.9619, 77.6819],
  "Sarjapur":         [12.8996, 77.6815],
  "Kadubeesanahalli": [12.9383, 77.7108],
  "Frazer Town":      [13.0012, 77.6098],
  "Brookefield":      [12.9699, 77.7108],
  "Electronic City":  [12.8406, 77.6770],
  "KR Puram":         [13.0071, 77.6967],
  "Marathahalli":     [12.9591, 77.6974],
};

const KNOWN_AREAS = Object.keys(bengaluruCoords);

const AREA_ALIASES = {
  "doddanekkundi":   "Doddanekundi",
  "doddanekkundhi":  "Doddanekundi",
  "mahadevpura":     "Mahadevapura",
  "kormangala":      "Koramangala",
  "kormangla":       "Koramangala",
  "koramangla":      "Koramangala",
  "hsr":             "HSR Layout",
  "btm":             "BTM Layout",
  "kr puram":        "KR Puram",
  "sarjapur road":   "Sarjapur",
  "frazer town":     "Frazer Town",
  "kasturi nagar":   "Kasturi Nagar",
};

function extractArea(p) {
  const candidates = [p.location, p.area, p.post_text].filter(Boolean);
  for (const str of candidates) {
    const lower = str.toLowerCase();
    for (const known of KNOWN_AREAS) {
      if (lower.includes(known.toLowerCase())) return known;
    }
    for (const [alias, canonical] of Object.entries(AREA_ALIASES)) {
      if (lower.includes(alias)) return canonical;
    }
  }
  return null;
}

function inferBhk(text) {
  if (!text) return null;
  const m = text.match(/\b([1-4])\s*(?:BHK|bhk|bedroom|bed(?:room)?s?)\b/i);
  return m ? `${m[1]}BHK` : null;
}

function normalizeBhk(raw, postText) {
  const src = raw || inferBhk(postText);
  if (!src) return null;
  const s = src.replace(/\s+/g, "").toUpperCase();
  const m = s.match(/^(\d+)BHK/);
  if (m) return `${m[1]}BHK`;
  if (/STUDIO/i.test(src)) return "Studio";
  if (/PG/i.test(src)) return "PG";
  return src.trim();
}

function normalizeFurnishing(raw) {
  if (!raw) return "Unfurnished";
  const s = raw.toLowerCase();
  if (s.includes("fully") || s === "full") return "Fully Furnished";
  if (s.includes("semi"))                  return "Semi Furnished";
  return "Unfurnished";
}

function parseRent(raw) {
  if (!raw) return 0;
  const n = parseInt(String(raw).replace(/[^\d]/g, ""), 10);
  if (!n) return 0;
  return n < 1000 ? n * 1000 : n;
}

function extractPhone(text) {
  if (!text) return null;
  const m = text.match(/\b(\+?91[-\s]?)?([6-9]\d{9})\b/);
  return m ? `+91${m[2]}` : null;
}

const JUNK_PATTERNS = [
  /pick up only/i,
  /move out sale/i,
  /washing machine.*for sale/i,
  /^interested/i,
  /^not able to dm/i,
  /^hi,?\s*i am interested/i,
  /modi ji/i,
  /please check dm/i,
  /unable to dm/i,
  /^is this still available/i,
];

function isPropertyListing(p) {
  const bhk = normalizeBhk(p.property_type, p.post_text);
  if (!bhk) return false;
  if (extractArea(p) === null) return false;
  const text = (p.post_text || "").trim();
  if (JUNK_PATTERNS.some(re => re.test(text))) return false;
  return true;
}

const facebookListings = rawData
  .filter(isPropertyListing)
  .map((property, index) => {
    const areaName    = extractArea(property);
    const coords      = bengaluruCoords[areaName] || [12.9716, 77.5946];
    const bhkType     = normalizeBhk(property.property_type, property.post_text);
    const monthlyRent = parseRent(property.rent);
    const furnishing  = normalizeFurnishing(property.furnishing);
    const images      = (property.image_links || []).filter(u => typeof u === "string" && u.startsWith("http"));
    const fallback    = apartmentPhotos[index % apartmentPhotos.length];
    const phone       = extractPhone(property.post_text);

    const description = (property.post_text || "")
      .split(/[.!?\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 20)
      .slice(0, 2)
      .join(". ")
      .slice(0, 200) || `${bhkType} in ${areaName}, Bangalore`;

    return {
      id: `fb-${index}`,
      bhkType,
      area:      areaName,
      rent:      monthlyRent,
      furnishing,
      title:     `${bhkType} in ${areaName}`,
      price:     monthlyRent ? `₹ ${monthlyRent.toLocaleString("en-IN")}` : "Contact for price",
      deposit:   monthlyRent ? monthlyRent * 2 : 0,
      type:      "Rent",
      location:  `${areaName}, Bangalore`,
      address:   `${areaName}, Bangalore`,
      coords,
      lat:       coords[0],
      lng:       coords[1],
      availability:     "Immediate",
      amenities:        property.amenities || [],
      image:            images[0] || fallback,
      images:           images.length > 0 ? images : [fallback],
      contactName:      "Facebook Group",
      contactPhone:     phone,
      preferredTenants: "Any",
      availableFrom:    "Immediate",
      seller:           "Facebook Group",
      contact:          property.post_url || "via Facebook",
      source:           "facebook:real",
      description,
      createdAt:        { seconds: Math.floor(Date.now() / 1000) - index * 3600 },
    };
  });

export default facebookListings;
