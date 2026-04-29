// // src/components/sections/ServicesHero.jsx
// import { motion } from "framer-motion";
// import cozyLivingRoom from "../../assets/images/Cozy_modern_living_room.png";

// const EASE = [0.22, 1, 0.36, 1];

// const fadeUp = (delay = 0) => ({
//   initial:    { opacity: 0, y: 32 },
//   animate:    { opacity: 1, y: 0 },
//   transition: { duration: 0.7, delay, ease: EASE },
// });

// export default function ServicesHero() {
//   return (
//     <section className="relative w-full min-h-[calc(100vh-72px)] flex items-center pt-12 pb-20 overflow-hidden bg-white">
//       <div className="max-w-7xl mx-auto px-6 lg:px-10 w-full">
//         <div className="grid lg:grid-cols-2 items-center gap-12 lg:gap-8">

//           {/* ── Left: Text ─────────────────────────────────────────────── */}
//           <div className="max-w-[520px]">

//             {/* Badge */}
//             <motion.div {...fadeUp(0)}>
//               <span className="
//                 inline-block px-4 py-1.5 rounded-full
//                 bg-[#FDECEA] text-[#EF4444]
//                 text-[11px] font-semibold tracking-[0.12em] uppercase
//               ">
//                 Our Mission
//               </span>
//             </motion.div>

//             {/* Headline */}
//             <motion.h1
//               {...fadeUp(0.1)}
//               className="
//                 mt-6
//                 text-[46px] sm:text-[58px] lg:text-[68px]
//                 font-extrabold text-[#1E2A3A]
//                 leading-[1.06] tracking-tight
//               "
//             >
//               Moving Made<br />Human
//             </motion.h1>

//             {/* Body */}
//             <motion.p
//               {...fadeUp(0.22)}
//               className="mt-6 text-[16px] text-gray-500 leading-[1.82] max-w-[440px]"
//             >
//               Relocation isn't just about moving boxes; it's about starting a
//               new chapter. Moveazy simplifies the journey through empathy,
//               technology, and a deep understanding of what makes a place feel
//               like home.
//             </motion.p>

//             {/* CTAs */}
//             <motion.div
//               {...fadeUp(0.34)}
//               className="mt-10 flex flex-wrap items-center gap-4"
//             >
//               <button className="
//                 px-7 py-[13px] text-[14.5px] font-semibold
//                 text-white bg-[#EF4444] rounded-full
//                 hover:bg-[#DC2626] active:scale-[0.975]
//                 transition-all duration-200
//                 shadow-[0_6px_22px_rgba(239,68,68,0.3)]
//               ">
//                 Find Your New Home
//               </button>

//               <button className="
//                 px-7 py-[13px] text-[14.5px] font-semibold
//                 text-[#EF4444] bg-[#FDECEA] rounded-full
//                 hover:bg-[#fbd9d7] active:scale-[0.975]
//                 transition-all duration-200
//               ">
//                 Meet the Team
//               </button>
//             </motion.div>
//           </div>

//           {/* ── Right: Room Image ──────────────────────────────────────── */}
//           <div className="flex justify-center lg:justify-end">
//             <motion.div
//               initial={{ opacity: 0, scale: 0.93, y: 28 }}
//               animate={{ opacity: 1, scale: 1, y: 0 }}
//               transition={{ duration: 0.85, delay: 0.15, ease: EASE }}
//               className="
//                 relative w-full
//                 max-w-[400px] sm:max-w-[460px] lg:max-w-[500px]
//                 rounded-[28px] overflow-hidden
//                 shadow-[0_28px_64px_rgba(0,0,0,0.13)]
//               "
//             >
//               <img
//                 src={cozyLivingRoom}
//                 alt="Cozy modern living room"
//                 className="w-full h-full object-cover"
//                 draggable={false}
//               />
//             </motion.div>
//           </div>

//         </div>
//       </div>
//     </section>
//   );
// }
import { motion } from "framer-motion";
import cozyLivingRoom from "../../assets/images/Cozy_modern_living_room.png";

const EASE = [0.22, 1, 0.36, 1];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.7, delay, ease: EASE },
});

export default function ServicesHero() {
  return (
    <section className="relative w-full overflow-hidden bg-white pt-24 sm:pt-28 lg:pt-32 pb-14 sm:pb-16">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
          {/* LEFT CONTENT */}
          <div className="max-w-[560px]">
            {/* Badge */}
            <motion.div {...fadeUp(0)}>
              <span
                className="
                  inline-block rounded-full
                  px-4 py-1.5
                  bg-[#FDECEA] text-[#EF4444]
                  text-[11px] font-semibold uppercase tracking-[0.12em]
                "
              >
                Our Mission
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              {...fadeUp(0.08)}
              className="
                mt-5
                text-[38px] leading-[1.08]
                sm:text-[52px]
                lg:text-[62px]
                font-extrabold tracking-tight text-[#1E2A3A]
              "
            >
              Moving Made
              <br />
              Human
            </motion.h1>

            {/* Text */}
            <motion.p
              {...fadeUp(0.16)}
              className="
                mt-5 max-w-[480px]
                text-[15px] sm:text-[16px]
                leading-[1.85] text-gray-500
              "
            >
              Relocation isn't just about moving boxes; it's about starting a
              new chapter. Moveazy simplifies the journey through empathy,
              technology, and a deep understanding of what makes a place feel
              like home.
            </motion.p>

            {/* Buttons */}
            <motion.div
              {...fadeUp(0.24)}
              className="mt-8 flex flex-wrap gap-4"
            >
              <button
                className="
                  rounded-full px-7 py-3
                  text-[14px] font-semibold text-white
                  bg-[#EF4444]
                  hover:bg-[#DC2626]
                  transition-all duration-200
                  shadow-[0_10px_28px_rgba(239,68,68,0.25)]
                "
              >
                Find Your New Home
              </button>

              <button
                className="
                  rounded-full px-7 py-3
                  text-[14px] font-semibold
                  text-[#EF4444] bg-[#FDECEA]
                  hover:bg-[#fbd9d7]
                  transition-all duration-200
                "
              >
                Meet the Team
              </button>
            </motion.div>
          </div>

          {/* RIGHT IMAGE */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 22 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.8, ease: EASE }}
            className="flex justify-center lg:justify-end"
          >
            <div
              className="
                w-full
                max-w-[280px]
                sm:max-w-[360px]
                md:max-w-[420px]
                lg:max-w-[440px]
                xl:max-w-[470px]
                rounded-[26px] overflow-hidden
                shadow-[0_24px_60px_rgba(0,0,0,0.12)]
              "
            >
              <img
                src={cozyLivingRoom}
                alt="Cozy modern living room"
                className="w-full h-auto object-cover"
                draggable={false}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}