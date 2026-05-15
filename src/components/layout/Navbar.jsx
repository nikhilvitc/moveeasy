import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MovEAZYLogo from "../branding/MovEAZYLogo";
import { FLAT_SEARCH_CTA, PRIMARY_NAV_LINKS } from "../../config/navLinks";

const chipBtn =
  "rounded-md px-2 py-1 text-[11px] font-semibold border border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10 transition-colors";
const chipAdmin =
  "rounded-md px-2 py-1 text-[11px] font-semibold border border-red-500/40 bg-red-600/20 text-red-100 hover:bg-red-600/30 transition-colors";

/**
 * @param {{ variant?: "solid" | "overlay" }} props
 * overlay = home hero (glass, not a heavy black slab)
 */
export default function Navbar({ variant = "solid" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isOverlay = variant === "overlay" || location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const shellClass = (() => {
    if (isOverlay && !scrolled) {
      return "border-b border-white/10 bg-black/35 backdrop-blur-md shadow-none";
    }
    if (isOverlay && scrolled) {
      return "border-b border-red-950/40 bg-black/88 backdrop-blur-lg shadow-[0_4px_24px_rgba(0,0,0,0.35)]";
    }
    return scrolled
      ? "border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md shadow-sm"
      : "border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md";
  })();

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
    <header className={`sticky top-0 z-50 transition-all duration-300 ${shellClass}`}>
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:px-4 lg:px-6">
        {/* Logo */}
        <motion.button
          type="button"
          onClick={() => closeAndGo("/")}
          className="shrink-0 flex items-center"
          whileTap={{ scale: 0.98 }}
          aria-label="MovEazy home"
        >
          <MovEAZYLogo variant="onDark" size="sm" />
        </motion.button>

        {/* Center nav — desktop */}
        <nav className="hidden lg:flex flex-1 items-center justify-center gap-0.5 min-w-0" aria-label="Main">
          {PRIMARY_NAV_LINKS.map(({ label, path }) => (
            <NavLink key={path} label={label} onClick={() => closeAndGo(path)} light={isOverlay && !scrolled} />
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto lg:ml-0">
          <motion.button
            type="button"
            onClick={() => closeAndGo(FLAT_SEARCH_CTA.path)}
            className="hidden sm:inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-[11px] sm:text-xs font-bold text-white shadow-sm hover:bg-red-500 border border-red-500/80 whitespace-nowrap"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {FLAT_SEARCH_CTA.label}
          </motion.button>

          {user ? (
            <div className="hidden lg:flex items-center gap-1">
              {user.role === "customer" && (
                <button type="button" onClick={() => closeAndGo("/customer")} className={chipBtn}>
                  Dashboard
                </button>
              )}
              {user.role === "seller" && (
                <button type="button" onClick={() => closeAndGo("/seller")} className={chipBtn}>
                  Seller
                </button>
              )}
              {(user.role === "admin" || user.role === "sub_admin" || user.role === "consultant") && (
                <button type="button" onClick={() => closeAndGo("/crm")} className={chipBtn}>
                  CRM
                </button>
              )}
              {user.role === "admin" && (
                <button type="button" onClick={() => closeAndGo("/admin")} className={chipAdmin}>
                  Admin
                </button>
              )}
              <button type="button" onClick={handleLogout} className={chipBtn}>
                Logout
              </button>
            </div>
          ) : (
            <motion.button
              type="button"
              onClick={() => closeAndGo("/login")}
              className="hidden sm:inline-flex rounded-md px-3 py-1.5 text-[11px] sm:text-xs font-bold text-zinc-200 border border-white/20 hover:bg-white/10"
              whileTap={{ scale: 0.98 }}
            >
              Sign in
            </motion.button>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/30 text-zinc-100 text-sm font-bold"
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden overflow-hidden border-t border-white/10 bg-zinc-950/98 backdrop-blur-lg"
          >
            <div className="px-4 py-3 grid gap-1 text-sm font-medium text-zinc-200 max-h-[70vh] overflow-y-auto">
              {PRIMARY_NAV_LINKS.map(({ label, path }) => (
                <button
                  key={path}
                  type="button"
                  onClick={() => closeAndGo(path)}
                  className="text-left rounded-lg py-2.5 px-2 hover:bg-white/5 hover:text-white"
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => closeAndGo("/map")}
                className="text-left rounded-lg py-2.5 px-2 hover:bg-white/5 text-zinc-400"
              >
                Explore map
              </button>
              <button
                type="button"
                onClick={() => closeAndGo(FLAT_SEARCH_CTA.path)}
                className="mt-1 rounded-lg py-2.5 px-3 bg-red-600 text-white text-center font-bold"
              >
                {FLAT_SEARCH_CTA.label}
              </button>
              {user?.role === "customer" && (
                <button type="button" onClick={() => closeAndGo("/customer")} className="text-left rounded-lg py-2 px-2 hover:bg-white/5">
                  Customer dashboard
                </button>
              )}
              {user?.role === "seller" && (
                <button type="button" onClick={() => closeAndGo("/seller")} className="text-left rounded-lg py-2 px-2 hover:bg-white/5">
                  Seller dashboard
                </button>
              )}
              {(user?.role === "admin" || user?.role === "sub_admin" || user?.role === "consultant") && (
                <button type="button" onClick={() => closeAndGo("/crm")} className="text-left rounded-lg py-2 px-2 hover:bg-white/5">
                  Staff CRM
                </button>
              )}
              {user?.role === "admin" && (
                <button type="button" onClick={() => closeAndGo("/admin")} className="text-left rounded-lg py-2 px-2 hover:bg-white/5 text-red-300">
                  Admin
                </button>
              )}
              {!user && (
                <button type="button" onClick={() => closeAndGo("/login")} className="text-left rounded-lg py-2 px-2 text-red-400 font-semibold">
                  Sign in / Register
                </button>
              )}
              {user && (
                <>
                  <p className="text-[11px] text-zinc-500 px-2 pt-2 break-all">{user.email}</p>
                  <button type="button" onClick={handleLogout} className="text-left rounded-lg py-2 px-2 text-red-400 font-semibold">
                    Logout
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function NavLink({ label, onClick, light }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors whitespace-nowrap ${
        light ? "text-white/85 hover:text-white hover:bg-white/10" : "text-zinc-300 hover:text-white hover:bg-white/5"
      }`}
    >
      {label}
    </button>
  );
}
