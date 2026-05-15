import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import PageShell from "../components/layout/PageShell";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSitePublicSettings } from "../hooks/useSitePublicSettings";
import Tilt3D from "../components/ui/Tilt3D";

const EASE = [0.22, 1, 0.36, 1];

const WHY_ITEMS = [
  {
    icon: "🎯",
    title: "Built around your brief",
    desc: "Budget, commute radius, flat type, PG vs whole flat, and move-in week — we translate that into a tight shortlist, not random WhatsApp forwards.",
  },
  {
    icon: "⚡",
    title: "Exclusive & fast-moving stock",
    desc: "Paid match clients get earlier nudge on landlord-approved deals and off-market options when owners want a quick close.",
  },
  {
    icon: "📌",
    title: "Priority when you move",
    desc: "When you are ready to visit or block a unit, your request is queued ahead of cold inquiries so you waste fewer weekends.",
  },
];

export default function Contact() {
  const navigate = useNavigate();
  const { sitePublic, loading } = useSitePublicSettings();
  const contacts = sitePublic.contacts?.length ? sitePublic.contacts : [];

  const gridCols =
    contacts.length >= 3
      ? "md:grid-cols-2 lg:grid-cols-3"
      : contacts.length === 1
      ? "md:grid-cols-1 max-w-md mx-auto"
      : "md:grid-cols-2";

  return (
    <PageShell fixedBackdrop variant="dark" overlayOnly className="antialiased bg-[#0d0d14]">
      <Navbar />

      <main className="relative">
        {/* Hero — rich gradient */}
        <section
          className="relative text-white overflow-hidden"
          style={{
            background:
              "linear-gradient(145deg, #0f0c29 0%, #1a0508 40%, #0a1228 100%)",
          }}
        >
          {/* Floating blobs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div
              style={{
                position: "absolute",
                top: "-5%",
                left: "-5%",
                width: 400,
                height: 400,
                borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
                background: "radial-gradient(circle, rgba(232,90,79,0.28) 0%, transparent 70%)",
                animation: "blob-move 12s ease-in-out infinite, float-slow 9s ease-in-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "-10%",
                right: "-5%",
                width: 340,
                height: 340,
                borderRadius: "40% 60% 70% 30% / 40% 70% 30% 60%",
                background: "radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)",
                animation: "blob-move 14s ease-in-out infinite 2s, float-slow 11s ease-in-out infinite 1s",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "60%",
                width: 220,
                height: 220,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(249,115,22,0.16) 0%, transparent 70%)",
                animation: "float-slow 8s ease-in-out infinite 0.5s",
              }}
            />
          </div>

          {/* Gradient border bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[1px] pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(232,90,79,0.40), rgba(249,115,22,0.40), transparent)",
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 sm:py-28 text-center">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="font-semibold text-sm tracking-widest uppercase mb-4"
              style={{ color: "#ff8a7a" }}
            >
              Paid · personalized match
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight"
            >
              Your shortlist,{" "}
              <span className="gradient-text">built for you</span>
              <span className="block sm:inline sm:ml-3 text-3xl sm:text-4xl lg:text-5xl mt-2 sm:mt-0 font-extrabold text-white/95">
                — ₹1,999
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16, ease: EASE }}
              className="mt-5 text-lg max-w-2xl mx-auto"
              style={{ color: "rgba(255,255,255,0.60)" }}
            >
              We no longer offer open-ended free consults. Instead, for <strong className="text-white/90">₹1,999</strong> you unlock a{" "}
              <strong className="text-white/90">personalized property recommendation pack</strong>: a consultant reviews your requirements, curates matching homes
              (including sharper picks as inventory moves), flags exclusive or fast-closing deals, and <strong className="text-white/90">prioritizes</strong> your visits
              and callbacks when you are ready to move in.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24, ease: EASE }}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                to="/checkout?sku=personalized-match"
                className="inline-flex px-10 py-4 rounded-full font-bold text-base text-white btn-glow-pulse text-center"
                style={{ background: "linear-gradient(135deg, #e85a4f, #f97316)" }}
              >
                Pay ₹1,999 — start my match
              </Link>
              <a
                href="https://wa.me/919413186425?text=Hi%2C%20I%27ve%20paid%20or%20want%20to%20pay%20%E2%82%B91999%20for%20MovEazy%20personalized%20property%20match.%20Please%20share%20next%20steps."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex px-8 py-4 rounded-full font-semibold text-base border border-white/30 text-white/90 hover:bg-white/10 transition-colors"
              >
                WhatsApp the team
              </a>
            </motion.div>
          </div>
        </section>

        {/* Contact Cards */}
        <section className="max-w-6xl mx-auto px-6 -mt-12 relative z-20 pb-20">
          {loading ? (
            <div
              className="text-center py-16 text-sm font-medium"
              style={{ color: "rgba(255,255,255,0.40)" }}
            >
              Loading contact team…
            </div>
          ) : (
            <div className={`grid gap-8 ${gridCols}`}>
              {contacts.map((c, i) => (
                <motion.div
                  key={`${c.name}-${c.phoneRaw}-${i}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: EASE }}
                >
                  <Tilt3D intensity={5} scale={1.02} className="h-full">
                    <div
                      className="h-full rounded-2xl p-7 flex flex-col gap-5 relative overflow-hidden"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        boxShadow: "0 12px 40px rgba(0,0,0,0.30)",
                        transition: "box-shadow 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = "0 20px 60px rgba(0,0,0,0.40), 0 0 60px rgba(232,90,79,0.20)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.30)";
                      }}
                    >
                      {/* Top gradient line */}
                      <div
                        className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl pointer-events-none bg-gradient-to-r ${c.gradient || "from-[#e85a4f] to-[#f97316]"}`}
                        aria-hidden="true"
                      />

                      <div className="flex items-center gap-4">
                        <div
                          className={`w-14 h-14 rounded-full bg-gradient-to-br ${c.gradient || "from-[#e85a4f] to-[#f97316]"} flex items-center justify-center text-white font-bold text-lg shadow-lg`}
                        >
                          {c.avatar}
                        </div>
                        <div>
                          <div className="font-bold text-[17px] text-white">{c.name}</div>
                          <div className="text-[13px]" style={{ color: "rgba(255,255,255,0.50)" }}>
                            {c.title}
                          </div>
                        </div>
                      </div>

                      <div className="text-[14px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                        <div className="flex items-center gap-2">
                          <span>📞</span>
                          <a
                            href={`tel:${c.phoneRaw}`}
                            className="font-medium transition-colors"
                            style={{ color: "rgba(255,255,255,0.70)" }}
                            onMouseEnter={(e) => (e.target.style.color = "#ff8a7a")}
                            onMouseLeave={(e) => (e.target.style.color = "rgba(255,255,255,0.70)")}
                          >
                            {c.phone}
                          </a>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-auto">
                        <motion.a
                          href={`tel:${c.phoneRaw}`}
                          className="flex-1 text-center py-3 px-4 rounded-xl font-semibold text-[14px] text-white"
                          style={{
                            background: "rgba(255,255,255,0.12)",
                            border: "1px solid rgba(255,255,255,0.16)",
                          }}
                          whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.20)" }}
                          whileTap={{ scale: 0.97 }}
                        >
                          📞 Call Now
                        </motion.a>
                        <motion.a
                          href={`https://wa.me/${c.phoneRaw}?text=${encodeURIComponent(
                            "Hi — I'm interested in MovEazy's ₹1,999 personalized property match (curated shortlist + priority). Please confirm next steps."
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center py-3 px-4 rounded-xl font-semibold text-[14px] text-white"
                          style={{
                            background: "linear-gradient(135deg, #16a34a, #15803d)",
                            boxShadow: "0 4px 16px rgba(22,163,74,0.35)",
                          }}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          💬 WhatsApp
                        </motion.a>
                      </div>
                    </div>
                  </Tilt3D>
                </motion.div>
              ))}
            </div>
          )}

          {/* Why talk to us */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: EASE }}
            className="mt-16 text-center"
          >
            <h2 className="text-2xl font-bold mb-4">
              <span style={{ color: "rgba(255,255,255,0.85)" }}>Why Talk to </span>
              <span className="gradient-text">Us?</span>
            </h2>
            <div className="grid sm:grid-cols-3 gap-6 mt-8 max-w-3xl mx-auto">
              {WHY_ITEMS.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + i * 0.08, ease: EASE }}
                  className="rounded-xl p-6 text-left"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(10px)",
                  }}
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                >
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <div className="font-bold mb-1 text-white">{item.title}</div>
                  <div className="text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {item.desc}
                    {item.bullets?.length ? (
                      <ul className="mt-2 pl-4 list-disc space-y-1 text-left">
                        {item.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6, ease: EASE }}
            className="mt-14 text-center"
          >
            <motion.button
              onClick={() => navigate("/guarantee")}
              className="px-10 py-4 text-white rounded-full font-bold text-base btn-glow-pulse"
              style={{
                background: "linear-gradient(135deg, #e85a4f, #f97316)",
              }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.97 }}
            >
              View Our Guarantee Plan →
            </motion.button>
          </motion.div>
        </section>
      </main>

      <Footer />
    </PageShell>
  );
}
