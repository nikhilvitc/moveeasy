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
  },
  {
    number: "2",
    icon: realEstateAgentIcon,
    title: "Get Matched to the Right Brokers",
    desc: "We connect you with trusted brokers who have real-time, high-quality properties. No outdated listings. No endless scrolling.",
  },
  {
    number: "3",
    icon: protectIcon,
    title: "Close Fast & Stay Protected",
    desc: "We help you finalize quickly and protect your security deposit with legal support.",
  },
];

function DashedArc() {
  return (
    <div className="hidden lg:flex items-start justify-center w-12 xl:w-20 2xl:w-24 mt-14 flex-shrink-0">
      <svg viewBox="0 0 80 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" aria-hidden="true">
        <path d="M4 24 Q40 2 76 24" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function HowItWorks() {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  return (
    <section className="bg-white py-20 sm:py-24 lg:py-28">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 xl:max-w-[90rem] xl:px-12 2xl:px-16">
        <div className="rounded-2xl lg:rounded-3xl border border-gray-100 bg-white px-5 py-14 sm:px-8 sm:py-16 lg:px-12 lg:py-20 xl:px-16">

          {/* Title */}
          <motion.div
            className="text-center mb-14 sm:mb-16"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <h2 className="text-[28px] sm:text-[36px] lg:text-[42px] font-extrabold text-gray-950 leading-[1.15] tracking-tight">
              Your Move, Simplified in 3 Steps
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
                  transition={{ duration: 0.58, delay: i * 0.15, ease: EASE }}
                >
                  {/* Number badge */}
                  <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[12px] font-bold mb-4 flex-shrink-0">
                    {step.number}
                  </div>

                  {/* Icon circle */}
                  <div className="w-[110px] h-[110px] sm:w-[120px] sm:h-[120px] rounded-full border-[1.5px] border-gray-200 flex items-center justify-center bg-white flex-shrink-0">
                    <img src={step.icon} alt="" aria-hidden="true" className="w-14 h-14 object-contain select-none" />
                  </div>

                  {/* Title */}
                  <h3 className="mt-5 text-[16px] sm:text-[17px] font-bold text-gray-950 leading-snug px-2">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="mt-2.5 text-[13.5px] sm:text-[14px] text-gray-400 leading-[1.75] px-2">
                    {step.desc}
                  </p>
                </motion.div>

                {i < STEPS.length - 1 && <DashedArc />}
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
