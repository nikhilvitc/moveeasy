import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import PageShell from "../components/layout/PageShell";
import { useSitePublicSettings } from "../hooks/useSitePublicSettings";
import { DEFAULT_CONTACT_TEAM } from "../lib/sitePublicSettings";
import { buildContactWhatsAppUrl } from "../config/contactChannels";
import { db, isFirebaseConfigured } from "../lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

const MAX_MSG = 500;

function WaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

const INPUT_STYLE = {
  width: "100%",
  padding: "11px 14px 11px 40px",
  borderRadius: 10,
  background: "#ffffff",
  border: "2px solid #0f172a",
  color: "#0f172a",
  fontSize: 14,
  fontWeight: 600,
  outline: "none",
  transition: "border-color 0.15s",
};

function Field({ label, icon, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold" style={{ color: "#475569" }}>
        {label}
      </label>
      <div className="relative">
        <span
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px]"
          style={{ color: "#94a3b8", pointerEvents: "none" }}
        >
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

export default function Contact() {
  const { sitePublic } = useSitePublicSettings();
  const contacts = sitePublic.contacts?.length ? sitePublic.contacts : DEFAULT_CONTACT_TEAM;
  const supportEmail = sitePublic.supportEmail || "support@moveazy.in";

  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "", agreed: false });
  const [status, setStatus] = useState(null); // null | "sending" | "sent" | "error"
  const [errorMsg, setErrorMsg] = useState("");

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.agreed) { setErrorMsg("Please agree to the Privacy Policy."); return; }
    if (!form.name.trim() || !form.email.trim()) { setErrorMsg("Name and email are required."); return; }
    setErrorMsg("");
    setStatus("sending");
    try {
      if (isFirebaseConfigured) {
        await addDoc(collection(db, "contactQueries"), {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          message: form.message.trim(),
          status: "pending",
          createdAt: serverTimestamp(),
        });
      }
      setStatus("sent");
      setForm({ name: "", email: "", phone: "", message: "", agreed: false });
    } catch (err) {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try WhatsApp directly.");
      console.error(err);
    }
  };

  return (
    <PageShell fixedBackdrop variant="light" overlayOnly className="antialiased" style={{ background: "#f5f5f7" }}>
      <Navbar />

      <main
        className="min-h-screen relative"
        style={{ background: "#f5f5f7" }}
      >
        {/* Background glow */}
        <div
          className="pointer-events-none absolute bottom-0 left-0"
          style={{ width: 600, height: 500, background: "radial-gradient(ellipse at bottom left, rgba(99,102,241,0.10) 0%, transparent 65%)" }}
          aria-hidden
        />

        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-6 pb-14 sm:pt-8 sm:pb-20">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">

            {/* ── Left ── */}
            <div className="pt-0">
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-3" style={{ color: "#0f172a" }}>
                Let&apos;s Get In Touch.
              </h1>

              <p className="text-[15px] font-semibold mb-2" style={{ color: "#334155" }}>
                Or just reach out manually to{" "}
                <a
                  href={`mailto:${supportEmail}`}
                  className="font-bold transition-colors hover:underline"
                  style={{ color: "#4f46e5" }}
                >
                  {supportEmail}
                </a>
              </p>

              {/* WhatsApp direct links */}
              <div className="mt-6 flex flex-col gap-3">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] mb-1" style={{ color: "#475569" }}>
                  WhatsApp our sales team
                </p>
                {contacts.map((c) => {
                  const href = buildContactWhatsAppUrl(c, "Hi — I'd like to connect with MovEazy sales.");
                  const first = String(c.name || "team").split(/\s+/)[0];
                  return (
                    <a
                      key={c.phoneRaw || c.name}
                      href={href || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 w-fit group"
                    >
                      <span
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shrink-0"
                        style={{ background: "#0f172a" }}
                      >
                        {c.avatar || first.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="flex flex-col">
                        <span className="text-[14px] font-extrabold text-gray-900 group-hover:text-green-600 transition-colors flex items-center gap-1.5">
                          <span className="text-green-600"><WaIcon /></span> {first}
                        </span>
                        <span className="text-[12px] font-semibold" style={{ color: "#475569" }}>{c.phone}</span>
                      </span>
                    </a>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t" style={{ borderColor: "#cbd5e1" }}>
                <p className="text-[13px] font-bold" style={{ color: "#475569" }}>
                  Mon–Sun · 9 am – 9 pm IST · Bangalore
                </p>
              </div>
            </div>

            {/* ── Right: Form ── */}
            <div
              className="rounded-2xl p-6"
              style={{ background: "#ffffff", border: "2px solid #0f172a", boxShadow: "4px 4px 0 #0f172a" }}
            >
              {status === "sent" ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                  <div className="text-4xl">✅</div>
                  <h2 className="text-xl font-extrabold" style={{ color: "#0f172a" }}>Message received!</h2>
                  <p className="text-[14px] max-w-xs" style={{ color: "#64748b" }}>
                    We usually respond within a few hours. You can also reach us on WhatsApp for faster replies.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStatus(null)}
                    className="mt-2 text-[13px] font-semibold underline"
                    style={{ color: "#818cf8" }}
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <Field label="Full Name" icon="👤">
                    <input
                      type="text"
                      required
                      placeholder="Enter your full name..."
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      style={INPUT_STYLE}
                      onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                      onBlur={(e) => (e.target.style.borderColor = "#0f172a")}
                    />
                  </Field>

                  <Field label="Email Address" icon="✉️">
                    <input
                      type="email"
                      required
                      placeholder="Enter your email address..."
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      style={INPUT_STYLE}
                      onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                      onBlur={(e) => (e.target.style.borderColor = "#0f172a")}
                    />
                  </Field>

                  <Field label="Phone Number" icon="">
                    <div className="flex">
                      <span
                        className="flex items-center px-3.5 text-[13px] font-bold rounded-l-[10px] shrink-0"
                        style={{
                          background: "#f1f5f9",
                          border: "2px solid #0f172a",
                          borderRight: "none",
                          color: "#0f172a",
                        }}
                      >
                        +91
                      </span>
                      <input
                        type="tel"
                        placeholder="(000) 000-0000"
                        value={form.phone}
                        onChange={(e) => set("phone", e.target.value.replace(/[^\d\s\-()]/g, ""))}
                        style={{
                          ...INPUT_STYLE,
                          paddingLeft: 14,
                          borderRadius: "0 10px 10px 0",
                          borderLeft: "none",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                        onBlur={(e) => (e.target.style.borderColor = "#0f172a")}
                      />
                    </div>
                  </Field>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold" style={{ color: "#475569" }}>
                      Message
                    </label>
                    <div className="relative">
                      <textarea
                        placeholder="Enter your main query here..."
                        rows={5}
                        maxLength={MAX_MSG}
                        value={form.message}
                        onChange={(e) => set("message", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "11px 14px",
                          borderRadius: 10,
                          background: "#ffffff",
                          border: "2px solid #0f172a",
                          color: "#0f172a",
                          fontSize: 14,
                          fontWeight: 600,
                          outline: "none",
                          resize: "vertical",
                          minHeight: 110,
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                        onBlur={(e) => (e.target.style.borderColor = "#0f172a")}
                      />
                      <span
                        className="absolute bottom-3 left-4 text-[11px]"
                        style={{ color: "#94a3b8" }}
                      >
                        {form.message.length}/{MAX_MSG}
                      </span>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={form.agreed}
                      onChange={(e) => set("agreed", e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded accent-indigo-500 shrink-0"
                    />
                    <span className="text-[13px]" style={{ color: "#64748b" }}>
                      I hereby agree to our{" "}
                      <Link
                        to="/privacy"
                        className="font-semibold transition-colors"
                        style={{ color: "#818cf8" }}
                      >
                        Privacy Policy
                      </Link>{" "}
                      terms.
                    </span>
                  </label>

                  {errorMsg && (
                    <p className="text-[13px] font-semibold" style={{ color: "#f87171" }}>{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[10px] font-bold text-[15px] text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                    style={{ background: "#0f172a", border: "2px solid #0f172a" }}
                  >
                    {status === "sending" ? "Sending…" : <>Submit Form <span className="text-lg">→</span></>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </PageShell>
  );
}
