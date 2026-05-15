import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MovEAZYLogo from "../branding/MovEAZYLogo";
import { FLAT_SEARCH_CTA, PRIMARY_NAV_LINKS } from "../../config/navLinks";

const NAV_BG = "bg-[#000000]";

const chipBtn =
  "rounded-lg px-2.5 py-1.5 text-xs font-semibold border border-white/12 bg-white/[0.06] text-zinc-100 hover:bg-white/10 transition-colors";
const chipAdmin =
  "rounded-lg px-2.5 py-1.5 text-xs font-semibold border border-red-500/35 bg-red-600/25 text-red-50 hover:bg-red-600/35 transition-colors";

/**
 * @param {{ variant?: "solid" | "overlay" }} props
 */
export default function Navbar({ variant = "solid" }) {
  void variant;
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const borderClass = scrolled
    ? "border-b border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
    : "border-b border-white/[0.05]";

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
    <header
      className={`sticky top-0 z-50 transition-[border-color,box-shadow] duration-300 ${NAV_BG} ${borderClass}`}
    >
      <motion.div
        className="mx-auto flex h-12 w-full max-w-[1440px] items-center gap-3 sm:gap-4 pl-3 pr-3 sm:pl-4 sm:pr-5 lg:pl-5 lg:pr-6"
        layout
      >
        {/* Logo — flush left */}
        <motion.button
          type="button"
          onClick={() => closeAndGo("/")}
          className="shrink-0 flex items-center -ml-0.5"
          whileTap={{ scale: 0.98 }}
          aria-label="MovEazy home"
        >
          <MovEAZYLogo size="nav" />
        </motion.button>

        {/* Primary links — sit next to logo, not centered in empty space */}
        <nav
          className="hidden lg:flex min-w-0 flex-1 items-center gap-0.5 ml-2 xl:ml-6"
          aria-label="Main"
        >
          {PRIMARY_NAV_LINKS.map(({ label, path }) => (
            <NavLink key={path} label={label} onClick={() => closeAndGo(path)} />
          ))}
        </nav>

        {/* Actions */}
        <motion.div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto">
          <motion.button
            type="button"
            onClick={() => closeAndGo(FLAT_SEARCH_CTA.path)}
            className="hidden sm:inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 border border-red-500/70 whitespace-nowrap shadow-[0_2px_12px_rgba(220,38,38,0.35)]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {FLAT_SEARCH_CTA.label}
          </motion.button>

          {user ? (
            <div className="hidden lg:flex items-center gap-1.5">
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
              className="hidden sm:inline-flex rounded-lg px-3.5 py-2 text-sm font-semibold text-white border border-white/15 hover:bg-white/[0.08]"
              whileTap={{ scale: 0.98 }}
            >
              Sign in
            </motion.button>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/[0.06] text-zinc-100 text-base font-bold"
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? "✕" : "☰"}
          </button>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`lg:hidden overflow-hidden border-t border-white/[0.08] ${NAV_BG}`}
          >
            <motion.div className="px-4 py-3 grid gap-0.5 text-[15px] font-medium text-zinc-100 max-h-[70vh] overflow-y-auto">
              {PRIMARY_NAV_LINKS.map(({ label, path }) => (
                <button
                  key={path}
                  type="button"
                  onClick={() => closeAndGo(path)}
                  className="text-left rounded-lg py-2.5 px-2 hover:bg-white/[0.06] hover:text-white"
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => closeAndGo("/map")}
                className="text-left rounded-lg py-2.5 px-2 hover:bg-white/[0.06] text-zinc-400"
              >
                Explore map
              </button>
              <button
                type="button"
                onClick={() => closeAndGo(FLAT_SEARCH_CTA.path)}
                className="mt-2 rounded-lg py-3 px-3 bg-red-600 text-white text-center text-sm font-bold"
              >
                {FLAT_SEARCH_CTA.label}
              </button>
              {user?.role === "customer" && (
                <button type="button" onClick={() => closeAndGo("/customer")} className="text-left rounded-lg py-2 px-2 hover:bg-white/[0.06]">
                  Customer dashboard
                </button>
              )}
              {user?.role === "seller" && (
                <button type="button" onClick={() => closeAndGo("/seller")} className="text-left rounded-lg py-2 px-2 hover:bg-white/[0.06]">
                  Seller dashboard
                </button>
              )}
              {(user?.role === "admin" || user?.role === "sub_admin" || user?.role === "consultant") && (
                <button type="button" onClick={() => closeAndGo("/crm")} className="text-left rounded-lg py-2 px-2 hover:bg-white/[0.06]">
                  Staff CRM
                </button>
              )}
              {user?.role === "admin" && (
                <button type="button" onClick={() => closeAndGo("/admin")} className="text-left rounded-lg py-2 px-2 hover:bg-white/[0.06] text-red-300">
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
                  <p className="text-xs text-zinc-500 px-2 pt-2 break-all">{user.email}</p>
                  <button type="button" onClick={handleLogout} className="text-left rounded-lg py-2 px-2 text-red-400 font-semibold">
                    Logout
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function NavLink({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-3 py-2 text-[15px] font-semibold tracking-tight text-zinc-200 hover:text-white hover:bg-white/[0.06] transition-colors whitespace-nowrap"
    >
      {label}
    </button>
  );
}
