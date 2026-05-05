import { motion } from "framer-motion";

/**
 * Friendly cartoon guide in a MovEasy tee — points toward your primary CTA (e.g. View Listings).
 * Blender-style polish is approximated with clean vectors + motion (export GLB later if you want true 3D).
 *
 * @param {"left" | "right"} direction — horizontal direction the hand points (mascot faces opposite side).
 */
export default function MovEasyMascot({ direction = "left", className = "" }) {
  const scaleX = direction === "left" ? 1 : -1;

  return (
    <figure className={`select-none ${className}`} aria-hidden="true">
      <div style={{ transform: `scaleX(${scaleX})` }}>
        <motion.svg
          width="132"
          height="168"
          viewBox="0 0 132 168"
          className="mx-auto h-auto w-[min(112px,22vw)] sm:w-[120px]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
        <defs>
          <linearGradient id="me-mascot-skin" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde7d8" />
            <stop offset="100%" stopColor="#f5cbb8" />
          </linearGradient>
          <linearGradient id="me-mascot-shirt" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e85a4f" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
        </defs>
        {/* Legs */}
        <path d="M52 138 L48 162 L58 164 L62 140 Z" fill="#1e293b" />
        <path d="M78 138 L82 162 L72 164 L68 140 Z" fill="#1e293b" />
        {/* Body / t-shirt */}
        <path
          d="M42 88 Q40 120 48 138 L84 138 Q92 120 90 88 Q66 78 42 88 Z"
          fill="url(#me-mascot-shirt)"
          stroke="#7f1d1d"
          strokeWidth="1.2"
        />
        {/* MovEasy on shirt */}
        <text
          x="66"
          y="118"
          textAnchor="middle"
          fill="white"
          fontSize="9"
          fontWeight="800"
          fontFamily="Inter, system-ui, sans-serif"
          style={{ letterSpacing: "-0.02em" }}
        >
          MovEasy
        </text>
        {/* Neck */}
        <rect x="58" y="78" width="16" height="14" rx="3" fill="url(#me-mascot-skin)" />
        {/* Head */}
        <ellipse cx="66" cy="56" rx="28" ry="30" fill="url(#me-mascot-skin)" stroke="#e8b4a0" strokeWidth="1.2" />
        {/* Hair */}
        <path
          d="M38 52 Q44 28 66 26 Q88 28 94 52 Q90 38 66 34 Q42 38 38 52 Z"
          fill="#292524"
        />
        {/* Face */}
        <circle cx="56" cy="54" r="3.5" fill="#1e293b" />
        <circle cx="76" cy="54" r="3.5" fill="#1e293b" />
        <path d="M58 66 Q66 72 74 66" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
        {/* Back arm */}
        <path
          d="M38 96 Q28 104 26 118"
          fill="none"
          stroke="url(#me-mascot-skin)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Pointing arm + hand */}
        <motion.g
          style={{ transformOrigin: "78px 92px" }}
          animate={{ rotate: [0, -14, 2, -10, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M82 90 Q108 82 118 68"
            fill="none"
            stroke="url(#me-mascot-skin)"
            strokeWidth="11"
            strokeLinecap="round"
          />
          <path
            d="M112 62 L124 58 L120 72 Z"
            fill="url(#me-mascot-skin)"
            stroke="#e8b4a0"
            strokeWidth="1"
          />
        </motion.g>
        </motion.svg>
      </div>
      <figcaption className="sr-only">Cartoon guide in MovEasy shirt pointing to listings</figcaption>
    </figure>
  );
}
