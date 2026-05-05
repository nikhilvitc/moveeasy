import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

/**
 * Three lightweight “Blender-style” scenes: CSS 3D transforms + motion (no WebGL).
 * Replace with GLB + react-three/fiber later if you export from Blender.
 *
 * @param {"full" | "compact"} variant
 * @param {"on-dark" | "on-light"} surface — hero vs guarantee/marketing white sections
 */
export default function Home3DShowcase({ variant = "full", surface = "on-dark" }) {
  const compact = variant === "compact";
  const dark = surface === "on-dark";
  const card =
    dark
      ? "border-white/25 bg-white/[0.12] text-white shadow-[0_12px_40px_rgba(0,0,0,0.2)]"
      : "border-stone-200 bg-white text-stone-600 shadow-md";

  const label = dark ? "text-[10px] font-bold uppercase tracking-wider text-white/75" : "text-[10px] font-bold uppercase tracking-wider text-stone-500";

  return (
    <div
      className={`grid w-full ${
        compact ? "max-w-xl grid-cols-3 gap-2" : "grid-cols-3 gap-2 sm:gap-3"
      }`}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.08, ease: EASE }}
        className={`rounded-2xl border p-3 backdrop-blur-md ${card} ${compact ? "p-2" : "sm:p-4"}`}
        style={{ perspective: 700 }}
      >
        <motion.div
          className="mx-auto flex items-center justify-center"
          style={{ transformStyle: "preserve-3d" }}
          animate={{
            rotateY: [0, 14, -10, 0],
            y: [0, compact ? -4 : -7, 0],
          }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className={`relative ${compact ? "scale-[0.72]" : "scale-100"}`}>
            <div
              className="absolute -top-4 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[38px] border-b-[32px] border-x-transparent border-b-rose-400 drop-shadow-md"
              style={{ filter: dark ? "brightness(1.05)" : undefined }}
            />
            <div
              className={`relative left-1/2 mt-[18px] h-11 w-[4.5rem] -translate-x-1/2 rounded-sm border bg-gradient-to-b shadow-inner ${
                dark ? "border-rose-300/50 from-rose-100 to-rose-200" : "border-rose-200 from-rose-50 to-rose-100"
              }`}
            >
              <div className="absolute bottom-1 left-1/2 h-5 w-3 -translate-x-1/2 rounded-sm bg-sky-400/90 shadow-sm" />
              <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-sky-200/90" />
            </div>
          </div>
        </motion.div>
        <p className={`mt-2 text-center ${label}`}>Home 3D</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.16, ease: EASE }}
        className={`rounded-2xl border p-3 backdrop-blur-md ${card} ${compact ? "p-2" : "sm:p-4"}`}
        style={{ perspective: 800 }}
      >
        <motion.div
          className="mx-auto flex min-h-[4.5rem] items-center justify-center"
          style={{ transformStyle: "preserve-3d" }}
          animate={{
            rotateX: [0, 10, -6, 0],
            rotateY: [0, -18, 12, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <div
            className={`relative w-[4.8rem] rounded-xl border-2 px-2 py-2 shadow-lg ${
              dark ? "border-white/40 bg-white/95" : "border-stone-200 bg-stone-50"
            } ${compact ? "scale-[0.78]" : ""}`}
            style={{ transform: "translateZ(24px)" }}
          >
            <div className={`h-1.5 w-8 rounded ${dark ? "bg-rose-400" : "bg-rose-500"}`} />
            <div className="mt-1.5 space-y-1">
              <div className={`h-1 w-full rounded ${dark ? "bg-stone-200" : "bg-stone-300"}`} />
              <div className={`h-1 w-4/5 rounded ${dark ? "bg-stone-200" : "bg-stone-300"}`} />
            </div>
            <motion.div
              className={`absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black ${
                dark ? "bg-primary text-white" : "bg-rose-600 text-white"
              }`}
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              3
            </motion.div>
          </div>
        </motion.div>
        <p className={`mt-2 text-center ${label}`}>Listings</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.24, ease: EASE }}
        className={`rounded-2xl border p-3 backdrop-blur-md ${card} ${compact ? "p-2" : "sm:p-4"}`}
        style={{ perspective: 700 }}
      >
        <motion.div
          className="mx-auto flex min-h-[4.5rem] items-center justify-center"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: [0, 360] }}
          transition={{ duration: compact ? 14 : 12, repeat: Infinity, ease: "linear" }}
        >
          <div
            className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 shadow-xl ${
              dark
                ? "border-emerald-300/60 bg-gradient-to-br from-emerald-400/90 to-teal-600/95"
                : "border-emerald-200 bg-gradient-to-br from-emerald-400 to-teal-600"
            }`}
            style={{ transform: "translateZ(20px)" }}
          >
            <motion.span
              className="text-2xl font-black text-white drop-shadow-md"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              ✓
            </motion.span>
          </div>
        </motion.div>
        <p className={`mt-2 text-center ${label}`}>Guarantee</p>
      </motion.div>
    </div>
  );
}
