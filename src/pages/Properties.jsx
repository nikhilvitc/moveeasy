import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import {
  extractAreas,
  applyFilters,
} from "../lib/facebookPropertiesService";
import { isFirebaseConfigured } from "../lib/firebase";
import listingsData from "../data/facebookListings";

// ─── constants ────────────────────────────────────────────────────────────────
const BHK_OPTIONS = ["All", "Studio", "1BHK", "2BHK", "3BHK", "4BHK", "PG"];
const FURNISHING_OPTIONS = ["All", "Fully Furnished", "Semi Furnished", "Unfurnished"];
const EASE = [0.22, 1, 0.36, 1];

const RENT_STEPS = [
  { label: "Any price", min: 0, max: 0 },
  { label: "Under ₹10k", min: 0, max: 10000 },
  { label: "₹10k – 20k", min: 10000, max: 20000 },
  { label: "₹20k – 35k", min: 20000, max: 35000 },
  { label: "₹35k – 60k", min: 35000, max: 60000 },
  { label: "₹60k+", min: 60000, max: 0 },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "rent-asc", label: "Rent: Low → High" },
  { value: "rent-desc", label: "Rent: High → Low" },
];

// BHK → gradient for the card image header
const BHK_GRADIENT = {
  Studio:  "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)",
  "1BHK":  "linear-gradient(135deg,#0ea5e9 0%,#06b6d4 100%)",
  "2BHK":  "linear-gradient(135deg,#e85a4f 0%,#f97316 100%)",
  "3BHK":  "linear-gradient(135deg,#059669 0%,#10b981 100%)",
  "4BHK":  "linear-gradient(135deg,#7c3aed 0%,#ec4899 100%)",
  PG:      "linear-gradient(135deg,#d97706 0%,#f59e0b 100%)",
};
const DEFAULT_GRADIENT = "linear-gradient(135deg,#334155 0%,#1e293b 100%)";

// Amenity → emoji icon
const AMENITY_ICON = {
  "WiFi": "📶", "Wi-Fi": "📶",
  "AC": "❄️", "Air Conditioning": "❄️",
  "Parking": "🅿️",
  "Gym": "🏋️",
  "Power Backup": "🔋", "Power backup": "🔋",
  "Security": "🔒", "24×7 Security": "🔒",
  "Swimming Pool": "🏊", "Pool": "🏊",
  "Clubhouse": "🏛️",
  "Lift": "🛗", "Elevator": "🛗",
  "Garden": "🌿",
  "CCTV": "📹",
  "Gas Pipeline": "🔥",
  "Balcony": "🪴",
  "Pets Allowed": "🐾",
};

// Demo data shown when Firebase is not configured
const DEMO_PROPERTIES = [
  {
    id: "demo-1", bhkType: "2BHK", area: "Koramangala", rent: 28000, deposit: 84000,
    furnishing: "Semi Furnished", amenities: ["WiFi", "AC", "Parking", "Gym", "Power Backup", "Security"],
    location: "5th Block, Koramangala, Bengaluru 560095",
    description: "Spacious 2BHK with modern interiors, 24×7 security, and great connectivity to Silk Board. Society has power backup and covered parking.",
    contactName: "Rahul S.", contactPhone: "+919876543210",
    preferredTenants: "Family", availableFrom: "Immediate", isActive: true,
    createdAt: { seconds: Date.now() / 1000 - 3600 },
  },
  {
    id: "demo-2", bhkType: "1BHK", area: "HSR Layout", rent: 16500, deposit: 49500,
    furnishing: "Fully Furnished", amenities: ["WiFi", "AC", "Power Backup", "Security", "Lift"],
    location: "Sector 7, HSR Layout, Bengaluru 560102",
    description: "Fully furnished 1BHK in a gated society. Walking distance to HSR BDA complex. All appliances included — fridge, washing machine, microwave.",
    contactName: "Priya M.", contactPhone: "+919876543211",
    preferredTenants: "Any", availableFrom: "1 Jun 2026", isActive: true,
    createdAt: { seconds: Date.now() / 1000 - 7200 },
  },
  {
    id: "demo-3", bhkType: "3BHK", area: "Whitefield", rent: 42000, deposit: 126000,
    furnishing: "Unfurnished", amenities: ["Parking", "Clubhouse", "Swimming Pool", "Gym", "Security", "CCTV"],
    location: "EPIP Zone, Whitefield, Bengaluru 560066",
    description: "Brand-new 3BHK in a premium gated community. 5 min from ITPL. East-facing flat with beautiful garden view. Pets allowed.",
    contactName: "Sanjay T.", contactPhone: "+919876543212",
    preferredTenants: "Family", availableFrom: "15 Jun 2026", isActive: true,
    createdAt: { seconds: Date.now() / 1000 - 86400 },
  },
  {
    id: "demo-4", bhkType: "Studio", area: "Indiranagar", rent: 12000, deposit: 24000,
    furnishing: "Fully Furnished", amenities: ["WiFi", "AC", "Security", "CCTV"],
    location: "100 Feet Road, Indiranagar, Bengaluru 560038",
    description: "Cozy studio apartment ideal for working professionals. Fully furnished with all basics. 5 min walk to Indiranagar Metro.",
    contactName: "Meena K.", contactPhone: "+919876543213",
    preferredTenants: "Bachelors", availableFrom: "Immediate", isActive: true,
    createdAt: { seconds: Date.now() / 1000 - 1800 },
  },
  {
    id: "demo-5", bhkType: "2BHK", area: "Bellandur", rent: 24000, deposit: 72000,
    furnishing: "Semi Furnished", amenities: ["WiFi", "Parking", "Gym", "Power Backup", "Lift"],
    location: "Near Ecospace, Bellandur, Bengaluru 560103",
    description: "Bright 2BHK close to Outer Ring Road. Great for IT professionals working in Bellandur/Sarjapur corridor. Society has clubhouse.",
    contactName: "Vijay R.", contactPhone: "+919876543214",
    preferredTenants: "Any", availableFrom: "Immediate", isActive: true,
    createdAt: { seconds: Date.now() / 1000 - 5400 },
  },
  {
    id: "demo-6", bhkType: "PG", area: "BTM Layout", rent: 8500, deposit: 17000,
    furnishing: "Fully Furnished", amenities: ["WiFi", "AC", "Security", "Power Backup"],
    location: "BTM 2nd Stage, BTM Layout, Bengaluru 560076",
    description: "Girls PG with homely food included. 3 sharing / 2 sharing / single rooms available. Curfew 10 PM. Ideal for working women.",
    contactName: "Mrs. Lakshmi", contactPhone: "+919876543215",
    preferredTenants: "Girls", availableFrom: "Immediate", isActive: true,
    createdAt: { seconds: Date.now() / 1000 - 10800 },
  },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtRent(n) {
  if (!n) return "On Request";
  return "₹" + n.toLocaleString("en-IN");
}

function applySort(list, sort) {
  const copy = [...list];
  if (sort === "rent-asc") return copy.sort((a, b) => (a.rent || 0) - (b.rent || 0));
  if (sort === "rent-desc") return copy.sort((a, b) => (b.rent || 0) - (a.rent || 0));
  // newest: sort by createdAt seconds descending
  return copy.sort((a, b) => {
    const ta = a.createdAt?.seconds || 0;
    const tb = b.createdAt?.seconds || 0;
    return tb - ta;
  });
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
      <div className="h-28 bg-white/[0.06] animate-pulse" />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="h-5 w-12 rounded-full bg-white/[0.08] animate-pulse" />
          <div className="h-5 w-24 rounded-full bg-white/[0.06] animate-pulse" />
        </div>
        <div className="h-7 w-36 rounded-lg bg-white/[0.08] animate-pulse" />
        <div className="h-4 w-28 rounded bg-white/[0.06] animate-pulse" />
        <div className="h-3 w-full rounded bg-white/[0.05] animate-pulse" />
        <div className="h-3 w-4/5 rounded bg-white/[0.05] animate-pulse" />
        <div className="flex gap-1.5 mt-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-5 w-14 rounded-md bg-white/[0.06] animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────
function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all border whitespace-nowrap ${
        active
          ? "border-transparent text-white shadow-lg"
          : "border-white/[0.1] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.18] bg-white/[0.04] hover:bg-white/[0.07]"
      }`}
      style={active ? { background: "linear-gradient(135deg,#e85a4f,#f97316)" } : undefined}
    >
      {children}
    </button>
  );
}

// ─── Property card ────────────────────────────────────────────────────────────
function PropertyCard({ property, index }) {
  const {
    bhkType, furnishing, area, location, rent, deposit,
    amenities = [], images = [], description, contactName, contactPhone,
    preferredTenants, availableFrom, createdAt,
  } = property;

  const isNew = createdAt?.seconds && (Date.now() / 1000 - createdAt.seconds) < 86400;

  const waLink = contactPhone
    ? `https://wa.me/${contactPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
        `Hi! I found your ${bhkType} listing in ${area} on MovEAZY (₹${rent?.toLocaleString("en-IN") || "??"}/mo). Is it still available?`
      )}`
    : null;

  const furnishShort =
    furnishing === "Fully Furnished" ? "Fully Furn." :
    furnishing === "Semi Furnished"  ? "Semi Furn."  :
    furnishing === "Unfurnished"     ? "Unfurnished" : "";

  const furnishColor =
    furnishing === "Fully Furnished" ? "rgba(5,150,105,0.85)"  :
    furnishing === "Semi Furnished"  ? "rgba(180,83,9,0.85)"   :
    "rgba(71,85,105,0.85)";

  const cardGradient = BHK_GRADIENT[bhkType] || DEFAULT_GRADIENT;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.38, delay: Math.min(index * 0.05, 0.35), ease: EASE }}
      className="group flex flex-col rounded-2xl border border-white/[0.09] bg-[#111111] overflow-hidden hover:border-white/[0.22] transition-all duration-300"
      style={{ boxShadow: "0 0 0 0 transparent" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 0 0 0 transparent";
      }}
    >
      {/* ── Image header ── */}
      <div className="relative h-36 flex items-end p-3 overflow-hidden">
        {/* Real photo or gradient placeholder */}
        {images && images.length > 0 ? (
          <img
            src={images[0]}
            alt={`${bhkType} in ${area}`}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              // fallback to gradient if image fails to load
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement.style.background = cardGradient;
            }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: cardGradient }} />
        )}
        {/* Dark scrim so badges are always readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
        {/* Ghost BHK label (only on gradient, hidden when real image showing) */}
        {(!images || images.length === 0) && (
          <span className="absolute top-3 right-4 text-4xl font-black text-white/15 select-none leading-none tracking-tight">
            {bhkType}
          </span>
        )}
        {/* Photo count pill */}
        {images && images.length > 1 && (
          <span className="absolute top-2.5 right-3 flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-white/80">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
            </svg>
            {images.length}
          </span>
        )}
        {/* Badges */}
        <div className="relative flex flex-wrap gap-1.5 z-10">
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-black text-white bg-black/50 backdrop-blur-sm border border-white/20">
            {bhkType}
          </span>
          {furnishShort && (
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm"
              style={{ background: furnishColor }}
            >
              {furnishShort}
            </span>
          )}
          {isNew && (
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-black text-white bg-green-500/90 backdrop-blur-sm animate-pulse">
              NEW
            </span>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Rent */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[26px] font-black text-white tracking-tight leading-none">
            {fmtRent(rent)}
          </span>
          <span className="text-zinc-500 text-sm font-medium">/mo</span>
          {deposit ? (
            <span className="ml-auto text-[11px] font-semibold text-zinc-600 bg-white/[0.05] border border-white/[0.07] rounded-full px-2 py-0.5 whitespace-nowrap">
              Dep. ₹{deposit.toLocaleString("en-IN")}
            </span>
          ) : null}
        </div>

        {/* Area + Location */}
        <div>
          <div className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-orange-400 shrink-0">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="text-sm font-bold text-zinc-100">{area}</span>
          </div>
          {location && (
            <p className="text-xs text-zinc-500 mt-0.5 ml-5 leading-relaxed line-clamp-1">
              {location}
            </p>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
            {description}
          </p>
        )}

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {amenities.slice(0, 5).map((a) => (
              <span
                key={a}
                className="rounded-lg px-2 py-1 text-[10px] font-semibold text-zinc-300 bg-white/[0.06] border border-white/[0.07] flex items-center gap-1"
              >
                {AMENITY_ICON[a] && (
                  <span className="text-[10px] leading-none">{AMENITY_ICON[a]}</span>
                )}
                {a}
              </span>
            ))}
            {amenities.length > 5 && (
              <span className="rounded-lg px-2 py-1 text-[10px] font-semibold text-zinc-600 bg-white/[0.03] border border-white/[0.05]">
                +{amenities.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Meta pills */}
        <div className="flex flex-wrap gap-2 text-[11px]">
          {preferredTenants && preferredTenants !== "Any" && (
            <span className="flex items-center gap-1 text-zinc-500">
              <span>👥</span> {preferredTenants}
            </span>
          )}
          {availableFrom && (
            <span className="flex items-center gap-1 text-zinc-500">
              <span>📅</span> {availableFrom}
            </span>
          )}
          {contactName && (
            <span className="flex items-center gap-1 text-zinc-500 ml-auto">
              <span>🏠</span> {contactName}
            </span>
          )}
        </div>
      </div>

      {/* ── CTAs ── */}
      {contactPhone ? (
        <div className="flex gap-2 px-4 pb-4">
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-white transition-transform active:scale-95"
              style={{ background: "linear-gradient(135deg,#1fba53,#25d366)" }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          )}
          <a
            href={`tel:${contactPhone}`}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-zinc-200 border border-white/[0.12] hover:bg-white/[0.08] hover:text-white transition-all active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z"/>
            </svg>
            Call
          </a>
        </div>
      ) : (
        <div className="px-4 pb-4">
          <div className="w-full rounded-xl py-2.5 text-xs font-semibold text-zinc-600 border border-white/[0.06] text-center">
            Contact not available
          </div>
        </div>
      )}
    </motion.article>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default function Properties() {
  const [allProperties, setAllProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isDemo = !isFirebaseConfigured;

  // filters
  const [bhkType, setBhkType]     = useState("");
  const [furnishing, setFurnishing] = useState("");
  const [area, setArea]           = useState("");
  const [rentStep, setRentStep]   = useState(0);
  const [search, setSearch]       = useState("");
  const [sort, setSort]           = useState("newest");

  useEffect(() => {
    setAllProperties(listingsData);
    setLoading(false);
  }, []);

  const areas = useMemo(() => extractAreas(allProperties), [allProperties]);

  const filters = useMemo(() => {
    const step = RENT_STEPS[rentStep];
    return {
      bhkType: bhkType || "",
      furnishing: furnishing || "",
      area: area || "",
      minRent: step.min || 0,
      maxRent: step.max || 0,
      search: search.trim(),
    };
  }, [bhkType, furnishing, area, rentStep, search]);

  const displayed = useMemo(() => {
    const filtered = applyFilters(allProperties, filters);
    return applySort(filtered, sort);
  }, [allProperties, filters, sort]);

  const resetFilters = useCallback(() => {
    setBhkType(""); setFurnishing(""); setArea("");
    setRentStep(0); setSearch("");
  }, []);

  const activeFilterCount = [bhkType, furnishing, area, rentStep > 0 ? "rent" : ""].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      <Navbar />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative pt-14 pb-12 px-4 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div style={{
            position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)",
            width: "70%", height: "260px", borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(232,90,79,0.18) 0%, transparent 70%)",
            filter: "blur(40px)",
          }} />
          <div style={{
            position: "absolute", top: "0", left: "15%",
            width: "200px", height: "200px", borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(249,115,22,0.08) 0%, transparent 70%)",
            filter: "blur(60px)",
          }} />
          <div style={{
            position: "absolute", top: "20px", right: "10%",
            width: "180px", height: "180px", borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)",
            filter: "blur(50px)",
          }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
          className="relative max-w-3xl mx-auto text-center"
        >
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.05] px-4 py-1.5 mb-5 backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <span className="text-xs font-semibold text-zinc-300">
              Live rentals · Sourced from Facebook groups
            </span>
          </motion.div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.08]">
            <span className="text-white">Bengaluru Rental</span>
            <br />
            <span style={{
              background: "linear-gradient(90deg,#e85a4f 0%,#f97316 50%,#fb923c 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Properties
            </span>
          </h1>

          <p className="mt-4 text-zinc-400 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
            Zero-brokerage rentals extracted from Facebook groups.
            Contact owners directly — no middlemen.
          </p>

          {/* Stat pills */}
          {!loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4, ease: EASE }}
              className="flex flex-wrap items-center justify-center gap-3 mt-6"
            >
              {[
                { icon: "🏠", label: `${allProperties.length} Listings` },
                { icon: "📍", label: `${areas.length} Areas` },
                { icon: "💰", label: "Zero Brokerage" },
                { icon: "⚡", label: "Direct Owner Contact" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-zinc-300"
                >
                  <span>{s.icon}</span>
                  {s.label}
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ── Filter bar (sticky) ──────────────────────────────────────────────── */}
      <div className="sticky top-12 z-30 border-y border-white/[0.07] bg-[#080808]/90 backdrop-blur-2xl">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-2.5">

          {/* Row 1: search + sort */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by area, BHK, keywords…"
                className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500/40 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="shrink-0 bg-white/[0.04] border border-white/[0.09] rounded-xl text-xs font-semibold text-zinc-300 px-3 py-2 focus:outline-none focus:border-orange-500/40 cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Row 2: BHK + Furnishing chips (horizontal scroll) */}
          <div className="overflow-x-auto scrollbar-none -mx-4 px-4">
            <div className="flex gap-1.5 w-max items-center">
              <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest pr-1 shrink-0">BHK</span>
              {BHK_OPTIONS.map((o) => (
                <Chip key={o} active={o === "All" ? !bhkType : bhkType === o}
                  onClick={() => setBhkType(o === "All" ? "" : o)}>
                  {o}
                </Chip>
              ))}
              <div className="w-px h-4 bg-white/[0.1] mx-2 shrink-0" />
              <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest pr-1 shrink-0">Furn.</span>
              {FURNISHING_OPTIONS.map((o) => (
                <Chip key={o} active={o === "All" ? !furnishing : furnishing === o}
                  onClick={() => setFurnishing(o === "All" ? "" : o)}>
                  {o === "Fully Furnished" ? "Full" : o === "Semi Furnished" ? "Semi" : o === "Unfurnished" ? "Bare" : "All"}
                </Chip>
              ))}
            </div>
          </div>

          {/* Row 3: Rent + Area + Reset */}
          <div className="overflow-x-auto scrollbar-none -mx-4 px-4">
            <div className="flex gap-1.5 w-max items-center">
              <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest pr-1 shrink-0">Rent</span>
              {RENT_STEPS.map((s, i) => (
                <Chip key={s.label} active={rentStep === i} onClick={() => setRentStep(i)}>
                  {s.label}
                </Chip>
              ))}

              {areas.length > 0 && (
                <>
                  <div className="w-px h-4 bg-white/[0.1] mx-2 shrink-0" />
                  <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest pr-1 shrink-0">Area</span>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="rounded-full bg-white/[0.04] border border-white/[0.09] text-xs font-bold text-zinc-300 px-3.5 py-1.5 focus:outline-none focus:border-orange-500/40 cursor-pointer"
                  >
                    <option value="">All Areas</option>
                    {areas.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </>
              )}

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="ml-2 shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-orange-400 border border-orange-500/30 hover:bg-orange-500/10 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                  Clear ({activeFilterCount})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">

        {/* Demo banner */}
        {isDemo && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-3.5"
          >
            <span className="text-lg">⚠️</span>
            <div>
              <div className="text-sm font-bold text-amber-300">Demo mode</div>
              <div className="text-xs text-amber-400/80 mt-0.5">
                Firebase is not configured. Showing sample listings. Run{" "}
                <code className="font-mono bg-amber-500/20 px-1 rounded">node scripts/seed-facebook-properties.mjs</code>{" "}
                to populate real data.
              </div>
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3.5">
            <span className="text-lg">❌</span>
            <div>
              <div className="text-sm font-bold text-red-300">Failed to load listings</div>
              <div className="text-xs text-red-400/80 mt-0.5">{error}</div>
            </div>
          </div>
        )}

        {/* Loading: skeleton grid */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Results */}
        {!loading && (
          <>
            {/* Results count + sort summary */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{displayed.length}</span>
                <span className="text-zinc-500 text-sm">
                  {displayed.length === 1 ? "property" : "properties"}
                  {allProperties.length !== displayed.length && (
                    <span className="text-zinc-700"> · {allProperties.length} total</span>
                  )}
                </span>
              </div>
            </div>

            {/* Empty state */}
            {displayed.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-28 text-center"
              >
                <div className="w-20 h-20 rounded-3xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center text-4xl mb-5">
                  🏠
                </div>
                <div className="text-xl font-black text-zinc-200 mb-2">
                  No properties match
                </div>
                <div className="text-zinc-500 text-sm mb-6 max-w-xs">
                  Try clearing some filters or searching for a different area.
                </div>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl px-6 py-2.5 text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#e85a4f,#f97316)" }}
                >
                  Clear all filters
                </button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {displayed.map((p, i) => (
                    <PropertyCard key={p.id} property={p} index={i} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Bottom CTA ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-white/[0.07]">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background: "radial-gradient(ellipse 60% 100% at 50% 100%, rgba(232,90,79,0.12) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="inline-block rounded-2xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-bold text-zinc-400 mb-5">
            🤝 Consultant-assisted search
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight">
            Want us to find the perfect flat for you?
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-7 max-w-md mx-auto">
            MovEAZY consultants shortlist, schedule visits, and negotiate rent on your
            behalf. Flat search guarantee — or your money back.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/checkout?sku=flat-search"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3 text-sm font-bold text-white transition-transform active:scale-95"
              style={{ background: "linear-gradient(135deg,#e85a4f,#f97316)" }}
            >
              Start my flat search →
            </a>
            <a
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3 text-sm font-bold text-zinc-300 border border-white/[0.15] hover:bg-white/[0.06] transition-all"
            >
              Talk to a consultant
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
