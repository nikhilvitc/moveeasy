import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { BRAND_PAYEE_NAME, getPaymentProduct } from "../config/paymentProducts";
import { getRazorpayHostedPaymentUrl } from "../config/razorpayHosted";
import { getBusinessUpiCheckoutEnv } from "../config/upiCheckout";

const EASE = [0.22, 1, 0.36, 1];

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [confirmed, setConfirmed] = useState(() => searchParams.get("status") === "paid");

  const product = useMemo(() => getPaymentProduct(searchParams), [searchParams]);
  const razorpayHostedUrl = useMemo(() => getRazorpayHostedPaymentUrl(product.key), [product.key]);
  const { businessUpiVpa, checkoutQrImageUrl, whatsappOrderE164, hasDirectUpiFallback } = useMemo(
    () => getBusinessUpiCheckoutEnv(),
    [],
  );

  const upiPayUri = useMemo(() => {
    if (!businessUpiVpa) return "";
    return `upi://pay?pa=${encodeURIComponent(businessUpiVpa)}&pn=${encodeURIComponent(BRAND_PAYEE_NAME)}&am=${product.amountPaise}&cu=INR`;
  }, [businessUpiVpa, product.amountPaise]);

  const qrSrc = useMemo(() => {
    if (checkoutQrImageUrl) return checkoutQrImageUrl;
    if (upiPayUri) {
      return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&ecc=M&data=${encodeURIComponent(upiPayUri)}`;
    }
    return "";
  }, [checkoutQrImageUrl, upiPayUri]);

  const whatsAppReceiptHref = `https://wa.me/${whatsappOrderE164}?text=${product.whatsappPath}`;

  return (
    <div className="min-h-[100dvh] bg-[#fafafa] antialiased">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        {confirmed ? (
          <SuccessScreen
            product={product}
            whatsAppHref={whatsAppReceiptHref}
            onHome={() => navigate("/")}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="grid lg:grid-cols-[1fr_420px] gap-12 lg:gap-20 items-start"
          >
            {/* ── Left ── */}
            <div className="lg:sticky lg:top-24">
              <p className="text-xs font-medium text-slate-400 tracking-wide">Secure checkout</p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-stone-900 leading-snug">
                {product.title}
              </h1>
              {product.subtitle && (
                <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{product.subtitle}</p>
              )}

              <div className="mt-5">
                <span className="text-3xl font-bold text-stone-900 tabular-nums">
                  ₹{product.amountRupee.toLocaleString("en-IN")}
                </span>
                <span className="ml-2 text-sm text-slate-400">one-time payment</span>
              </div>

              {product.bullets?.length > 0 && (
                <ul className="mt-7 space-y-2.5">
                  {product.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8l3.5 3.5L13 5" />
                      </svg>
                      <span className="text-sm text-stone-600 leading-snug">{b}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-10 pt-6 border-t border-stone-200 space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="12" height="8" rx="1.5"/><path d="M5 7V5a3 3 0 016 0v2"/></svg>
                  256-bit SSL encryption
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2l1.5 3 3.5.5-2.5 2.5.5 3.5L8 10l-3 1.5.5-3.5L3 5.5 6.5 5z"/></svg>
                  Powered by Razorpay
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></svg>
                  Confirmation within 2 hours
                </div>
              </div>
            </div>

            {/* ── Right ── */}
            <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-800">
                  {hasDirectUpiFallback ? "Payment" : "Pay via Razorpay"}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="12" height="8" rx="1.5"/><path d="M5 7V5a3 3 0 016 0v2"/></svg>
                  Secure
                </span>
              </div>

              <div className="p-6 space-y-4">
                {/* Amount row */}
                <div className="flex items-center justify-between py-3 border-b border-stone-100">
                  <span className="text-sm text-stone-600">{product.title}</span>
                  <span className="text-sm font-semibold text-stone-900 tabular-nums">₹{product.amountRupee.toLocaleString("en-IN")}</span>
                </div>

                {/* Pay button */}
                <a
                  href={razorpayHostedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center rounded-lg bg-stone-900 py-3.5 text-sm font-semibold text-white hover:bg-stone-800 active:scale-[0.99] transition-all"
                >
                  Pay ₹{product.amountRupee.toLocaleString("en-IN")}
                </a>
                <p className="text-center text-[11px] text-slate-400">
                  UPI · Debit &amp; Credit cards · Netbanking · Wallets
                </p>

                {/* QR */}
                {hasDirectUpiFallback && qrSrc && (
                  <>
                    <div className="flex items-center gap-3 py-1">
                      <div className="flex-1 border-t border-stone-100" />
                      <span className="text-[11px] text-slate-400">or scan to pay</span>
                      <div className="flex-1 border-t border-stone-100" />
                    </div>
                    <div className="flex flex-col items-center rounded-lg border border-stone-100 bg-stone-50 py-5 px-4">
                      <img src={qrSrc} alt={product.qrAlt} width={160} height={160} className="rounded" decoding="async" />
                      <p className="mt-3 text-xs text-stone-500 text-center">
                        Scan with Google Pay, PhonePe, Paytm or any UPI app
                      </p>
                      {businessUpiVpa && (
                        <p className="mt-1.5 text-xs text-slate-400">
                          UPI: <span className="font-mono text-stone-600">{businessUpiVpa}</span>
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* WhatsApp receipt */}
                <div className="rounded-lg border border-stone-100 bg-stone-50 p-4">
                  <p className="text-xs font-medium text-stone-600 mb-2.5">After payment, send your receipt</p>
                  <a
                    href={whatsAppReceiptHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center rounded-lg border border-stone-200 bg-white py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
                  >
                    Send receipt via WhatsApp
                  </a>
                </div>

                <p className="text-center text-[10px] text-slate-400 leading-relaxed">
                  No card details are stored on our servers. Payments are processed securely by Razorpay.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function SuccessScreen({ product, whatsAppHref, onHome }) {
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
      {/* Check icon */}
      <div className="flex justify-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-stone-900">
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

      {/* Order card */}
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

      {/* Next steps */}
      <div className="mt-5 rounded-xl border border-stone-200 bg-white overflow-hidden divide-y divide-stone-100">
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

      {/* Actions */}
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
