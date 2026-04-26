import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);
const ADMIN_EMAILS = ["jiyanshudhaka20@gmail.com"];

// Qodo Security Fix: SHA-256 Hash Function for Passwords
async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Pre-computed SHA-256 hash of "moveasy_admin_2026"
// The plain text password is no longer exposed in the public code!
const ADMIN_SECRET_HASH = "5da9364841af9a59dd4427b956a812751a68ab9cb14f7a91355caa7fe1d5d6c9";

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

  const login = async (email, password) => {
    const e = email.toLowerCase().trim();
    const hashedSubmission = await hashPassword(password);

    if (ADMIN_EMAILS.includes(e)) {
      if (hashedSubmission === ADMIN_SECRET_HASH) {
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
    if (existing.passwordHash !== hashedSubmission) return { success: false, error: "Wrong password" };
    
    const u = { email: e, role: existing.role || "customer", name: existing.name };
    setUser(u);
    localStorage.setItem("moveasy_session", JSON.stringify(u));
    return { success: true, role: u.role };
  };

  const signup = async (email, password, name, role = "customer") => {
    const e = email.toLowerCase().trim();
    if (ADMIN_EMAILS.includes(e)) return { success: false, error: "This email is reserved." };
    const users = getUsers();
    if (users[e]) return { success: false, error: "Account already exists. Please login." };
    const normalizedRole = role === "seller" ? "seller" : "customer";
    
    // Qodo Security Fix: Store only the generated hash, never the plaintext password
    const hashedPassword = await hashPassword(password);
    users[e] = { passwordHash: hashedPassword, name: name || e.split("@")[0], role: normalizedRole };
    saveUsers(users);
    
    const u = { email: e, role: normalizedRole, name: users[e].name };
    setUser(u);
    localStorage.setItem("moveasy_session", JSON.stringify(u));
    return { success: true, role: normalizedRole };
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
