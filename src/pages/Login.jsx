import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [signupRole, setSignupRole] = useState("customer");
  const [selectedAccountType, setSelectedAccountType] = useState("customer");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const { login, signup, resendVerificationEmail, ADMIN_EMAILS } = useAuth();
  const [resendBusy, setResendBusy] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const navigate = useNavigate();
  const roleCards = [
    { id: "admin", title: "Admin", hint: "Manage all listings and assignments" },
    { id: "seller", title: "Seller", hint: "Manage your listings and leads" },
    { id: "customer", title: "Customer", hint: "Browse homes and apply quickly" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setShowResendVerification(false);

    if (selectedAccountType === "admin" && isSignup) {
      setError("Admin mode supports sign in only.");
      return;
    }
    if (selectedAccountType !== "admin" && isAdminEmail) {
      setError("You entered admin email in customer/seller mode. Select Admin card to continue.");
      return;
    }
    if (selectedAccountType === "admin" && !isAdminEmail) {
      setError("Admin mode requires the reserved admin email.");
      return;
    }

    let result;
    if (isSignup) {
      if (!name.trim()) { setError("Please enter your name"); return; }
      result = await signup(email, password, name, signupRole);
    } else {
      result = await login(email, password);
    }
    if (result.success) {
      if (result.requiresVerification) {
        setIsSignup(false);
        setPassword("");
        setInfo(result.info || "Verification email sent. Please verify your email before login.");
        return;
      }
      const r = result.role || "customer";
      if (r === "admin") navigate("/admin");
      else if (r === "seller") navigate("/seller");
      else navigate("/");
    } else {
      setError(result.error || "Something went wrong");
      setShowResendVerification(!!result.unverified);
    }
  };

  const handleResendVerification = async () => {
    setError("");
    setInfo("");
    setShowResendVerification(false);
    if (!email.trim() || !password) {
      setError("Enter your email and password, then click resend.");
      return;
    }
    setResendBusy(true);
    const result = await resendVerificationEmail(email, password);
    setResendBusy(false);
    if (result.success) setInfo(result.info || "Verification email sent.");
    else setError(result.error || "Could not resend.");
  };

  const box = { background: "white", borderRadius: "16px", padding: "40px", width: "100%", maxWidth: "420px", boxShadow: "0 25px 50px rgba(0,0,0,0.25)" };
  const inp = { width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "12px", fontSize: "14px", boxSizing: "border-box" };
  const lbl = { fontSize: "13px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" };
  const selectedTitle = roleCards.find((r) => r.id === selectedAccountType)?.title || "Customer";
  const normalizedEmail = email.toLowerCase().trim();
  const isAdminEmail = ADMIN_EMAILS.includes(normalizedEmail);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #fff1f2 0%, #fecdd3 100%)" }}>
      <div style={box}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#EF4444", textAlign: "center", margin: "0 0 4px" }}>MovEasy</h1>
        <p style={{ textAlign: "center", color: "#64748b", margin: "0 0 24px", fontSize: "14px" }}>
          {isSignup ? "Create your account" : "Sign in to your account"}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
          {roleCards.map((card) => {
            const active = selectedAccountType === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setSelectedAccountType(card.id);
                  setError("");
                  setInfo("");
                  if (card.id === "admin") {
                    setIsSignup(false);
                    setEmail("jiyanshudhaka20@gmail.com");
                    setInfo("Admin mode selected. Use admin credentials to sign in.");
                    return;
                  }
                  setIsSignup(true);
                  setSignupRole(card.id === "seller" ? "seller" : "customer");
                  setInfo(`${card.title} mode selected. Complete signup to create a ${card.title.toLowerCase()} account.`);
                }}
                style={{
                  border: active ? "1px solid #EF4444" : "1px solid #e2e8f0",
                  background: active ? "#fef2f2" : "#f8fafc",
                  borderRadius: "8px",
                  padding: "8px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 700, color: active ? "#EF4444" : "#1e293b" }}>{card.title}</div>
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>{card.hint}</div>
              </button>
            );
          })}
        </div>
        <p style={{ margin: "0 0 14px", fontSize: "11px", color: "#475569" }}>
          Selected account type: <strong>{selectedTitle}</strong>
        </p>
        {info && (
          <div style={{ background: "#ecfeff", color: "#155e75", padding: "10px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", textAlign: "center", border: "1px solid #a5f3fc" }}>
            {info}
          </div>
        )}

        {error && (
          <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", textAlign: "center" }}>
            {error}
            {showResendVerification && selectedAccountType !== "admin" && (
              <div style={{ marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendBusy}
                  style={{
                    padding: "8px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    borderRadius: "6px",
                    border: "1px solid #fca5a5",
                    background: "#fff",
                    color: "#b91c1c",
                    cursor: resendBusy ? "wait" : "pointer",
                  }}
                >
                  {resendBusy ? "Sending…" : "Resend verification email"}
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <div>
              <label style={lbl}>Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={inp} />
              <label style={lbl}>Account Type</label>
              <select
                value={signupRole}
                onChange={(e) => {
                  setSignupRole(e.target.value);
                  setSelectedAccountType(e.target.value);
                }}
                style={inp}
              >
                <option value="customer">Customer</option>
                <option value="seller">Seller / Broker</option>
              </select>
            </div>
          )}

          <label style={lbl}>Email (Gmail for new sign-ups)</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@gmail.com" style={inp} />

          <label style={lbl}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter password" minLength="6" style={inp} />

          <button type="submit" style={{ width: "100%", padding: "12px", background: "#EF4444", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "15px", cursor: "pointer", marginTop: "4px" }}>
            {isSignup ? `Create ${selectedTitle} Account` : `Sign In as ${selectedTitle}`}
          </button>
        </form>

        {selectedAccountType === "admin" ? (
          <p style={{ textAlign: "center", margin: "16px 0 0", fontSize: "13px", color: "#64748b" }}>
            Admin mode is sign-in only.
          </p>
        ) : (
          <p style={{ textAlign: "center", margin: "16px 0 0", fontSize: "13px", color: "#64748b" }}>
            {isSignup ? "Already have an account? " : "No account? "}
            <button
              onClick={() => {
                setError("");
                setInfo("");
                setIsSignup(!isSignup);
                if (!isSignup) setSelectedAccountType("customer");
              }}
              style={{ color: "#EF4444", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: "13px" }}
            >
              {isSignup ? "Sign In" : "Sign Up"}
            </button>
          </p>
        )}

        <div style={{ marginTop: "20px", padding: "12px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#166534", margin: "0 0 4px" }}>Roles available:</p>
          <p style={{ fontSize: "11px", color: "#166534", margin: "2px 0" }}>- Admin login: reserved admin email + password</p>
          <p style={{ fontSize: "11px", color: "#166534", margin: "2px 0" }}>- Seller/Broker login: signup with Seller account type</p>
          <p style={{ fontSize: "11px", color: "#166534", margin: "2px 0" }}>- Customer login: signup with Customer account type</p>
          <p style={{ fontSize: "11px", color: "#14532d", margin: "8px 0 0", lineHeight: 1.45 }}>
            New accounts use <strong>@gmail.com</strong> or <strong>@googlemail.com</strong>. Firebase sends a <strong>free verification link</strong> to your inbox; you must open it before sign-in. Optional welcome + admin alerts use <strong>EmailJS</strong> (free tier) when configured in GitHub Secrets — see docs.
          </p>
        </div>
      </div>
    </div>
  );
}
