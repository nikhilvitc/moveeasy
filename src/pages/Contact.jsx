import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

const CONTACTS = [
  {
    name: "Kuldeep Meena",
    title: "Sales Lead — IITK BS Physics",
    phone: "+91 70559 54373",
    phoneRaw: "917055954373",
    avatar: "KM",
    gradient: "from-red-500 to-orange-500",
  },
  {
    name: "Suresh Meena",
    title: "Sales Lead — IITK Electrical",
    phone: "+91 78179 40441",
    phoneRaw: "917817940441",
    avatar: "SM",
    gradient: "from-blue-600 to-indigo-600",
  },
];

export default function Contact() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white antialiased">
      <Navbar />

      <main className="relative">
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-10 w-72 h-72 bg-red-500 rounded-full blur-[120px]" />
            <div className="absolute bottom-10 right-20 w-96 h-96 bg-blue-500 rounded-full blur-[140px]" />
          </div>
          <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 sm:py-28 text-center">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="text-red-400 font-semibold text-sm tracking-widest uppercase mb-4"
            >
              Talk to our team
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight"
            >
              Book a Free <span className="text-red-400">Consultation</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16, ease: EASE }}
              className="mt-5 text-lg text-white/70 max-w-xl mx-auto"
            >
              Get expert advice on your Bangalore move. Our IITK-trained consultants
              will help you find the perfect home — no broker fees, no scams.
            </motion.p>
          </div>
        </section>

        {/* Contact Cards */}
        <section className="max-w-5xl mx-auto px-6 -mt-12 relative z-20 pb-20">
          <div className="grid md:grid-cols-2 gap-8">
            {CONTACTS.map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.12, ease: EASE }}
                className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-shadow"
              >
                {/* Avatar */}
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {c.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-lg text-gray-900">{c.name}</div>
                    <div className="text-sm text-gray-500">{c.title}</div>
                  </div>
                </div>

                <div className="text-gray-600 text-sm mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span>📞</span>
                    <a href={`tel:${c.phoneRaw}`} className="hover:text-red-600 transition-colors font-medium">
                      {c.phone}
                    </a>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <a
                    href={`tel:${c.phoneRaw}`}
                    className="flex-1 text-center py-3 px-4 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-700 transition-colors shadow-sm"
                  >
                    📞 Call Now
                  </a>
                  <a
                    href={`https://wa.me/${c.phoneRaw}?text=${encodeURIComponent("Hi, I'd like to book a free consultation about finding a home in Bangalore through MovEazy.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center py-3 px-4 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors shadow-sm"
                  >
                    💬 WhatsApp
                  </a>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: EASE }}
            className="mt-16 text-center"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Why Talk to Us?</h2>
            <div className="grid sm:grid-cols-3 gap-6 mt-8 max-w-3xl mx-auto">
              {[
                { icon: "🏠", title: "Verified Listings Only", desc: "Every property is personally inspected by our team." },
                { icon: "🛡️", title: "Zero Broker Fee", desc: "We eliminate middlemen. Pay only for the Guarantee Plan." },
                { icon: "⚡", title: "48-Hour Move-In", desc: "From first call to keys-in-hand in under 2 days." },
              ].map((item) => (
                <div key={item.title} className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <div className="font-bold text-gray-900 mb-1">{item.title}</div>
                  <div className="text-sm text-gray-500">{item.desc}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
            className="mt-14 text-center"
          >
            <button
              onClick={() => navigate("/guarantee")}
              className="px-10 py-4 bg-red-500 text-white rounded-full font-bold text-base hover:bg-red-600 transition-colors shadow-lg hover:shadow-xl"
            >
              View Our Guarantee Plan →
            </button>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
