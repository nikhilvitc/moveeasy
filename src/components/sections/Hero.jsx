import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { pickFirstListingForHeroSearch } from "../../lib/searchResolve";

/** Premium exterior — Unsplash (license-friendly). */
const HERO_PHOTO =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=88&w=2400";

const EASE = [0.22, 1, 0.36, 1];

/* initial: false avoids a stuck opacity:0 first paint if motion fails on some mobile browsers */
const fadeUp = (delay = 0) => ({
  initial: false,
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: EASE },
});

export default function Hero() {
  const navigate = useNavigate();
  /** Permissive defaults so first-time visitors see homes on the map, not an empty filter. */
  const [quickFilters, setQuickFilters] = useState({
    locality: "",
    bhk: "",
    propertyType: "",
    budget: "any",
  });
  const featuredLocalities = ["Whitefield", "HSR Layout", "Koramangala", "Indiranagar", "Bellandur", "Mahadevpura"];
  const budgetRanges = useMemo(
    () => ({
      any: { min: 10000, max: 100000 },
      "15000-35000": { min: 15000, max: 35000 },
      "30000-70000": { min: 30000, max: 70000 },
      "70000-120000": { min: 70000, max: 120000 },
    }),
    []
  );

  const goToMap = (overrides = {}, { openFilters = false } = {}) => {
    const q = { ...quickFilters, ...overrides };
    const budget = budgetRanges[q.budget] || budgetRanges.any;
    const match = pickFirstListingForHeroSearch({
      locality: q.locality,
      bhk: q.bhk || undefined,
      propertyType: q.propertyType || undefined,
      minRent: budget.min,
      maxRent: budget.max,
    });
    const params = new URLSearchParams();
    if (q.locality?.trim()) params.set("locality", q.locality.trim());
    if (q.bhk?.trim()) params.set("bhk", q.bhk.trim());
    if (q.propertyType?.trim()) params.set("propertyType", q.propertyType.trim());
    if (q.budget && q.budget !== "any") {
      params.set("minRent", String(budget.min));
      params.set("maxRent", String(budget.max));
    }
    if (match?.id != null) params.set("listingId", String(match.id));
    if (openFilters) params.set("openFilters", "1");
    const qs = params.toString();
    navigate(qs ? `/map?${qs}` : "/map");
  };

  const runSearch = () => goToMap();

  return (
    <section className="relative z-[1] w-full min-h-[min(560px,85vh)] overflow-hidden lg:min-h-[calc(100vh-64px)]">
      {/* Full-bleed photography */}
      <img
        src={HERO_PHOTO}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center scale-105 pointer-events-none select-none"
        draggable={false}
      />
      {/* Themed overlays: warm coral left → cool depth right (matches Figma split feel) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(105deg, rgba(76, 5, 25, 0.92) 0%, rgba(185, 28, 28, 0.78) 38%, rgba(15, 23, 42, 0.55) 72%, rgba(12, 74, 110, 0.45) 100%)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/50 via-transparent to-stone-900/20 pointer-events-none" />

      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8 sm:pt-10 sm:pb-12 lg:pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-6 lg:gap-10 items-stretch">
          <motion.div {...fadeUp(0)} className="min-w-0 text-white pt-2 lg:pt-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[12px] sm:text-[13px] font-semibold tracking-wide text-[#ffe4e0] backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-glow shadow-[0_0_12px_#ff8a7a]" />
              Bengaluru · Verified listings
            </p>

            <h1 className="mt-4 text-[28px] min-[400px]:text-[32px] sm:text-[48px] lg:text-[62px] font-extrabold leading-[1.08] tracking-tight text-white drop-shadow-sm break-words">
              Find Verified Properties In{" "}
              <span className="bg-gradient-to-r from-[#fecaca] via-white to-[#bae6fd] bg-clip-text text-transparent">
                Bengaluru
              </span>
            </h1>
            <p className="mt-3 max-w-xl text-[14px] sm:text-[17px] font-medium leading-relaxed text-[#fecdd3]">
              5K+ listings refreshed daily · curated for serious renters who want clarity, not chaos.
            </p>

            <div className="mt-6 sm:mt-8 rounded-2xl border border-white/20 bg-white/12 p-3.5 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.25)] backdrop-blur-md">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.2fr_0.8fr]">
                <input
                  value={quickFilters.locality}
                  onChange={(e) => setQuickFilters((p) => ({ ...p, locality: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runSearch();
                  }}
                  placeholder="Search locality or project"
                  className="h-11 rounded-xl border border-white/30 bg-white/95 px-3 text-[14px] text-stone-800 outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={runSearch}
                  className="h-11 rounded-xl bg-primary text-[14px] font-semibold text-white shadow-red transition-colors hover:bg-primary-dark"
                >
                  Search
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <select
                  value={quickFilters.propertyType}
                  onChange={(e) => setQuickFilters((p) => ({ ...p, propertyType: e.target.value }))}
                  className="h-10 rounded-xl border border-white/30 bg-white/95 px-2 text-[12px] font-medium text-stone-700 outline-none"
                >
                  <option value="">Any property type</option>
                  <option>Apartment</option>
                  <option>Independent House/Villa</option>
                  <option>Gated Societies</option>
                  <option>Gated Community Villa</option>
                </select>
                <select
                  value={quickFilters.bhk}
                  onChange={(e) => setQuickFilters((p) => ({ ...p, bhk: e.target.value }))}
                  className="h-10 rounded-xl border border-white/30 bg-white/95 px-2 text-[12px] font-medium text-stone-700 outline-none"
                >
                  <option value="">Any BHK</option>
                  <option>1 RK</option>
                  <option>1 BHK</option>
                  <option>2 BHK</option>
                  <option>3 BHK</option>
                  <option>3+ BHK</option>
                </select>
                <select
                  value={quickFilters.budget}
                  onChange={(e) => setQuickFilters((p) => ({ ...p, budget: e.target.value }))}
                  className="h-10 rounded-xl border border-white/30 bg-white/95 px-2 text-[12px] font-medium text-stone-700 outline-none"
                >
                  <option value="any">Any budget (10k – 1L)</option>
                  <option value="15000-35000">Budget 15k – 35k</option>
                  <option value="30000-70000">Budget 30k – 70k</option>
                  <option value="70000-120000">Budget 70k – 1.2L</option>
                </select>
                <button
                  type="button"
                  onClick={() => goToMap({}, { openFilters: true })}
                  className="h-10 rounded-xl border border-white/35 bg-white/15 text-[12px] font-semibold text-white backdrop-blur-sm hover:bg-white/25"
                >
                  More Filters
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="w-full text-[11px] font-semibold uppercase tracking-wider text-[#fecaca]/90 sm:w-auto">Popular</span>
                {featuredLocalities.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => {
                      setQuickFilters((p) => ({ ...p, locality: loc }));
                      goToMap({ locality: loc });
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors ${
                      quickFilters.locality === loc
                        ? "border-white bg-white text-primary-darker"
                        : "border-white/40 text-white hover:bg-white/15"
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex w-full flex-col gap-2 min-[400px]:flex-row min-[400px]:flex-wrap min-[400px]:items-center sm:mt-6 sm:gap-3">
              <button
                type="button"
                onClick={runSearch}
                className="inline-flex w-full min-[400px]:w-auto items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-[14px] font-semibold text-white shadow-red-lg transition hover:bg-primary-dark sm:px-7"
              >
                View Listings
                <span aria-hidden>→</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/guarantee")}
                className="w-full min-[400px]:w-auto rounded-full border-2 border-white/70 bg-white/10 px-6 py-3 text-center text-[14px] font-semibold text-white backdrop-blur-sm hover:bg-white/20 sm:px-7"
              >
                Deposit Saver
              </button>
            </div>
          </motion.div>

          {/* Desktop / large-tablet: glass stats panel. Mobile: compact row so it does not fight Stats below */}
          <motion.div
            {...fadeUp(0.14)}
            className="relative flex min-h-0 w-full flex-col justify-end rounded-2xl border border-white/25 bg-white/10 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.28)] backdrop-blur-md sm:rounded-[28px] sm:p-5 lg:ml-auto lg:h-auto lg:min-h-0 lg:max-w-md lg:justify-start lg:self-start xl:max-w-lg"
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 sm:rounded-[28px]" />
            <p className="relative z-10 mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-100/90 sm:mb-3 sm:text-right sm:text-[11px] sm:tracking-[0.2em] lg:text-left">
              Trusted moves
            </p>
            <div className="relative z-10 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end sm:gap-3 lg:justify-start">
              <div className="min-w-0 rounded-xl bg-white/95 px-3 py-2.5 shadow-lg ring-1 ring-stone-200/80 sm:rounded-2xl sm:px-4 sm:py-3">
                <div className="text-[17px] font-extrabold text-primary-darker sm:text-[20px]">1K+</div>
                <div className="text-[10px] font-medium leading-snug text-ink-muted sm:text-[12px]">People moved happily</div>
              </div>
              <div className="min-w-0 rounded-xl bg-white/95 px-3 py-2.5 shadow-lg ring-1 ring-stone-200/80 sm:rounded-2xl sm:px-4 sm:py-3">
                <div className="text-[17px] font-extrabold text-sky-800 sm:text-[20px]">56</div>
                <div className="text-[10px] font-medium leading-snug text-ink-muted sm:text-[12px]">Homes closed / month</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
