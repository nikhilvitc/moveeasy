import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Tilt3D from "../components/ui/Tilt3D";
import PremiumPageBackdrop from "../components/ui/PremiumPageBackdrop";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

const EASE = [0.22, 1, 0.36, 1];

/** Scannable UPI QR for the Guarantee Plan amount (same VPA as copy below). */
const UPI_VPA = "9413186425@ybl";
const UPI_PAY_URI = `upi://pay?pa=${encodeURIComponent(UPI_VPA)}&pn=${encodeURIComponent("MovEazy Guarantee")}&am=1999&cu=INR`;
const UPI_QR_IMAGE_SRC = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&ecc=M&data=${encodeURIComponent(UPI_PAY_URI)}`;

export default function Checkout() {
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden antialiased">
      <PremiumPageBackdrop variant="checkout" />

      <Navbar />

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-rose-200/80 bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-rose-700 shadow-sm backdrop-blur-sm">
            <motion.span
              className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
              animate={{ scale: [1, 1.35, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            Live checkout
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-stone-900 via-rose-900 to-orange-700 bg-clip-text text-transparent">
              Checkout
            </span>
          </h1>
          <p className="mt-2 text-slate-600 font-medium">
            Complete your Guarantee Plan enrollment — secure UPI, instant confirmation.
          </p>

          <div className="mt-10 grid md:grid-cols-2 gap-8 md:gap-10">
            <Tilt3D intensity={6} scale={1.01} className="rounded-2xl [transform-style:preserve-3d]">
              <div className="rounded-2xl border border-white/80 bg-white/95 p-8 shadow-card-lg backdrop-blur-md ring-1 ring-stone-900/[0.04]">
                <h2 className="text-xl font-bold text-stone-900 mb-6">Order Summary</h2>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center gap-4 pb-4 border-b border-stone-100">
                    <div className="min-w-0">
                      <div className="font-semibold text-stone-900">MovEazy Guarantee Plan</div>
                      <div className="text-sm text-slate-500 mt-1">Legal verification + escrow deposit security</div>
                    </div>
                    <div className="font-bold text-lg text-stone-900 shrink-0">₹1,999</div>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    {[
                      "Binding contract verification",
                      "Escrow-style deposit protection",
                      "Broker negligence coverage",
                      "24/7 legal support hotline",
                      "100% refund if deal falls through",
                    ].map((line) => (
                      <div key={line} className="flex items-center gap-2">
                        <span className="text-emerald-500 font-bold">✓</span>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t-2 border-stone-900">
                  <div className="font-bold text-lg text-stone-900">Total</div>
                  <motion.div
                    className="font-extrabold text-2xl text-stone-900 tabular-nums"
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    ₹1,999
                  </motion.div>
                </div>
              </div>
            </Tilt3D>

            <Tilt3D intensity={7} scale={1.015} className="rounded-2xl [transform-style:preserve-3d]">
              <div className="rounded-2xl border border-white/80 bg-white/95 p-8 shadow-card-lg backdrop-blur-md ring-1 ring-stone-900/[0.04]">
                <div className="mb-6 flex items-start justify-between gap-3">
                  <h2 className="text-xl font-bold text-stone-900">Pay via UPI</h2>
                  <span className="shrink-0 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/80">
                    Encrypted
                  </span>
                </div>

                <div className="mb-6 rounded-2xl bg-gradient-to-r from-rose-400 via-orange-300 to-violet-400 p-[2px] shadow-lg bg-[length:240%_240%] animate-gradient-shift">
                  <div className="rounded-[14px] bg-gradient-to-b from-stone-50/95 to-white p-6 text-center">
                    <Tilt3D intensity={5} scale={1.02} className="mx-auto inline-block rounded-xl">
                      <div className="w-52 h-52 mx-auto bg-white rounded-xl shadow-inner flex items-center justify-center border border-stone-200/80 p-2 ring-2 ring-white">
                        <img
                          src={UPI_QR_IMAGE_SRC}
                          alt="UPI QR code for ₹1,999 MovEazy Guarantee payment"
                          width={220}
                          height={220}
                          className="max-w-full h-auto rounded-md"
                          decoding="async"
                        />
                      </div>
                    </Tilt3D>
                    <p className="mt-4 text-sm font-semibold text-stone-800">Scan with any UPI app</p>
                    <p className="text-xs text-slate-500 mt-1">Google Pay • PhonePe • Paytm • BHIM</p>
                  </div>
                </div>

                <div className="bg-sky-50/90 rounded-xl p-4 mb-6 text-sm border border-sky-100 ring-1 ring-sky-200/40">
                  <div className="font-semibold text-sky-950 mb-2">Or pay via Bank Transfer:</div>
                  <div className="text-sky-900 space-y-1">
                    <div>
                      UPI: <span className="font-mono font-bold">{UPI_VPA}</span>
                    </div>
                    <div>After payment, share screenshot on WhatsApp:</div>
                    <a
                      href="https://wa.me/919413186425?text=I've%20paid%20₹1999%20for%20Guarantee%20Plan.%20Here's%20my%20receipt."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md"
                    >
                      💬 Share on WhatsApp
                    </a>
                  </div>
                </div>

                {!confirmed ? (
                  <motion.button
                    type="button"
                    onClick={() => setConfirmed(true)}
                    className="relative w-full overflow-hidden rounded-xl py-4 font-bold text-base text-white shadow-red-lg"
                    style={{
                      background: "linear-gradient(135deg, #e11d48 0%, #ea580c 45%, #c026d3 100%)",
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    animate={{ boxShadow: ["0 8px 28px rgba(225,29,72,0.45)", "0 12px 40px rgba(225,29,72,0.65)", "0 8px 28px rgba(225,29,72,0.45)"] }}
                    transition={{ boxShadow: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}
                  >
                    <span className="relative z-[1]">I&apos;ve Made the Payment — activate my plan</span>
                    <motion.span
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                      initial={{ x: "-100%" }}
                      animate={{ x: "200%" }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 0.8 }}
                    />
                  </motion.button>
                ) : (
                  <div className="text-center">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-4 shadow-sm">
                      <motion.div
                        className="text-4xl mb-2"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 16 }}
                      >
                        🎉
                      </motion.div>
                      <div className="font-bold text-emerald-900 text-lg">Payment Received!</div>
                      <div className="text-sm text-emerald-700/90 mt-2">
                        Our team will verify your payment and activate your Guarantee Plan within 2 hours.
                        You&apos;ll receive a confirmation on WhatsApp.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/")}
                      className="px-8 py-3 rounded-full font-semibold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-md transition-colors"
                    >
                      Back to Home
                    </button>
                  </div>
                )}

                <p className="mt-5 text-center text-[11px] font-medium text-slate-400">
                  Trusted checkout · UPI protected · No card data stored on MovEazy
                </p>
              </div>
            </Tilt3D>
          </div>
        </motion.div>
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
