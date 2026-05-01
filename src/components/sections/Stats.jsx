// // src/components/sections/Stats.jsx
// import { useEffect, useRef, useState } from "react";
// import { motion } from "framer-motion";
// import { useInView } from "react-intersection-observer";

// const EASE = [0.22, 1, 0.36, 1];

// const STATS = [
//   { value: 10000, suffix: "+", label: "Moves Simplified Across Cities" },
//   { value: 500, suffix: "+", label: "Trusted Broker Partners" },
//   { value: 90, suffix: "%+", label: "Users Found a Home Within 7 Days" },
// ];

// function useCounter(target, duration, start) {
//   const [count, setCount] = useState(0);
//   const rafRef = useRef(null);
//   const beganRef = useRef(false);

//   useEffect(() => {
//     if (!start || beganRef.current) return;
//     beganRef.current = true;

//     const startTime = performance.now();

//     const tick = (now) => {
//       const progress = Math.min((now - startTime) / duration, 1);
//       const eased = 1 - Math.pow(1 - progress, 3);
//       setCount(Math.floor(eased * target));

//       if (progress < 1) {
//         rafRef.current = requestAnimationFrame(tick);
//       }
//     };

//     rafRef.current = requestAnimationFrame(tick);
//     return () => cancelAnimationFrame(rafRef.current);
//   }, [start, target, duration]);

//   return count;
// }

// function StatItem({ stat, inView, index }) {
//   const count = useCounter(stat.value, 1400, inView);
//   const formatted = count.toLocaleString("en-IN");

//   return (
//     <motion.div
//       className="flex flex-col items-center text-center px-3 sm:px-4"
//       initial={{ opacity: 0, y: 18 }}
//       animate={inView ? { opacity: 1, y: 0 } : {}}
//       transition={{ duration: 0.55, delay: index * 0.1, ease: EASE }}
//     >
//       <span className="text-[40px] sm:text-[46px] lg:text-[58px] font-bold text-white leading-none tracking-tight">
//         {formatted}
//         {stat.suffix}
//       </span>

//       <span className="mt-2 text-[12.5px] sm:text-[13px] lg:text-[14px] text-gray-400 max-w-[180px] leading-snug">
//         {stat.label}
//       </span>
//     </motion.div>
//   );
// }

// export default function Stats() {
//   const { ref, inView } = useInView({
//     threshold: 0.35,
//     triggerOnce: true,
//   });

//   return (
//     <section className="bg-transparent py-0">
//       <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div
//           ref={ref}
//           className="
//             bg-[#0B0B0B]
//             rounded-2xl lg:rounded-[28px]
//             px-4 sm:px-6 lg:px-8
//             py-8 sm:py-10 lg:py-12
//             shadow-[0_12px_40px_rgba(0,0,0,0.12)]
//           "
//         >
//           <div className="grid grid-cols-1 sm:grid-cols-3 gap-7 sm:gap-0 items-center">
//             {STATS.map((stat, i) => (
//               <div
//                 key={stat.label}
//                 className="
//                   relative flex justify-center
//                   sm:min-h-[120px]
//                 "
//               >
//                 <StatItem stat={stat} inView={inView} index={i} />

//                 {i < STATS.length - 1 && (
//                   <>
//                     {/* desktop divider */}
//                     <div className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 h-14 w-px bg-white/10" />

//                     {/* mobile divider */}
//                     <div className="sm:hidden absolute -bottom-3 left-1/2 -translate-x-1/2 h-px w-16 bg-white/10" />
//                   </>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

const EASE = [0.22, 1, 0.36, 1];

const STATS = [
  { value: 10000, suffix: "+", label: "Moves Simplified Across Cities" },
  { value: 500, suffix: "+", label: "Trusted Broker Partners" },
  { value: 90, suffix: "%+", label: "Users Found a Home Within 7 Days" },
];

function useCounter(target, duration, start) {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);
  const beganRef = useRef(false);

  useEffect(() => {
    if (!start || beganRef.current) return;
    beganRef.current = true;

    const startTime = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));

      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [start, target, duration]);

  return count;
}

function StatItem({ stat, inView, index }) {
  const count = useCounter(stat.value, 1300, inView);
  const formatted = count.toLocaleString("en-IN");

  return (
    <motion.div
      className="flex flex-col items-center text-center px-2 sm:px-4"
      initial={{ opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08, ease: EASE }}
    >
      <span className="text-[30px] sm:text-[46px] lg:text-[58px] font-bold text-white leading-none tracking-tight">
        {formatted}
        {stat.suffix}
      </span>

      <span className="mt-1.5 text-[11px] sm:text-[13px] lg:text-[14px] text-gray-400 max-w-[150px] sm:max-w-[180px] leading-snug">
        {stat.label}
      </span>
    </motion.div>
  );
}

export default function Stats() {
  const { ref, inView } = useInView({
    threshold: 0.35,
    triggerOnce: true,
  });

  return (
    <section className="bg-transparent py-0">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className="
            bg-[#0B0B0B]
            rounded-xl sm:rounded-2xl lg:rounded-[28px]
            px-3 sm:px-6 lg:px-8
            py-5 sm:py-10 lg:py-12
            shadow-[0_10px_30px_rgba(0,0,0,0.10)]
          "
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-0 items-center">
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className="relative flex justify-center sm:min-h-[120px]"
              >
                <StatItem stat={stat} inView={inView} index={i} />

                {i < STATS.length - 1 && (
                  <>
                    <div className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 h-14 w-px bg-white/10" />
                    <div className="sm:hidden absolute -bottom-2 left-1/2 -translate-x-1/2 h-px w-12 bg-white/10" />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}