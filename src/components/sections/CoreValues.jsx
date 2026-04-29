// src/components/sections/CoreValues.jsx
import { motion } from "framer-motion";
import bgTransparency from "../../assets/images/Background.png";     // eye icon
import bgEmpowerment  from "../../assets/images/Background__1_.png"; // rocket icon
import bgCommunity    from "../../assets/images/Background__2_.png"; // community icon

const EASE = [0.22, 1, 0.36, 1];

const VALUES = [
  {
    bg:    bgTransparency,
    title: "Radical Transparency",
    desc:  "No hidden fees, no ghost listings, and no fake reviews. We believe clarity is the foundation of trust during a move.",
    delay: 0,
  },
  {
    bg:    bgEmpowerment,
    title: "Empowerment",
    desc:  "We give you the tools and data to make informed decisions. Your move, your rules, powered by our intelligence.",
    delay: 0.1,
  },
  {
    bg:    bgCommunity,
    title: "Community First",
    desc:  "A home is more than four walls. We connect you to the local pulse and the people who make a city feel alive.",
    delay: 0.2,
  },
];

// ── Single value card ─────────────────────────────────────────────────────────
function ValueCard({ bg, title, desc, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, delay, ease: EASE }}
      whileHover={{ y: -4, transition: { duration: 0.25, ease: "easeOut" } }}
      className="
        bg-white rounded-2xl p-7 sm:p-8
        shadow-[0_2px_24px_rgba(0,0,0,0.06)]
        flex flex-col gap-5
        cursor-default
      "
    >
      {/* Dark icon tile */}
      <div className="w-[58px] h-[58px] rounded-[14px] overflow-hidden flex-shrink-0">
        <img
          src={bg}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
        />
      </div>

      <div>
        <h3 className="text-[17px] font-bold text-[#1E2A3A] mb-2 leading-snug">
          {title}
        </h3>
        <p className="text-[14px] text-gray-500 leading-[1.82]">{desc}</p>
      </div>
    </motion.div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
export default function CoreValues() {
  return (
    <section className="relative w-full bg-[#F2F2FB] py-24 lg:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="max-w-[560px] mb-14">
          <motion.h2
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: EASE }}
            className="
              text-[32px] sm:text-[40px] lg:text-[50px]
              font-extrabold text-[#1E2A3A]
              leading-[1.1] tracking-tight
            "
          >
            Values that guide us
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.65, delay: 0.12, ease: EASE }}
            className="mt-4 text-[15.5px] text-gray-500 leading-[1.82]"
          >
            Integrity isn't a checkbox; it's our operating system. We believe
            in building a platform that puts the resident first, always.
          </motion.p>
        </div>

        {/* ── Value Cards ────────────────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {VALUES.map((v) => (
            <ValueCard key={v.title} {...v} />
          ))}
        </div>

      </div>
    </section>
  );
}
