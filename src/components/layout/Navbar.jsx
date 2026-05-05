import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navBtn =
  "rounded-md px-2.5 py-1.5 text-[12px] font-bold leading-tight border border-zinc-600 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:border-zinc-500 transition-colors";
const navBtnAdmin =
  "rounded-md px-2.5 py-1.5 text-[12px] font-bold leading-tight border border-red-800/80 bg-red-950/60 text-red-100 hover:bg-red-950 transition-colors";

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
          ? "border-red-900/30 bg-zinc-950/98 backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.35)]"
          : "border-red-900/20 bg-zinc-950/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.28)]"
      }`}
    >
      <div className="flex items-center justify-between px-2 sm:px-4 md:px-5 py-1 gap-2">
        <motion.div
          onClick={() => closeAndGo("/")}
          className="cursor-pointer flex items-center select-none shrink-0 leading-none"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          {/* Wide bar asset (~5:1): height caps bar thickness; width follows aspect ratio */}
          <img
            src="/logo-moveazy-bar.png"
            alt="MovEAZY"
            className="h-[24px] w-auto sm:h-[26px] md:h-[28px] max-h-[28px] block"
            decoding="async"
            fetchPriority="high"
          />
        </motion.div>

        <div className="hidden lg:flex items-center gap-1.5 xl:gap-2 text-[12px] font-semibold text-zinc-300 flex-wrap justify-end">
          {[
            { label: "Services", path: "/services" },
            { label: "Guarantee", path: "/guarantee" },
            { label: "Listings", path: "/map" },
            { label: "Saved", path: "/activity" },
          ].map(({ label, path }) => (
            <NavLink key={label} label={label} onClick={() => closeAndGo(path)} />
          ))}

          <motion.button
            type="button"
            onClick={() => closeAndGo("/map")}
            className="rounded-md px-3 py-1.5 text-[12px] font-bold leading-tight bg-red-600 text-white border border-red-700 hover:bg-red-500 shadow-[0_2px_10px_rgba(220,38,38,0.28)]"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            Explore map
          </motion.button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <div className="hidden lg:flex items-center gap-1.5 text-[12px] font-semibold">
              {user.role === "customer" && (
                <motion.button type="button" onClick={() => closeAndGo("/customer")} className={navBtn} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  Customer
                </motion.button>
              )}
              {user.role === "seller" && (
                <motion.button type="button" onClick={() => closeAndGo("/seller")} className={navBtn} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  Seller
                </motion.button>
              )}
              {user.role === "admin" && (
                <motion.button type="button" onClick={() => closeAndGo("/admin")} className={navBtnAdmin} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  Admin
                </motion.button>
              )}
              <span className="hidden xl:inline-flex max-w-[200px] truncate text-zinc-500 text-xs font-medium" title={user.email}>
                {user.email}
              </span>
              {user.authProvider === "google" && (
                <span
                  className="inline-flex items-center rounded-md border border-emerald-700/70 bg-emerald-950/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300"
                  title="Signed in with Google"
                >
                  Google
                </span>
              )}
              <motion.button type="button" onClick={handleLogout} className={navBtn} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                Logout
              </motion.button>
            </div>
          ) : (
            <motion.button
              type="button"
              onClick={() => closeAndGo("/login")}
              className="hidden sm:block rounded-md px-3.5 py-1.5 text-[12px] font-bold leading-tight text-white bg-red-600 border border-red-700 hover:bg-red-500 shadow-[0_2px_10px_rgba(220,38,38,0.28)]"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18 }}
            >
              Sign in / Register
            </motion.button>
          )}

          <motion.button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden rounded-md px-2 py-1.5 border border-zinc-600 bg-zinc-900 text-zinc-200 text-xs font-bold leading-none"
            whileHover={{ backgroundColor: "rgb(39 39 42)" }}
            whileTap={{ scale: 0.95 }}
            aria-label="Toggle menu"
          >
            {open ? "✕" : "☰"}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="lg:hidden border-t border-zinc-800 px-4 py-4 bg-zinc-950"
          >
            <div className="grid gap-2 text-sm font-semibold text-zinc-200">
              {[
                { label: "Services", path: "/services" },
                { label: "Guarantee", path: "/guarantee" },
                { label: "Listings / Map", path: "/map" },
                { label: "Saved & activity", path: "/activity" },
              ].map(({ label, path }) => (
                <button key={label} type="button" onClick={() => closeAndGo(path)} className="text-left rounded-lg py-2 px-2 hover:bg-zinc-900 hover:text-red-400 transition-colors">
                  {label}
                </button>
              ))}
              <button type="button" onClick={() => closeAndGo("/contact")} className="text-left rounded-lg py-2 px-2 hover:bg-zinc-900 text-red-400 font-bold">
                Contact / consultation
              </button>
              {user?.role === "customer" && (
                <button type="button" onClick={() => closeAndGo("/customer")} className="text-left rounded-lg py-2 px-2 hover:bg-zinc-900">
                  Customer dashboard
                </button>
              )}
              {user?.role === "seller" && (
                <button type="button" onClick={() => closeAndGo("/seller")} className="text-left rounded-lg py-2 px-2 hover:bg-zinc-900">
                  Seller dashboard
                </button>
              )}
              {user?.role === "admin" && (
                <button type="button" onClick={() => closeAndGo("/admin")} className="text-left rounded-lg py-2 px-2 hover:bg-zinc-900">
                  Admin dashboard
                </button>
              )}
              {!user && (
                <motion.button
                  type="button"
                  onClick={() => closeAndGo("/login")}
                  className="mt-1 rounded-lg px-4 py-2.5 bg-red-600 text-white text-center font-bold border border-red-700"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Sign in / Register
                </motion.button>
              )}
              {user && (
                <>
                  {user.authProvider === "google" && (
                    <div className="text-[11px] text-emerald-300 font-semibold">Signed in with Google</div>
                  )}
                  <div className="text-xs text-zinc-500 break-all pt-1">{user.email}</div>
                  <button type="button" onClick={handleLogout} className="text-left text-red-400 font-semibold rounded-lg py-2">
                    Logout
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

function NavLink({ label, onClick }) {
  return (
    <motion.span
      onClick={onClick}
      className="cursor-pointer relative py-0.5 px-0.5 group text-zinc-300"
      whileHover={{ color: "#f87171" }}
      transition={{ duration: 0.15 }}
    >
      {label}
      <span className="absolute bottom-0 left-0 h-0.5 w-0 rounded-full bg-red-500 transition-all duration-200 group-hover:w-full" aria-hidden="true" />
    </motion.span>
  );
}
