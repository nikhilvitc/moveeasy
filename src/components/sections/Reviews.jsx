import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import ellipseImg from "../../assets/images/ellipse.png";

const EASE = [0.22, 1, 0.36, 1];

const REVIEWS = [
  {
    id: 0,
    name: "Shreya Das",
    rating: 4.8,
    date: "29 Aug, 2018",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    quote: "Found my dream home in 4 days.",
    body: "I moved from Pune to Bangalore with zero contacts. Moveazy matched me with a broker who knew exactly what I needed. Within 4 days I had visited 3 shortlisted flats and signed the one I loved.",
  },
  {
    id: 1,
    name: "Riya Singh",
    rating: 4.3,
    date: "12 Dec, 2021",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg",
    quote: "Saved my deposit completely.",
    body: "I've always lost money during move-out, but this time Moveazy handled everything. Got my full deposit back without stress.",
  },
  {
    id: 2,
    name: "Vivek Roy",
    rating: 4.3,
    date: "12 Dec, 2021",
    avatar: "https://randomuser.me/api/portraits/men/52.jpg",
    quote: "The broker they found was incredible.",
    body: "No commission tricks, no fake listings. The broker understood my budget and got me a deal I couldn't have found on my own. Genuinely stress-free.",
  },
];

function StarRating({ rating }) {
  const full  = Math.floor(rating);
  const frac  = rating - full;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="11" height="11" viewBox="0 0 13 13">
          <defs>
            <linearGradient id={`star-${i}-${rating}`}>
              <stop offset={`${i < full ? 100 : i === full ? Math.round(frac * 100) : 0}%`} stopColor="#F59E0B" />
              <stop offset={`${i < full ? 100 : i === full ? Math.round(frac * 100) : 0}%`} stopColor="#D1D5DB" />
            </linearGradient>
          </defs>
          <path
            d="M6.5 0.5l1.545 3.13 3.455.503-2.5 2.437.59 3.44L6.5 8.385l-3.09 1.625.59-3.44L.5 4.133l3.455-.503L6.5.5z"
            fill={i < full ? "#F59E0B" : "#D1D5DB"}
          />
        </svg>
      ))}
      <span className="ml-1 text-[11px] text-gray-500 font-semibold">{rating}</span>
    </div>
  );
}

function ReviewNode({ reviewer, isActive, onClick, className }) {
  return (
    <div className={`absolute -translate-x-1/2 -translate-y-1/2 ${className}`}>
      <motion.button
        onClick={onClick}
        className="relative flex items-center"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.97 }}
      >
        <motion.div
          className="rounded-full overflow-hidden shrink-0 transition-all duration-300"
          animate={{
            width: isActive ? 56 : 40,
            height: isActive ? 56 : 40,
            opacity: isActive ? 1 : 0.65,
          }}
          style={{
            boxShadow: isActive
              ? "0 0 0 3px #EF4444, 0 0 16px rgba(239,68,68,0.45)"
              : "none",
          }}
        >
          <img src={reviewer.avatar} alt={reviewer.name} className="w-full h-full object-cover" />
        </motion.div>
        <div className="ml-3 whitespace-nowrap text-left">
          <p className={`${isActive ? "text-[14px] font-bold text-gray-900" : "text-[12px] text-gray-500"}`}>
            {reviewer.name}
          </p>
          {isActive && <StarRating rating={reviewer.rating} />}
        </div>
      </motion.button>
    </div>
  );
}

function MobileReviewNode({ reviewer, isActive, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      className="transition-all duration-300"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
    >
      <div className="flex flex-col items-center text-center">
        <motion.div
          className="rounded-full overflow-hidden transition-all duration-300"
          animate={{ width: isActive ? 64 : 56, height: isActive ? 64 : 56 }}
          style={{
            boxShadow: isActive
              ? "0 0 0 3px #EF4444, 0 0 16px rgba(239,68,68,0.40)"
              : "0 2px 8px rgba(0,0,0,0.10)",
            opacity: isActive ? 1 : 0.7,
          }}
        >
          <img src={reviewer.avatar} alt={reviewer.name} className="w-full h-full object-cover" />
        </motion.div>
        <p className="mt-2 text-[13px] font-semibold text-gray-800">{reviewer.name}</p>
        {isActive && <StarRating rating={reviewer.rating} />}
      </div>
    </motion.button>
  );
}

export default function Reviews() {
  const [activeIndex, setActiveIndex] = useState(1);
  const activeReview = REVIEWS[activeIndex];

  const { ref, inView } = useInView({ threshold: 0.15, triggerOnce: true });

  return (
    <section
      className="relative py-12 sm:py-16 overflow-hidden min-h-screen flex items-center"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 0% 50%, rgba(232,90,79,0.06) 0%, transparent 55%), #ffffff",
      }}
    >
      {/* Background ellipse image */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[220px] sm:w-[320px] z-0 opacity-60">
        <img src={ellipseImg} alt="" className="w-full" draggable={false} />
      </div>

      {/* Ambient glow */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(14,165,233,0.06) 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="w-[90%] max-w-7xl mx-auto relative z-10">
        <div
          ref={ref}
          className="px-6 rounded-2xl sm:px-10 py-8 sm:py-12"
          style={{
            background: "rgba(255,255,255,0.80)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(232,90,79,0.12)",
            boxShadow:
              "0 8px 40px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)",
          }}
        >
          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, ease: EASE }}
            className="mb-8"
          >
            {/* Gradient accent bar */}
            <div
              className="w-10 h-[3px] rounded-full mb-3"
              style={{ background: "linear-gradient(90deg, #e85a4f, #f97316)" }}
            />
            <h2 className="text-[26px] sm:text-[44px] font-extrabold text-gray-900">
              Customer{" "}
              <span className="gradient-text">Reviews</span>
            </h2>
          </motion.div>

          {/* Main Layout */}
          <div className="grid md:grid-cols-2 gap-10 items-center">
            {/* ─ DESKTOP LEFT ─ */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.45 }}
              className="relative h-[260px] hidden md:block"
            >
              {/* Gradient curve */}
              <svg
                className="absolute left-[75px] top-[15px]"
                width="130"
                height="230"
                viewBox="0 0 130 230"
                fill="none"
              >
                <defs>
                  <linearGradient id="curve-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%"   stopColor="#e85a4f" stopOpacity="0.6" />
                    <stop offset="50%"  stopColor="#f97316" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                <path
                  d="M20 0 C120 45,120 185,20 230"
                  stroke="url(#curve-grad)"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>

              {REVIEWS.map((reviewer, i) => {
                const positions = [
                  "top-[16px] left-[140px]",
                  "top-[120px] left-[200px]",
                  "top-[240px] left-[140px]",
                ];
                return (
                  <ReviewNode
                    key={reviewer.id}
                    reviewer={reviewer}
                    isActive={activeIndex === i}
                    onClick={() => setActiveIndex(i)}
                    className={positions[i]}
                  />
                );
              })}
            </motion.div>

            {/* ─ MOBILE ─ */}
            <div className="md:hidden flex flex-col items-center">
              <div className="flex justify-center gap-6 mb-8 flex-wrap">
                {REVIEWS.map((reviewer, i) => (
                  <MobileReviewNode
                    key={reviewer.id}
                    reviewer={reviewer}
                    isActive={activeIndex === i}
                    onClick={() => setActiveIndex(i)}
                  />
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-2xl px-5 py-6 text-center"
                  style={{
                    background: "rgba(255,244,242,0.7)",
                    border: "1px solid rgba(232,90,79,0.12)",
                  }}
                >
                  <h3 className="text-[20px] font-bold italic text-gray-900 leading-snug">
                    "{activeReview.quote}"
                  </h3>
                  <p className="mt-3 text-[13px] text-gray-500 leading-[1.8]">
                    {activeReview.body}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ─ DESKTOP RIGHT ─ */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="hidden md:flex items-center justify-center"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-[430px]"
                >
                  <h3
                    className="text-[38px] font-bold italic text-gray-900 leading-tight"
                    style={{ textShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                  >
                    "{activeReview.quote}"
                  </h3>
                  <p className="mt-5 text-[16px] text-gray-500 italic leading-[1.9]">
                    {activeReview.body}
                  </p>
                  <div className="mt-4">
                    <StarRating rating={activeReview.rating} />
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
