// src/components/sections/HowItWorks.jsx
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import consultationIcon from "../../assets/icons/consultation.png";
import realEstateAgentIcon from "../../assets/icons/real-estate-agent.png";
import protectIcon from "../../assets/icons/protect.png";

const EASE = [0.22, 1, 0.36, 1];

const STEPS = [
  {
    number: "1",
    icon: consultationIcon,
    title: "Understand You",
    desc: "Tell us your office location, budget, lifestyle, and preferences. We guide you on the best areas, commute realities, and trade-offs.",
    gradientFrom: "#e85a4f",
    gradientTo: "#f97316",
  },
  {
    number: "2",
    icon: realEstateAgentIcon,
    title: "Get Matched to the Right Brokers",
    desc: "We connect you with trusted brokers who have real-time, high-quality properties. No outdated listings. No endless scrolling.",
    gradientFrom: "#f97316",
    gradientTo: "#ec4899",
  },
  {
    number: "3",
    icon: protectIcon,
    title: "Close Fast & Stay Protected",
    desc: "We help you finalize quickly and protect your security deposit with legal support.",
    gradientFrom: "#ec4899",
    gradientTo: "#8b5cf6",
  },
];

function AnimatedArc({ visible, delay }) {
  return (
    <div className="hidden lg:flex items-start justify-center w-12 xl:w-20 2xl:w-24 mt-14 flex-shrink-0">
      <svg
        viewBox="0 0 80 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`arc-grad-${delay}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#e85a4f" />
            <stop offset="50%"  stopColor="#f97316" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <motion.path
          d="M4 24 Q40 2 76 24"
          stroke={`url(#arc-grad-${delay})`}
          strokeWidth="2.5"
          strokeDasharray="5 5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={visible ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
          transition={{ duration: 0.9, delay, ease: EASE }}
        />
      </svg>
    </div>
  );
}

export default function HowItWorks() {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  return (
    <section className="bg-white py-20 sm:py-24 lg:py-28">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 xl:max-w-[90rem] xl:px-12 2xl:px-16">
        <div
          className="rounded-2xl lg:rounded-3xl px-5 py-14 sm:px-8 sm:py-16 lg:px-12 lg:py-20 xl:px-16"
          style={{
            background: "linear-gradient(145deg, #fafafa 0%, #ffffff 50%, #fff8f7 100%)",
            border: "1px solid rgba(232,90,79,0.10)",
            boxShadow: "0 4px 40px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          {/* Title */}
          <motion.div
            className="text-center mb-14 sm:mb-16"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <h2 className="text-[28px] sm:text-[36px] lg:text-[42px] font-extrabold text-gray-950 leading-[1.15] tracking-tight">
              Your Move, Simplified in{" "}
              <span className="gradient-text">3 Steps</span>
            </h2>
            <p className="mt-3 text-[14.5px] sm:text-[15.5px] text-gray-400">
              From confusion → to keys in hand → we handle everything
            </p>
          </motion.div>

          {/* Steps */}
          <div
            ref={ref}
            className="flex flex-col sm:flex-row sm:items-start sm:justify-center gap-10 sm:gap-0"
          >
            {STEPS.map((step, i) => (
              <div key={step.number} className="flex sm:contents">
                <motion.div
                  className="relative flex min-w-0 flex-1 flex-col items-center text-center lg:px-1 xl:px-2"
                  initial={{ opacity: 0, y: 28 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.58, delay: i * 0.18, ease: EASE }}
                >
                  {/* Gradient step number badge */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-extrabold text-white mb-4 flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${step.gradientFrom}, ${step.gradientTo})`,
                      boxShadow: `0 4px 16px ${step.gradientFrom}60`,
                    }}
                  >
                    {step.number}
                  </div>

                  {/* Glowing icon circle */}
                  <motion.div
                    className="w-[110px] h-[110px] sm:w-[120px] sm:h-[120px] rounded-full flex items-center justify-center bg-white flex-shrink-0"
                    style={{
                      border: `2px solid ${step.gradientFrom}30`,
                      boxShadow: `0 0 0 6px ${step.gradientFrom}10, 0 8px 32px ${step.gradientFrom}25`,
                    }}
                    whileHover={{
                      boxShadow: `0 0 0 8px ${step.gradientFrom}18, 0 12px 40px ${step.gradientFrom}40`,
                      scale: 1.04,
                    }}
                    transition={{ duration: 0.25 }}
                  >
                    <img
                      src={step.icon}
                      alt=""
                      aria-hidden="true"
                      className="w-14 h-14 object-contain select-none"
                    />
                  </motion.div>

                  {/* Title with gradient accent on first word */}
                  <h3 className="mt-5 text-[16px] sm:text-[17px] font-bold text-gray-950 leading-snug px-2">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="mt-2.5 text-[13.5px] sm:text-[14px] text-gray-400 leading-[1.75] px-2">
                    {step.desc}
                  </p>
                </motion.div>

                {i < STEPS.length - 1 && <AnimatedArc visible={inView} delay={0.2 + i * 0.18} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
