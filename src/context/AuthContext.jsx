import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);
const ADMIN_EMAILS = ["jiyanshudhaka20@gmail.com"];

const ADMIN_SECRET_HASH = "8e92a0d927c3abeb1d365851ceebb87ef93afff017fbb8bed4cbffc7662c129e";

async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getUsers() { try { return JSON.parse(localStorage.getItem("moveasy_users") || "{}"); } catch { return {}; } }
function saveUsers(users) { localStorage.setItem("moveasy_users", JSON.stringify(users)); }
function getSellerRequests() { try { return JSON.parse(localStorage.getItem("moveasy_seller_requests") || "[]"); } catch { return []; } }
function saveSellerRequests(r) { localStorage.setItem("moveasy_seller_requests", JSON.stringify(r)); }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("moveasy_session");
    if (saved) { try { setUser(JSON.parse(saved)); } catch { localStorage.removeItem("moveasy_session"); } }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const e = email.toLowerCase().trim();
      const hashedSubmission = await hashPassword(password);
      if (ADMIN_EMAILS.includes(e)) {
        if (hashedSubmission === ADMIN_SECRET_HASH) {
          const u = { email: e, role: "admin", name: "Admin" };
          setUser(u); localStorage.setItem("moveasy_session", JSON.stringify(u)); return { success: true, role: "admin" };
        }
        return { success: false, error: "Invalid admin credentials" };
      }
      const users = getUsers();
      const existing = users[e];
      if (!existing) return { success: false, error: "No account found. Please sign up." };
      if (existing.passwordHash !== hashedSubmission) return { success: false, error: "Wrong password" };
      const u = { email: e, role: existing.role || "customer", name: existing.name };
      setUser(u); localStorage.setItem("moveasy_session", JSON.stringify(u)); return { success: true, role: u.role };
    } catch (err) { return { success: false, error: "Auth Error: " + err.message }; }
  };

  const signup = async (email, password, name) => {
    try {
      const e = email.toLowerCase().trim();
      if (ADMIN_EMAILS.includes(e)) return { success: false, error: "Email reserved." };
      const users = getUsers();
      if (users[e]) return { success: false, error: "Account exists." };
      const hashedPassword = await hashPassword(password);
      users[e] = { passwordHash: hashedPassword, name: name || e.split("@")[0], role: "customer" };
      saveUsers(users);
      const u = { email: e, role: "customer", name: users[e].name };
      setUser(u); localStorage.setItem("moveasy_session", JSON.stringify(u)); return { success: true };
    } catch (err) { return { success: false, error: "Signup Error: " + err.message }; }
  };

  const logout = () => { setUser(null); localStorage.removeItem("moveasy_session"); };
  const requestSeller = () => { if(!user) return; const req = getSellerRequests(); if(req.find(r=>r.email===user.email)) return; req.push({email:user.email, name:user.name, status:"pending"}); saveSellerRequests(req); };
  const approveSeller = (email) => { const u = getUsers(); if (u[email]) { u[email].role = "seller"; saveUsers(u); } const req = getSellerRequests(); saveSellerRequests(req.map(r=>r.email===email?{...r,status:"approved"}:r)); };
  const rejectSeller = (email) => { const req = getSellerRequests(); saveSellerRequests(req.map(r=>r.email===email?{...r,status:"rejected"}:r)); };
  const refreshRole = () => { if (!user || ADMIN_EMAILS.includes(user.email)) return; const u = getUsers(); if (u[user.email] && u[user.email].role !== user.role) { const updated = { ...user, role: u[user.email].role }; setUser(updated); localStorage.setItem("moveasy_session", JSON.stringify(updated)); } };
  const getAllUsers = () => getUsers();
  const promoteToAdmin = (email) => { const u = getUsers(); if (u[email]) { u[email].role = "admin"; saveUsers(u); } };
  const updateLeadStatus = (index, status) => {
     const leads = JSON.parse(localStorage.getItem("moveasy_bookings") || "[]");
     if (leads[index]) { leads[index].status = status; localStorage.setItem("moveasy_bookings", JSON.stringify(leads)); }
  };

  return <AuthContext.Provider value={{ user, loading, login, signup, logout, requestSeller, approveSeller, rejectSeller, refreshRole, getSellerRequests, ADMIN_EMAILS, getAllUsers, promoteToAdmin, updateLeadStatus }}>{children}</AuthContext.Provider>;
}

export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error("must use AuthProvider"); return ctx; }
