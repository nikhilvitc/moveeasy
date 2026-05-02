// src/components/sections/SmartMatch.jsx
// Top Matches uses seeded / Firestore listings so every card opens a real PropertyModal.

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useInView } from "react-intersection-observer";
import logoSvg from "../../assets/logo/moveasy.svg";
import { MapPin } from "lucide-react";
import { getListings } from "../../lib/store";
import { isFirebaseConfigured } from "../../lib/firebase";
import { getListingsData } from "../../lib/firestoreStore";
import { pickFirstListingForHeroSearch } from "../../lib/searchResolve";
import PropertyModal from "../PropertyModal";

const EASE = [0.22, 1, 0.36, 1];

const SMART_FEATURES = [
  { emoji: "📍", label: "Best Areas for You" },
  { emoji: "💰", label: "Budget Fit" },
  { emoji: "🏠", label: "Home Matches" },
  { emoji: "⚡", label: "Move Speed" },
];

const BADGE_ROTATION = ["Verified on map", "Sample listing", "Budget-friendly", "Great commute", "Fast availability"];

function isBangaloreListing(listing) {
  const t = `${listing.address || ""} ${listing.location || ""}`.toLowerCase();
  return t.includes("bangalore") || t.includes("bengaluru");
}

function localityFromListing(listing) {
  return String(listing.address || "").split(",")[0].trim() || "Bengaluru";
}

function normBhk(s) {
  return String(s || "").replace(/\s+/g, "").toLowerCase();
}

function listingMatchesArea(listing, areaFilter) {
  if (areaFilter === "All areas") return true;
  const loc = localityFromListing(listing).toLowerCase();
  const want = areaFilter.toLowerCase().trim();
  return loc === want || loc.includes(want) || want.includes(loc);
}

function listingMatchesBhk(listing, bhkFilter) {
  if (bhkFilter === "All BHK") return true;
  return normBhk(listing.bhk) === normBhk(bhkFilter);
}

function PropertyCard({ listing, badge, delay, onClick }) {
  const { ref, inView } = useInView({ threshold: 0.15, triggerOnce: true });
  const loc = localityFromListing(listing);
  const bhkCompact = String(listing.bhk || "").replace(/\s+/g, "");
  const subtitle = String(listing.description || listing.title || "").slice(0, 72).trim();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: EASE }}
      className="
        flex-shrink-0
        w-[260px] sm:w-[290px]
        rounded-2xl border border-gray-100
        bg-white overflow-hidden
        shadow-[0_2px_16px_rgba(0,0,0,0.07)]
        hover:shadow-[0_6px_28px_rgba(0,0,0,0.12)]
        hover:-translate-y-1
        transition-all duration-300
        cursor-pointer
      "
      onClick={onClick}
    >
      <div className="relative w-full h-[200px] sm:h-[220px] overflow-hidden">
        <img
          src={listing.image}
          alt={`${loc} ${listing.bhk}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <span
          className="
          absolute top-3 right-3
          bg-[#EF4444] text-white
          text-[12px] font-semibold
          px-3 py-1.5 rounded-full
          shadow-[0_2px_12px_rgba(239,68,68,0.4)]
        "
        >
          {badge}
        </span>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-center gap-1.5">
          <MapPin size={13} className="text-[#EF4444] flex-shrink-0 mt-[1px]" fill="#EF4444" />
          <span className="text-[15px] font-bold text-gray-950">
            {loc} • {bhkCompact}
          </span>
        </div>
        <p className="mt-1 text-[13.5px] text-gray-400 pl-[18px]">{subtitle || "Tap for full details"}</p>
      </div>
    </motion.div>
  );
}

export default function SmartMatch() {
  const navigate = useNavigate();
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
        if (alive) setListings(rows);
      } catch {
        if (alive) setListings(getListings());
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const areaOptions = ["All areas", "Whitefield", "HSR Layout", "Koramangala", "Indiranagar", "Bellandur", "Mahadevpura"];
  const bhkOptions = ["All BHK", "1 BHK", "2 BHK", "3 BHK", "3+ BHK"];

  const visibleMatches = useMemo(() => {
    const blr = listings.filter(isBangaloreListing);
    return blr
      .filter((l) => listingMatchesArea(l, areaFilter))
      .filter((l) => listingMatchesBhk(l, bhkFilter))
      .slice(0, 24);
  }, [listings, areaFilter, bhkFilter]);

  return (
    <section className="bg-white py-20 sm:py-24 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <motion.div
          ref={titleRef}
          initial={{ opacity: 0, y: 24 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-10 sm:mb-12"
        >
          <h2
            className="
            text-[26px] sm:text-[34px] lg:text-[40px]
            font-extrabold text-gray-950 leading-[1.15] tracking-tight
          "
          >
            Find the Right Home — Without the Guesswork
          </h2>
          <p className="mt-3 text-[14.5px] sm:text-[15.5px] text-gray-500 max-w-2xl leading-relaxed">
            Answer a few quick questions and we'll guide you to the best areas, brokers, and homes based on your needs.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-0">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="
              w-full lg:w-[300px] xl:w-[320px]
              flex-shrink-0
              rounded-2xl border border-gray-200
              bg-white p-7
              flex flex-col
              shadow-[0_2px_16px_rgba(0,0,0,0.06)]
            "
          >
            <div className="flex items-center gap-3 mb-7">
              <img src={logoSvg} alt="MovEASY" className="h-7 w-auto" />
              <span className="text-[16px] font-bold text-gray-950">Smart Match</span>
            </div>

            <ul className="flex flex-col gap-4 flex-1">
              {SMART_FEATURES.map(({ emoji, label }) => (
                <li key={label} className="flex items-center gap-3 text-[15px] text-gray-700">
                  <span className="text-[18px] leading-none">{emoji}</span>
                  {label}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => {
                const m = pickFirstListingForHeroSearch({
                  locality: "",
                  bhk: "",
                  propertyType: "",
                  minRent: 10000,
                  maxRent: 100000,
                });
                if (m) navigate(`/map?listingId=${encodeURIComponent(m.id)}`);
                else navigate("/map");
              }}
              className="
              mt-8 w-full py-[14px]
              text-[14.5px] font-semibold text-white
              bg-[#EF4444] rounded-xl
              hover:bg-[#DC2626] active:scale-[0.975]
              transition-all duration-200
              shadow-[0_4px_18px_rgba(239,68,68,0.30)]
            "
            >
              Get Started →
            </button>
          </motion.div>

          <div
            className="hidden lg:block w-px bg-gray-150 mx-8 xl:mx-10 self-stretch flex-shrink-0"
            style={{ backgroundColor: "#E5E7EB" }}
            aria-hidden="true"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <span
                className="
                text-[15px] sm:text-[16px] font-semibold
                text-[#EF4444]
                underline underline-offset-4 decoration-[#EF4444]
              "
              >
                Top Matches
              </span>
              <button
                type="button"
                onClick={() => navigate("/listings")}
                className="text-[14.5px] font-semibold text-gray-950 hover:text-[#EF4444] transition-colors"
              >
                View All
              </button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="h-9 rounded-lg border border-gray-200 px-2.5 text-[12px] font-semibold text-gray-700 bg-white"
              >
                {areaOptions.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
              <select
                value={bhkFilter}
                onChange={(e) => setBhkFilter(e.target.value)}
                className="h-9 rounded-lg border border-gray-200 px-2.5 text-[12px] font-semibold text-gray-700 bg-white"
              >
                {bhkOptions.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div
              className="
              flex gap-4 sm:gap-5
              overflow-x-auto
              pb-4
              -mx-2 px-2
              scrollbar-hide
              snap-x snap-mandatory
            "
            >
              {visibleMatches.length === 0 && (
                <p className="text-sm text-gray-500 py-6">
                  No sample homes for this filter.{" "}
                  <button type="button" className="font-semibold text-[#EF4444]" onClick={() => navigate("/map")}>
                    Open map
                  </button>
                </p>
              )}
              {visibleMatches.map((listing, i) => (
                <div key={listing.id} className="snap-start">
                  <PropertyCard
                    listing={listing}
                    badge={BADGE_ROTATION[i % BADGE_ROTATION.length]}
                    delay={0.1 + i * 0.08}
                    onClick={() => setSelectedListing(listing)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedListing && (
        <PropertyModal
          property={selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}
    </section>
  );
}
