// Animated mesh + faux-3D orbs for checkout and legal pages
import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

/** Glossy “3D” orb — CSS gradients + soft specular highlight */
function GlossOrb({ className, delay = 0, duration = 14, label }) {
  return (
    <motion.div
      className={`absolute pointer-events-none select-none ${className}`}
      aria-hidden="true"
      initial={{ opacity: 0.85 }}
      animate={{
        y: [0, -28, 8, 0],
        x: [0, 18, -14, 0],
        rotateX: [0, 18, -12, 0],
        rotateY: [0, -22, 14, 0],
        rotateZ: [0, 6, -4, 0],
        scale: [1, 1.06, 0.98, 1],
      }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
      style={{ transformStyle: "preserve-3d", perspective: 900 }}
    >
      <div
        className="relative flex h-full w-full items-center justify-center rounded-full shadow-[0_24px_48px_rgba(15,23,42,0.18),inset_0_-12px_24px_rgba(0,0,0,0.12),inset_0_8px_20px_rgba(255,255,255,0.45)]"
        style={{
          background:
            "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95) 0%, transparent 42%), radial-gradient(circle at 70% 72%, rgba(251,113,133,0.35) 0%, transparent 50%), linear-gradient(145deg, #fecdd3 0%, #fb7185 35%, #f97316 70%, #fdba74 100%)",
        }}
      >
        <span className="relative z-[1] text-2xl drop-shadow-md md:text-3xl" role="img">
          {label}
        </span>
        <div
          className="pointer-events-none absolute inset-[12%] rounded-full opacity-40 blur-md"
          style={{
            background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.9), transparent 55%)",
          }}
        />
      </div>
    </motion.div>
  );
}

/** Flat frosted “chip” — subtle 3D tilt */
function FrostChip({ className, delay, children }) {
  return (
    <motion.div
      className={`absolute pointer-events-none ${className}`}
      aria-hidden="true"
      animate={{
        y: [0, -16, 4, 0],
        rotateX: [0, 8, -6, 0],
        rotateY: [0, -10, 6, 0],
      }}
      transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay }}
      style={{ transformStyle: "preserve-3d", perspective: 700 }}
    >
      <div className="rounded-2xl border border-white/50 bg-white/25 px-4 py-2 text-xs font-bold uppercase tracking-wider text-rose-900/80 shadow-lg backdrop-blur-md">
        {children}
      </div>
    </motion.div>
  );
}

/**
 * @param {"checkout" | "subtle"} variant — checkout = richer motion; subtle = legal/docs pages
 * @param {boolean} overlayOnly — skip opaque base wash (use on pages that already define their own background)
 */
export default function PremiumPageBackdrop({ variant = "subtle", overlayOnly = false }) {
  const rich = variant === "checkout";

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
      style={{ perspective: 1200 }}
    >
      {/* Base wash */}
      {!overlayOnly && (
        <div
          className="absolute inset-0"
          style={{
            background: rich
              ? "linear-gradient(165deg, #faf5ff 0%, #fff7ed 28%, #f0f9ff 55%, #fef2f2 100%)"
              : "linear-gradient(160deg, #fafafa 0%, #fff7f5 40%, #f8fafc 100%)",
          }}
        />
      )}

      {/* Soft animated blobs */}
      <motion.div
        className="absolute -left-[18%] top-[8%] h-[min(520px,55vw)] w-[min(520px,55vw)] rounded-full bg-gradient-to-br from-rose-200/70 via-orange-200/50 to-amber-100/40 blur-3xl"
        animate={{ x: [0, 24, -12, 0], y: [0, -20, 10, 0], scale: [1, 1.08, 0.96, 1] }}
        transition={{ duration: rich ? 18 : 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-[12%] top-[22%] h-[min(480px,50vw)] w-[min(480px,50vw)] rounded-full bg-gradient-to-bl from-sky-200/60 via-violet-200/40 to-fuchsia-100/35 blur-3xl"
        animate={{ x: [0, -30, 16, 0], y: [0, 24, -8, 0], scale: [1, 0.94, 1.05, 1] }}
        transition={{ duration: rich ? 20 : 24, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute bottom-[-8%] left-[20%] h-[min(400px,45vw)] w-[min(400px,45vw)] rounded-full bg-gradient-to-tr from-rose-300/45 to-orange-200/30 blur-3xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.75, 0.5] }}
        transition={{ duration: rich ? 14 : 18, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />

      {/* Mesh grid — tech / “studio” feel */}
      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(15,23,42,0.9) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15,23,42,0.9) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Slow drifting highlight */}
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.9), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(251,113,133,0.15), transparent 50%)",
        }}
        animate={{ opacity: rich ? [0.22, 0.38, 0.24] : [0.12, 0.2, 0.14] }}
        transition={{ duration: 8, repeat: Infinity, ease: EASE }}
      />

      {rich && (
        <>
          <GlossOrb
            className="left-[4%] top-[18%] h-20 w-20 md:left-[6%] md:top-[22%] md:h-28 md:w-28"
            delay={0}
            duration={13}
            label="🛡️"
          />
          <GlossOrb
            className="right-[8%] top-[32%] h-[4.5rem] w-[4.5rem] md:right-[10%] md:top-[28%] md:h-24 md:w-24"
            delay={1.2}
            duration={15}
            label="🔒"
          />
          <GlossOrb
            className="bottom-[28%] left-[12%] h-16 w-16 md:bottom-[22%] md:left-[8%] md:h-20 md:w-20"
            delay={2}
            duration={12}
            label="✨"
          />
          <GlossOrb
            className="right-[6%] bottom-[18%] h-14 w-14 md:right-[14%] md:bottom-[24%] md:h-[4.5rem] md:w-[4.5rem]"
            delay={0.4}
            duration={16}
            label="💳"
          />
          <FrostChip className="left-[18%] top-[48%] hidden md:block" delay={0.3}>
            Secure UPI
          </FrostChip>
          <FrostChip className="right-[20%] top-[56%] hidden lg:block" delay={1.1}>
            ₹1,999 plan
          </FrostChip>
        </>
      )}

      {!rich && (
        <GlossOrb
          className="right-[5%] top-[15%] h-14 w-14 opacity-70 md:right-[8%] md:h-16 md:w-16"
          delay={0}
          duration={18}
          label="📋"
        />
      )}

      {/* Corner sheen */}
      <div
        className="absolute -right-24 -top-24 h-64 w-64 rotate-12 rounded-full bg-gradient-to-br from-white/50 to-transparent blur-2xl"
        aria-hidden="true"
      />
    </div>
  );
}
