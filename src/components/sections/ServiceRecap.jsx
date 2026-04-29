// src/components/sections/ServiceRecap.jsx
import { motion } from "framer-motion";
import iconConsultation from "../../assets/images/Icon__3_.png"; // chat icon
import iconBroker       from "../../assets/images/Icon__2_.png"; // handshake/heart
import iconMap          from "../../assets/images/Icon__1_.png"; // map
import iconFlatmate     from "../../assets/images/Icon.png";     // people

const EASE = [0.22, 1, 0.36, 1];

const SERVICES = [
  {
    icon:  iconConsultation,
    title: "Personalized Consultation",
    desc:  "Expert guidance from those who've walked the path before.",
    bg:    "bg-white",
    delay: 0,
  },
  {
    icon:  iconBroker,
    title: "Broker Connections",
    desc:  "Access to vetted, trustworthy local real estate partners.",
    bg:    "bg-[#FFF0EE]",
    delay: 0.08,
  },
  {
    icon:  iconMap,
    title: "Intelligent Map Search",
    desc:  "Neighborhood data that matters: commute, vibe, and safety.",
    bg:    "bg-[#FFF0EE]",
    delay: 0.16,
  },
  {
    icon:  iconFlatmate,
    title: "Flatmate Matching",
    desc:  "Find the people you'll actually enjoy sharing breakfast with.",
    bg:    "bg-white",
    delay: 0.24,
  },
];

const CHECKPOINTS = [
  "Seamless tech-driven logistics combined with high-touch human support.",
  "Real-time neighborhood analysis to match your lifestyle, not just your budget.",
];

// ── Single service card ───────────────────────────────────────────────────────
function ServiceCard({ icon, title, desc, bg, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className={`
        ${bg} rounded-2xl p-5 sm:p-6
        border border-white/70
        shadow-[0_2px_18px_rgba(0,0,0,0.06)]
      `}
    >
      <img
        src={icon}
        alt=""
        aria-hidden="true"
        className="w-7 h-7 object-contain mb-4"
      />
      <h3 className="text-[15px] font-bold text-[#1E2A3A] leading-snug mb-2">
        {title}
      </h3>
      <p className="text-[13px] text-gray-500 leading-[1.78]">{desc}</p>
    </motion.div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
export default function ServiceRecap() {
  return (
    <section className="relative w-full bg-[#FEF2F0] py-24 lg:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 items-center gap-12 lg:gap-20">

          {/* ── Left: 2×2 Service Cards ───────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            {SERVICES.map((s) => (
              <ServiceCard key={s.title} {...s} />
            ))}
          </div>

          {/* ── Right: Narrative ──────────────────────────────────────── */}
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
              className="
                text-[30px] sm:text-[36px] lg:text-[44px]
                font-extrabold text-[#1E2A3A]
                leading-[1.14] tracking-tight
              "
            >
              Integrated support<br />for every step.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.65, delay: 0.2, ease: EASE }}
              className="mt-5 text-[15.5px] text-gray-500 leading-[1.85]"
            >
              We don't provide a list of features; we provide a curated
              journey. From the moment you think about moving to the night you
              host your first housewarming, Moveazy is there.
            </motion.p>

            {/* Checkpoints */}
            <ul className="mt-8 space-y-4">
              {CHECKPOINTS.map((point, i) => (
                <motion.li
                  key={point}
                  initial={{ opacity: 0, x: -22 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.55, delay: 0.3 + i * 0.1, ease: EASE }}
                  className="flex items-start gap-3"
                >
                  {/* Green circle checkmark */}
                  <span className="
                    flex-shrink-0 mt-[3px]
                    w-5 h-5 rounded-full bg-[#0E6B4E]
                    flex items-center justify-center
                  ">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="white" strokeWidth="1.6"
                        strokeLinecap="round" strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="text-[14.5px] text-gray-600 leading-[1.76]">
                    {point}
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
}
