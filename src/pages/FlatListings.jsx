import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import listingsRaw from "../assets/icons/listings.json";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE   = 12;
const BENGALURU_CENTER = [12.9716, 77.5946];
const BENGALURU_BOUNDS = [[12.75, 77.38], [13.18, 77.82]];
const BRAND_RED  = "#ff3131";
const BRAND_INK  = "#1c1917";

// ─── Data ─────────────────────────────────────────────────────────────────────
const AMENITY_LABELS = {
  ac: "AC", wifi: "WiFi", parking: "Parking", microwave: "Microwave",
  refrigerator: "Fridge", washing_machine: "Washing Machine",
  dining_table: "Dining Table", sofa: "Sofa", tv: "TV",
};
const AMENITY_ICONS = {
  AC: "❄️", WiFi: "📶", Parking: "🅿️", Gym: "🏋️", Lift: "🛗",
  Security: "🔒", Fridge: "🧊", TV: "📺", Sofa: "🛋️",
  "Swimming Pool": "🏊", "Water Purifier": "💧", Cook: "👨‍🍳", WiFi: "📶",
};
function normalizeAmenity(k) { return AMENITY_LABELS[k] || k; }

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return "Just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const days = Math.floor(s / 86400);
  return days < 30 ? `${days}d ago` : `${Math.floor(days / 30)}mo ago`;
}

function useDebounce(val, ms = 280) {
  const [v, setV] = useState(val);
  useEffect(() => { const t = setTimeout(() => setV(val), ms); return () => clearTimeout(t); }, [val, ms]);
  return v;
}

const PROPERTIES = listingsRaw
  .filter(l => l.precise_coordinates?.x && l.precise_coordinates?.y)
  .map(l => ({
    id: l.id,
    title: l.display_title || l.title || "",
    description: l.description || "",
    area: l.area || "",
    city: l.city || "",
    locationDetails: l.location_details || "",
    rent: Math.round(parseFloat(l.monthly_rent) || 0),
    deposit: l.security_deposit ? Math.round(parseFloat(l.security_deposit)) : null,
    bedrooms: l.bedroom_count || 1,
    bathrooms: l.bathroom_count || 1,
    furnished: !!l.is_furnished,
    amenities: Object.keys(l.amenities || {}).filter(k => l.amenities[k]).map(normalizeAmenity),
    houseRules: Object.keys(l.house_rules || {}).filter(k => l.house_rules[k]),
    gender: l.gender_preference || "any",
    images: ((l.images?.length ? l.images : [l.cover_image_url]) || []).filter(Boolean),
    coverImage: l.cover_image_url || l.images?.[0] || "",
    totalImages: l.totalImageCount || l.images?.length || 1,
    lat: l.precise_coordinates.y,
    lng: l.precise_coordinates.x,
    ownerName: l.owner_name || "Owner",
    ownerPicture: l.owner_picture || "",
    isVerified: !!l.is_verified,
    viewCount: l.view_count || 0,
    nearbyLocalities: (l.nearby_localities || []).slice(0, 3),
    createdAt: l.created_at,
    bumpedAt: l.bumped_at || l.created_at,
    slug: l.slug || "",
    maxFlatmates: l.max_flatmates || 1,
    currentFlatmates: l.current_flatmates || 0,
  }));

const ALL_AREAS = ["All Areas", ...Array.from(
  new Set(PROPERTIES.map(p => p.area).filter(Boolean))
).sort((a, b) => a.localeCompare(b))];

const GENDER_CONFIG = {
  female: { label: "Female", icon: "♀", cls: "text-rose-600 bg-rose-50 border-rose-200" },
  male:   { label: "Male",   icon: "♂", cls: "text-sky-600 bg-sky-50 border-sky-200"   },
  any:    { label: "Co-ed",  icon: "⚥", cls: "text-gray-600 bg-gray-50 border-gray-200" },
};

// ─── Map helpers ──────────────────────────────────────────────────────────────
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 0.5, easeLinearity: 0.08 });
  }, [center, zoom, map]);
  return null;
}

const clusterCache = new Map();
function getClusterIcon(count, isSelected) {
  const key = `${count}-${isSelected}`;
  if (clusterCache.has(key)) return clusterCache.get(key);
  const bg = isSelected ? BRAND_RED : BRAND_INK;
  const icon = L.divIcon({
    html: `<div style="
      background:${bg};color:#fff;
      padding:5px 12px;border-radius:20px;
      font-size:11px;font-weight:700;
      font-family:'Inter',sans-serif;white-space:nowrap;
      box-shadow:0 3px 12px rgba(0,0,0,.25);
      ${isSelected ? "transform:scale(1.12);" : ""}
      transition:all .15s;
    ">${count} flat${count !== 1 ? "s" : ""}</div>`,
    className: "", iconSize: [72, 28], iconAnchor: [36, 14],
  });
  clusterCache.set(key, icon);
  return icon;
}

// ─── Owner Avatar ─────────────────────────────────────────────────────────────
const OwnerAvatar = memo(function OwnerAvatar({ src, name, size = 24 }) {
  const [err, setErr] = useState(false);
  const initial = name?.[0]?.toUpperCase() || "?";
  if (err || !src) {
    return (
      <div className="rounded-full text-white font-bold flex items-center justify-center shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.42, background: BRAND_RED }}>
        {initial}
      </div>
    );
  }
  return <img src={src} alt={name} onError={() => setErr(true)}
    className="rounded-full object-cover shrink-0 bg-gray-100" style={{ width: size, height: size }} />;
});

// ─── Listing Card (FlatX style) ───────────────────────────────────────────────
const ListingCard = memo(function ListingCard({ property, onClick, compact }) {
  const [imgIdx, setImgIdx] = useState(0);
  const gender = GENDER_CONFIG[property.gender] || GENDER_CONFIG.any;
  const visibleAmenities = property.amenities.slice(0, compact ? 2 : 3);
  const extra = property.amenities.length - visibleAmenities.length;
  const imgH = compact ? "h-40" : "h-52";

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 shadow-sm"
    >
      {/* Image */}
      <div className={`relative ${imgH} overflow-hidden bg-gray-100`}>
        {property.coverImage
          ? <img src={property.coverImage} alt={property.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy" decoding="async" />
          : <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
              </svg>
            </div>
        }

        {/* Image dots */}
        {property.totalImages > 1 && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1">
            {Array.from({ length: Math.min(property.totalImages, 5) }).map((_, i) => (
              <div key={i} onClick={e => { e.stopPropagation(); setImgIdx(i); }}
                className={`rounded-full transition-all cursor-pointer ${i === imgIdx ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/60"}`} />
            ))}
          </div>
        )}

        {/* Heart */}
        <button onClick={e => e.stopPropagation()}
          className="absolute top-2.5 right-2.5 w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center hover:scale-110 transition-transform group/h">
          <svg className="w-4 h-4 text-gray-400 group-hover/h:text-rose-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>

        {/* Verified */}
        {property.isVerified && (
          <div className="absolute top-2.5 left-2.5 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
            ✓ Verified
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3.5">
        {/* Title */}
        <h3 className="font-bold text-[#1c1917] text-[13px] leading-snug mb-2.5 truncate">
          {property.title}
        </h3>

        {/* Rent | Deposit */}
        <div className="flex items-start gap-3 mb-2.5">
          <div>
            <p className="text-[9px] text-gray-400 uppercase tracking-wide font-medium mb-0.5">Rent</p>
            <p className="text-sm font-bold text-[#1c1917]">₹{property.rent.toLocaleString("en-IN")}</p>
          </div>
          <div className="w-px self-stretch bg-gray-100 mx-0.5" />
          <div>
            <p className="text-[9px] text-gray-400 uppercase tracking-wide font-medium mb-0.5">Deposit</p>
            <p className="text-sm font-bold text-[#1c1917]">
              {property.deposit ? `₹${property.deposit.toLocaleString("en-IN")}` : "—"}
            </p>
          </div>
        </div>

        {/* Chips row */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
          {/* Gender */}
          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${gender.cls}`}>
            {gender.icon} {gender.label}
          </span>
          {/* BHK */}
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border border-gray-200 text-gray-600 bg-gray-50 flex items-center gap-0.5">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {property.bedrooms} BHK
          </span>
          {/* Amenities */}
          {visibleAmenities.map(a => (
            <span key={a} className="text-[9px] font-semibold px-2 py-0.5 rounded-full border border-gray-200 text-gray-600 bg-gray-50 flex items-center gap-0.5">
              {AMENITY_ICONS[a] && <span>{AMENITY_ICONS[a]}</span>} {a}
            </span>
          ))}
          {extra > 0 && (
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 bg-gray-50">
              +{extra}
            </span>
          )}
        </div>

        {/* Owner row */}
        <div className="flex items-center gap-2 pt-2.5 border-t border-gray-50">
          <OwnerAvatar src={property.ownerPicture} name={property.ownerName} size={22} />
          <span className="text-[10px] text-gray-600 truncate flex-1">{property.ownerName}</span>
          <span className="text-[9px] text-gray-400 shrink-0">
            Bumped {timeAgo(property.bumpedAt || property.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
});

// ─── Detail Modal (bottom-sheet style) ───────────────────────────────────────
const DetailModal = memo(function DetailModal({ property, onClose }) {
  const [imgIdx, setImgIdx] = useState(0);
  useEffect(() => { setImgIdx(0); }, [property?.id]);
  if (!property) return null;

  const gender = GENDER_CONFIG[property.gender] || GENDER_CONFIG.any;
  const spotsLeft = property.maxFlatmates - property.currentFlatmates;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Gallery */}
        <div className="relative h-64 shrink-0 overflow-hidden bg-gray-100">
          <AnimatePresence mode="wait">
            <motion.img key={imgIdx} src={property.images[imgIdx]} alt={property.title}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="w-full h-full object-cover" />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {property.images.map((_, i) => (
              <button key={i} onClick={() => setImgIdx(i)}
                className={`rounded-full transition-all ${i === imgIdx ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`} />
            ))}
          </div>

          {/* Nav */}
          {property.images.length > 1 && (<>
            <button onClick={() => setImgIdx(p => (p - 1 + property.images.length) % property.images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={() => setImgIdx(p => (p + 1) % property.images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>)}

          {/* Close */}
          <button onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Bottom overlay */}
          <div className="absolute bottom-6 left-4">
            <p className="text-white font-bold text-base drop-shadow">{property.title}</p>
            <p className="text-white/75 text-xs flex items-center gap-1 mt-0.5">
              <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              {property.locationDetails}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Rent strip */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-wide font-medium">Rent</p>
                <p className="text-xl font-extrabold text-[#1c1917]">₹{property.rent.toLocaleString("en-IN")}<span className="text-xs font-normal text-gray-400">/mo</span></p>
              </div>
              {property.deposit && (
                <>
                  <div className="w-px h-10 bg-gray-100" />
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wide font-medium">Deposit</p>
                    <p className="text-xl font-extrabold text-[#1c1917]">₹{property.deposit.toLocaleString("en-IN")}</p>
                  </div>
                </>
              )}
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${gender.cls}`}>{gender.label}</span>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "BHK",    value: `${property.bedrooms} BHK` },
                { label: "Baths",  value: property.bathrooms          },
                { label: "Type",   value: property.furnished ? "Furnished" : "Bare" },
                { label: "Views",  value: property.viewCount          },
              ].map(({ label, value }) => (
                <div key={label} className="text-center py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-[#1c1917]">{value}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Spots */}
            {spotsLeft > 0 && (
              <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-700">{spotsLeft} flatmate spot{spotsLeft > 1 ? "s" : ""} available</p>
                  <p className="text-[9px] text-emerald-600">{property.currentFlatmates} of {property.maxFlatmates} occupied</p>
                </div>
              </div>
            )}

            {/* Description */}
            {property.description && (
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">About</p>
                <p className="text-xs text-gray-600 leading-relaxed">{property.description}</p>
              </div>
            )}

            {/* Amenities */}
            {property.amenities.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Amenities</p>
                <div className="flex flex-wrap gap-1.5">
                  {property.amenities.map(a => (
                    <span key={a} className="text-[10px] px-2.5 py-1 bg-[#fff5f5] text-[#ff3131] rounded-full font-semibold border border-red-100 flex items-center gap-1">
                      {AMENITY_ICONS[a] && <span>{AMENITY_ICONS[a]}</span>}{a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* House Rules */}
            {property.houseRules.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">House Rules</p>
                <div className="flex flex-wrap gap-1.5">
                  {property.houseRules.map(r => (
                    <span key={r} className="text-[10px] px-2.5 py-1 bg-green-50 text-green-700 rounded-full font-semibold border border-green-100">✓ {r}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Nearby */}
            {property.nearbyLocalities.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Nearby</p>
                {property.nearbyLocalities.map(n => (
                  <div key={n.name} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: BRAND_RED }} />{n.name}
                    </span>
                    <span className="text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">{n.distance}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Owner */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
              <OwnerAvatar src={property.ownerPicture} name={property.ownerName} size={40} />
              <div className="flex-1">
                <p className="text-sm font-bold text-[#1c1917]">{property.ownerName}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">Bumped {timeAgo(property.bumpedAt || property.createdAt)} · {property.viewCount} views</p>
              </div>
            </div>

            {/* CTA */}
            <button
              className="w-full py-3.5 text-white text-sm font-bold rounded-2xl transition-all active:scale-[0.98] shadow-md mb-1"
              style={{ background: `linear-gradient(135deg, ${BRAND_RED}, #c0392b)`, boxShadow: `0 4px 14px rgba(255,49,49,0.35)` }}
            >
              Contact Owner
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FlatListings() {
  const [search, setSearch]               = useState("");
  const [filterBHK, setFilterBHK]         = useState([]);
  const [filterBudgetMin, setFilterBudgetMin] = useState(0);
  const [filterBudgetMax, setFilterBudgetMax] = useState(150000);
  const [filterGender, setFilterGender]   = useState("any");
  const [filterArea, setFilterArea]       = useState("All Areas");
  const [sortBy, setSortBy]               = useState("relevance");
  const [view, setView]                   = useState("area"); // "area" | "map"
  const [selectedId, setSelectedId]       = useState(null);
  const [page, setPage]                   = useState(1);
  const [mapCenter, setMapCenter]         = useState(BENGALURU_CENTER);
  const [mapZoom, setMapZoom]             = useState(12);
  const loaderRef = useRef(null);

  const debouncedSearch = useDebounce(search);
  useEffect(() => { setPage(1); }, [debouncedSearch, filterBHK, filterBudgetMin, filterBudgetMax, filterGender, filterArea, sortBy]);

  const filtered = useMemo(() => {
    let r = PROPERTIES;
    if (filterArea !== "All Areas") r = r.filter(p => p.area === filterArea);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      r = r.filter(p =>
        p.area?.toLowerCase().includes(q) ||
        p.locationDetails?.toLowerCase().includes(q) ||
        p.title?.toLowerCase().includes(q)
      );
    }
    if (filterBHK.length > 0)
      r = r.filter(p => filterBHK.includes(p.bedrooms >= 4 ? 4 : p.bedrooms));
    r = r.filter(p => p.rent >= filterBudgetMin && p.rent <= filterBudgetMax);
    if (filterGender !== "any")
      r = r.filter(p => p.gender === filterGender || p.gender === "any");
    return [...r].sort((a, b) => {
      if (sortBy === "price_asc")  return a.rent - b.rent;
      if (sortBy === "price_desc") return b.rent - a.rent;
      if (sortBy === "area_az")    return a.area.localeCompare(b.area);
      // relevance: bumped/recency
      return new Date(b.bumpedAt || b.createdAt) - new Date(a.bumpedAt || a.createdAt);
    });
  }, [debouncedSearch, filterBHK, filterBudgetMin, filterBudgetMax, filterGender, filterArea, sortBy]);

  const visible = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const hasMore = visible.length < filtered.length;

  // Area clusters for map
  const areaClusters = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      if (!map[p.area]) map[p.area] = { area: p.area, count: 0, lat: p.lat, lng: p.lng };
      map[p.area].count++;
    });
    return Object.values(map);
  }, [filtered]);

  const selectedProperty = useMemo(() => filtered.find(p => p.id === selectedId) ?? null, [filtered, selectedId]);

  // Infinite scroll
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore) setPage(p => p + 1); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore]);

  const toggleBHK = useCallback(n =>
    setFilterBHK(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]), []);

  const clearAll = useCallback(() => {
    setSearch(""); setFilterBHK([]); setFilterBudgetMin(0); setFilterBudgetMax(150000);
    setFilterGender("any"); setFilterArea("All Areas"); setSortBy("relevance");
    setSelectedId(null); setPage(1); setMapCenter(BENGALURU_CENTER); setMapZoom(12);
  }, []);

  const activeCount =
    filterBHK.length + (filterGender !== "any" ? 1 : 0) +
    (filterArea !== "All Areas" ? 1 : 0) +
    (filterBudgetMin > 0 || filterBudgetMax < 150000 ? 1 : 0);

  const budgetLabel = filterBudgetMin === 0 && filterBudgetMax === 150000
    ? "Budget: ₹0 – ₹1.5L"
    : `₹${(filterBudgetMin / 1000).toFixed(0)}k – ₹${(filterBudgetMax / 1000).toFixed(0)}k`;

  const genderLabel = filterGender === "female" ? "Girls Only" : filterGender === "male" ? "Boys Only" : "Looking for";

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#fffaf8", fontFamily: "'Inter',sans-serif" }}>

      {/* ── Page Header ── */}
      <div className="px-6 md:px-10 pt-7 pb-2 flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#1c1917] tracking-tight">Find Your Next Place</h1>
        <button
          className="hidden sm:flex items-center gap-2 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-all hover:opacity-90 shadow-md active:scale-[0.97]"
          style={{ background: BRAND_INK }}
        >
          ✨ Smart Matches
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
      </div>

      {/* ── Search + Filter Block ── */}
      <div className="px-6 md:px-10 py-4">
        <div className="rounded-2xl p-4" style={{ background: "#f0ebe3" }}>

          {/* Row 1: Search + Sort */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1 bg-white rounded-xl shadow-sm">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Which area are you looking in?"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-11 pr-10 py-3 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none rounded-xl"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 text-sm text-gray-600 font-semibold">
              <span>Sort By:</span>
              <div className="relative">
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 text-gray-700 text-xs font-semibold pl-3 pr-7 py-2.5 rounded-xl cursor-pointer focus:outline-none hover:border-gray-300">
                  <option value="relevance">Relevance</option>
                  <option value="price_asc">Price ↑</option>
                  <option value="price_desc">Price ↓</option>
                  <option value="area_az">Area Name</option>
                </select>
                <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Row 2: Filter pills + view toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Budget pill */}
            <div className="relative group">
              <button className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl border bg-white transition-all hover:border-gray-400 ${filterBudgetMin > 0 || filterBudgetMax < 150000 ? "border-[#ff3131] text-[#ff3131]" : "border-gray-200 text-gray-700"}`}>
                {budgetLabel}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {/* Budget dropdown */}
              <div className="absolute top-full left-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-30 hidden group-focus-within:block w-56">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Budget Range</p>
                {[
                  [0, 150000, "Any budget"],
                  [0, 10000,  "Under ₹10k"],
                  [10000, 20000, "₹10k – ₹20k"],
                  [20000, 30000, "₹20k – ₹30k"],
                  [30000, 150000, "₹30k+"],
                ].map(([min, max, label]) => (
                  <button key={label} onClick={() => { setFilterBudgetMin(min); setFilterBudgetMax(max); }}
                    className={`w-full text-left text-xs py-2 px-3 rounded-xl mb-1 font-medium transition-colors ${filterBudgetMin === min && filterBudgetMax === max ? "text-white" : "text-gray-600 hover:bg-gray-50"}`}
                    style={filterBudgetMin === min && filterBudgetMax === max ? { background: BRAND_RED } : {}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Looking for (gender) */}
            <div className="relative group">
              <button className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl border bg-white transition-all hover:border-gray-400 ${filterGender !== "any" ? "border-[#ff3131] text-[#ff3131]" : "border-gray-200 text-gray-700"}`}>
                {genderLabel}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full left-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-30 hidden group-focus-within:block w-44">
                {[["any", "Co-ed / Any"], ["female", "Girls Only"], ["male", "Boys Only"]].map(([v, label]) => (
                  <button key={v} onClick={() => setFilterGender(v)}
                    className={`w-full text-left text-xs py-2 px-3 rounded-xl mb-1 font-medium transition-colors ${filterGender === v ? "text-white" : "text-gray-600 hover:bg-gray-50"}`}
                    style={filterGender === v ? { background: BRAND_RED } : {}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* BHK chips */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map(n => (
                <button key={n} onClick={() => toggleBHK(n)}
                  className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${filterBHK.includes(n) ? "text-white border-transparent" : "bg-white border-gray-200 text-gray-700 hover:border-gray-400"}`}
                  style={filterBHK.includes(n) ? { background: BRAND_RED, borderColor: BRAND_RED } : {}}>
                  {n === 4 ? "4+ BHK" : `${n} BHK`}
                </button>
              ))}
            </div>

            {/* Area filter */}
            <div className="relative">
              <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
                className={`appearance-none text-xs font-semibold pl-3 pr-7 py-2 rounded-xl border cursor-pointer bg-white focus:outline-none transition-all ${filterArea !== "All Areas" ? "text-white border-transparent" : "border-gray-200 text-gray-700 hover:border-gray-400"}`}
                style={filterArea !== "All Areas" ? { background: BRAND_RED } : {}}>
                {ALL_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <svg className={`absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${filterArea !== "All Areas" ? "text-white" : "text-gray-400"}`}
                fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Search icon button */}
            <button className="w-9 h-9 flex items-center justify-center rounded-xl text-white shrink-0 transition-all hover:opacity-90"
              style={{ background: BRAND_RED }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Clear */}
            {activeCount > 0 && (
              <button onClick={clearAll}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-all">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear ({activeCount})
              </button>
            )}

            {/* View toggle — right side */}
            <div className="ml-auto flex items-center rounded-xl border border-gray-200 overflow-hidden bg-white divide-x divide-gray-200">
              {[
                { key: "map",  label: "Map",       icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg> },
                { key: "area", label: "Area only", icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg> },
              ].map(({ key, label, icon }) => (
                <button key={key} onClick={() => setView(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all ${view === key ? "text-white" : "text-gray-600 hover:bg-gray-50"}`}
                  style={view === key ? { background: BRAND_INK } : {}}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Result count */}
      <div className="px-6 md:px-10 pb-3">
        <p className="text-sm text-gray-500">
          Showing <span className="font-bold text-[#1c1917]">{visible.length}</span> – <span className="font-bold text-[#1c1917]">{filtered.length}</span> results
          {filterArea !== "All Areas" && (
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full border" style={{ color: BRAND_RED, borderColor: "#ffcdd2", background: "#fff5f5" }}>{filterArea}</span>
          )}
        </p>
      </div>

      {/* ── Content ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Area-only: full-width grid */}
        {view === "area" && (
          <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-gray-100">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
                  </svg>
                </div>
                <p className="text-base font-bold text-gray-600 mb-1">No listings found</p>
                <p className="text-sm text-gray-400 mb-4">Try adjusting your search or filters</p>
                <button onClick={clearAll}
                  className="text-sm font-semibold px-5 py-2 rounded-xl text-white transition-all"
                  style={{ background: BRAND_RED }}>Clear all filters</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {visible.map(p => (
                    <ListingCard key={p.id} property={p} onClick={() => setSelectedId(p.id)} compact={false} />
                  ))}
                </div>
                <div ref={loaderRef} className="py-6 flex justify-center">
                  {hasMore && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <div className="w-4 h-4 border-2 border-gray-200 border-t-red-400 rounded-full animate-spin" />
                      Loading more…
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Map view: cards left + map right */}
        {view === "map" && (
          <>
            {/* Cards column */}
            <div className="w-[44%] shrink-0 overflow-y-auto px-4 pb-6">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <p className="text-sm font-bold text-gray-600 mb-1">No listings found</p>
                  <button onClick={clearAll} className="text-sm font-semibold text-white px-4 py-2 rounded-xl mt-3" style={{ background: BRAND_RED }}>Clear filters</button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {visible.map(p => (
                      <ListingCard key={p.id} property={p} onClick={() => { setSelectedId(p.id); setMapCenter([p.lat, p.lng]); setMapZoom(15); }} compact={true} />
                    ))}
                  </div>
                  <div ref={loaderRef} className="py-4 flex justify-center">
                    {hasMore && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="w-4 h-4 border-2 border-gray-200 border-t-red-400 rounded-full animate-spin" />
                        Loading…
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Map */}
            <div className="flex-1 relative">
              <MapContainer
                center={mapCenter} zoom={mapZoom}
                style={{ height: "100%", width: "100%" }}
                zoomControl={false} preferCanvas={true}
                maxBounds={BENGALURU_BOUNDS} maxBoundsViscosity={0.9}
                minZoom={10} maxZoom={18}
                zoomSnap={0.25} zoomDelta={0.5} wheelPxPerZoomLevel={60}
                markerZoomAnimation zoomAnimation
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  subdomains="abcd" maxZoom={18}
                  keepBuffer={4} updateWhenIdle={false} updateWhenZooming={false}
                />
                <MapController center={mapCenter} zoom={mapZoom} />
                {areaClusters.map(c => (
                  <Marker
                    key={c.area}
                    position={[c.lat, c.lng]}
                    icon={getClusterIcon(c.count, c.area === (filtered.find(p => p.id === selectedId)?.area))}
                    eventHandlers={{ click: () => { setFilterArea(c.area); setMapCenter([c.lat, c.lng]); setMapZoom(14); } }}
                  />
                ))}
              </MapContainer>

              <style>{`.leaflet-control-attribution{font-size:9px!important;opacity:.4}.leaflet-bottom.leaflet-right{bottom:4px;right:4px}`}</style>

              <div className="absolute bottom-4 right-4 z-[999] flex gap-2">
                <button onClick={() => { setMapCenter(BENGALURU_CENTER); setMapZoom(12); }}
                  className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-lg text-xs font-semibold text-gray-700 border border-gray-200 flex items-center gap-1.5 hover:bg-white transition-all">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {selectedId && selectedProperty && (
          <DetailModal property={selectedProperty} onClose={() => setSelectedId(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
