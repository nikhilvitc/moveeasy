import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

// Same photo used on the home-page hero
const BG_PHOTO =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1800";

const PRIORITIES = [
  "Rent",
  "Spacious Rooms",
  "Interiors",
  "Locality",
  "Proximity to Office",
];

const FLAT_TYPES = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "Villa", "PG / Hostel", "Studio"];

const POPULAR_AREAS = [
  "HSR Layout", "Koramangala", "Bellandur", "Whitefield", "Marathalli",
  "Indiranagar", "BTM Layout", "Hebbal", "Electronic City", "Hoodi",
];

// ---------------------------------------------------------------------------
// Tiny atoms
// ---------------------------------------------------------------------------

function FieldLabel({ children, required }) {
  return (
    <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
      {children}{required && <span className="text-rose-400 ml-0.5">*</span>}
    </label>
  );
}

const inputCls =
  "w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:bg-gray-50 disabled:opacity-60";

function TextInput({ label, required, wrapCls = "", ...props }) {
  return (
    <div className={`mb-3 ${wrapCls}`}>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <input className={inputCls} {...props} />
    </div>
  );
}

function PrimaryBtn({ children, loading }) {
  return (
    <motion.button type="submit"
      whileHover={loading ? {} : { scale: 1.01 }}
      whileTap={loading  ? {} : { scale: 0.98 }}
      disabled={loading}
      className="w-full h-10 rounded-lg text-[13px] font-bold text-white mt-1 disabled:opacity-60 disabled:cursor-wait"
      style={{ background: "linear-gradient(135deg,#dc2626 0%,#ef4444 100%)" }}
    >
      {children}
    </motion.button>
  );
}

function GoogleBtn({ onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="w-full h-10 rounded-lg border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-60">
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continue with Google
    </button>
  );
}

const slide = {
  enter: (d) => ({ opacity: 0, x: d > 0 ? 22 : -22 }),
  center: { opacity: 1, x: 0 },
  exit:  (d) => ({ opacity: 0, x: d > 0 ? -22 : 22 }),
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Login() {
  const { login, signup, loginWithGoogle, forgotPassword, resendVerificationEmail, checkEmail } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep]     = useState("email");
  const [dir,  setDir]      = useState(1);
  const [email, setEmail]   = useState("");
  const [pw,    setPw]      = useState("");
  const [error, setError]   = useState("");
  const [info,  setInfo]    = useState("");
  const [busy,  setBusy]    = useState(false);
  const [fbBusy, setFbBusy] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);

  // signup fields
  const [name,   setName]   = useState("");
  const [phone,  setPhone]  = useState("");
  const [role,   setRole]   = useState("customer");
  const [ft,     setFt]     = useState("");           // flat type
  const [area,   setArea]   = useState("");
  const [mid,    setMid]    = useState("");           // move-in date
  const [budget, setBudget] = useState("");
  const [prio,   setPrio]   = useState("");           // priority

  function goTo(next, d = 1) {
    setDir(d); setError(""); setInfo(""); setShowResend(false); setStep(next);
  }

  function redirect(r) {
    const nextUrl = searchParams.get("next");
    if (nextUrl) {
      navigate(nextUrl);
      return;
    }
    if      (r === "admin")                        navigate("/admin");
    else if (r === "consultant" || r === "sub_admin") navigate("/crm");
    else if (r === "seller")                       navigate("/seller");
    else                                           navigate("/");
  }

  /* ── Step 1 ── */
  const onEmailContinue = async (e) => {
    e.preventDefault();
    const t = email.trim(); if (!t) return;
    setError("");
    goTo("login", 1);
  };

  /* ── Step 2a ── */
  const onLogin = async (e) => {
    e.preventDefault();
    setBusy(true); setError(""); setInfo(""); setShowResend(false);
    try {
      const r = await login(email, pw);
      if (r.success) {
        if (r.requiresVerification) { setPw(""); setInfo(r.info || "Verify your email first."); return; }
        if (r.emailWarning) sessionStorage.setItem("moveasy_onboarding_email_warning", r.emailWarning);
        redirect(r.role || "customer");
      } else {
        const errMsg = r.error || "Something went wrong.";
        setError(errMsg);
        setShowResend(!!r.unverified);
      }
    } finally { setBusy(false); }
  };

  const onForgot = async () => {
    setError(""); setInfo(""); setFbBusy(true);
    const r = await forgotPassword(email.trim());
    setFbBusy(false);
    if (r.success) setInfo(r.info || "Reset email sent."); else setError(r.error || "Could not send.");
  };

  const onResend = async () => {
    setError(""); setInfo(""); setShowResend(false); setResendBusy(true);
    const r = await resendVerificationEmail(email, pw);
    setResendBusy(false);
    if (r.success) setInfo(r.info || "Verification email sent."); else setError(r.error || "Could not resend.");
  };

  /* ── Step 2b ── */
  const onSignup = async (e) => {
    e.preventDefault();
    if (!name.trim())               { setError("Please enter your name.");      return; }
    if (!phone.trim())              { setError("Please enter your phone.");      return; }
    if (role === "customer" && !prio) { setError("Please pick your priority."); return; }

    setBusy(true); setError("");
    // All form data that gets saved to customerSearchProfiles + userProfiles
    const searchProfile = role === "customer" ? {
      bhk:            ft,
      preferredAreas: area ? [area] : [],
      moveInDate:     mid,
      budgetMax:      budget ? Number(budget) : null,
      budgetMin:      null,
      priority:       prio,
    } : null;

    try {
      const r = await signup(email, pw, name.trim(), role, phone.trim(), searchProfile);
      if (r.success) {
        if (r.requiresVerification) { setPw(""); setInfo(r.info || "Verify your email then sign in."); goTo("login", 1); return; }
        redirect(r.role || "customer");
      } else {
        const msg = r.error || "";
        if (msg.toLowerCase().includes("already in use") || msg.toLowerCase().includes("already exists")) {
          setError("Account already exists — please sign in."); goTo("login", 1);
        } else { setError(msg || "Something went wrong."); }
      }
    } finally { setBusy(false); }
  };

  const onGoogle = async () => {
    setBusy(true); setError("");
    try {
      const r = await loginWithGoogle("customer");
      if (r.success) {
        if (r.emailWarning) sessionStorage.setItem("moveasy_onboarding_email_warning", r.emailWarning);
        redirect(r.role || "customer");
      } else { setError(r.error || "Google sign-in failed."); }
    } finally { setBusy(false); }
  };

  const emailChip = (
    <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
      <span className="text-[12px] text-gray-700 flex-1 truncate font-medium">{email}</span>
      <button type="button" onClick={() => goTo("email", -1)}
        className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 shrink-0">Change</button>
    </div>
  );

  const titles = { email: "Sign in / Register", login: "Welcome back", signup: "Create your account" };
  const subs   = { email: "Enter your email to continue", login: "Enter your password", signup: "Fill in your details" };
  const stepN  = step === "email" ? 1 : 2;

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-12">

      {/* ── Background: same Unsplash photo as home-page hero ── */}
      <div className="absolute inset-0 z-0">
        <img
          src={BG_PHOTO}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          style={{ filter: "blur(2px) brightness(0.92)", transform: "scale(1.04)" }}
        />
        {/* Warm cream overlay — matches home page colour palette */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(160deg, rgba(255,245,242,0.82) 0%, rgba(255,255,255,0.88) 50%, rgba(255,247,245,0.84) 100%)" }} />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 w-full max-w-[370px] mx-auto">

        {/* Brand */}
        <div className="text-center mb-5">
          <p className="text-[26px] font-black tracking-tight">
            <span style={{ color: "white" }}>Mov</span><span style={{ color: "#dc2626" }}>Eazy</span>
          </p>
          <p className="text-[12px] text-gray-500 mt-0.5">Find your home in Bengaluru</p>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="bg-white/95 backdrop-blur-sm rounded-2xl border border-white/80 shadow-[0_8px_40px_rgba(0,0,0,0.12)]"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-start justify-between">
            <div>
              <h1 className="text-[16px] font-extrabold text-gray-900 leading-snug">{titles[step]}</h1>
              <p className="text-[12px] text-gray-400 mt-0.5">{subs[step]}</p>
            </div>
            <div className="flex items-center gap-1 mt-1 ml-3 shrink-0">
              {[1,2].map((n) => (
                <span key={n} className="rounded-full transition-all duration-300"
                  style={{ width: n === stepN ? 18 : 7, height: 7, background: n === stepN ? "#e85a4f" : "#e5e7eb" }} />
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-100 mx-6" />

          {/* Spinner overlay */}
          {busy && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/75 backdrop-blur-[2px] rounded-2xl">
              <div className="h-7 w-7 rounded-full border-[3px] border-gray-200 border-t-rose-500 animate-spin" />
            </div>
          )}

          {/* Alerts */}
          <div className="px-6 pt-4">
            <AnimatePresence>
              {info && (
                <motion.div key="info" initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
                  className="mb-3 rounded-lg px-3 py-2.5 text-[12px] text-amber-800 bg-amber-50 border border-amber-200 overflow-hidden">
                  {info} <span className="font-semibold">Check spam / junk too.</span>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {error && (
                <motion.div key="err" initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
                  className="mb-3 rounded-lg px-3 py-2.5 text-[12px] text-red-700 bg-red-50 border border-red-200 overflow-hidden">
                  {error}
                  {showResend && (
                    <button type="button" onClick={onResend} disabled={resendBusy}
                      className="mt-1 block font-semibold text-red-600 underline underline-offset-2 disabled:opacity-50">
                      {resendBusy ? "Sending…" : "Resend verification email"}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Body */}
          <div className="px-6 pb-6 relative overflow-hidden">
            <AnimatePresence mode="wait" custom={dir}>

              {/* ── EMAIL ── */}
              {step === "email" && (
                <motion.div key="email" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: EASE }}>
                  <form onSubmit={onEmailContinue} className="mt-1">
                    <TextInput type="email" label="Email address" value={email}
                      onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" required disabled={busy} autoFocus />
                    <PrimaryBtn loading={busy}>Continue →</PrimaryBtn>
                  </form>
                  <div className="my-4 flex items-center gap-3 text-[11px] text-gray-400">
                    <span className="h-px flex-1 bg-gray-100" /> or <span className="h-px flex-1 bg-gray-100" />
                  </div>
                  <GoogleBtn onClick={onGoogle} disabled={busy} />
                  <p className="mt-4 text-center text-[11px] text-gray-400">
                    By continuing you agree to our{" "}
                    <a href="/terms" className="underline text-gray-500">Terms</a> &amp;{" "}
                    <a href="/privacy" className="underline text-gray-500">Privacy Policy</a>.
                  </p>
                </motion.div>
              )}

              {/* ── LOGIN ── */}
              {step === "login" && (
                <motion.div key="login" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: EASE }}>
                  <form onSubmit={onLogin} className="mt-1">
                    {emailChip}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <FieldLabel>Password</FieldLabel>
                        <button type="button" onClick={onForgot} disabled={fbBusy}
                          className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 disabled:opacity-50">
                          {fbBusy ? "Sending…" : "Forgot?"}
                        </button>
                      </div>
                      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
                        required disabled={busy} placeholder="Enter your password" minLength="6" autoFocus className={inputCls} />
                    </div>
                    <PrimaryBtn loading={busy}>Sign In</PrimaryBtn>
                  </form>
                  <p className="text-center mt-4 text-[12px] text-gray-400">
                    No account?{" "}
                    <button type="button" onClick={() => goTo("signup", 1)} className="font-semibold text-red-600 hover:text-red-700">Sign up free</button>
                  </p>
                </motion.div>
              )}

              {/* ── SIGN UP ── */}
              {step === "signup" && (
                <motion.div key="signup" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: EASE }}>
                  <form onSubmit={onSignup} className="mt-1">
                    {emailChip}

                    {/* Role */}
                    <div className="mb-3">
                      <FieldLabel>I am a</FieldLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "customer", label: "Tenant / Buyer" },
                          { id: "seller",   label: "Seller / Broker" },
                        ].map((c) => {
                          const on = role === c.id;
                          return (
                            <button key={c.id} type="button" onClick={() => setRole(c.id)}
                              className="h-9 rounded-lg border text-[12px] font-semibold transition-all"
                              style={{ borderColor: on?"#e85a4f":"#e5e7eb", background: on?"#fff5f2":"white", color: on?"#e85a4f":"#6b7280", boxShadow: on?"0 0 0 1px #e85a4f":"none" }}>
                              {c.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <TextInput label="Full Name"    type="text" value={name}  onChange={(e) => setName(e.target.value)}  placeholder="Your name"        required disabled={busy} autoFocus />
                    <TextInput label="Phone Number" type="tel"  value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210"  required disabled={busy} />
                    <div className="mb-3">
                      <FieldLabel>Password</FieldLabel>
                      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required disabled={busy} placeholder="Min 6 characters" minLength="6" className={inputCls} />
                    </div>

                    {/* ── Customer search profile ── */}
                    <AnimatePresence>
                      {role === "customer" && (
                        <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }} className="overflow-hidden">
                          <div className="flex items-center gap-2 my-3">
                            <span className="h-px flex-1 bg-gray-100" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Flat Search Details</span>
                            <span className="h-px flex-1 bg-gray-100" />
                          </div>
                          <p className="text-center text-[11px] text-gray-400 mb-3 -mt-1">Saved to your profile · brokers use this for intros</p>

                          {/* Flat type */}
                          <div className="mb-3">
                            <FieldLabel>Flat Type</FieldLabel>
                            <div className="flex flex-wrap gap-1.5">
                              {FLAT_TYPES.map((f) => (
                                <button key={f} type="button" onClick={() => setFt(ft === f ? "" : f)}
                                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all"
                                  style={{ borderColor: ft===f?"#e85a4f":"#e5e7eb", background: ft===f?"#fff5f2":"white", color: ft===f?"#e85a4f":"#6b7280" }}>
                                  {f}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Area */}
                          <div className="mb-3">
                            <FieldLabel>Preferred Area</FieldLabel>
                            <select value={area} onChange={(e) => setArea(e.target.value)} disabled={busy}
                              className={inputCls} style={{ height: 40 }}>
                              <option value="">Select area…</option>
                              {POPULAR_AREAS.map((a) => <option key={a}>{a}</option>)}
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          {/* Date + Budget */}
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div>
                              <FieldLabel>Move-in Date</FieldLabel>
                              <input type="date" value={mid} onChange={(e) => setMid(e.target.value)} disabled={busy}
                                className={inputCls} style={{ fontSize: 12 }} />
                            </div>
                            <div>
                              <FieldLabel>Budget / mo (₹)</FieldLabel>
                              <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)}
                                min="0" step="500" disabled={busy} placeholder="25000" className={inputCls} />
                            </div>
                          </div>

                          {/* Priority */}
                          <div className="mb-3">
                            <FieldLabel required>My Main Priority</FieldLabel>
                            <div className="flex flex-col gap-1.5">
                              {PRIORITIES.map((p) => (
                                <button key={p} type="button" onClick={() => setPrio(p)}
                                  className="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[12px] font-medium text-left transition-all hover:border-rose-300"
                                  style={{ borderColor: prio===p?"#e85a4f":"#e5e7eb", background: prio===p?"#fff5f2":"white", color: prio===p?"#c2410c":"#374151" }}>
                                  <span className="h-3.5 w-3.5 rounded-full border-2 shrink-0 flex items-center justify-center"
                                    style={{ borderColor: prio===p?"#e85a4f":"#d1d5db" }}>
                                    {prio === p && <span className="h-2 w-2 rounded-full bg-rose-500" />}
                                  </span>
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <PrimaryBtn loading={busy}>Create Account</PrimaryBtn>
                  </form>
                  <p className="text-center mt-3 text-[12px] text-gray-400">
                    Already have an account?{" "}
                    <button type="button" onClick={() => goTo("login", -1)} className="font-semibold text-red-600 hover:text-red-700">Sign in</button>
                  </p>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.div>

        {/* Trust strip */}
        <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[11px] text-gray-600">
          {["Verified brokers", "Zero hidden charges", "On-ground support"].map((t) => (
            <span key={t} className="flex items-center gap-1">
              <svg className="h-3 w-3 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {t}
            </span>
          ))}
        </div>

      </div>
    </div>
  );
}
