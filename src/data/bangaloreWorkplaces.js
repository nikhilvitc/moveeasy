/**
 * Major Bangalore tech parks & office hubs — tap-to-select on map (no geocode round-trip).
 * Coordinates are approximate campus centers for commute-radius search.
 *
 * `companies` — common employer / brand names users type (matched case-insensitive) to jump to this campus.
 */
export const BANGALORE_WORKPLACES = [
  { id: "manyata", name: "Manyata Embassy Tech Park", lat: 13.0444, lng: 77.6247, companies: ["ibm", "philips", "nokia", "conduent", "cerner", "rolls royce"] },
  { id: "embassy-tech", name: "Embassy Tech Village (Bellandur)", lat: 12.9347, lng: 77.6972, companies: ["cisco", "vmware", "juniper", "yahoo", "samsung r&d"] },
  { id: "rmz-eco", name: "RMZ Ecoworld", lat: 12.9299, lng: 77.6844, companies: ["jp morgan", "visa", "wells fargo", "mu sigma"] },
  { id: "prestige-tech", name: "Prestige Tech Park (Marathahalli)", lat: 12.9592, lng: 77.7013, companies: ["ericsson", "qualcomm", "sasken"] },
  { id: "bagmane", name: "Bagmane Tech Park (CV Raman Nagar)", lat: 12.9797, lng: 77.6658, companies: ["oracle", "verizon", "pwc"] },
  { id: "itpb", name: "ITPB Whitefield", lat: 12.9879, lng: 77.7372, companies: ["sap", "capgemini", "tcs", "infosys", "wipro whitefield"] },
  { id: "egl", name: "EGL (Domlur)", lat: 12.9668, lng: 77.641, companies: ["google", "google india", "alphabet", "youtube"] },
  { id: "wtc", name: "WTC / Kadubeesanahalli", lat: 12.9256, lng: 77.6855, companies: ["microsoft", "accenture kadubeesanahalli"] },
  { id: "cessna", name: "Cessna Business Park", lat: 12.9513, lng: 77.699, companies: ["amazon", "aws"] },
  { id: "global-village", name: "Global Village (Mysore Rd)", lat: 12.902, lng: 77.4837, companies: ["morgan stanley", "netapp"] },
  { id: "brigade-orion", name: "Brigade Gateway / Orion Mall", lat: 13.0112, lng: 77.55, companies: ["amdocs", "huawei"] },
  { id: "kalyani-tech", name: "Kalyani Tech Park", lat: 13.0226, lng: 77.596, companies: ["mercedes", "daimler"] },
  { id: "rmz-infinity", name: "RMZ Infinity (Old Airport Rd)", lat: 12.962, lng: 77.6413, companies: ["nokia bell", "nokia solutions"] },
  { id: "koramangala-100ft", name: "Koramangala (100ft / Sony World)", lat: 12.9352, lng: 77.6245, companies: ["swiggy", "razorpay", "cred"] },
  { id: "hsr-17", name: "HSR Layout Sector 17", lat: 12.9116, lng: 77.6389, companies: ["flipkart", "meesho"] },
  { id: "electronic-city", name: "Electronic City Phase 1", lat: 12.8456, lng: 77.6603, companies: ["infosys electronic", "wipro ec", "biocon", "siemens"] },
  { id: "jp-nagar", name: "JP Nagar 6th Phase", lat: 12.9067, lng: 77.585 },
  { id: "indiranagar", name: "Indiranagar 100ft Rd", lat: 12.9784, lng: 77.6408 },
  { id: "mg-road", name: "MG Road / Trinity", lat: 12.9755, lng: 77.6059 },
  { id: "ub-city", name: "UB City", lat: 12.9716, lng: 77.5966 },
  { id: "hebbal", name: "Hebbal / ORR", lat: 13.0358, lng: 77.597 },
  { id: "yelahanka", name: "Yelahanka New Town", lat: 13.1007, lng: 77.5963 },
  { id: "sarjapur", name: "Sarjapur Rd (Wipro)", lat: 12.9108, lng: 77.6877, companies: ["wipro sarjapur", "adobe"] },
  { id: "mahadevapura", name: "Mahadevapura / KR Puram", lat: 12.9915, lng: 77.7038, companies: ["dell", "emc"] },
];

function norm(s) {
  return String(s || "").toLowerCase().trim();
}

/**
 * Resolve typed company or campus name to a preset workplace (before geocode / text filters).
 */
export function matchWorkplacePreset(raw) {
  const q = norm(raw);
  if (!q) return null;
  for (const wp of BANGALORE_WORKPLACES) {
    const name = norm(wp.name);
    const id = String(wp.id || "").toLowerCase();
    if (q === id || name === q) return wp;
    const companies = (wp.companies || []).map(norm).filter(Boolean);
    for (const cn of companies) {
      if (!cn) continue;
      if (q === cn || q.includes(cn) || cn.includes(q)) return wp;
    }
    if (q.length >= 3 && (name.includes(q) || id.replace(/-/g, " ").includes(q))) return wp;
  }
  return null;
}
