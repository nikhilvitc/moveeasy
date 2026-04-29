// src/components/layout/Footer.jsx
import logoSvg from "../../assets/logo/moveasy.svg";
// ─────────────────────────────────────────────────────────────────────────────
// Footer — exactly matches Figma design
//
// Desktop layout:
//   Left  : MovEASY logo | copyright text below
//   Right : legal nav links (Terms of Service underlined, Privacy Policy, etc.)
//
// Mobile layout:
//   Logo + copyright stacked
//   Links wrap below in two rows
//
// Border: subtle top border separating from page content
// ─────────────────────────────────────────────────────────────────────────────

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

const EASE = [0.22, 1, 0.36, 1];

const FOOTER_LINKS = [
  { label: "Terms of Service", href: "#",   underline: true },
  { label: "Privacy Policy",   href: "#",   underline: false },
  { label: "Cookie Policy",    href: "#",   underline: false },
  { label: "Support",          href: "#",   underline: false },
  { label: "Contact",          href: "#",   underline: false },
];

export default function Footer() {
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
            <a href="/" className="inline-block">
              <img
                src={logoSvg}
                alt="MovEASY"
                className="h-8 w-auto"
              />
            </a>
            <p className="text-[11.5px] text-gray-400 uppercase tracking-wide font-medium">
              © 2024 Moveazy Architectural Relocation. All Rights Reserved.
            </p>
          </div>

          {/* ── Right: Legal links ────────────────────────────────── */}
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center gap-x-6 gap-y-2"
          >
            {FOOTER_LINKS.map(({ label, href, underline }) => (
              <a
                key={label}
                href={href}
                className={`
                  text-[12px] sm:text-[12.5px]
                  font-medium text-gray-500
                  uppercase tracking-wide
                  hover:text-gray-900
                  transition-colors duration-150
                  ${underline ? "underline underline-offset-2" : ""}
                `}
              >
                {label}
              </a>
            ))}
          </nav>

        </motion.div>
      </div>
    </footer>
  );
}
