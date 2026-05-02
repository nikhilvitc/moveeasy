import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

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
    <nav className="sticky top-0 z-50 border-b border-primary-light/40 bg-white/90 backdrop-blur-lg shadow-navbar">
      <div className="flex items-center justify-between px-4 md:px-8 py-3">
      
      {/* LOGO */}
      <div onClick={() => closeAndGo("/")} className="cursor-pointer text-2xl font-black tracking-tight flex items-center">
        <span className="text-ink">Mov</span>
        <span className="text-primary">EAZY</span>
      </div>

      {/* CENTER LINKS */}
      <div className="hidden lg:flex items-center gap-7 text-[14px] font-semibold text-ink-muted">
        <span onClick={() => closeAndGo("/services")} className="cursor-pointer hover:text-primary-darker transition-colors">Services</span>
        <span onClick={() => closeAndGo("/guarantee")} className="cursor-pointer hover:text-primary-darker transition-colors">Guarantee</span>
        <span onClick={() => closeAndGo("/map")} className="cursor-pointer hover:text-primary-darker transition-colors">Listings</span>
        <span onClick={() => closeAndGo("/activity")} className="cursor-pointer hover:text-primary-darker transition-colors">Saved</span>
        <span onClick={() => closeAndGo("/contact")} className="cursor-pointer hover:text-primary-darker transition-colors">Contact</span>
        
        {/* EXPLORE MAP BUTTON */}
         <button 
           onClick={() => closeAndGo("/map")} 
           className="cursor-pointer font-bold text-sky-800 bg-sky-50 px-4 py-1.5 rounded-full hover:bg-sky-100/90 transition-colors flex items-center gap-2 border border-sky-200/80 shadow-sm"
         >
          🗺️ Explore Map
        </button>
      </div>

      {/* RIGHT SIDE (AUTH & ACTIONS) */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => closeAndGo("/contact")}
          className="hidden xl:block px-5 py-2 text-sm font-bold border-2 border-ink/15 text-ink rounded-full hover:border-primary/40 hover:bg-primary-soft/50 transition-colors">
          Book A Consultation
        </button>
        
        {user ? (
          <div className="hidden lg:flex items-center gap-3 text-sm font-semibold text-ink-muted">
            {user.role === "customer" && (
              <button
                onClick={() => closeAndGo("/customer")}
                className="px-4 py-1.5 border border-blue-200 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
              >
                Customer Dashboard
              </button>
            )}
            {user.role === "seller" && (
              <button
                onClick={() => closeAndGo("/seller")}
                className="px-4 py-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-full hover:bg-emerald-100 transition-colors"
              >
                Seller Dashboard
              </button>
            )}
            {user.role === "admin" && (
              <button
                onClick={() => closeAndGo("/admin")}
                className="px-4 py-1.5 border border-indigo-200 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors"
              >
                Admin Dashboard
              </button>
            )}
            <span className="hidden sm:inline-flex items-center gap-1 opacity-75">👤 {user.email}</span>
            <button 
              onClick={handleLogout}
              className="px-4 py-1.5 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors flex items-center gap-1"
            >
              ↪ Logout
            </button>
          </div>
        ) : (
          <button onClick={() => closeAndGo("/login")} className="hidden sm:block px-6 py-2 text-sm font-bold text-white bg-primary rounded-full hover:bg-primary-dark transition-colors shadow-red">
            Sign In / Register
          </button>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden px-3 py-2 rounded-lg border border-gray-200 text-gray-700"
          aria-label="Toggle menu"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-primary-light/30 px-4 py-4 bg-surface-pink/80">
          <div className="grid gap-3 text-sm font-semibold text-ink">
            <button onClick={() => closeAndGo("/services")} className="text-left">Services</button>
            <button onClick={() => closeAndGo("/guarantee")} className="text-left">Guarantee</button>
            <button onClick={() => closeAndGo("/map")} className="text-left">Listings / Map</button>
            <button onClick={() => closeAndGo("/activity")} className="text-left">Saved and activity</button>
            <button onClick={() => closeAndGo("/contact")} className="text-left">Contact</button>
            {user?.role === "customer" && <button onClick={() => closeAndGo("/customer")} className="text-left">Customer Dashboard</button>}
            {user?.role === "seller" && <button onClick={() => closeAndGo("/seller")} className="text-left">Seller Dashboard</button>}
            {user?.role === "admin" && <button onClick={() => closeAndGo("/admin")} className="text-left">Admin Dashboard</button>}
            {!user && (
              <button
                onClick={() => closeAndGo("/login")}
                className="mt-1 px-4 py-2 rounded-full bg-red-500 text-white text-center"
              >
                Sign In / Register
              </button>
            )}
            {user && (
              <>
                <div className="text-xs text-gray-500 break-all">👤 {user.email}</div>
                <button onClick={handleLogout} className="text-left text-red-600">Logout</button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
