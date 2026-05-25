import logoSvg from "../../assets/logo/moveasy.svg";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

const EASE = [0.22, 1, 0.36, 1];

const FOOTER_LINKS = [
  { label: "Terms of Service", route: "/terms" },
  { label: "Privacy Policy", route: "/privacy" },
  { label: "Guarantee", route: "/guarantee" },
  { label: "Flat Plan", route: "/plan" },
  { label: "Listings", route: "/listings" },
  { label: "Agents", route: "/agents" },
  { label: "About us", route: "/about" },
  { label: "Contact", route: "/contact" },
];

export default function Footer() {
  const navigate = useNavigate();
  const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: true });

  return (
    <footer className="relative bg-white overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: "linear-gradient(90deg, transparent 0%, #e85a4f 30%, #f97316 50%, #ec4899 70%, transparent 100%)" }}
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, ease: EASE }}
          className="py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
        >
          {/* Logo + copyright */}
          <div className="flex flex-col gap-1">
            <motion.span
              onClick={() => navigate("/")}
              className="inline-block cursor-pointer"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
            >
              <img src={logoSvg} alt="MovEASY" className="h-7 w-auto" />
            </motion.span>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium">
              © 2024 MovEazy. All Rights Reserved.
            </p>
          </div>

          {/* Nav links */}
          <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
            {FOOTER_LINKS.map(({ label, route }) => (
              <motion.span
                key={label}
                onClick={() => navigate(route)}
                className="text-[12px] font-medium text-gray-400 uppercase tracking-wide cursor-pointer"
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
