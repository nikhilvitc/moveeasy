// src/components/sections/BuiltMoveazy.jsx
import { motion } from "framer-motion";
import { Search, Headphones, ArrowRightLeft } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.7, delay, ease: EASE },
});

const FEATURES = [
  {
    Icon: Search,
    title: "Verified Listings",
    desc: "Browse real, verified listings — not expired posts.",
    delay: 0,
  },
  {
    Icon: Headphones,
    title: "Concierge Support",
    desc: "Dedicated real estate concierge for your preferences.",
    delay: 0.08,
  },
  {
    Icon: ArrowRightLeft,
    title: "End to End",
    desc: "From listing to lease to move-in support.",
    delay: 0.16,
  },
];

export default function BuiltMoveazy() {
  return (
    <section className="relative w-full bg-white py-20 lg:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* Heading */}
        <div className="text-center mb-14">
          <motion.h2
            {...fadeUp(0)}
            className="text-[32px] sm:text-[42px] lg:text-[52px] font-extrabold text-[#1E2A3A] leading-[1.08] tracking-tight"
          >
            So we built <strong className="text-[#1E2A3A]">Moveazy</strong>.
          </motion.h2>

          <motion.p
            {...fadeUp(0.08)}
            className="mt-4 text-[15px] sm:text-[16px] text-gray-500 leading-[1.82] max-w-[540px] mx-auto"
          >
            A curated relocation experience designed to put your peace of mind first. Honest
            listings, seamless logistics, and a team you'll actually love.
          </motion.p>
        </div>

        {/* Feature Cards */}
        <div className="grid sm:grid-cols-3 gap-6 lg:gap-8 max-w-3xl mx-auto">
          {FEATURES.map(({ Icon, title, desc, delay }) => (
            <motion.div
              key={title}
              {...fadeUp(delay)}
              className="text-center"
            >
              <div className="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
                <Icon size={20} className="text-[#1E2A3A]" />
              </div>
              <h3 className="text-[15px] font-bold text-[#1E2A3A] mb-1.5">
                {title}
              </h3>
              <p className="text-[13px] text-gray-500 leading-[1.72]">
                {desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          {...fadeUp(0.24)}
          className="mt-12 text-center"
        >
          <button className="rounded-full px-8 py-3.5 text-[14px] font-semibold text-white bg-[#EF4444] hover:bg-[#DC2626] transition-all duration-200 shadow-[0_10px_28px_rgba(239,68,68,0.25)]">
            Start Your Stress-Free Move
          </button>
        </motion.div>

      </div>
    </section>
  );
}
