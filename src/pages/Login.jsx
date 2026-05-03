import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

export default function Login() {
  const [email,            setEmail]            = useState("");
  const [password,         setPassword]         = useState("");
  const [name,             setName]             = useState("");
  const [phone,            setPhone]            = useState("");
  const [signupRole,       setSignupRole]        = useState("customer");
  const [selectedAccountType, setSelectedAccountType] = useState("customer");
  const [error,            setError]            = useState("");
  const [info,             setInfo]             = useState("");
  const [isSignup,         setIsSignup]         = useState(false);
  const { login, signup, resendVerificationEmail } = useAuth();
  const [resendBusy, setResendBusy] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const navigate = useNavigate();

  const roleCards = [
    { id: "admin",    title: "Admin",    hint: "Manage all listings and assignments" },
    { id: "seller",   title: "Seller",   hint: "Manage your listings and leads" },
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

    let result;
    if (isSignup) {
      if (!name.trim())  { setError("Please enter your name");         return; }
      if (!phone.trim()) { setError("Please enter your phone number"); return; }
      result = await signup(email, password, name, signupRole, phone);
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
      if (result.emailWarning) {
        sessionStorage.setItem("moveasy_onboarding_email_warning", result.emailWarning);
      } else {
        sessionStorage.removeItem("moveasy_onboarding_email_warning");
      }
      const r = result.role || "customer";
      if      (r === "admin")  navigate("/admin");
      else if (r === "seller") navigate("/seller");
      else                     navigate("/");
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
    if (result.success) setInfo(result.info  || "Verification email sent.");
    else                setError(result.error || "Could not resend.");
  };

  const selectedTitle = roleCards.find((r) => r.id === selectedAccountType)?.title || "Customer";

  return (
    <div
      className="min-h-screen flex items-center justify-center overflow-hidden relative"
      style={{
        background:
          "linear-gradient(135deg, #1a0508 0%, #2d0a14 30%, #0f0c29 65%, #0a1628 100%)",
      }}
    >
      {/* Animated background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          style={{
            position: "absolute",
            top: "-10%",
            left: "-5%",
            width: 400,
            height: 400,
            borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
            background: "radial-gradient(circle, rgba(232,90,79,0.30) 0%, transparent 70%)",
            animation: "blob-move 12s ease-in-out infinite, float-slow 8s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-10%",
            right: "-5%",
            width: 380,
            height: 380,
            borderRadius: "40% 60% 70% 30% / 40% 70% 30% 60%",
            background: "radial-gradient(circle, rgba(14,165,233,0.22) 0%, transparent 70%)",
            animation: "blob-move 14s ease-in-out infinite 2s, float-slow 10s ease-in-out infinite 1s",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "60%",
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 70%)",
            animation: "float-slow 9s ease-in-out infinite 0.5s",
          }}
        />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: EASE }}
        className="relative w-full max-w-[440px] mx-4"
        style={{
          background: "rgba(255,255,255,0.07)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.13)",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12)",
          padding: "36px 32px",
        }}
      >
        {/* Inner gradient glow top */}
        <div
          className="absolute inset-x-0 top-0 h-[2px] rounded-t-[24px] pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(232,90,79,0.8) 30%, rgba(249,115,22,0.8) 50%, rgba(236,72,153,0.8) 70%, transparent 100%)",
          }}
          aria-hidden="true"
        />

        {/* Logo */}
        <div className="text-center mb-2">
          <h1 className="text-[32px] font-black tracking-tight gradient-text-shimmer">
            MovEasy
          </h1>
          <p className="text-white/55 text-[14px] mt-1">
            {isSignup ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-3 gap-2 mt-5 mb-1">
          {roleCards.map((card) => {
            const active = selectedAccountType === card.id;
            return (
              <motion.button
                key={card.id}
                type="button"
                onClick={() => {
                  setSelectedAccountType(card.id);
                  setError("");
                  setInfo("");
                  if (card.id === "admin") {
                    setIsSignup(false);
                    return;
                  }
                  setIsSignup(true);
                  setSignupRole(card.id === "seller" ? "seller" : "customer");
                }}
                className="text-left rounded-xl px-3 py-2.5 border transition-all duration-200 cursor-pointer"
                style={{
                  background: active
                    ? "linear-gradient(135deg, rgba(232,90,79,0.25), rgba(249,115,22,0.18))"
                    : "rgba(255,255,255,0.06)",
                  border: active
                    ? "1px solid rgba(232,90,79,0.55)"
                    : "1px solid rgba(255,255,255,0.10)",
                  boxShadow: active ? "0 4px 16px rgba(232,90,79,0.20)" : "none",
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <div
                  className="text-[12px] font-bold"
                  style={{ color: active ? "#ff8a7a" : "rgba(255,255,255,0.75)" }}
                >
                  {card.title}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>
                  {card.hint}
                </div>
              </motion.button>
            );
          })}
        </div>

        <p className="text-[11px] mb-4 mt-2" style={{ color: "rgba(255,255,255,0.40)" }}>
          Selected: <span style={{ color: "rgba(255,255,255,0.70)", fontWeight: 600 }}>{selectedTitle}</span>
        </p>

        {/* Info message */}
        <AnimatePresence>
          {info && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl px-4 py-3 mb-4 text-[13px] text-center overflow-hidden"
              style={{
                background: "rgba(14,165,233,0.15)",
                border: "1px solid rgba(14,165,233,0.30)",
                color: "#7dd3fc",
              }}
            >
              {info}
              <div className="mt-1 font-semibold" style={{ color: "#38bdf8" }}>
                Please check your Spam/Junk folder.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl px-4 py-3 mb-4 text-[13px] text-center overflow-hidden"
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.30)",
                color: "#fca5a5",
              }}
            >
              {error}
              {showResendVerification && selectedAccountType !== "admin" && (
                <div className="mt-2">
                  <motion.button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendBusy}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                    style={{
                      background: "rgba(255,255,255,0.10)",
                      border: "1px solid rgba(239,68,68,0.40)",
                      color: "#fca5a5",
                      cursor: resendBusy ? "wait" : "pointer",
                    }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {resendBusy ? "Sending…" : "Resend verification email"}
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <AnimatePresence>
            {isSignup && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mb-3">
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full h-10 rounded-xl px-3 text-[14px] outline-none transition-shadow"
                    style={{
                      background: "rgba(255,255,255,0.09)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      color: "rgba(255,255,255,0.90)",
                      caretColor: "#e85a4f",
                    }}
                    onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px rgba(232,90,79,0.40)")}
                    onBlur={(e)  => (e.target.style.boxShadow = "none")}
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Your phone number"
                    className="w-full h-10 rounded-xl px-3 text-[14px] outline-none transition-shadow"
                    style={{
                      background: "rgba(255,255,255,0.09)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      color: "rgba(255,255,255,0.90)",
                      caretColor: "#e85a4f",
                    }}
                    onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px rgba(232,90,79,0.40)")}
                    onBlur={(e)  => (e.target.style.boxShadow = "none")}
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
                    Account Type
                  </label>
                  <select
                    value={signupRole}
                    onChange={(e) => {
                      setSignupRole(e.target.value);
                      setSelectedAccountType(e.target.value);
                    }}
                    className="w-full h-10 rounded-xl px-3 text-[14px] outline-none"
                    style={{
                      background: "rgba(255,255,255,0.09)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      color: "rgba(255,255,255,0.90)",
                    }}
                  >
                    <option value="customer" style={{ background: "#1a0508", color: "#fff" }}>Customer</option>
                    <option value="seller"   style={{ background: "#1a0508", color: "#fff" }}>Seller / Broker</option>
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email */}
          <div className="mb-3">
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
              Email (Gmail for new sign-ups)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@gmail.com"
              className="w-full h-10 rounded-xl px-3 text-[14px] outline-none transition-shadow"
              style={{
                background: "rgba(255,255,255,0.09)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "rgba(255,255,255,0.90)",
                caretColor: "#e85a4f",
              }}
              onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px rgba(232,90,79,0.40)")}
              onBlur={(e)  => (e.target.style.boxShadow = "none")}
            />
          </div>

          {/* Password */}
          <div className="mb-5">
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter password"
              minLength="6"
              className="w-full h-10 rounded-xl px-3 text-[14px] outline-none transition-shadow"
              style={{
                background: "rgba(255,255,255,0.09)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "rgba(255,255,255,0.90)",
                caretColor: "#e85a4f",
              }}
              onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px rgba(232,90,79,0.40)")}
              onBlur={(e)  => (e.target.style.boxShadow = "none")}
            />
          </div>

          {/* Submit button */}
          <motion.button
            type="submit"
            className="w-full py-3 rounded-xl text-[15px] font-bold text-white relative overflow-hidden btn-glow-pulse"
            style={{
              background: "linear-gradient(135deg, #e85a4f 0%, #f97316 100%)",
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Shimmer */}
            <span
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.20) 50%, transparent 70%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 2s linear infinite",
              }}
              aria-hidden="true"
            />
            <span className="relative z-10">
              {isSignup ? `Create ${selectedTitle} Account` : `Sign In as ${selectedTitle}`}
            </span>
          </motion.button>
        </form>

        {/* Admin note */}
        {selectedAccountType === "admin" ? (
          <div
            className="mt-4 rounded-xl px-4 py-3 text-[12px] leading-[1.6]"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.50)",
            }}
          >
            <strong style={{ color: "rgba(255,255,255,0.70)" }}>Note:</strong> Only authorized staff emails can sign in as Admin.
          </div>
        ) : (
          <p className="text-center mt-5 text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>
            {isSignup ? "Already have an account? " : "No account? "}
            <motion.button
              onClick={() => {
                setError("");
                setInfo("");
                setIsSignup(!isSignup);
                if (!isSignup) setSelectedAccountType("customer");
              }}
              className="font-bold bg-none border-none cursor-pointer text-[13px] gradient-text"
              style={{ background: "none", padding: 0 }}
              whileHover={{ scale: 1.04 }}
            >
              {isSignup ? "Sign In" : "Sign Up"}
            </motion.button>
          </p>
        )}
      </motion.div>
    </div>
  );
}
