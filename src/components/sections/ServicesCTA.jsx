// src/components/sections/ServicesCTA.jsx
// Named ServicesCTA to avoid collision with existing CityCTA.jsx
import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

export default function ServicesCTA() {
  return (
    <section className="relative w-full bg-white py-16 lg:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.75, ease: EASE }}
          className="
            relative rounded-[28px] overflow-hidden
            px-8 py-16 sm:px-14 sm:py-20
            text-center
          "
          style={{
            background: "linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)",
          }}
        >
          {/* Decorative blobs */}
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/[0.06] pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-black/[0.07] pointer-events-none"
          />

          <div className="relative z-10 max-w-[700px] mx-auto">

            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, delay: 0.15, ease: EASE }}
              className="
                text-[28px] sm:text-[38px] lg:text-[50px]
                font-extrabold text-white leading-[1.1] tracking-tight
              "
            >
              Join our journey to better living
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.26, ease: EASE }}
              className="mt-5 text-[15.5px] text-white/80 leading-[1.82]"
            >
              Whether you're moving across town or across the globe, or looking
              to help us build the future of relocation, we'd love to have you.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.36, ease: EASE }}
              className="mt-10 flex flex-wrap justify-center gap-4"
            >
              <button className="
                px-8 py-[13px] text-[14.5px] font-semibold
                text-[#EF4444] bg-white rounded-full
                hover:bg-gray-50 active:scale-[0.975]
                transition-all duration-200
              ">
                See Open Positions
              </button>

              <button className="
                px-8 py-[13px] text-[14.5px] font-semibold
                text-white rounded-full border border-white/50
                hover:bg-white/10 active:scale-[0.975]
                transition-all duration-200
              ">
                Get Started
              </button>
            </motion.div>

          </div>
        </motion.div>

      </div>
    </section>
  );
}
