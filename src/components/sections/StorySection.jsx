// src/components/sections/StorySection.jsx
import { motion } from "framer-motion";
import vector20 from "../../assets/images/Vector_20.png";

const EASE = [0.22, 1, 0.36, 1];

// Reusable scroll-triggered fadeUp for this section
const scrollFadeUp = (delay = 0) => ({
  initial:     { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport:    { once: true, margin: "-80px" },
  transition:  { duration: 0.7, delay, ease: EASE },
});

export default function StorySection() {
  return (
    <section className="relative w-full min-h-screen bg-[#F7F7F7] overflow-hidden py-24 lg:py-36">

      {/* ── Decorative pink wave blob — bottom-right corner ─────────── */}
      <motion.img
        src={vector20}
        alt=""
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: EASE }}
        className="
          absolute bottom-0 right-0
          w-[100%]
          pointer-events-none select-none
        "
      />

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="relative max-w-[720px] mx-auto px-6 text-center">

        {/* Title */}
        <motion.h2
          {...scrollFadeUp(0)}
          className="
            text-[32px] sm:text-[40px] lg:text-[50px]
            font-extrabold text-[#1E2A3A]
            leading-[1.1] tracking-tight
          "
        >
          The struggle of starting over.
        </motion.h2>

        {/* Paragraph 1 */}
        <motion.p
          {...scrollFadeUp(0.12)}
          className="mt-10 text-[16px] sm:text-[17px] text-gray-500 leading-[1.88]"
        >
          Moveazy was born in the middle of a chaotic relocation. Our founders
          spent weeks navigating fragmented websites, unreliable brokers, and
          the crushing isolation of a new city where they knew no one.
        </motion.p>

        {/* Paragraph 2 */}
        <motion.p
          {...scrollFadeUp(0.22)}
          className="mt-6 text-[16px] sm:text-[17px] text-gray-500 leading-[1.88]"
        >
          We realized that while logistics were handled by moving trucks, the{" "}
          <strong className="font-semibold text-[#1E2A3A]">
            human element
          </strong>{" "}
          of settling in was completely ignored. We didn't just want a service
          that moved furniture; we wanted a digital concierge that understood
          the anxiety of finding the right neighborhood and the joy of finding
          the right flatmate.
        </motion.p>

        {/* Pull quote */}
        <motion.blockquote
          {...scrollFadeUp(0.34)}
          className="
            mt-10
            text-[16px] sm:text-[17.5px]
            font-semibold italic text-[#EF4444]
            leading-[1.72]
          "
        >
          "We built what we wished we had: a bridge to a better life, not just
          a better apartment."
        </motion.blockquote>

      </div>
    </section>
  );
}
