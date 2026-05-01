import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

const EASE = [0.22, 1, 0.36, 1];

export default function Checkout() {
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 antialiased">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-500 mb-10">Complete your Guarantee Plan enrollment</p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Order Summary */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                  <div>
                    <div className="font-semibold text-gray-900">MovEazy Guarantee Plan</div>
                    <div className="text-sm text-gray-500 mt-1">Legal verification + escrow deposit security</div>
                  </div>
                  <div className="font-bold text-lg text-gray-900">₹1,999</div>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Binding contract verification
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Escrow-style deposit protection
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Broker negligence coverage
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    24/7 legal support hotline
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    100% refund if deal falls through
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t-2 border-gray-900">
                <div className="font-bold text-lg text-gray-900">Total</div>
                <div className="font-extrabold text-2xl text-gray-900">₹1,999</div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Pay via UPI</h2>

              {/* QR Code Placeholder */}
              <div className="bg-gray-50 rounded-xl p-8 mb-6 text-center border-2 border-dashed border-gray-200">
                <div className="w-48 h-48 mx-auto bg-white rounded-lg shadow-inner flex items-center justify-center mb-4 border border-gray-200">
                  {/* SVG QR-like pattern */}
                  <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
                    <rect width="140" height="140" fill="white"/>
                    <rect x="10" y="10" width="40" height="40" rx="4" fill="#1e293b"/>
                    <rect x="16" y="16" width="28" height="28" rx="2" fill="white"/>
                    <rect x="22" y="22" width="16" height="16" rx="1" fill="#1e293b"/>
                    <rect x="90" y="10" width="40" height="40" rx="4" fill="#1e293b"/>
                    <rect x="96" y="16" width="28" height="28" rx="2" fill="white"/>
                    <rect x="102" y="22" width="16" height="16" rx="1" fill="#1e293b"/>
                    <rect x="10" y="90" width="40" height="40" rx="4" fill="#1e293b"/>
                    <rect x="16" y="96" width="28" height="28" rx="2" fill="white"/>
                    <rect x="22" y="102" width="16" height="16" rx="1" fill="#1e293b"/>
                    <rect x="60" y="10" width="8" height="8" fill="#1e293b"/>
                    <rect x="60" y="26" width="8" height="8" fill="#1e293b"/>
                    <rect x="72" y="18" width="8" height="8" fill="#1e293b"/>
                    <rect x="60" y="60" width="20" height="20" rx="2" fill="#ef4444"/>
                    <text x="70" y="75" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">₹</text>
                    <rect x="56" y="90" width="8" height="8" fill="#1e293b"/>
                    <rect x="68" y="90" width="8" height="8" fill="#1e293b"/>
                    <rect x="80" y="90" width="8" height="8" fill="#1e293b"/>
                    <rect x="90" y="60" width="8" height="8" fill="#1e293b"/>
                    <rect x="106" y="60" width="8" height="8" fill="#1e293b"/>
                    <rect x="90" y="76" width="8" height="8" fill="#1e293b"/>
                    <rect x="122" y="76" width="8" height="8" fill="#1e293b"/>
                    <rect x="106" y="90" width="24" height="8" fill="#1e293b"/>
                    <rect x="90" y="106" width="8" height="8" fill="#1e293b"/>
                    <rect x="106" y="106" width="8" height="24" fill="#1e293b"/>
                    <rect x="122" y="106" width="8" height="8" fill="#1e293b"/>
                    <rect x="122" y="122" width="8" height="8" fill="#1e293b"/>
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700">Scan with any UPI app</p>
                <p className="text-xs text-gray-400 mt-1">Google Pay • PhonePe • Paytm • BHIM</p>
              </div>

              {/* Bank Transfer Fallback */}
              <div className="bg-blue-50 rounded-xl p-4 mb-6 text-sm">
                <div className="font-semibold text-blue-900 mb-2">Or pay via Bank Transfer:</div>
                <div className="text-blue-800 space-y-1">
                  <div>UPI: <span className="font-mono font-bold">9413186425@ybl</span></div>
                  <div>After payment, share screenshot on WhatsApp:</div>
                  <a
                    href="https://wa.me/919413186425?text=I've%20paid%20₹1999%20for%20Guarantee%20Plan.%20Here's%20my%20receipt."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    💬 Share on WhatsApp
                  </a>
                </div>
              </div>

              {/* Confirmation */}
              {!confirmed ? (
                <button
                  onClick={() => setConfirmed(true)}
                  className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-base hover:bg-slate-700 transition-colors shadow-lg"
                >
                  ✅ I've Made the Payment
                </button>
              ) : (
                <div className="text-center">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-4">
                    <div className="text-3xl mb-2">🎉</div>
                    <div className="font-bold text-green-800 text-lg">Payment Received!</div>
                    <div className="text-sm text-green-600 mt-2">
                      Our team will verify your payment and activate your Guarantee Plan within 2 hours.
                      You'll receive a confirmation on WhatsApp.
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/")}
                    className="px-8 py-3 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600 transition-colors"
                  >
                    Back to Home
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
