// src/components/layout/Footer.jsx
import logoSvg from "../../assets/logo/moveasy.svg";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

const EASE = [0.22, 1, 0.36, 1];

const FOOTER_LINKS = [
  { label: "Terms of Service", route: "/terms",   underline: true },
  { label: "Privacy Policy",   route: "/privacy", underline: false },
  { label: "Services",         route: "/services", underline: false },
  { label: "Support",          route: "/contact", underline: false },
  { label: "Contact",          route: "/contact", underline: false },
];

export default function Footer() {
  const navigate = useNavigate();
  const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: true });

  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: EASE }}
          className="
            flex flex-col sm:flex-row
            items-start sm:items-center
            justify-between
            gap-6 sm:gap-4
            py-8 sm:py-9
          "
        >
          {/* ── Left: Logo + copyright ─────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <span onClick={() => navigate("/")} className="inline-block cursor-pointer">
              <img
                src={logoSvg}
                alt="MovEASY"
                className="h-8 w-auto"
              />
            </span>
            <p className="text-[11.5px] text-gray-400 uppercase tracking-wide font-medium">
              © 2024 Moveazy Architectural Relocation. All Rights Reserved.
            </p>
          </div>

          {/* ── Right: Legal links ────────────────────────────────── */}
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center gap-x-6 gap-y-2"
          >
            {FOOTER_LINKS.map(({ label, route, underline }) => (
              <span
                key={label}
                onClick={() => navigate(route)}
                className={`
                  text-[12px] sm:text-[12.5px]
                  font-medium text-gray-500
                  uppercase tracking-wide
                  hover:text-gray-900
                  transition-colors duration-150
                  cursor-pointer
                  ${underline ? "underline underline-offset-2" : ""}
                `}
              >
                {label}
              </span>
            ))}
          </nav>

        </motion.div>
      </div>
    </footer>
  );
}
