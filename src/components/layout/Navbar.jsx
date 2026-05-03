import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeAndGo = (path) => {
    setOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <nav
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-primary-light/50 bg-white/95 backdrop-blur-xl shadow-navbar-glow"
          : "border-primary-light/30 bg-white/90 backdrop-blur-lg shadow-navbar"
      }`}
    >
      <div className="flex items-center justify-between px-4 md:px-8 py-3">

        {/* LOGO */}
        <motion.div
          onClick={() => closeAndGo("/")}
          className="cursor-pointer text-2xl font-black tracking-tight flex items-center select-none"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.2 }}
        >
          <span className="text-ink">Mov</span>
          <span className="gradient-text-shimmer">EAZY</span>
        </motion.div>

        {/* CENTER LINKS */}
        <div className="hidden lg:flex items-center gap-7 text-[14px] font-semibold text-ink-muted">
          {[
            { label: "Services",  path: "/services" },
            { label: "Guarantee", path: "/guarantee" },
            { label: "Listings",  path: "/map" },
            { label: "Saved",     path: "/activity" },
            { label: "Contact",   path: "/contact" },
          ].map(({ label, path }) => (
            <NavLink key={label} label={label} onClick={() => closeAndGo(path)} />
          ))}

          {/* EXPLORE MAP BUTTON */}
          <motion.button
            onClick={() => closeAndGo("/map")}
            className="font-bold text-sky-800 bg-sky-50 px-4 py-1.5 rounded-full border border-sky-200/80 shadow-sm flex items-center gap-2"
            whileHover={{ scale: 1.05, backgroundColor: "rgb(224,242,254)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            🗺️ Explore Map
          </motion.button>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-4">
          <motion.button
            onClick={() => closeAndGo("/contact")}
            className="hidden xl:block px-5 py-2 text-sm font-bold border-2 border-ink/15 text-ink rounded-full"
            whileHover={{
              borderColor: "rgba(232,90,79,0.5)",
              backgroundColor: "rgba(255,244,242,0.6)",
              scale: 1.03,
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            Book A Consultation
          </motion.button>

          {user ? (
            <div className="hidden lg:flex items-center gap-3 text-sm font-semibold text-ink-muted">
              {user.role === "customer" && (
                <motion.button
                  onClick={() => closeAndGo("/customer")}
                  className="px-4 py-1.5 border border-blue-200 bg-blue-50 text-blue-700 rounded-full"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Customer Dashboard
                </motion.button>
              )}
              {user.role === "seller" && (
                <motion.button
                  onClick={() => closeAndGo("/seller")}
                  className="px-4 py-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-full"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Seller Dashboard
                </motion.button>
              )}
              {user.role === "admin" && (
                <motion.button
                  onClick={() => closeAndGo("/admin")}
                  className="px-4 py-1.5 border border-indigo-200 bg-indigo-50 text-indigo-700 rounded-full"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Admin Dashboard
                </motion.button>
              )}
              <span className="hidden sm:inline-flex items-center gap-1 opacity-70 text-xs">
                👤 {user.email}
              </span>
              <motion.button
                onClick={handleLogout}
                className="px-4 py-1.5 border border-gray-300 rounded-full text-ink-muted"
                whileHover={{ scale: 1.04, borderColor: "rgba(232,90,79,0.4)" }}
                whileTap={{ scale: 0.97 }}
              >
                ↪ Logout
              </motion.button>
            </div>
          ) : (
            <motion.button
              onClick={() => closeAndGo("/login")}
              className="hidden sm:block px-6 py-2 text-sm font-bold text-white bg-primary rounded-full shadow-red"
              whileHover={{ scale: 1.05, boxShadow: "0 8px 28px rgba(232,90,79,0.45)" }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18 }}
            >
              Sign In / Register
            </motion.button>
          )}

          <motion.button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden px-3 py-2 rounded-lg border border-gray-200 text-gray-700"
            whileHover={{ backgroundColor: "rgba(255,244,242,0.8)" }}
            whileTap={{ scale: 0.95 }}
            aria-label="Toggle menu"
          >
            {open ? "✕" : "☰"}
          </motion.button>
        </div>
      </div>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="lg:hidden border-t border-primary-light/30 px-4 py-5 glass-light"
          >
            <div className="grid gap-3 text-sm font-semibold text-ink">
              {[
                { label: "Services",          path: "/services" },
                { label: "Guarantee",         path: "/guarantee" },
                { label: "Listings / Map",    path: "/map" },
                { label: "Saved and activity",path: "/activity" },
                { label: "Contact",           path: "/contact" },
              ].map(({ label, path }) => (
                <button key={label} onClick={() => closeAndGo(path)} className="text-left hover:text-primary transition-colors">
                  {label}
                </button>
              ))}
              {user?.role === "customer" && (
                <button onClick={() => closeAndGo("/customer")} className="text-left">
                  Customer Dashboard
                </button>
              )}
              {user?.role === "seller" && (
                <button onClick={() => closeAndGo("/seller")} className="text-left">
                  Seller Dashboard
                </button>
              )}
              {user?.role === "admin" && (
                <button onClick={() => closeAndGo("/admin")} className="text-left">
                  Admin Dashboard
                </button>
              )}
              {!user && (
                <motion.button
                  onClick={() => closeAndGo("/login")}
                  className="mt-1 px-4 py-2.5 rounded-full bg-primary text-white text-center font-bold shadow-red"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Sign In / Register
                </motion.button>
              )}
              {user && (
                <>
                  <div className="text-xs text-gray-500 break-all">👤 {user.email}</div>
                  <button onClick={handleLogout} className="text-left text-red-600 font-semibold">
                    ↪ Logout
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

/* Animated nav link with sliding underline */
function NavLink({ label, onClick }) {
  return (
    <motion.span
      onClick={onClick}
      className="cursor-pointer relative py-1 group"
      whileHover={{ color: "#D64A3F" }}
      transition={{ duration: 0.15 }}
    >
      {label}
      <span
        className="absolute bottom-0 left-0 h-[2px] w-0 rounded-full bg-primary transition-all duration-200 group-hover:w-full"
        aria-hidden="true"
      />
    </motion.span>
  );
}
