import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [role, setRole] = useState("customer");
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    let result;
    if (isSignup) {
      result = signup(email, password, role, email.split("@")[0]);
    } else {
      result = login(email, password);
    }
    if (result.success) {
      const r = result.role || role;
      if (r === "admin") navigate("/admin");
      else if (r === "seller") navigate("/seller");
      else navigate("/customer");
    } else {
      setError(result.error || "Login failed");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)" }}>
      <div style={{ background: "white", borderRadius: "16px", padding: "40px", width: "100%", maxWidth: "420px", boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#1e3a8a", textAlign: "center", margin: "0 0 4px" }}>MovEasy</h1>
        <p style={{ textAlign: "center", color: "#64748b", margin: "0 0 24px", fontSize: "14px" }}>{isSignup ? "Create your account" : "Sign in to your account"}</p>

        {error && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", textAlign: "center" }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Enter email" style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "12px", fontSize: "14px", boxSizing: "border-box" }} />

          <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter password" style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "12px", fontSize: "14px", boxSizing: "border-box" }} />

          {isSignup && (
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>I am a</label>
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                {["customer", "seller", "admin"].map((r) => (
                  <button type="button" key={r} onClick={() => setRole(r)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: role === r ? "2px solid #1e3a8a" : "1px solid #e2e8f0", background: role === r ? "#eff6ff" : "white", fontWeight: 600, fontSize: "13px", color: role === r ? "#1e3a8a" : "#64748b", cursor: "pointer", textTransform: "capitalize" }}>{r}</button>
                ))}
              </div>
            </div>
          )}

          <button type="submit" style={{ width: "100%", padding: "12px", background: "#1e3a8a", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}>{isSignup ? "Create Account" : "Sign In"}</button>
        </form>

        <p style={{ textAlign: "center", margin: "16px 0 0", fontSize: "13px", color: "#64748b" }}>{isSignup ? "Already have an account?" : "No account?"} <button onClick={() => { setIsSignup(!isSignup); setError(""); }} style={{ color: "#1e3a8a", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: "13px" }}>{isSignup ? "Sign In" : "Sign Up"}</button></p>

        <div style={{ marginTop: "20px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#334155", margin: "0 0 6px" }}>Demo Credentials:</p>
          <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0" }}>Admin: admin@moveasy.com / admin123</p>
          <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0" }}>Seller: seller@moveasy.com / seller123</p>
          <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0" }}>Customer: customer@moveasy.com / customer123</p>
        </div>
      </div>
    </div>
  );
}
