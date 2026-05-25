import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MovEAZYLogo from "../branding/MovEAZYLogo";
import {
  PRIMARY_NAV_LINKS,
  isNavLinkActive,
} from "../../config/navLinks";

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
  const { pathname } = useLocation();
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
        className="mx-auto flex h-12 w-full max-w-[1440px] items-center gap-2 sm:gap-3 pl-3 pr-3 sm:pl-4 sm:pr-5 lg:pl-5 lg:pr-6"
        layout
      >
        <motion.button
          type="button"
          onClick={() => closeAndGo("/")}
          className="shrink-0 flex items-center -ml-0.5"
          whileTap={{ scale: 0.98 }}
          aria-label="MovEazy home"
        >
          <MovEAZYLogo size="nav" />
        </motion.button>

        <nav
          className="hidden lg:flex min-w-0 flex-1 items-center gap-4 ml-1 xl:ml-6"
          aria-label="Main"
        >
          {PRIMARY_NAV_LINKS.map((item) => {
            if (item.children && Array.isArray(item.children)) {
              return <ServicesDropdown key={item.label} item={item} closeAndGo={closeAndGo} pathname={pathname} />;
            }
            return (
              <NavLink
                key={item.path}
                label={item.label}
                active={isNavLinkActive(pathname, item.path)}
                onClick={() => closeAndGo(item.path)}
              />
            );
          })}
        </nav>

        <motion.div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto">
{user ? (
            <motion.div className="hidden lg:flex items-center gap-1.5">
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
              <button
                type="button"
                onClick={() => closeAndGo("/customer")}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 border border-white/12 bg-white/[0.06] hover:bg-white/10 transition-colors"
                title={user.name || user.email}
              >
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white" style={{ background: "linear-gradient(135deg,#e85a4f,#f97316)" }}>
                  {(user.name || user.email || "?")[0].toUpperCase()}
                </span>
                <span className="text-xs font-semibold text-zinc-100 max-w-[80px] truncate">{user.name || user.email?.split("@")[0]}</span>
              </button>
            </motion.div>
          ) : (
            <motion.button
              type="button"
              onClick={() => closeAndGo("/login")}
              className="hidden lg:inline-flex rounded-lg px-3.5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
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
            <div className="px-3 py-3 flex flex-col gap-0.5 max-h-[75vh] overflow-y-auto">

              {/* Services section */}
              {PRIMARY_NAV_LINKS.map((item) => {
                if (item.children && Array.isArray(item.children)) {
                  return (
                    <div key={item.label}>
                      <div className="px-3 pt-3 pb-1.5 text-[10px] font-black tracking-widest uppercase text-zinc-500">
                        {item.label}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {item.children.map((c) => {
                          const active = isNavLinkActive(pathname, c.path);
                          return (
                            <button
                              key={c.path}
                              type="button"
                              onClick={() => closeAndGo(c.path)}
                              className={`text-left rounded-xl px-4 py-3 text-[15px] font-semibold transition-colors ${
                                active
                                  ? "bg-white/[0.10] text-white"
                                  : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                              }`}
                              aria-current={active ? "page" : undefined}
                            >
                              {active && <span className="mr-2 text-red-400">▸</span>}
                              {c.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                const active = isNavLinkActive(pathname, item.path);
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => closeAndGo(item.path)}
                    className={`text-left rounded-xl px-4 py-3 text-[15px] font-semibold transition-colors ${
                      active
                        ? "bg-white/[0.10] text-white"
                        : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {active && <span className="mr-2 text-red-400">▸</span>}
                    {item.label}
                  </button>
                );
              })}

              {/* Divider */}
              <div className="my-2 border-t border-white/[0.07]" />

              {/* User / auth section */}
              {user ? (
                <>
                  <button type="button" onClick={() => closeAndGo("/customer")} className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-white/[0.06] transition-colors">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black text-white shrink-0" style={{ background: "linear-gradient(135deg,#e85a4f,#f97316)" }}>
                      {(user.name || user.email || "?")[0].toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-zinc-100 truncate">{user.name || user.email?.split("@")[0]}</div>
                      <div className="text-[11px] text-zinc-500 truncate">{user.email}</div>
                    </div>
                  </button>
                  {user.role === "seller" && (
                    <button type="button" onClick={() => closeAndGo("/seller")} className="text-left rounded-xl px-4 py-2.5 text-[14px] font-semibold text-zinc-400 hover:bg-white/[0.06] hover:text-white transition-colors">
                      Seller dashboard
                    </button>
                  )}
                  {(user.role === "admin" || user.role === "sub_admin" || user.role === "consultant") && (
                    <button type="button" onClick={() => closeAndGo("/crm")} className="text-left rounded-xl px-4 py-2.5 text-[14px] font-semibold text-zinc-400 hover:bg-white/[0.06] hover:text-white transition-colors">
                      Staff CRM
                    </button>
                  )}
                  {user.role === "admin" && (
                    <button type="button" onClick={() => closeAndGo("/admin")} className="text-left rounded-xl px-4 py-2.5 text-[14px] font-semibold text-red-400 hover:bg-white/[0.06] transition-colors">
                      Admin
                    </button>
                  )}
                </>
              ) : (
                <button type="button" onClick={() => closeAndGo("/login")}
                  className="mx-1 rounded-xl px-4 py-3 text-[15px] font-bold text-center text-white transition-colors"
                  style={{ background: "#dc2626" }}>
                  Sign in / Register
                </button>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function NavLink({ label, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`relative shrink-0 rounded-lg px-3 py-2 text-[13px] xl:text-[15px] font-bold tracking-tight transition-colors whitespace-nowrap ${
        active
          ? "text-white after:absolute after:bottom-0.5 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-red-500"
          : "text-zinc-200 hover:text-white hover:bg-white/[0.06]"
      }`}
    >
      {label}
    </button>
  );
}

function ServicesDropdown({ item, closeAndGo, pathname }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const closeTimer = useRef(null);

  const scheduleClose = () => { closeTimer.current = setTimeout(() => setOpen(false), 150); };
  const cancelClose = () => clearTimeout(closeTimer.current);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => { cancelClose(); setOpen(true); }}
        onMouseLeave={scheduleClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative shrink-0 flex items-center gap-1 rounded-lg px-2 py-2 text-[13px] xl:text-[15px] font-bold tracking-tight transition-colors whitespace-nowrap text-zinc-200 hover:text-white hover:bg-white/[0.06]"
      >
        {item.label}
        <svg
          className={`w-3 h-3 opacity-50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <div style={{ position: "absolute", minWidth: "180px", left: "50%", transform: "translateX(-50%)", top: "100%", marginTop: "6px", zIndex: 60 }}>
          <motion.div
            key="services-menu"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            role="menu"
            aria-label="Services"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            className="rounded-2xl bg-white border border-zinc-200 shadow-[0_12px_40px_rgba(0,0,0,0.15)] overflow-hidden"
          >
            {/* Nav links — vertical with black dividers */}
            <div className="flex flex-col">
              {item.children.map((c, i) => {
                const active = isNavLinkActive(pathname, c.path);
                return (
                  <div key={c.path}>
                    {i > 0 && <div className="border-t border-black/10 mx-4" />}
                    <Link
                      to={c.path}
                      role="menuitem"
                      onClick={() => { cancelClose(); setOpen(false); }}
                      className={`block whitespace-nowrap px-6 py-3 text-[14px] font-bold text-center transition-colors ${
                        active ? "bg-zinc-100 text-black" : "text-zinc-800 hover:bg-zinc-50 hover:text-black"
                      }`}
                    >
                      {c.label}
                    </Link>
                  </div>
                );
              })}
            </div>

          </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
