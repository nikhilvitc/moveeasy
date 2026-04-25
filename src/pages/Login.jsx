import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    let result;
    if (isSignup) {
      if (!name.trim()) { setError("Please enter your name"); return; }
      result = signup(email, password, name);
    } else {
      result = login(email, password);
    }
    if (result.success) {
      const r = result.role || "customer";
      if (r === "admin") navigate("/admin");
      else if (r === "seller") navigate("/seller");
      else navigate("/customer");
    } else {
      setError(result.error || "Something went wrong");
    }
  };

  const box = { background: "white", borderRadius: "16px", padding: "40px", width: "100%", maxWidth: "420px", boxShadow: "0 25px 50px rgba(0,0,0,0.25)" };
  const inp = { width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "12px", fontSize: "14px", boxSizing: "border-box" };
  const lbl = { fontSize: "13px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)" }}>
      <div style={box}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#1e3a8a", textAlign: "center", margin: "0 0 4px" }}>MovEasy</h1>
        <p style={{ textAlign: "center", color: "#64748b", margin: "0 0 24px", fontSize: "14px" }}>
          {isSignup ? "Create your account" : "Sign in to your account"}
        </p>

        {error && (
          <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", textAlign: "center" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <div>
              <label style={lbl}>Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={inp} />
            </div>
          )}

          <label style={lbl}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Enter email" style={inp} />

          <label style={lbl}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter password" minLength="6" style={inp} />

          <button type="submit" style={{ width: "100%", padding: "12px", background: "#1e3a8a", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "15px", cursor: "pointer", marginTop: "4px" }}>
            {isSignup ? "Create Account" : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", margin: "16px 0 0", fontSize: "13px", color: "#64748b" }}>
          {isSignup ? "Already have an account? " : "No account? "}
          <button onClick={() => { setIsSignup(!isSignup); setError(""); }} style={{ color: "#1e3a8a", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: "13px" }}>
            {isSignup ? "Sign In" : "Sign Up"}
          </button>
        </p>

        <div style={{ marginTop: "20px", padding: "12px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#166534", margin: "0 0 4px" }}>How it works:</p>
          <p style={{ fontSize: "11px", color: "#166534", margin: "2px 0" }}>1. Sign up as a Customer (free)</p>
          <p style={{ fontSize: "11px", color: "#166534", margin: "2px 0" }}>2. Apply as Seller from your dashboard</p>
          <p style={{ fontSize: "11px", color: "#166534", margin: "2px 0" }}>3. Admin approves your seller request</p>
        </div>
      </div>
    </div>
  );
      }
