import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useMemo, useState, useCallback } from "react";
import { BRAND_PAYEE_NAME, getPaymentProduct } from "../config/paymentProducts";
import { getRazorpayHostedPaymentUrl } from "../config/razorpayHosted";
import { getBusinessUpiCheckoutEnv } from "../config/upiCheckout";

const ORDER_FN = import.meta.env.VITE_RAZORPAY_ORDER_URL?.trim();
const BILLING_EMAIL = import.meta.env.VITE_BILLING_CONTACT_EMAIL?.trim();

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("no window"));
      return;
    }
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    const existing = document.querySelector('script[data-razorpay-checkout="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Razorpay));
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.dataset.razorpayCheckout = "1";
    s.onload = () => resolve(window.Razorpay);
    s.onerror = () => reject(new Error("Razorpay script failed to load"));
    document.body.appendChild(s);
  });
}

export default function Pay() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const product = useMemo(() => getPaymentProduct(searchParams), [searchParams]);
  const apiSku = useMemo(() => {
    const q = String(searchParams.get("sku") || "").trim().toLowerCase();
    if (q === "deposit-saver" || q === "flat-search" || q === "personalized-match" || q === "guarantee") return q;
    return "guarantee";
  }, [searchParams]);

  const hostedUrl = useMemo(() => getRazorpayHostedPaymentUrl(product.key), [product.key]);
  const { hasDirectUpiFallback, whatsappOrderE164 } = useMemo(() => getBusinessUpiCheckoutEnv(), []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // auto-show success if Razorpay hosted link redirects back with ?status=paid
  const [done, setDone] = useState(() => searchParams.get("status") === "paid");

  const checkoutSkuQuery = searchParams.toString() ? `?${searchParams.toString()}` : "";

  const payWithRazorpayModal = useCallback(async () => {
    setErr("");
    if (!ORDER_FN) {
      setErr("Server checkout is not configured. Use the Razorpay page button or UPI checkout.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErr("Enter a valid email for your receipt.");
      return;
    }
    setBusy(true);
    try {
      const Razorpay = await loadRazorpayScript();
      const res = await fetch(ORDER_FN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: apiSku,
          receipt: `web_${apiSku}_${Date.now()}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.orderId || !data.keyId) {
        setErr(data.error || "Could not start payment. Try the Razorpay page or UPI checkout.");
        setBusy(false);
        return;
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency || "INR",
        order_id: data.orderId,
        name: BRAND_PAYEE_NAME,
        description: product.title,
        prefill: {
          name: name.trim() || undefined,
          email: email.trim(),
          contact: phone.replace(/\D/g, "").slice(0, 15) || undefined,
        },
        theme: { color: "#e11d48" },
        handler() {
          setDone(true);
          setBusy(false);
        },
        modal: {
          ondismiss() {
            setBusy(false);
          },
        },
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Payment could not start.");
      setBusy(false);
    }
  }, [ORDER_FN, email, name, phone, product.title, apiSku]);

  return (
    <div className="min-h-[100dvh] bg-white antialiased">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {done ? (
          <PaySuccessScreen product={product} onHome={() => navigate("/")} whatsappOrderE164={whatsappOrderE164} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start"
          >
            {/* ── Left: product info ── */}
            <div className="lg:sticky lg:top-24">
              <p className="text-[11px] font-bold uppercase tracking-widest text-rose-600">MovEazy</p>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 leading-tight">
                {product.title}
              </h1>
              {product.subtitle && (
                <p className="mt-2 text-slate-500 text-sm leading-relaxed">{product.subtitle}</p>
              )}

              <div className="mt-6 flex items-end gap-2">
                <span className="text-4xl font-extrabold text-stone-900 tabular-nums">
                  ₹{product.amountRupee.toLocaleString("en-IN")}
                </span>
                <span className="mb-1 text-sm text-slate-400">one-time</span>
              </div>

              {product.bullets?.length > 0 && (
                <ul className="mt-8 space-y-3">
                  {product.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">
                        ✓
                      </span>
                      <span className="text-sm text-stone-700 leading-snug">{b}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-10 border-t border-stone-100 pt-6 flex flex-wrap gap-5 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">🔒 SSL secured</span>
                <span className="flex items-center gap-1.5">⚡ Instant confirmation</span>
                <span className="flex items-center gap-1.5">💳 Powered by Razorpay</span>
              </div>

              {BILLING_EMAIL && (
                <p className="mt-4 text-xs text-slate-400">
                  Billing: <span className="font-medium text-slate-600">{BILLING_EMAIL}</span>
                </p>
              )}
            </div>

            {/* ── Right: payment panel ── */}
            <div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
              <h2 className="text-sm font-bold text-stone-900 mb-5">Payment details</h2>

              {/* Primary CTA */}
              <a
                href={hostedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-4 text-sm font-bold text-white shadow hover:bg-stone-800 active:scale-[0.99] transition-all"
              >
                Pay ₹{product.amountRupee.toLocaleString("en-IN")} — UPI · Card · more
              </a>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                UPI (GPay, PhonePe, Paytm) · Debit/Credit cards · Netbanking · Wallets
              </p>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 border-t border-stone-100" />
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">or fill details below</span>
                <div className="flex-1 border-t border-stone-100" />
              </div>

              {/* Form */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Full name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-slate-400 focus:border-stone-400 focus:bg-white focus:outline-none transition-colors"
                    placeholder="As on ID / bank"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email <span className="text-rose-500">*</span></label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-slate-400 focus:border-stone-400 focus:bg-white focus:outline-none transition-colors"
                    placeholder="you@email.com"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Phone <span className="text-slate-300">(optional)</span></label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-slate-400 focus:border-stone-400 focus:bg-white focus:outline-none transition-colors"
                    placeholder="+91 …"
                    autoComplete="tel"
                  />
                </div>
              </div>

              {err && (
                <p className="mt-3 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600 font-medium">{err}</p>
              )}

              {ORDER_FN && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={payWithRazorpayModal}
                  className="mt-4 w-full rounded-xl border border-stone-200 bg-stone-50 py-3 text-sm font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-50 transition-colors"
                >
                  {busy ? "Opening payment…" : "Pay in-page"}
                </button>
              )}

              <p className="mt-5 text-center text-xs text-slate-400">
                {hasDirectUpiFallback ? (
                  <>Want a UPI QR?{" "}
                    <Link to={`/checkout${checkoutSkuQuery}`} className="font-semibold text-rose-600 underline">
                      Open checkout with QR
                    </Link>
                  </>
                ) : (
                  <Link to={`/checkout${checkoutSkuQuery}`} className="font-semibold text-rose-600 underline">
                    Order summary &amp; receipt via WhatsApp
                  </Link>
                )}
              </p>
            </div>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function PaySuccessScreen({ product, onHome, whatsappOrderE164 }) {
  const whatsAppHref = whatsappOrderE164
    ? `https://wa.me/${whatsappOrderE164}?text=${product.whatsappPath}`
    : null;

  const steps = [
    { title: "Payment verified", body: "Our team confirms your payment within 2 hours." },
    { title: "WhatsApp confirmation", body: "You will receive a confirmation message on WhatsApp." },
    { title: "Your guide is assigned", body: "A dedicated consultant will reach out to get started." },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-md mx-auto py-14"
    >
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-900">
          <motion.svg
            viewBox="0 0 40 40"
            className="h-7 w-7 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M10 21l7 7 13-14"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.45, delay: 0.15, ease: "easeOut" }}
            />
          </motion.svg>
        </div>
      </div>

      <div className="mt-5 text-center">
        <h2 className="text-xl font-bold text-stone-900">Payment received</h2>
        <p className="mt-1 text-sm text-slate-500">Your order has been confirmed.</p>
      </div>

      <div className="mt-7 rounded-xl border border-stone-200 bg-white overflow-hidden">
        <div className="px-5 py-3 bg-stone-50 border-b border-stone-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Order summary</p>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-800">{product.title}</p>
            {product.subtitle && <p className="text-xs text-slate-500 mt-0.5">{product.subtitle}</p>}
          </div>
          <p className="text-sm font-bold text-stone-900 tabular-nums ml-4 shrink-0">
            ₹{product.amountRupee.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-stone-200 bg-white overflow-hidden divide-y divide-stone-100">
        <div className="px-5 py-3 bg-stone-50 border-b border-stone-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">What happens next</p>
        </div>
        {steps.map((s, i) => (
          <div key={s.title} className="px-5 py-3.5 flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-stone-200 text-[10px] font-semibold text-stone-500">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium text-stone-800">{s.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">{s.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2.5">
        {whatsAppHref && (
          <a
            href={whatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center rounded-lg bg-stone-900 py-3 text-sm font-semibold text-white hover:bg-stone-800 transition-colors"
          >
            Send receipt on WhatsApp
          </a>
        )}
        <button
          type="button"
          onClick={onHome}
          className="w-full rounded-lg border border-stone-200 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
        >
          Return to home
        </button>
      </div>

      <p className="mt-6 text-center text-[11px] text-slate-400">
        Questions? Contact us on WhatsApp — we respond within 2 hours.
      </p>
    </motion.div>
  );
}
