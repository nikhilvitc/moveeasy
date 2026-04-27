// src/components/sections/SmartMatch.jsx
// ─────────────────────────────────────────────────────────────────────────────
// "Find the Right Home — Without the Guesswork"
//
// Layout (desktop):
//   Full-width title + subtitle
//   Row below: [SmartMatch card LEFT] | [vertical divider] | [property cards RIGHT]
//
// Property cards are horizontally scrollable on all screen sizes.
// SmartMatch card has: logo + "Smart Match" label, feature list, red CTA.
// Property cards: photo (with red badge chip), location pin + area/BHK, subtitle.
// ─────────────────────────────────────────────────────────────────────────────

import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import logoSvg from "../../assets/logo/moveasy.svg";
import { MapPin } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1];

// ── Smart Match feature list ──────────────────────────────────────────────────
const SMART_FEATURES = [
  { emoji: "📍", label: "Best Areas for You" },
  { emoji: "💰", label: "Budget Fit" },
  { emoji: "🏠", label: "Home Matches" },
  { emoji: "⚡", label: "Move Speed" },
];

// ── Property listings ─────────────────────────────────────────────────────────
// Using Unsplash images. Replace with real images when available.
const PROPERTIES = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&auto=format&fit=crop",
    badge: "Great commute",
    area: "HSR Layout",
    bhk: "2BHK",
    subtitle: "Close to your office",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&auto=format&fit=crop",
    badge: "Fast availability",
    area: "Whitefield",
    bhk: "1BHK",
    subtitle: "Budget-friendly",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&auto=format&fit=crop",
    badge: "Great commute",
    area: "HSR Layout",
    bhk: "2BHK",
    subtitle: "Close to your office",
  },
];

// ── Property Card ─────────────────────────────────────────────────────────────
function PropertyCard({ property, delay }) {
  const { ref, inView } = useInView({ threshold: 0.15, triggerOnce: true });

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
    >
      {/* Image + Badge */}
      <div className="relative w-full h-[200px] sm:h-[220px] overflow-hidden">
        <img
          src={property.image}
          alt={`${property.area} ${property.bhk}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Red badge chip — top right */}
        <span className="
          absolute top-3 right-3
          bg-[#EF4444] text-white
          text-[12px] font-semibold
          px-3 py-1.5 rounded-full
          shadow-[0_2px_12px_rgba(239,68,68,0.4)]
        ">
          {property.badge}
        </span>
      </div>

      {/* Card body */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-1.5">
          <MapPin size={13} className="text-[#EF4444] flex-shrink-0 mt-[1px]" fill="#EF4444" />
          <span className="text-[15px] font-bold text-gray-950">
            {property.area} • {property.bhk}
          </span>
        </div>
        <p className="mt-1 text-[13.5px] text-gray-400 pl-[18px]">
          {property.subtitle}
        </p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function SmartMatch() {
  const navigate = useNavigate();
  const { ref: titleRef, inView: titleInView } = useInView({ threshold: 0.2, triggerOnce: true });

  return (
    <section className="bg-white py-20 sm:py-24 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* ── Title block ───────────────────────────────────────────────── */}
        <motion.div
          ref={titleRef}
          initial={{ opacity: 0, y: 24 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-10 sm:mb-12"
        >
          <h2 className="
            text-[26px] sm:text-[34px] lg:text-[40px]
            font-extrabold text-gray-950 leading-[1.15] tracking-tight
          ">
            Find the Right Home — Without the Guesswork
          </h2>
          <p className="mt-3 text-[14.5px] sm:text-[15.5px] text-gray-500 max-w-2xl leading-relaxed">
            Answer a few quick questions and we'll guide you to the best areas,
            brokers, and homes based on your needs.
          </p>
        </motion.div>

        {/* ── Main row ──────────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-0">

          {/* ── LEFT: Smart Match card ─────────────────────────────────── */}
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
            {/* Card header: logo + Smart Match label */}
            <div className="flex items-center gap-3 mb-7">
              <img
                src={logoSvg}
                alt="MovEASY"
                className="h-7 w-auto"
              />
              <span className="text-[16px] font-bold text-gray-950">Smart Match</span>
            </div>

            {/* Feature list */}
            <ul className="flex flex-col gap-4 flex-1">
              {SMART_FEATURES.map(({ emoji, label }) => (
                <li key={label} className="flex items-center gap-3 text-[15px] text-gray-700">
                  <span className="text-[18px] leading-none">{emoji}</span>
                  {label}
                </li>
              ))}
            </ul>

            {/* CTA button */}
            <button 
              onClick={() => navigate('/map')}
              className="
              mt-8 w-full py-[14px]
              text-[14.5px] font-semibold text-white
              bg-[#EF4444] rounded-xl
              hover:bg-[#DC2626] active:scale-[0.975]
              transition-all duration-200
              shadow-[0_4px_18px_rgba(239,68,68,0.30)]
            ">
              Get Started →
            </button>
          </motion.div>

          {/* ── Vertical divider — desktop only ───────────────────────── */}
          <div
            className="hidden lg:block w-px bg-gray-150 mx-8 xl:mx-10 self-stretch flex-shrink-0"
            style={{ backgroundColor: "#E5E7EB" }}
            aria-hidden="true"
          />

          {/* ── RIGHT: Top Matches + scrollable property cards ────────── */}
          <div className="flex-1 min-w-0">
            {/* Sub-header row */}
            <div className="flex items-center justify-between mb-5">
              <span className="
                text-[15px] sm:text-[16px] font-semibold
                text-[#EF4444]
                underline underline-offset-4 decoration-[#EF4444]
              ">
                Top Matches
              </span>
              <button className="text-[14.5px] font-semibold text-gray-950 hover:text-[#EF4444] transition-colors">
                View All
              </button>
            </div>

            {/* Horizontally scrollable cards */}
            <div className="
              flex gap-4 sm:gap-5
              overflow-x-auto
              pb-4
              -mx-2 px-2
              scrollbar-hide
              snap-x snap-mandatory
            ">
              {PROPERTIES.map((property, i) => (
                <div key={property.id} className="snap-start">
                  <PropertyCard property={property} delay={0.1 + i * 0.1} />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
