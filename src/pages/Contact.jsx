import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import PageShell from "../components/layout/PageShell";
import { FLAT_SEARCH_CTA, HEADER_CTA } from "../config/navLinks";
import {
  buildContactWhatsAppUrl,
  contactRoleLabel,
  formatContactDisplayName,
  formatTelHref,
  SALES_WA_GREETING,
  whatsAppLabelForContact,
} from "../config/contactChannels";
import { DEFAULT_CONTACT_TEAM } from "../lib/sitePublicSettings";
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

function TeamContactCard({ contact, index, waMessage }) {
  const telHref = formatTelHref(contact.phoneRaw);
  const waHref = buildContactWhatsAppUrl(contact, waMessage) || "#";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 + index * 0.08, ease: EASE }}
    >
      <Tilt3D intensity={5} scale={1.02} className="h-full">
        <motion.div
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
            e.currentTarget.style.boxShadow =
              "0 20px 60px rgba(0,0,0,0.40), 0 0 60px rgba(232,90,79,0.20)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.30)";
          }}
        >
          <div
            className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl pointer-events-none bg-gradient-to-r ${contact.gradient || "from-[#e85a4f] to-[#f97316]"}`}
            aria-hidden="true"
          />

          <div className="flex items-center gap-4">
            <motion.div
              className={`w-14 h-14 rounded-full bg-gradient-to-br ${contact.gradient || "from-[#e85a4f] to-[#f97316]"} flex items-center justify-center text-white font-bold text-lg shadow-lg`}
            >
              {contact.avatar}
            </motion.div>
            <div className="min-w-0">
              <p
                className="text-[11px] font-semibold uppercase tracking-wider mb-1"
                style={{ color: "#ff8a7a" }}
              >
                {contactRoleLabel(contact)}
              </p>
              <div className="font-bold text-[17px] text-white leading-snug">
                {formatContactDisplayName(contact)}
              </div>
            </div>
          </div>

          <div className="text-[14px]" style={{ color: "rgba(255,255,255,0.55)" }}>
            <div className="flex items-center gap-2">
              <span aria-hidden="true">📞</span>
              <a
                href={telHref}
                className="font-medium transition-colors"
                style={{ color: "rgba(255,255,255,0.70)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ff8a7a")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.70)")}
              >
                {contact.phone}
              </a>
            </div>
          </div>

          <div className="flex gap-3 mt-auto">
            <motion.a
              href={telHref}
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
              href={waHref}
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
        </motion.div>
      </Tilt3D>
    </motion.div>
  );
}

export default function Contact() {
  const navigate = useNavigate();
  const { sitePublic, loading } = useSitePublicSettings();
  const contacts = sitePublic.contacts?.length ? sitePublic.contacts : DEFAULT_CONTACT_TEAM;
  const supportEmail = sitePublic.supportEmail || "support@moveazy.in";
  const supportPhone = sitePublic.legalPhoneDisplay || "+91 70559 54373";
  const supportTel = sitePublic.legalPhoneTel || formatTelHref("917055954373");

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
              Sales &amp; Support
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight"
            >
              Contact{" "}
              <span className="gradient-text">MovEazy</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16, ease: EASE }}
              className="mt-5 text-lg max-w-2xl mx-auto"
              style={{ color: "rgba(255,255,255,0.60)" }}
            >
              <strong className="text-white/90">Sales</strong> — WhatsApp Kuldeep or Suresh for flat search (₹1,499), guarantee (₹1,999), and visits.{" "}
              <strong className="text-white/90">Support</strong> — email{" "}
              <a href={`mailto:${supportEmail}`} className="text-[#ff8a7a] underline font-semibold">
                {supportEmail}
              </a>{" "}
              for account and listing help. See our{" "}
              <Link to="/plan" className="text-[#ff8a7a] underline font-semibold">
                Flat Plan
              </Link>{" "}
              for how matching works.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24, ease: EASE }}
              className="mt-8 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4"
            >
              <Link
                to={HEADER_CTA.path}
                className="inline-flex px-10 py-4 rounded-full font-bold text-base text-white btn-glow-pulse text-center"
                style={{ background: "linear-gradient(135deg, #e85a4f, #f97316)" }}
              >
                {HEADER_CTA.label}
              </Link>
              <Link
                to={FLAT_SEARCH_CTA.path}
                className="inline-flex px-8 py-4 rounded-full font-semibold text-base border border-white/30 text-white/90 hover:bg-white/10 transition-colors"
              >
                {FLAT_SEARCH_CTA.label} — ₹1,499
              </Link>
              {contacts.map((c) => {
                const href = buildContactWhatsAppUrl(c, SALES_WA_GREETING);
                if (!href) return null;
                return (
                  <a
                    key={c.phoneRaw}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex px-6 py-4 rounded-full font-semibold text-base border border-white/30 text-white/90 hover:bg-white/10 transition-colors"
                  >
                    {whatsAppLabelForContact(c)}
                  </a>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* Sales & Support */}
        <section className="max-w-6xl mx-auto px-6 -mt-12 relative z-20 pb-20">
          {loading ? (
            <div
              className="text-center py-16 text-sm font-medium"
              style={{ color: "rgba(255,255,255,0.40)" }}
            >
              Loading contact team…
            </div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="mb-6"
                id="sales"
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-white">Sales team</h2>
                <p className="mt-2 text-sm max-w-2xl" style={{ color: "rgba(255,255,255,0.55)" }}>
                  Flat search, guarantee plans, and visit scheduling — call or WhatsApp directly.
                </p>
              </motion.div>
              <div className={`grid gap-8 ${gridCols}`}>
                {contacts.map((c, i) => (
                  <TeamContactCard
                    key={`${c.name}-${c.phoneRaw}-${i}`}
                    contact={c}
                    index={i}
                    waMessage={SALES_WA_GREETING}
                  />
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.2, ease: EASE }}
                className="mt-14"
                id="support"
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-white">Customer support</h2>
                <p className="mt-2 text-sm max-w-2xl mb-6" style={{ color: "rgba(255,255,255,0.55)" }}>
                  Account access, payments, guarantee claims, and listing issues — we aim to reply within one business day.
                </p>
                <div
                  className="max-w-xl rounded-2xl p-7 flex flex-col sm:flex-row sm:items-center gap-5"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    backdropFilter: "blur(16px)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                      style={{ color: "#ff8a7a" }}
                    >
                      Support
                    </p>
                    <p className="font-bold text-lg text-white">MovEazy customer support</p>
                    <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                      Email us for non-urgent help; use sales WhatsApp above for flat search and visits.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:shrink-0">
                    <a
                      href={`mailto:${supportEmail}`}
                      className="text-center py-3 px-5 rounded-xl font-semibold text-[14px] text-white"
                      style={{
                        background: "linear-gradient(135deg, #e85a4f, #f97316)",
                        boxShadow: "0 4px 16px rgba(232,90,79,0.35)",
                      }}
                    >
                      ✉️ {supportEmail}
                    </a>
                    <a
                      href={supportTel}
                      className="text-center py-3 px-5 rounded-xl font-semibold text-[14px] text-white"
                      style={{
                        background: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.16)",
                      }}
                    >
                      📞 {supportPhone}
                    </a>
                  </div>
                </div>
              </motion.div>
            </>
          )}

          {/* Why talk to us */}

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
