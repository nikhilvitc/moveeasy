import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  phoneMockup,
  ratingCard,
  videoThumbnailCard,
  engagementChartCard,
  itemsSoldCard,
  socialPostCard,
} from "../../assets";

const EASE = [0.22, 1, 0.36, 1];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease: EASE },
});

function FloatingCard({
  src,
  alt,
  className,
  entranceDelay,
  xFrom,
  floatDelay = 0,
}) {
  return (
    <motion.div
      className={`absolute ${className}`}
      initial={{ opacity: 0, x: xFrom }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.72, delay: entranceDelay, ease: EASE }}
    >
      <motion.img
        src={src}
        alt={alt}
        className="w-full drop-shadow-xl select-none pointer-events-none"
        draggable={false}
        animate={{ y: [0, -9, 0] }}
        transition={{
          duration: 3.6 + floatDelay * 0.25,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "loop",
          delay: entranceDelay + 0.72 + floatDelay * 0.4,
        }}
      />
    </motion.div>
  );
}

export default function Hero() {
  const navigate = useNavigate();
  return (
    <section
      className="
        relative w-full
        min-h-[calc(100vh-72px)]
        flex items-center
        pt-[88px] sm:pt-[96px] lg:pt-[110px] pb-16
        overflow-hidden bg-white
      "
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 w-full">
        <div className="grid lg:grid-cols-2 items-center gap-10 lg:gap-4">
          {/* Left: Text Content */}
          <div className="max-w-[600px] mx-auto lg:mx-0 text-center lg:text-left">
            {/* Main Heading */}
            <motion.h1
              {...fadeUp(0)}
              className="
                text-[40px] sm:text-[56px] lg:text-[72px]
                font-extrabold text-gray-950
                leading-[1.05] tracking-tight
              "
            >
              Move To A New City
            </motion.h1>

            {/* Subheading in coral/red */}
            <motion.h2
              {...fadeUp(0.1)}
              className="
                text-[40px] sm:text-[56px] lg:text-[72px]
                font-light text-[#E85A4F]
                leading-[1.05] tracking-tight
              "
            >
              Without The Chaos
            </motion.h2>

            {/* Description */}
            <motion.p
              {...fadeUp(0.2)}
              className="
                mt-6 text-[16px] sm:text-[18px] text-gray-500
                leading-[1.7] max-w-[500px] mx-auto lg:mx-0
              "
            >
              We understand your needs, connect you to the right brokers, and
              manage your move from start to finish with speed and trust.
            </motion.p>

            {/* Security Badge */}
            <motion.div
              {...fadeUp(0.3)}
              className="mt-6 flex items-center justify-center lg:justify-start gap-3"
            >
              <svg
                className="w-5 h-5 text-[#E85A4F]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
              <span className="text-[15px] sm:text-[16px] font-medium text-gray-700">
                100% Secure Deposit Protection
              </span>
            </motion.div>

            {/* CTA Button */}
            <motion.div
              {...fadeUp(0.4)}
              className="mt-8 flex justify-center lg:justify-start"
            >
              <button
                onClick={() => navigate('/login')}
                className="
                  flex items-center gap-3
                  px-8 sm:px-10 py-[14px] sm:py-[16px]
                  text-[15px] sm:text-[16px] font-semibold
                  text-white bg-[#E85A4F] rounded-full
                  hover:bg-[#D64A3F]
                  active:scale-[0.975]
                  transition-all duration-200
                  shadow-[0_8px_30px_rgba(232,90,79,0.35)]
                "
              >
                Start Your Move
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3"
                  />
                </svg>
              </button>
            </motion.div>
          </div>

          {/* Right: Phone + Floating Cards */}
          <div className="flex justify-center items-center overflow-hidden">
            <div
              className="
                relative
                w-[340px] h-[500px]
                sm:w-[460px] sm:h-[580px]
                lg:w-[540px] lg:h-[650px]
              "
            >
              {/* Phone Mockup */}
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <motion.img
                  src={phoneMockup}
                  alt="MovEASY mobile app"
                  initial={{ opacity: 0, scale: 0.88, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.82, delay: 0.1, ease: EASE }}
                  className="h-[380px] sm:h-[460px] lg:h-[540px]
                              w-auto
                              drop-shadow-2xl
                              select-none
                            "
                  draggable={false}
                />
              </div>

              {/* Floating Cards */}

              {/* 5-Star Rating — upper left */}
              <FloatingCard
                src={ratingCard}
                alt="5.0 Traveler Rating"
                className="
                  top-[6%] left-[-2%] w-[176px]
                  z-20
                "
                entranceDelay={0.52}
                xFrom={-26}
                floatDelay={0}
              />

              {/* Video Thumbnail — upper right */}
              <FloatingCard
                src={videoThumbnailCard}
                alt="Virtual Tour: Skyline Loft"
                className="
                  top-[3%] right-[-2%]
                  w-[130px] sm:w-[158px] lg:w-[178px]
                  z-20
                "
                entranceDelay={0.58}
                xFrom={26}
                floatDelay={0.6}
              />

              {/* Engagement Chart — middle right */}
              <FloatingCard
                src={engagementChartCard}
                alt="40% Efficiency increase"
                className="
                  top-[40%] right-[-4%]
                  w-[120px] sm:w-[148px] lg:w-[164px]
                  z-20
                "
                entranceDelay={0.72}
                xFrom={26}
                floatDelay={1.0}
              />

              {/* Items Sold — lower left */}
              <FloatingCard
                src={itemsSoldCard}
                alt="Items sold this week"
                className="
                  bottom-[10%] left-[-2%]
                  w-[130px] sm:w-[148px] lg:w-[164px]
                  z-20
                "
                entranceDelay={0.67}
                xFrom={-26}
                floatDelay={1.4}
              />

              {/* Social Post Card — lower right */}
              <FloatingCard
                src={socialPostCard}
                alt="Social post card"
                className="
                  bottom-[8%] right-[1%]
                  w-[90px] sm:w-[118px] lg:w-[136px]
                  z-20
                "
                entranceDelay={0.78}
                xFrom={26}
                floatDelay={1.8}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}