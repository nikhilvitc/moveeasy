import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useMemo, useState, useRef } from "react";

/** Premium exterior — Unsplash (license-friendly). */
const HERO_PHOTO =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=88&w=2400";

const EASE = [0.22, 1, 0.36, 1];

const fadeUp = (delay = 0) => ({
  initial: false,
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: EASE },
});

export default function Hero() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const [quickFilters, setQuickFilters] = useState({
    locality: "",
    bhk: "",
    propertyType: "",
    budget: "any",
  });

  /* Parallax on hero background */
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.65]);

  const featuredLocalities = ["Whitefield", "HSR Layout", "Koramangala", "Indiranagar", "Bellandur", "Mahadevpura"];
  const budgetRanges = useMemo(
    () => ({
      any:            { min: 10000,  max: 100000 },
      "15000-35000":  { min: 15000,  max: 35000  },
      "30000-70000":  { min: 30000,  max: 70000  },
      "70000-120000": { min: 70000,  max: 120000 },
    }),
    []
  );

  const goToMap = (overrides = {}, { openFilters = true } = {}) => {
    const q = { ...quickFilters, ...overrides };
    const budget = budgetRanges[q.budget] || budgetRanges.any;
    const params = new URLSearchParams();
    if (q.locality?.trim())      params.set("locality",      q.locality.trim());
    if (q.bhk?.trim())           params.set("bhk",           q.bhk.trim());
    if (q.propertyType?.trim())  params.set("propertyType",  q.propertyType.trim());
    if (q.budget && q.budget !== "any") {
      params.set("minRent", String(budget.min));
      params.set("maxRent", String(budget.max));
    }
    if (openFilters) params.set("openFilters", "1");
    const qs = params.toString();
    navigate(qs ? `/map?${qs}` : "/map");
  };

  const runSearch = () => goToMap({}, { openFilters: true });

  return (
    <section
      ref={heroRef}
      className="relative z-[1] w-full min-h-[min(560px,85vh)] overflow-hidden lg:min-h-[calc(100vh-64px)]"
    >
      {/* ── Parallax background photo ── */}
      <motion.img
        src={HERO_PHOTO}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-[115%] w-full object-cover object-center pointer-events-none select-none"
        style={{ y: imgY }}
        draggable={false}
      />

      {/* ── Floating ambient orbs ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Orb 1 — coral top-left */}
        <motion.div
          className="absolute -top-16 -left-16 w-[340px] h-[340px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(232,90,79,0.35) 0%, transparent 70%)",
            animation: "float-slow 9s ease-in-out infinite",
          }}
        />
        {/* Orb 2 — blue right */}
        <motion.div
          className="absolute top-1/3 -right-20 w-[260px] h-[260px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(14,165,233,0.25) 0%, transparent 70%)",
            animation: "float-slow 11s ease-in-out infinite 2s",
          }}
        />
        {/* Orb 3 — orange bottom-center */}
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full"
          style={{
            background: "radial-gradient(ellipse, rgba(249,115,22,0.18) 0%, transparent 70%)",
            animation: "float-slow 13s ease-in-out infinite 1s",
          }}
        />
      </div>

      {/* ── Layered gradient overlays ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: overlayOpacity }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(76,5,25,0.93) 0%, rgba(185,28,28,0.80) 35%, rgba(15,23,42,0.58) 70%, rgba(12,74,110,0.48) 100%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/55 via-transparent to-stone-900/15" />
      </motion.div>

      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8 sm:pt-10 sm:pb-12 lg:pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-6 lg:gap-10 items-stretch">

          {/* ── LEFT: Main content ── */}
          <motion.div {...fadeUp(0)} className="min-w-0 text-white pt-2 lg:pt-6">
            {/* Badge */}
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, ease: EASE }}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[12px] sm:text-[13px] font-semibold tracking-wide text-[#ffe4e0] backdrop-blur-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary-glow shadow-[0_0_12px_#ff8a7a] animate-pulse" />
              Bengaluru · Verified listings
            </motion.p>

            {/* Headline with gradient text */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.05, ease: EASE }}
              className="mt-4 text-[28px] min-[400px]:text-[32px] sm:text-[48px] lg:text-[62px] font-extrabold leading-[1.08] tracking-tight text-white drop-shadow-sm break-words"
            >
              Find Verified Properties In{" "}
              <span
                style={{
                  background: "linear-gradient(110deg, #fecaca, #ffffff 45%, #bae6fd)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                }}
              >
                Bengaluru
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12, ease: EASE }}
              className="mt-3 max-w-xl text-[14px] sm:text-[17px] font-medium leading-relaxed text-[#fecdd3]"
            >
              5K+ listings refreshed daily · curated for serious renters who want clarity, not chaos.
            </motion.p>

            {/* Search box */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
              className="mt-6 sm:mt-8 rounded-2xl border border-white/20 bg-white/12 p-3.5 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)] backdrop-blur-md"
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.2fr_0.8fr]">
                <input
                  value={quickFilters.locality}
                  onChange={(e) => setQuickFilters((p) => ({ ...p, locality: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
                  placeholder="Search locality or project"
                  className="h-11 rounded-xl border border-white/30 bg-white/95 px-3 text-[14px] text-stone-800 outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-primary/50 transition-shadow"
                />
                <motion.button
                  type="button"
                  onClick={runSearch}
                  className="h-11 rounded-xl bg-primary text-[14px] font-semibold text-white shadow-red btn-glow-pulse"
                  whileHover={{ scale: 1.03, backgroundColor: "#D64A3F" }}
                  whileTap={{ scale: 0.97 }}
                >
                  Search
                </motion.button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  {
                    value: quickFilters.propertyType,
                    onChange: (e) => setQuickFilters((p) => ({ ...p, propertyType: e.target.value })),
                    options: [
                      { value: "",                       label: "Any property type" },
                      { value: "Apartment",              label: "Apartment" },
                      { value: "Independent House/Villa", label: "Independent House/Villa" },
                      { value: "Gated Societies",        label: "Gated Societies" },
                      { value: "Gated Community Villa",  label: "Gated Community Villa" },
                    ],
                  },
                  {
                    value: quickFilters.bhk,
                    onChange: (e) => setQuickFilters((p) => ({ ...p, bhk: e.target.value })),
                    options: [
                      { value: "",       label: "Any BHK" },
                      { value: "1 RK",   label: "1 RK" },
                      { value: "1 BHK",  label: "1 BHK" },
                      { value: "2 BHK",  label: "2 BHK" },
                      { value: "3 BHK",  label: "3 BHK" },
                      { value: "3+ BHK", label: "3+ BHK" },
                    ],
                  },
                  {
                    value: quickFilters.budget,
                    onChange: (e) => setQuickFilters((p) => ({ ...p, budget: e.target.value })),
                    options: [
                      { value: "any",            label: "Any budget (10k – 1L)" },
                      { value: "15000-35000",    label: "Budget 15k – 35k" },
                      { value: "30000-70000",    label: "Budget 30k – 70k" },
                      { value: "70000-120000",   label: "Budget 70k – 1.2L" },
                    ],
                  },
                ].map((sel, idx) => (
                  <select
                    key={idx}
                    value={sel.value}
                    onChange={sel.onChange}
                    className="h-10 rounded-xl border border-white/30 bg-white/95 px-2 text-[12px] font-medium text-stone-700 outline-none"
                  >
                    {sel.options.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ))}
                <motion.button
                  type="button"
                  onClick={() => goToMap({}, { openFilters: true })}
                  className="h-10 rounded-xl border border-white/35 bg-white/15 text-[12px] font-semibold text-white backdrop-blur-sm"
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.28)" }}
                  whileTap={{ scale: 0.97 }}
                >
                  More Filters
                </motion.button>
              </div>

              {/* Popular localities */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="w-full text-[11px] font-semibold uppercase tracking-wider text-[#fecaca]/90 sm:w-auto">
                  Popular
                </span>
                {featuredLocalities.map((loc) => (
                  <motion.button
                    key={loc}
                    type="button"
                    onClick={() => {
                      setQuickFilters((p) => ({ ...p, locality: loc }));
                      goToMap({ locality: loc });
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors ${
                      quickFilters.locality === loc
                        ? "border-white bg-white text-primary-darker"
                        : "border-white/40 text-white"
                    }`}
                    whileHover={{
                      backgroundColor: quickFilters.locality === loc ? "#fff" : "rgba(255,255,255,0.18)",
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {loc}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.3, ease: EASE }}
              className="mt-5 flex w-full flex-col gap-2 min-[400px]:flex-row min-[400px]:flex-wrap min-[400px]:items-center sm:mt-6 sm:gap-3"
            >
              <motion.button
                type="button"
                onClick={runSearch}
                className="inline-flex w-full min-[400px]:w-auto items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-[14px] font-semibold text-white shadow-red-lg btn-glow-pulse"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                View Listings <span aria-hidden>→</span>
              </motion.button>
              <motion.button
                type="button"
                onClick={() => navigate("/guarantee")}
                className="w-full min-[400px]:w-auto rounded-full border-2 border-white/70 bg-white/10 px-6 py-3 text-center text-[14px] font-semibold text-white backdrop-blur-sm"
                whileHover={{ backgroundColor: "rgba(255,255,255,0.22)" }}
                whileTap={{ scale: 0.97 }}
              >
                Deposit Saver
              </motion.button>
            </motion.div>
          </motion.div>

          {/* ── RIGHT: Glass stats panel ── */}
          <motion.div
            initial={{ opacity: 0, x: 30, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.7, delay: 0.14, ease: EASE }}
            className="relative flex min-h-0 w-full flex-col justify-end rounded-2xl border border-white/25 bg-white/10 p-4 shadow-glass backdrop-blur-md sm:rounded-[28px] sm:p-5 lg:ml-auto lg:h-auto lg:min-h-0 lg:max-w-md lg:justify-start lg:self-start xl:max-w-lg"
          >
            {/* Gradient border glow */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-[28px]"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(255,255,255,0.05)",
              }}
              aria-hidden="true"
            />

            <p className="relative z-10 mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-100/90 sm:mb-3 sm:text-right sm:text-[11px] sm:tracking-[0.2em] lg:text-left">
              Trusted moves
            </p>
            <div className="relative z-10 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end sm:gap-3 lg:justify-start">
              {[
                { value: "1K+", label: "People moved happily", color: "text-primary-darker" },
                { value: "56",  label: "Homes closed / month",  color: "text-sky-800" },
              ].map(({ value, label, color }) => (
                <motion.div
                  key={label}
                  className="min-w-0 rounded-xl bg-white/95 px-3 py-2.5 shadow-lg ring-1 ring-stone-200/80 sm:rounded-2xl sm:px-4 sm:py-3"
                  whileHover={{ scale: 1.05, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={`text-[17px] font-extrabold sm:text-[20px] ${color}`}>{value}</div>
                  <div className="text-[10px] font-medium leading-snug text-ink-muted sm:text-[12px]">{label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
