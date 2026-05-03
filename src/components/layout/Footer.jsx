// src/components/layout/Footer.jsx
import logoSvg from "../../assets/logo/moveasy.svg";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

const EASE = [0.22, 1, 0.36, 1];

const FOOTER_LINKS = [
  { label: "Terms of Service", route: "/terms",    underline: true },
  { label: "Privacy Policy",   route: "/privacy",  underline: false },
  { label: "Services",         route: "/services", underline: false },
  { label: "Support",          route: "/contact",  underline: false },
  { label: "Contact",          route: "/contact",  underline: false },
];

export default function Footer() {
  const navigate = useNavigate();
  const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: true });

  return (
    <footer className="relative bg-white overflow-hidden">
      {/* Premium gradient top border */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: "linear-gradient(90deg, transparent 0%, #e85a4f 30%, #f97316 50%, #ec4899 70%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* Subtle background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 80% at 50% 120%, rgba(232,90,79,0.04), transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-4 py-8 sm:py-9"
        >
          {/* ── Left: Logo + copyright ── */}
          <div className="flex flex-col gap-1.5">
            <motion.span
              onClick={() => navigate("/")}
              className="inline-block cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18 }}
            >
              <img src={logoSvg} alt="MovEASY" className="h-8 w-auto" />
            </motion.span>
            <p className="text-[11.5px] text-gray-400 uppercase tracking-wide font-medium">
              © 2024 Moveazy Architectural Relocation. All Rights Reserved.
            </p>
          </div>

          {/* ── Right: Legal links ── */}
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center gap-x-6 gap-y-2"
          >
            {FOOTER_LINKS.map(({ label, route, underline }) => (
              <motion.span
                key={label}
                onClick={() => navigate(route)}
                className={`text-[12px] sm:text-[12.5px] font-medium text-gray-400 uppercase tracking-wide cursor-pointer ${
                  underline ? "underline underline-offset-2" : ""
                }`}
                whileHover={{ color: "#E85A4F" }}
                transition={{ duration: 0.15 }}
              >
                {label}
              </motion.span>
            ))}
          </nav>
        </motion.div>
      </div>
    </footer>
  );
}
