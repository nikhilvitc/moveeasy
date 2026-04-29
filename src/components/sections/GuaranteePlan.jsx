// src/components/sections/GuaranteePlan.jsx
// ─────────────────────────────────────────────────────────────────────────────
// "THE GUARANTEE PLAN"
//
// Full-width section using the wavy red gradient image as background.
// Content is centered: shield icon → uppercase heading → body → ghost button.
// The button in Figma is a semi-transparent/ghost style on the red background.
// ─────────────────────────────────────────────────────────────────────────────

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import guaranteeBg from "../../assets/images/guarantee-bg.png";

const EASE = [0.22, 1, 0.36, 1];

export default function GuaranteePlan() {
  const navigate = useNavigate();
  const { ref, inView } = useInView({ threshold: 0.15, triggerOnce: true });

  return (
    <section>
      <div className="max-w-full">

        {/*
          Container with wavy red gradient bg image.
          Rounded corners, overflow-hidden to clip the bg.
        */}
        <div
          ref={ref}
          className="
            relative w-full
            overflow-hidden
            min-h-[360px] sm:min-h-[400px]
            flex items-center justify-center
          "
        >
          {/* Wavy red gradient background image */}
          <img
            src={guaranteeBg}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover object-center select-none"
            draggable={false}
          />

          {/* Content */}
          <div className="relative z-10 text-center px-6 sm:px-10 py-16 sm:py-20 max-w-2xl mx-auto">

            {/* Shield icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, ease: EASE }}
              className="flex justify-center mb-6"
            >
              {/* SVG shield with checkmark — matches Figma icon */}
              <svg
                width="44"
                height="44"
                viewBox="0 0 44 44"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M22 3L6 10v10c0 9.5 6.8 18.4 16 20.5C31.2 38.4 38 29.5 38 20V10L22 3z"
                  stroke="white"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                  fill="none"
                />
                <path
                  d="M14.5 22l5 5 10-10"
                  stroke="white"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>

            {/* Heading */}
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
              className="
                text-[28px] sm:text-[40px] lg:text-[50px]
                font-extrabold text-white
                uppercase leading-[1.1] tracking-wide
              "
            >
              The Guarantee Plan
            </motion.h2>

            {/* Body */}
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.58, delay: 0.18, ease: EASE }}
              className="
                mt-5
                text-[14.5px] sm:text-[15.5px]
                text-white/85
                leading-[1.8]
                max-w-lg mx-auto
              "
            >
              Total peace of mind for just ₹1999. Our legal protocol covers your entire transaction,
              providing binding contract verification and an escrow-style deposit security layer.
              If the deal falls through due to broker negligence, we cover the costs.
            </motion.p>

            {/* Ghost CTA button */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.52, delay: 0.28, ease: EASE }}
              className="mt-9"
            >
              <button 
                onClick={() => navigate('/guarantee')}
                className="
                px-10 py-[14px]
                text-[13.5px] font-semibold tracking-widest uppercase
                text-white
                border-[1.5px] border-white/40
                bg-white/10
                rounded-xl
                hover:bg-white/20
                active:scale-[0.975]
                backdrop-blur-sm
                transition-all duration-200
              ">
                View Plan
              </button>
            </motion.div>

          </div>
        </div>

      </div>
    </section>
  );
}
