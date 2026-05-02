// src/components/sections/Features.jsx
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
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

  return (
    <section className="bg-[#FFF1F1] py-20 sm:py-24 lg:py-28">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 xl:max-w-[90rem] xl:px-12 2xl:px-16 pt-8 sm:pt-12">

        {/* Title */}
        <motion.div
          className="text-center mb-14 sm:mb-16 lg:mb-20"
          initial={{ opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <h2 className="text-[32px] sm:text-[40px] lg:text-[48px] xl:text-[52px] font-extrabold text-gray-950 leading-[1.12] tracking-tight max-w-[1100px] mx-auto">
            Thousands Are Moving Smarter with Moveazy
          </h2>
        </motion.div>

        {/* Grid — whileInView so cards never stay opacity:0 if IO is flaky */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-12 gap-x-10 lg:gap-x-16 xl:gap-x-24">
          {FEATURES.map(({ icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 1, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12, margin: "0px 0px -40px 0px" }}
              transition={{ duration: 0.45, delay: 0.04 * i, ease: EASE }}
              className="flex gap-4 sm:gap-5"
            >
              {icon ? (
                <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 mt-0.5 bg-red-500 rounded-full p-2.5 sm:p-3">
                  <img src={icon} alt="" aria-hidden="true" className="w-full h-full object-contain select-none" />
                </div>
              ) : (
                <div className="flex-shrink-0 w-14 h-14 mt-0.5 opacity-0" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <h3 className="text-[17px] sm:text-[19px] lg:text-[20px] font-bold text-gray-950 leading-snug">{title}</h3>
                <p className="mt-2.5 text-[15px] sm:text-[16px] lg:text-[17px] text-gray-600 leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          className="flex justify-center mt-14 sm:mt-16 lg:mt-20"
          initial={{ opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <button
            type="button"
            onClick={() => navigate("/map")}
            className="px-9 py-4 text-[15px] sm:text-[16px] font-semibold text-white bg-[#EF4444] rounded-xl hover:bg-[#DC2626] active:scale-[0.975] transition-all duration-200 shadow-[0_6px_22px_rgba(239,68,68,0.28)]"
          >
            Book a Free Consultation Now
          </button>
        </motion.div>

      </div>
    </section>
  );
}
