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
      return { success: false, error: "Invalid admin credentials" };
    }
    const users = getUsers();
    const existing = users[e];
    if (!existing) return { success: false, error: "No account found. Please sign up first." };
    if (existing.password !== password) return { success: false, error: "Wrong password" };
    const u = { email: e, role: existing.role || "customer", name: existing.name };
    setUser(u);
    localStorage.setItem("moveasy_session", JSON.stringify(u));
    return { success: true, role: u.role };
  };

  const signup = (email, password, name) => {
    const e = email.toLowerCase().trim();
    if (ADMIN_EMAILS.includes(e)) return { success: false, error: "This email is reserved." };
    const users = getUsers();
    if (users[e]) return { success: false, error: "Account already exists. Please login." };
    users[e] = { password, name: name || e.split("@")[0], role: "customer" };
    saveUsers(users);
    const u = { email: e, role: "customer", name: users[e].name };
    setUser(u);
    localStorage.setItem("moveasy_session", JSON.stringify(u));
    return { success: true };
  };

  const requestSeller = () => {
    if (!user) return;
    const requests = getSellerRequests();
    if (requests.find((r) => r.email === user.email)) return;
    requests.push({ email: user.email, name: user.name, date: new Date().toISOString(), status: "pending" });
    saveSellerRequests(requests);
  };

  const approveSeller = (email) => {
    const users = getUsers();
    if (users[email]) { users[email].role = "seller"; saveUsers(users); }
    const requests = getSellerRequests();
    saveSellerRequests(requests.map((r) => r.email === email ? { ...r, status: "approved" } : r));
  };

  const rejectSeller = (email) => {
    const requests = getSellerRequests();
    saveSellerRequests(requests.map((r) => r.email === email ? { ...r, status: "rejected" } : r));
  };

  const logout = () => { setUser(null); localStorage.removeItem("moveasy_session"); };

  const refreshRole = () => {
    if (!user || ADMIN_EMAILS.includes(user.email)) return;
    const users = getUsers();
    const u = users[user.email];
    if (u && u.role !== user.role) {
      const updated = { ...user, role: u.role };
      setUser(updated);
      localStorage.setItem("moveasy_session", JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, requestSeller, approveSeller, rejectSeller, refreshRole, getSellerRequests, ADMIN_EMAILS }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
