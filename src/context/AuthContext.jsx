import { createContext, useContext, useState, useEffect } from "react";


const AuthContext = createContext(null);


const ADMIN_EMAILS = ["jiyanshudhaka20@gmail.com"];


function getUsers() {
  try { return JSON.parse(localStorage.getItem("moveasy_users") || "{}"); } catch { return {}; }
}
function saveUsers(users) { localStorage.setItem("moveasy_users", JSON.stringify(users)); }
function getSellerRequests() {
  try { return JSON.parse(localStorage.getItem("moveasy_seller_requests") || "[]"); } catch { return []; }
}
function saveSellerRequests(r) { localStorage.setItem("moveasy_seller_requests", JSON.stringify(r)); }


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const saved = localStorage.getItem("moveasy_session");
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch { localStorage.removeItem("moveasy_session"); }
    }
    setLoading(false);
  }, []);


  const login = (email, password) => {
    const e = email.toLowerCase().trim();
    if (ADMIN_EMAILS.includes(e)) {
      if (password === "moveasy_admin_2026") {
        const u = { email: e, role: "admin", name: "Admin" };
        setUser(u);
        localStorage.setItem("moveasy_session", JSON.stringify(u));
        return { success: true, role: "admin" };
      }
