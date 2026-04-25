import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("moveasy_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem("moveasy_user");
      }
    }
    setLoading(false);
  }, []);

  const login = (email, password) => {
    const e = email.toLowerCase().trim();
    const isAdmin = e === "jiyanshudhaka20@gmail.com" && password === "moveasy_admin_2026";
    
    // Simple demo logic: anyone can login as customer, except the hardcoded admin
    const userData = { 
      email: e, 
      role: isAdmin ? "admin" : "customer", 
      id: Date.now(),
      sellerRequest: null 
    };
    
    setUser(userData);
    localStorage.setItem("moveasy_user", JSON.stringify(userData));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("moveasy_user");
  };

  const requestSeller = () => {
    if (!user) return;
    const updated = { ...user, sellerRequest: "pending" };
    setUser(updated);
    localStorage.setItem("moveasy_user", JSON.stringify(updated));
  };

  const refreshRole = () => {
    const saved = localStorage.getItem("moveasy_user");
    if (saved) setUser(JSON.parse(saved));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, requestSeller, refreshRole, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
