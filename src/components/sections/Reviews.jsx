import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import ellipseImg from "../../assets/images/ellipse.png";

const EASE = [0.22, 1, 0.36, 1];

const REVIEWS = [
  {
    id: 0,
    name: "Shreya Das",
    rating: 4.8,
    date: "29 Aug, 2018",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    quote: "Found my dream home in 4 days.",
    body: "I moved from Pune to Bangalore with zero contacts. Moveazy matched me with a broker who knew exactly what I needed. Within 4 days I had visited 3 shortlisted flats and signed the one I loved.",
  },
  {
    id: 1,
    name: "Riya Singh",
    rating: 4.3,
    date: "12 Dec, 2021",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg",
    quote: "Saved my deposit completely.",
    body: "I've always lost money during move-out, but this time Moveazy handled everything. Got my full deposit back without stress.",
  },
  {
    id: 2,
    name: "Vivek Roy",
    rating: 4.3,
    date: "12 Dec, 2021",
    avatar: "https://randomuser.me/api/portraits/men/52.jpg",
    quote: "The broker they found was incredible.",
    body: "No commission tricks, no fake listings. The broker understood my budget and got me a deal I couldn't have found on my own. Genuinely stress-free.",
  },
];

function Star() {
  return (
    <svg width="10" height="10" viewBox="0 0 13 13" fill="#F59E0B">
      <path d="M6.5 0.5l1.545 3.13 3.455.503-2.5 2.437.59 3.44L6.5 8.385l-3.09 1.625.59-3.44L.5 4.133l3.455-.503L6.5.5z" />
    </svg>
  );
}

/* Desktop Review Node */
// function ReviewNode({ reviewer, isActive, onClick, className }) {
//   return (
//     <button
//       onClick={onClick}
//       className={`absolute flex items-center gap-3 text-left transition-all duration-300 ${className}`}
//     >
//       <div
//         className={`rounded-full overflow-hidden shrink-0 transition-all duration-300 ${
//           isActive
//             ? "w-14 h-14 ring-2 ring-[#EF4444] ring-offset-2 ring-offset-white"
//             : "w-10 h-10 opacity-70"
//         }`}
//       >
//         <img
//           src={reviewer.avatar}
//           alt={reviewer.name}
//           className="w-full h-full object-cover"
//         />
//       </div>

//       <div>
//         <p
//           className={`${
//             isActive
//               ? "text-[14px] font-bold text-black"
//               : "text-[12px] text-gray-600"
//           }`}
//         >
//           {reviewer.name}
//         </p>

//         <div className="flex items-center gap-1 mt-0.5">
//           <Star />
//           <span className="text-[11px] text-gray-700">{reviewer.rating}</span>
//         </div>
//       </div>
//     </button>
//   );
// }
function ReviewNode({ reviewer, isActive, onClick, className }) {
  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 ${className}`}
    >
      <button
        onClick={onClick}
        className="relative flex items-center"
      >
        {/* Avatar */}
        <div
          className={`rounded-full overflow-hidden shrink-0 transition-all duration-300 ${isActive
              ? "w-14 h-14 ring-2 ring-[#EF4444] ring-offset-2 ring-offset-white"
              : "w-10 h-10 opacity-70"
            }`}
        >
          <img
            src={reviewer.avatar}
            alt={reviewer.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Text beside avatar */}
        <div className="ml-3 whitespace-nowrap text-left">
          <p
            className={`${isActive
                ? "text-[14px] font-bold text-black"
                : "text-[12px] text-gray-600"
              }`}
          >
            {reviewer.name}
          </p>

          <div className="flex items-center gap-1 mt-0.5">
            <Star />
            <span className="text-[11px]">{reviewer.rating}</span>
          </div>
        </div>
      </button>
    </div>
  );
}
/* Mobile Review Node */
function MobileReviewNode({ reviewer, isActive, onClick }) {
  return (
    <button onClick={onClick} className="transition-all duration-300">
      <div className="flex flex-col items-center text-center">
        <div
          className={`rounded-full overflow-hidden transition-all duration-300 ${isActive
              ? "w-16 h-16 ring-2 ring-[#EF4444] ring-offset-2 ring-offset-white"
              : "w-14 h-14 opacity-70"
            }`}
        >
          <img
            src={reviewer.avatar}
            alt={reviewer.name}
            className="w-full h-full object-cover"
          />
        </div>

        <p className="mt-2 text-[13px] font-semibold text-black">
          {reviewer.name}
        </p>

        <div className="flex items-center gap-1 mt-1">
          <Star />
          <span className="text-[11px]">{reviewer.rating}</span>
        </div>
      </div>
    </button>
  );
}

export default function Reviews() {
  const [activeIndex, setActiveIndex] = useState(1);
  const activeReview = REVIEWS[activeIndex];

  const { ref, inView } = useInView({
    threshold: 0.15,
    triggerOnce: true,
  });

  return (
    <section className="relative bg-white py-12 sm:py-16 overflow-hidden min-h-screen flex items-center">
      {/* Background Red Shape */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[220px] sm:w-[320px] z-0">
        <img
          src={ellipseImg}
          alt=""
          className="w-full"
          draggable={false}
        />
      </div>

      <div className="w-[90%] max-w-7xl mx-auto relative z-10">
        <div
          ref={ref}
          className="bg-white border border-gray-300 shadow-md px-6 rounded-md sm:px-10 py-8 sm:py-12"
        >
          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, ease: EASE }}
            className="mb-8"
          >
            <div className="w-10 h-[3px] bg-[#EF4444] rounded-full mb-3" />
            <h2 className="text-[26px] sm:text-[44px] font-extrabold text-black">
              Customer Reviews
            </h2>
          </motion.div>

          {/* Main Layout */}
          <div className="grid md:grid-cols-2 gap-10 items-center">
            {/* ================= DESKTOP LEFT ================= */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.45 }}
              className="relative h-[260px] hidden md:block"
            >
              {/* Curve */}
              <svg
                className="absolute left-[75px] top-[15px]"
                width="130"
                height="230"
                viewBox="0 0 130 230"
                fill="none"
              >
                <path
                  d="M20 0 C120 45,120 185,20 230"
                  stroke="#D1D5DB"
                  strokeWidth="1.4"
                  fill="none"
                />
              </svg>

              <ReviewNode
                reviewer={REVIEWS[0]}
                isActive={activeIndex === 0}
                onClick={() => setActiveIndex(0)}
                className="top-[16px] left-[140px]"
              />

              <ReviewNode
                reviewer={REVIEWS[1]}
                isActive={activeIndex === 1}
                onClick={() => setActiveIndex(1)}
                className="top-[120px] left-[200px]"
              />

              <ReviewNode
                reviewer={REVIEWS[2]}
                isActive={activeIndex === 2}
                onClick={() => setActiveIndex(2)}
                className="top-[240px] left-[140px]"
              />
            </motion.div>

            {/* ================= MOBILE ================= */}
            <div className="md:hidden flex flex-col items-center">
              {/* Avatars */}
              <div className="flex justify-center gap-4 mb-8 flex-wrap">
                {REVIEWS.map((reviewer, i) => (
                  <MobileReviewNode
                    key={reviewer.id}
                    reviewer={reviewer}
                    isActive={activeIndex === i}
                    onClick={() => setActiveIndex(i)}
                  />
                ))}
              </div>

              {/* Review Card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="bg-[#F9F9F9] rounded-2xl px-5 py-6 text-center shadow-sm"
                >
                  <h3 className="text-[20px] font-bold italic text-black leading-snug">
                    “{activeReview.quote}”
                  </h3>

                  <p className="mt-3 text-[13px] text-gray-600 leading-[1.8]">
                    {activeReview.body}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ================= DESKTOP RIGHT ================= */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="hidden md:flex items-center justify-center"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-[430px]"
                >
                  <h3 className="text-[42px] font-bold italic text-black leading-tight">
                    “{activeReview.quote}”
                  </h3>

                  <p className="mt-5 text-[16px] text-gray-600 italic leading-[1.9]">
                    {activeReview.body}
                  </p>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}