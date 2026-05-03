// src/components/sections/SmartMatch.jsx
// Top Matches: six curated Bangalore areas, carousel controls, seed fallback when API rows omit areas.

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import logoSvg from "../../assets/logo/moveasy.svg";
import { getListings } from "../../lib/store";
import { isFirebaseConfigured } from "../../lib/firebase";
import { getListingsData, isListingPubliclyVisible } from "../../lib/firestoreStore";
import PropertyModal from "../PropertyModal";
import Tilt3D from "../ui/Tilt3D";

const EASE = [0.22, 1, 0.36, 1];

const SMART_FEATURES = [
  { emoji: "📍", label: "Best Areas for You" },
  { emoji: "💰", label: "Budget Fit" },
  { emoji: "🏠", label: "Home Matches" },
  { emoji: "⚡", label: "Move Speed" },
];

const BADGE_ROTATION = ["Verified on map", "Sample listing", "Budget-friendly", "Great commute", "Fast availability"];

/** One sample home per area for the default “Top Matches” strip. */
const POPULAR_AREAS_ORDER = ["Whitefield", "HSR Layout", "Koramangala", "Indiranagar", "Bellandur", "Mahadevpura"];

function localityFromListing(listing) {
  return String(listing.address || "").split(",")[0].trim() || "Bengaluru";
}

/** Treat as Bangalore if copy says so, locality matches known areas, or coords sit in the city bbox. */
function isBangaloreListing(listing) {
  const t = `${listing.address || ""} ${listing.location || ""}`.toLowerCase();
  if (t.includes("bangalore") || t.includes("bengaluru")) return true;
  const loc = localityFromListing(listing).toLowerCase();
  if (POPULAR_AREAS_ORDER.some((a) => loc === a.toLowerCase() || loc.includes(a.toLowerCase()))) return true;
  const lat = Number(listing.lat);
  const lng = Number(listing.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= 12.72 && lat <= 13.22 && lng >= 77.38 && lng <= 77.82) return true;
  return false;
}

function normBhk(s) {
  return String(s || "").replace(/\s+/g, "").toLowerCase();
}

function listingMatchesArea(listing, areaFilter) {
  if (areaFilter === "All areas") return true;
  const loc = localityFromListing(listing).toLowerCase();
  const want = areaFilter.toLowerCase().trim();
  if (loc === want) return true;
  if (loc.includes(want) || want.includes(loc)) return true;
  if (want.includes("mahadev") && loc.includes("mahadev")) return true;
  return false;
}

function listingMatchesBhk(listing, bhkFilter) {
  if (bhkFilter === "All BHK") return true;
  return normBhk(listing.bhk) === normBhk(bhkFilter);
}

/** Merge remote + seed so we can always fill six popular areas. */
function buildCuratedPopularSix(rows) {
  const blr = rows.filter(isBangaloreListing);
  const seed = getListings().filter(isListingPubliclyVisible).filter(isBangaloreListing);
  const pool = [...blr];
  for (const s of seed) {
    if (!pool.some((p) => String(p.id) === String(s.id))) pool.push(s);
  }
  const picked = [];
  for (const area of POPULAR_AREAS_ORDER) {
    const found = pool.find((l) => listingMatchesArea(l, area));
    if (found && !picked.some((p) => String(p.id) === String(found.id))) picked.push(found);
  }
  return picked;
}

function PropertyCard({ listing, badge, delay, onClick }) {
  const { ref, inView } = useInView({ threshold: 0.12, triggerOnce: true });
  const loc = localityFromListing(listing);
  const bhkCompact = String(listing.bhk || "").replace(/\s+/g, "");
  const subtitle = String(listing.description || listing.title || "").slice(0, 72).trim();
  const badgeShort = badge.length > 16 ? `${badge.slice(0, 14)}…` : badge;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: EASE }}
      className="snap-start flex-shrink-0 w-[260px] sm:w-[288px]"
    >
      <Tilt3D intensity={5} scale={1.02} className="h-full rounded-2xl">
        <button
          type="button"
          onClick={onClick}
          className="
            w-full text-left rounded-2xl border border-rose-100/80
            bg-gradient-to-b from-white to-rose-50/40 overflow-hidden
            shadow-[0_4px_20px_rgba(15,23,42,0.08)]
            hover:shadow-[0_12px_36px_rgba(185,28,28,0.12)]
            hover:border-rose-200/90
            transition-all duration-300
            focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2
          "
        >
          <div className="relative w-full h-[200px] sm:h-[218px] overflow-hidden">
            <img src={listing.image} alt="" className="w-full h-full object-cover" loading="lazy" />
            <span className="absolute top-3 right-3 max-w-[min(148px,70%)] truncate bg-gradient-to-r from-rose-600 to-red-500 text-white text-[11px] sm:text-[12px] font-bold px-2.5 py-1.5 rounded-full shadow-md">
              {badgeShort}
            </span>
          </div>
          <div className="px-4 py-3.5 bg-white/90 backdrop-blur-sm border-t border-rose-100/60">
            <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-start">
              <MapPin size={14} className="text-rose-600 flex-shrink-0 mt-0.5" fill="#fda4af" aria-hidden />
              <span className="text-[15px] font-extrabold bg-gradient-to-r from-stone-900 via-stone-800 to-rose-950 bg-clip-text text-transparent leading-snug">
                {loc} · {bhkCompact}
              </span>
              <span className="col-start-2 text-[13px] text-slate-600 leading-relaxed line-clamp-2">{subtitle || "Tap for full details"}</span>
            </div>
          </div>
        </button>
      </Tilt3D>
    </motion.div>
  );
}

export default function SmartMatch() {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const { ref: titleRef, inView: titleInView } = useInView({ threshold: 0.2, triggerOnce: true });
  const [listings, setListings] = useState([]);
  const [areaFilter, setAreaFilter] = useState("All areas");
  const [bhkFilter, setBhkFilter] = useState("All BHK");
  const [selectedListing, setSelectedListing] = useState(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const rows = isFirebaseConfigured ? await getListingsData() : getListings();
        if (alive) setListings(rows.filter(isListingPubliclyVisible));
      } catch {
        if (alive) setListings(getListings().filter(isListingPubliclyVisible));
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const areaOptions = ["All areas", ...POPULAR_AREAS_ORDER];
  const bhkOptions = ["All BHK", "1 BHK", "2 BHK", "3 BHK", "3+ BHK"];

  const visibleMatches = useMemo(() => {
    if (areaFilter !== "All areas") {
      const blr = listings.filter(isBangaloreListing);
      return blr
        .filter((l) => listingMatchesArea(l, areaFilter))
        .filter((l) => listingMatchesBhk(l, bhkFilter))
        .slice(0, 24);
    }
    if (bhkFilter === "All BHK") {
      return buildCuratedPopularSix(listings);
    }
    const blr = listings.filter(isBangaloreListing);
    const seed = getListings().filter(isListingPubliclyVisible).filter(isBangaloreListing);
    const pool = [...blr, ...seed.filter((s) => !blr.some((p) => String(p.id) === String(s.id)))];
    const pickedBhk = [];
    for (const area of POPULAR_AREAS_ORDER) {
      const found = pool.find((l) => listingMatchesArea(l, area) && listingMatchesBhk(l, bhkFilter));
      if (found && !pickedBhk.some((p) => String(p.id) === String(found.id))) pickedBhk.push(found);
    }
    return pickedBhk;
  }, [listings, areaFilter, bhkFilter]);

  const scrollBy = useCallback((delta) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
  }, []);

  return (
    <section className="relative overflow-hidden py-20 sm:py-24 lg:py-28">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-rose-100/95 via-orange-50/50 to-sky-100/80"
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-gradient-to-br from-rose-300/70 to-amber-200/30 blur-3xl will-change-transform"
        aria-hidden
        animate={{ x: [0, -20, 12, 0], y: [0, 16, -8, 0], scale: [1, 1.08, 0.97, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-gradient-to-tr from-sky-300/65 to-violet-200/35 blur-3xl will-change-transform"
        aria-hidden
        animate={{ x: [0, 24, -10, 0], y: [0, -18, 10, 0], scale: [1, 1.06, 1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-rose-200/25 via-transparent to-sky-200/25 blur-3xl will-change-transform"
        aria-hidden
        animate={{ opacity: [0.35, 0.65, 0.35], scale: [0.9, 1.05, 0.9] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-[1] max-w-7xl mx-auto px-6 lg:px-10">
        <motion.div
          ref={titleRef}
          initial={{ opacity: 0, y: 24 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-10 sm:mb-12 text-left"
        >
          <h2 className="text-[26px] sm:text-[34px] lg:text-[40px] font-extrabold leading-[1.15] tracking-tight max-w-3xl">
            <span className="text-stone-900">Find the </span>
            <span className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 bg-clip-text text-transparent">Right Home</span>
            <span className="text-stone-900"> — Without the Guesswork</span>
          </h2>
          <p className="mt-3 text-[14.5px] sm:text-[15.5px] text-slate-600 max-w-2xl leading-relaxed">
            Answer a few quick questions and we&apos;ll guide you to the best areas, brokers, and homes based on your needs.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row lg:items-stretch gap-10 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="
              w-full max-w-md mx-auto lg:mx-0 lg:w-[300px] xl:w-[320px] lg:flex-shrink-0
              rounded-2xl border border-rose-100/90
              bg-white/95 backdrop-blur-md p-7
              flex flex-col min-w-0 overflow-hidden
              shadow-[0_8px_32px_rgba(15,23,42,0.08)]
            "
          >
            <div className="mb-7 pb-5 border-b border-rose-100/80 w-full min-w-0">
              <img src={logoSvg} alt="MovEASY" className="h-8 w-auto mb-3.5" />
              <div className="min-w-0">
                <div className="text-[17px] font-extrabold leading-tight text-stone-900">Smart Match</div>
                <p className="text-[12.5px] font-medium text-slate-500 mt-1.5 leading-snug">
                  Your move, simplified
                </p>
              </div>
            </div>

            <ul className="flex flex-col gap-4 flex-1">
              {SMART_FEATURES.map(({ emoji, label }) => (
                <li key={label} className="flex items-center gap-3 text-[15px] text-slate-700">
                  <span className="text-[18px] leading-none">{emoji}</span>
                  <span className="font-medium">{label}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => navigate("/map?openFilters=1")}
              className="
              mt-8 w-full py-[14px]
              text-[14.5px] font-bold text-white
              rounded-xl bg-gradient-to-r from-rose-600 to-red-600
              hover:from-rose-700 hover:to-red-700 active:scale-[0.98]
              transition-all duration-200
              shadow-[0_6px_22px_rgba(225,29,72,0.35)]
            "
            >
              Get Started →
            </button>
          </motion.div>

          <div className="hidden lg:block w-px self-stretch flex-shrink-0 bg-gradient-to-b from-transparent via-rose-200/60 to-transparent" aria-hidden />

          <div className="flex-1 min-w-0 min-h-0 flex flex-col lg:pl-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6 mb-4">
              <div className="min-w-0">
                <h3 className="text-[19px] sm:text-[21px] font-extrabold tracking-tight">
                  <span className="bg-gradient-to-r from-stone-900 to-rose-950 bg-clip-text text-transparent">Top Matches</span>
                </h3>
                <p className="text-[12.5px] sm:text-[13px] text-slate-600 mt-1 font-medium">
                  Six popular areas · swipe or use arrows · tap a card for details
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/map?openFilters=1")}
                className="self-start sm:self-auto shrink-0 text-[14px] font-bold text-rose-600 hover:text-rose-700 transition-colors py-1"
              >
                View all on map →
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="h-9 rounded-lg border border-rose-100 bg-white/90 px-2.5 text-[12px] font-semibold text-slate-700 shadow-sm"
              >
                {areaOptions.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
              <select
                value={bhkFilter}
                onChange={(e) => setBhkFilter(e.target.value)}
                className="h-9 rounded-lg border border-rose-100 bg-white/90 px-2.5 text-[12px] font-semibold text-slate-700 shadow-sm"
              >
                {bhkOptions.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-end gap-2" role="group" aria-label="Scroll top matches">
                <button
                  type="button"
                  aria-label="Scroll top matches left"
                  onClick={() => scrollBy(-300)}
                  className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-rose-100 bg-white/95 text-rose-700 shadow-sm hover:bg-rose-50"
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  aria-label="Scroll top matches right"
                  onClick={() => scrollBy(300)}
                  className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-rose-100 bg-white/95 text-rose-700 shadow-sm hover:bg-rose-50"
                >
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
                </button>
              </div>

              <div
                ref={scrollRef}
                className="
                  flex gap-4 sm:gap-5
                  overflow-x-auto overflow-y-visible py-1
                  pl-0.5 pr-0.5
                  scroll-smooth
                  scrollbar-hide
                  snap-x snap-mandatory
                "
              >
                {visibleMatches.length === 0 && (
                  <p className="text-sm text-slate-500 py-6">
                    No homes for this filter.{" "}
                    <button type="button" className="font-bold text-rose-600" onClick={() => navigate("/map?openFilters=1")}>
                      Open map
                    </button>
                  </p>
                )}
                {visibleMatches.map((listing, i) => (
                  <PropertyCard
                    key={`${listing.id}-${i}`}
                    listing={listing}
                    badge={BADGE_ROTATION[i % BADGE_ROTATION.length]}
                    delay={0.06 + i * 0.06}
                    onClick={() => setSelectedListing(listing)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedListing && (
        <PropertyModal
          property={selectedListing}
          listings={listings}
          onSelectListing={(l) => setSelectedListing(l)}
          onClose={() => setSelectedListing(null)}
        />
      )}
    </section>
  );
}
