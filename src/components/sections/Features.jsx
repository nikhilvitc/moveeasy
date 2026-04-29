// src/components/sections/Features.jsx
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import userMaleIcon from "../../assets/icons/user-male.png";

const EASE = [0.22, 1, 0.36, 1];

const FEATURES = [
  {
    icon: userMaleIcon,
    title: "Personalized City Guidance",
    desc: "We help you understand the city, best areas, commute realities, and what truly fits your lifestyle before you even start.",
  },
  {
    icon: userMaleIcon,
    title: "Broker-Matched, Not Listing-Based",
    desc: "Skip outdated platforms. We connect you directly with trusted brokers who have real-time, high-quality properties.",
  },
  {
    icon: userMaleIcon,
    title: "Faster Home Finalization",
    desc: "Get curated options, quick site visits, and close deals before the best homes disappear.",
  },
  {
    icon: userMaleIcon,
    title: "Deposit Protection Guaranteed",
    desc: "Avoid unfair deductions with our Moveazy Guarantee — legal support that ensures you get your money back.",
  },
];

export default function Features() {
  const navigate = useNavigate();
  const { ref: gridRef, inView: gridInView } = useInView({ threshold: 0.08, triggerOnce: true });

  return (
    <section className="bg-[#FFF1F1] py-20 sm:py-24 lg:py-28">
      <div className="max-w-5xl mx-auto px-6 lg:px-10 pt-20">

        {/* Title */}
        <motion.div
          className="text-center mb-16 sm:mb-20"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <h2 className="text-[30px] sm:text-[38px] lg:text-[44px] font-extrabold text-gray-950 leading-[1.15] tracking-tight">
            Thousands Are Moving Smarter with Moveazy
          </h2>
        </motion.div>

        {/* Grid */}
        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 gap-y-10 gap-x-16 lg:gap-x-20"
        >
          {FEATURES.map(({ icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 28 }}
              animate={gridInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.58, delay: 0.1 + i * 0.1, ease: EASE }}
              className="flex gap-4"
            >
              {icon ? (
                <div className="flex-shrink-0 w-12 h-12 mt-0.5 bg-red-500 rounded-full p-2">
                  <img src={icon} alt="" aria-hidden="true" className="w-full h-full object-contain select-none" />
                </div>
              ) : (
                <div className="flex-shrink-0 w-12 h-12 mt-0.5 opacity-0" aria-hidden="true" />
              )}
              <div>
                <h3 className="text-[16.5px] sm:text-[17px] font-bold text-gray-950 leading-snug">{title}</h3>
                <p className="mt-2 text-[14.5px] sm:text-[15px] text-gray-500 leading-[1.75]">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          className="flex justify-center mt-14 sm:mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55, delay: 0.3, ease: EASE }}
        >
          <button 
            onClick={() => navigate('/map')}
            className="px-8 py-[14px] text-[14.5px] font-semibold text-white bg-[#EF4444] rounded-xl hover:bg-[#DC2626] active:scale-[0.975] transition-all duration-200 shadow-[0_6px_22px_rgba(239,68,68,0.28)]">
            Book a Free Consultation Now
          </button>
        </motion.div>

      </div>
    </section>
  );
}
