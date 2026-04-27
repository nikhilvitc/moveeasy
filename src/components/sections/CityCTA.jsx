// src/components/sections/CityCTA.jsx
// ─────────────────────────────────────────────────────────────────────────────
// "Your New City Doesn't Have to Be Stressful"
//
// Full-width city aerial photograph as background.
// Dark semi-transparent overlay sits on top.
// Rounded corners on the container (matches Figma).
// Centered: large bold white headline, white subtext, red CTA button.
// ─────────────────────────────────────────────────────────────────────────────

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import cityBg from "../../assets/images/city-bg.png";

const EASE = [0.22, 1, 0.36, 1];

export default function CityCTA() {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });
  const navigate = useNavigate();

  return (
    <section className="bg-white py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/*
          Container: rounded corners, overflow-hidden clips the bg image,
          relative so the overlay + content can be absolutely/relatively placed.
        */}
        <div
          ref={ref}
          className="
            relative w-full
            rounded-2xl lg:rounded-3xl
            overflow-hidden
            min-h-[360px] sm:min-h-[420px] lg:min-h-[480px]
            flex items-center justify-center
          "
        >
          {/* Background image */}
          <img
            src={cityBg}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover object-center select-none"
            draggable={false}
          />

          {/* Dark overlay — matches Figma's semi-transparent layer */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(10, 10, 10, 0.48)" }}
            aria-hidden="true"
          />

          {/* Content — sits above overlay via z-10 */}
          <div className="relative z-10 text-center px-6 sm:px-10 py-16 sm:py-20 max-w-3xl mx-auto">

            <motion.h2
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.65, ease: EASE }}
              className="
                text-[30px] sm:text-[42px] lg:text-[52px]
                font-extrabold text-white
                leading-[1.1] tracking-tight
              "
            >
              Your New City Doesn't<br />
              Have to Be Stressful
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.12, ease: EASE }}
              className="
                mt-5
                text-[14.5px] sm:text-[16px]
                text-white/80
                leading-[1.75]
                max-w-xl mx-auto
              "
            >
              Stop wasting time on listings, confusion, and unreliable brokers.
              <br className="hidden sm:block" />
              Moveazy helps you find the right home faster — with complete clarity and protection.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.24, ease: EASE }}
              className="mt-8"
            >
              <button
                onClick={() => navigate('/map')}
                className="
                px-8 sm:px-10 py-[14px] sm:py-[15px]
                text-[14.5px] sm:text-[15px] font-semibold
                text-white bg-[#EF4444] rounded-full
                hover:bg-[#DC2626] active:scale-[0.975]
                transition-all duration-200
                shadow-[0_8px_28px_rgba(239,68,68,0.40)]
              ">
                Start Your Move →
              </button>
            </motion.div>

          </div>
        </div>

      </div>
    </section>
  );
}
