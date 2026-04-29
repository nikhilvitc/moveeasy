// src/components/sections/ServicesTimeline.jsx
import { motion } from "framer-motion";
import timeline1 from "../../assets/images/services/timeline1.png";
import timeline2 from "../../assets/images/services/timeline2.png";
import timeline3 from "../../assets/images/services/timeline3.png";
import timeline4 from "../../assets/images/services/timeline4.png";

const EASE = [0.22, 1, 0.36, 1];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.7, delay, ease: EASE },
});

const ENTRIES = [
  {
    title: "It started with a move to Bangalore",
    body: "Packed bags, fresh offers, and the electric energy of the Garden City. We were ready for the next big chapter.",
    image: timeline1,
    alt: "Moving to Bangalore",
  },
  {
    title: "Then the search began",
    body: "Endless scrolling on portals, juggling with brokers, and visiting 'just-in-case' flats that didn't have windows. The grind was real.",
    image: timeline2,
    alt: "Searching for apartments",
  },
  {
    title: "Nothing matched our needs",
    body: "Overpriced rentals, ghost listings, and 'amenities' that existed only in descriptions. Every call felt like a negotiation we weren't ready to make.",
    image: timeline3,
    alt: "Apartment viewing disappointment",
  },
  {
    title: "Weeks passed, still no home",
    body: "Exhaustion set in. Long list of addresses, in temporary stays, juggling work while chasing leads. We were losing steam.",
    image: timeline4,
    alt: "Exhausted from apartment hunting",
  },
];

function TimelineEntry({ title, body, image, alt, index }) {
  // Odd index (0,2) = text-left / image-right; Even index (1,3) = image-left / text-right
  const textOnLeft = index % 2 === 0;

  const textContent = (
    <motion.div
      {...fadeUp(0.1)}
      className={`flex flex-col justify-center ${textOnLeft ? "lg:items-end lg:text-right" : "lg:items-start lg:text-left"}`}
    >
      <h3 className="text-[22px] sm:text-[26px] lg:text-[30px] font-bold text-[#1E2A3A] leading-[1.2] tracking-tight">
        {title}
      </h3>
      <p className="mt-3 text-[14px] sm:text-[15px] text-gray-500 leading-[1.85] max-w-[380px]">
        {body}
      </p>
    </motion.div>
  );

  const imageContent = (
    <motion.div
      {...fadeUp(0.15)}
      className={`flex ${textOnLeft ? "lg:justify-start" : "lg:justify-end"} justify-center`}
    >
      <div className="w-full max-w-[340px] lg:max-w-[380px] rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
        <img
          src={image}
          alt={alt}
          className="w-full h-auto object-cover"
          draggable={false}
        />
      </div>
    </motion.div>
  );

  return (
    <div className="relative grid lg:grid-cols-[1fr_48px_1fr] gap-6 lg:gap-0 items-center">
      {/* Left column */}
      <div className={`order-2 lg:order-1 ${textOnLeft ? "lg:pr-8" : "lg:pr-8"}`}>
        {textOnLeft ? textContent : imageContent}
      </div>

      {/* Center dot — desktop only */}
      <div className="hidden lg:flex justify-center order-2 relative z-10">
        <div className="w-4 h-4 rounded-full bg-white border-[3px] border-[#EF4444] shadow-sm" />
      </div>

      {/* Right column */}
      <div className={`order-1 lg:order-3 ${textOnLeft ? "lg:pl-8" : "lg:pl-8"}`}>
        {textOnLeft ? imageContent : textContent}
      </div>
    </div>
  );
}

export default function ServicesTimeline() {
  return (
    <section className="relative w-full bg-white py-20 lg:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* Section Header */}
        <div className="text-center mb-16 lg:mb-20">
          <motion.div {...fadeUp(0)}>
            <span className="inline-block rounded-full px-4 py-1.5 bg-[#FDECEA] text-[#EF4444] text-[11px] font-semibold uppercase tracking-[0.12em]">
              Our Journey
            </span>
          </motion.div>

          <motion.h2
            {...fadeUp(0.08)}
            className="mt-5 text-[32px] sm:text-[42px] lg:text-[52px] font-extrabold text-[#1E2A3A] leading-[1.08] tracking-tight"
          >
            Why we started{" "}
            <em className="not-italic text-[#EF4444] italic">this</em>.
          </motion.h2>

          <motion.p
            {...fadeUp(0.16)}
            className="mt-4 text-[15px] sm:text-[16px] text-gray-500 leading-[1.82] max-w-[520px] mx-auto"
          >
            Relocating shouldn't feel like a part-time job. We went through the grind so you didn't have to.
          </motion.p>
        </div>

        {/* Timeline Entries */}
        <div className="relative">

          {/* Vertical connector line — desktop only */}
          <div
            aria-hidden="true"
            className="hidden lg:block absolute left-1/2 top-0 bottom-40 w-px bg-gray-200 -translate-x-1/2"
          />

          <div className="space-y-16 lg:space-y-20">
            {ENTRIES.map((entry, i) => (
              <TimelineEntry key={entry.title} {...entry} index={i} />
            ))}
          </div>

          {/* Red circle connector + conclusion */}
          <motion.div
            {...fadeUp(0.1)}
            className="relative mt-16 lg:mt-20 flex flex-col items-center text-center"
          >
            {/* Red circle */}
            <div className="w-14 h-14 rounded-full bg-[#EF4444] flex items-center justify-center shadow-[0_8px_24px_rgba(239,68,68,0.3)] relative z-10">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M6 10L9 13L14 7"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h3 className="mt-6 text-[24px] sm:text-[28px] font-bold text-[#1E2A3A] leading-[1.2]">
              The process was broken.
            </h3>
            <p className="mt-3 text-[14px] sm:text-[15px] text-gray-500 leading-[1.82] max-w-[480px]">
              It wasn't just a bad search, it was a broken system. Fragmented, opaque,
              and entirely too stressful. Someone had to fix it.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
