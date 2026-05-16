// src/components/layout/Footer.jsx
import logoSvg from "../../assets/logo/moveasy.svg";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import {
  DEFAULT_CONTACT_TEAM,
  buildContactWhatsAppUrl,
  whatsAppLabelForContact,
} from "../../config/contactChannels";

const EASE = [0.22, 1, 0.36, 1];

const FOOTER_LINKS = [
  { label: "Terms of Service", route: "/terms", underline: true },
  { label: "Privacy Policy", route: "/privacy", underline: false },
  { label: "Services", route: "/services", underline: false },
  { label: "Guarantee", route: "/guarantee", underline: false },
  { label: "Flat Plan", route: "/plan", underline: false },
  { label: "Listings", route: "/listings", underline: false },
  { label: "Agents", route: "/agents", underline: false },
  { label: "Contact & Support", route: "/contact", underline: false },
];

const CONSULT_WA_MSG =
  "Hi — I'd like to book a free consultation with MovEazy. Please share next steps.";

export default function Footer() {
  const navigate = useNavigate();
  const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: true });

  return (
    <footer className="relative bg-white overflow-hidden">
      <motion.div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #e85a4f 30%, #f97316 50%, #ec4899 70%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 50% 120%, rgba(232,90,79,0.04), transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex flex-col gap-6 py-8 sm:py-9"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-4">
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
                © 2024 MovEazy Architectural Relocation. All Rights Reserved.
              </p>
            </div>

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
          </div>

          <motion.div
            className="flex flex-wrap items-center gap-3 pt-1 border-t border-gray-100"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-full sm:w-auto">
              WhatsApp us
            </span>
            {DEFAULT_CONTACT_TEAM.map((contact) => {
              const href = buildContactWhatsAppUrl(contact, CONSULT_WA_MSG);
              if (!href) return null;
              return (
                <motion.a
                  key={contact.phoneRaw}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span aria-hidden="true">💬</span>
                  {whatsAppLabelForContact(contact)}
                </motion.a>
              );
            })}
          </motion.div>
        </motion.div>
      </div>
    </footer>
  );
}
