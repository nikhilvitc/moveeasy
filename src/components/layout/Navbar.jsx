import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Smart scroller that safely handles React HashRouter conflicts
  const scrollTo = (id) => {
    if (window.location.hash && window.location.hash !== "#/") {
      navigate("/");
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 300);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 bg-white border-b border-gray-100 shadow-sm">
      
      {/* LOGO */}
      <div onClick={() => navigate("/")} className="cursor-pointer text-2xl font-black tracking-tight flex items-center">
        <span className="text-black">Mov</span>
        <span className="text-red-500">EAZY</span>
      </div>

      {/* CENTER LINKS */}
      <div className="hidden lg:flex items-center gap-8 text-[15px] font-semibold text-gray-600">
        <span onClick={() => scrollTo("services")} className="cursor-pointer hover:text-black transition-colors">Services</span>
        <span onClick={() => scrollTo("guarantee")} className="cursor-pointer hover:text-black transition-colors">Guarantee</span>
        <span onClick={() => scrollTo("listings")} className="cursor-pointer hover:text-black transition-colors">Listings</span>
        
        {/* NEW EXPLORE MAP BUTTON */}
         <button 
           onClick={() => navigate("/map")} 
           className="cursor-pointer font-bold text-blue-700 bg-blue-50 px-5 py-1.5 rounded-full hover:bg-blue-100 transition-colors flex items-center gap-2 border border-blue-200"
         >
          🗺️ Explore Map
        </button>
      </div>

      {/* RIGHT SIDE (AUTH & ACTIONS) */}
      <div className="flex items-center gap-4">
        <button className="hidden xl:block px-5 py-2 text-sm font-bold border-2 border-black rounded-full hover:bg-gray-50 transition-colors">
          Book A Consultation
        </button>
        
        {user ? (
          <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
            {user.role === "customer" && (
              <button
                onClick={() => navigate("/customer")}
                className="px-4 py-1.5 border border-blue-200 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
              >
                Customer Dashboard
              </button>
            )}
            {user.role === "seller" && (
              <button
                onClick={() => navigate("/seller")}
                className="px-4 py-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-full hover:bg-emerald-100 transition-colors"
              >
                Seller Dashboard
              </button>
            )}
            {user.role === "admin" && (
              <button
                onClick={() => navigate("/admin")}
                className="px-4 py-1.5 border border-indigo-200 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors"
              >
                Admin Dashboard
              </button>
            )}
            <span className="hidden sm:inline-flex items-center gap-1 opacity-75">👤 {user.email}</span>
            <button 
              onClick={() => { logout(); navigate("/login"); }} 
              className="px-4 py-1.5 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors flex items-center gap-1"
            >
              ↪ Logout
            </button>
          </div>
        ) : (
          <button onClick={() => navigate("/login")} className="px-6 py-2 text-sm font-bold text-white bg-red-500 rounded-full hover:bg-red-600 transition-colors shadow-sm">
            Sign In / Register
          </button>
        )}
      </div>
    </nav>
  );
}
