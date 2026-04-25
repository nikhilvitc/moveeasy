import { createContext, useContext, useState, useEffect } from "react";




const AuthContext = createContext(null);




const DEMO_USERS = {
    "admin@moveasy.com": { password: "admin123", role: "admin", name: "Admin User" },
    "seller@moveasy.com": { password: "seller123", role: "seller", name: "Demo Seller" },
    "customer@moveasy.com": { password: "customer123", role: "customer", name: "Demo Customer" },
};




export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);




  useEffect(() => {
        const saved = localStorage.getItem("moveasy_user");
        if (saved) {
                try { setUser(JSON.parse(saved)); } catch(e) { localStorage.removeItem("moveasy_user"); }
        }
        setLoading(false);
  }, []);




  const login = (email, password) => {
        const demo = DEMO_USERS[email];
        if (demo && demo.password === password) {
                const u = { email, role: demo.role, name: demo.name, uid: email };
                setUser(u);
                localStorage.setItem("moveasy_user", JSON.stringify(u));
                return { success: true, role: demo.role };
        }
        return { success: false, error: "Invalid email or password" };
  };




  const signup = (email, password, role, name) => {
        const u = { email, role: role || "customer", name: name || email.split("@")[0], uid: email };
        setUser(u);
        localStorage.setItem("moveasy_user", JSON.stringify(u));
        return { success: true };
  };




  const logout = () => {
        setUser(null);
        localStorage.removeItem("moveasy_user");
  };




  const profile = user ? { role: user.role, name: user.name } : null;




  return (
        <AuthContext.Provider value={{ user, profile, loading, login, signup, logout }}>
          {children}
        </AuthContext.Provider>
      );
}




export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}

