import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { motion } from "framer-motion";
import {
  SPECIALTY_OPTIONS,
  LANGUAGE_OPTIONS,
  BUDGET_OPTIONS,
} from "../data/agentsDirectory";
import { fetchDirectoryAgents } from "../lib/directoryAgentsSettings";
import { FLAT_SEARCH_CTA } from "../config/navLinks";
import { useAuth } from "../context/AuthContext";
import { fetchCustomerSearchProfile } from "../lib/customerSearchProfile";
import { logBrokerContact } from "../lib/brokerContactLog";
import { db, isFirebaseConfigured } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  fetchMyContacts,
  fetchMyRatings,
  isRatingUnlocked,
  submitAgentRating,
} from "../lib/agentRatings";

const EASE = [0.22, 1, 0.36, 1];

const PRIORITIES = [
  "Rent",
  "Spacious Rooms",
  "Interiors",
  "Locality",
  "Proximity to Office",
];

function buildWAMessage(agent, profile, priority) {
  const firstName = (agent.name || "").split(" ")[0] || "";
  const flatType = profile.bhk || profile.propertyType || "flat";
  const location =
    profile.preferredAreas && profile.preferredAreas.length > 0
      ? profile.preferredAreas.join(", ")
      : "the area";
  const moveIn = profile.moveInDate || "as soon as possible";
  const min = profile.budgetMin;
  const max = profile.budgetMax;
  let budget =
    min && max
      ? `₹${Math.round(min / 1000)}k–₹${Math.round(max / 1000)}k/month`
      : max
      ? `₹${Math.round(max / 1000)}k/month`
      : min
      ? `₹${Math.round(min / 1000)}k/month`
      : "flexible";
  return `Hi ${firstName} Sir!\n\nI got your contact through our seniors at MovEAZY. I am currently looking for a ${flatType} in ${location}. My expected move-in date is ${moveIn}, and my budget is around ${budget}.\nMy main priority is: ${priority}`;
}

function matchesBudget(tier, budgetLabel) {
  if (budgetLabel === "All") return true;
  if (budgetLabel === "Under ₹15k/mo") return tier === 1;
  if (budgetLabel === "₹15k – ₹30k/mo") return tier === 2;
  if (budgetLabel === "₹30k – ₹50k/mo") return tier === 3;
  if (budgetLabel === "₹50k+/mo") return tier === 4;
  return true;
}

const FULL_HEADING = "Find Your Perfect Rental Agent";
const GRADIENT_START = "Find Your Perfect ".length;

function useTypingEffect(text, speed = 50) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return displayed;
}

export default function AgentsDirectory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const typedFull = useTypingEffect(FULL_HEADING);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState("");
  const [connectError, setConnectError] = useState("");
  const [priorityPick, setPriorityPick] = useState(null); // { agent, profile }
  // Rating state
  const [contactMap, setContactMap] = useState({}); // agentId → earliest contact Date
  const [myRatings, setMyRatings] = useState({});   // agentId → star rating 1–5
  const [ratingModal, setRatingModal] = useState(null); // agent object
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingPick, setRatingPick] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [locationQ, setLocationQ] = useState("");
  const [nameQ, setNameQ] = useState("");
  const [rentAdvisory, setRentAdvisory] = useState(true);
  const [buyAdvisory, setBuyAdvisory] = useState(false);
  const [specialty, setSpecialty] = useState("All");
  const [language, setLanguage] = useState("All");
  const [budget, setBudget] = useState("All");

  useEffect(() => {
    let alive = true;
    fetchDirectoryAgents()
      .then((rows) => {
        if (alive) setAgents(rows);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Load contact timestamps + existing ratings once agents and user are ready
  useEffect(() => {
    if (!user?.uid || !agents.length) return;
    const ids = agents.map((a) => a.id);
    Promise.all([fetchMyContacts(user.uid), fetchMyRatings(user.uid, ids)]).then(
      ([contacts, ratings]) => {
        setContactMap(contacts);
        setMyRatings(ratings);
      }
    );
  }, [user?.uid, agents]);

  const filtered = useMemo(() => {
    const loc = locationQ.trim().toLowerCase();
    const nm = nameQ.trim().toLowerCase();
    return agents.filter((a) => {
      if (rentAdvisory || buyAdvisory) {
        if (rentAdvisory && buyAdvisory) {
          if (!a.rentFocus && !a.buyFocus) return false;
        } else if (rentAdvisory) {
          if (!a.rentFocus) return false;
        } else if (buyAdvisory) {
          if (!a.buyFocus) return false;
        }
      }
      if (specialty !== "All" && !a.specialties.includes(specialty)) return false;
      if (language !== "All" && !a.languages.includes(language)) return false;
      if (!matchesBudget(a.budgetTier, budget)) return false;
      if (loc) {
        const hay = `${a.areas.join(" ")} ${a.name} ${a.localExpertise}`.toLowerCase();
        const parts = loc.split(/\s+/).filter(Boolean);
        if (!parts.every((p) => hay.includes(p))) return false;
      }
      if (nm && !a.name.toLowerCase().includes(nm)) return false;
      return true;
    });
  }, [agents, locationQ, nameQ, rentAdvisory, buyAdvisory, specialty, language, budget]);

  const handleConnectWhatsApp = async (agent) => {
    setConnectError("");
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/agents?wa_agent=${agent.id}`)}`);
      return;
    }
    setConnectingId(agent.id);
    // Fetch profile + fresh broker phone in parallel
    const [profile, brokerSnap] = await Promise.all([
      fetchCustomerSearchProfile(user.uid),
      isFirebaseConfigured ? getDoc(doc(db, "brokers", agent.id)).catch(() => null) : Promise.resolve(null),
    ]);
    const phone = brokerSnap?.exists?.() ? String(brokerSnap.data().phone || "") : (agent.phone || "");
    const savedPriority = profile?.priority || "";
    const agentWithPhone = { ...agent, phone };
    if (savedPriority) {
      // Priority already stored — skip the modal, go straight to WhatsApp
      setPriorityPick(null);
      logBrokerContact({
        clientId: user.uid,
        clientEmail: user.email,
        clientName: user.displayName || user.email,
        brokerId: agent.id,
        brokerName: agent.name,
      });
      try {
        const message = buildWAMessage(agentWithPhone, profile, savedPriority);
        const digits = phone.replace(/\D/g, "");
        if (digits.length < 10) throw new Error("No WhatsApp number on file for this agent — contact support.");
        const number = digits.startsWith("91") && digits.length === 12 ? digits : `91${digits.slice(-10)}`;
        window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
      } catch (e) {
        setConnectError(String(e?.message || e || "Could not connect"));
      } finally {
        setConnectingId("");
      }
      return;
    }
    setConnectingId("");
    setPriorityPick({ agent: agentWithPhone, profile, savedPriority });
  };

  // Auto-open WhatsApp when coming back from login with wa_agent param
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const waAgent = searchParams.get("wa_agent");
    if (!waAgent) return;
    if (!user) return; // wait until logged in
    // find the agent and trigger connect
    const found = agents.find((a) => String(a.id) === String(waAgent));
    if (found) {
      // clear the param to avoid loops
      setSearchParams({});
      // small delay to allow UI to settle
      setTimeout(() => handleConnectWhatsApp(found), 80);
    } else {
      setSearchParams({});
    }
  }, [agents, user, searchParams]);

  const handlePrioritySelect = async (priority) => {
    if (!priorityPick) return;
    const { agent, profile } = priorityPick;
    setPriorityPick(null);
    setConnectingId(agent.id);
    logBrokerContact({
      clientId: user.uid,
      clientEmail: user.email,
      clientName: user.displayName || user.email,
      brokerId: agent.id,
      brokerName: agent.name,
    });
    try {
      const message = buildWAMessage(agent, profile, priority);
      const digits = (agent.phone || "").replace(/\D/g, "");
      if (digits.length < 10) {
        throw new Error("No WhatsApp number on file for this agent — contact support.");
      }
      // Normalise to full Indian number: 917XXXXXXXXXX
      const number =
        digits.startsWith("91") && digits.length === 12
          ? digits
          : `91${digits.slice(-10)}`;
      window.open(
        `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } catch (e) {
      setConnectError(String(e?.message || e || "Could not connect"));
    } finally {
      setConnectingId("");
    }
  };

  const handleOpenRating = (agent) => {
    setRatingPick(myRatings[agent.id] ?? 0);
    setRatingHover(0);
    setRatingModal(agent);
  };

  const handleRatingSubmit = async () => {
    if (!ratingModal || !ratingPick || !user?.uid) return;
    setRatingSubmitting(true);
    try {
      const { ratingAvg, ratingCount } = await submitAgentRating(user.uid, ratingModal.id, ratingPick);
      setMyRatings((prev) => ({ ...prev, [ratingModal.id]: ratingPick }));
      setAgents((prev) =>
        prev.map((a) => a.id === ratingModal.id ? { ...a, rating: ratingAvg, ratingCount } : a)
      );
      setRatingModal(null);
    } catch (e) {
      console.error("[handleRatingSubmit]", e);
    } finally {
      setRatingSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col antialiased">
      <Navbar />

      {/* ── Hero ── */}
      <section className="pt-4 pb-3 px-4">
        <motion.div
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.55, ease:EASE }}
          className="max-w-3xl mx-auto text-center"
        >
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-[1.08]">
            <span className="text-gray-900">{typedFull.slice(0, Math.min(typedFull.length, GRADIENT_START))}</span>
            {typedFull.length > GRADIENT_START && (
              <span className="text-[#e8321a]">
                {typedFull.slice(GRADIENT_START)}
              </span>
            )}
            {typedFull.length < FULL_HEADING.length && (
              <span className="inline-block w-[2px] h-[0.85em] align-middle ml-0.5 animate-pulse" style={{ background:"#e8321a" }} />
            )}
          </h1>
        </motion.div>
      </section>

      {/* ── Sticky filter bar ── */}
      <div className="sticky top-12 z-30 bg-white border-y border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-3">
          <select
            value={locationQ}
            onChange={e => setLocationQ(e.target.value)}
            className="flex-1 h-10 rounded-lg border-2 border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-800 cursor-pointer focus:outline-none focus:border-[#e8321a] focus:bg-white transition-colors"
          >
            <option value="">All areas</option>
            {["HSR Layout","Koramangala","Bellandur","Kadubesanahalli","Marathalli","Whitefield","Brookfield","Hoodi","Indiranagar","BTM Layout","Manyata Tech Park","HBR Layout","Hebbal","Electronic City"].map(a => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <div className="relative flex-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:"#e8321a" }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={nameQ}
              onChange={e => setNameQ(e.target.value)}
              placeholder="Search by name…"
              className="w-full h-10 rounded-lg border-2 border-gray-200 bg-gray-50 pl-9 pr-4 text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#e8321a] focus:bg-white transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ── Card grid ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-4">
        {loading && <div className="mb-3 text-gray-300 text-xs">loading…</div>}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a, i) => (
            <motion.article
              key={a.id}
              initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
              transition={{ duration:0.38, delay:Math.min(i*0.05, 0.35), ease:EASE }}
              className="flex flex-col rounded-2xl border border-gray-200 bg-gray-50 shadow-md hover:shadow-xl hover:border-[#e8321a] hover:-translate-y-0.5 transition-all duration-300"
            >
              {/* Red top strip */}
              <div className="h-1.5 w-full rounded-t-2xl" style={{ background:"#e8321a" }} />

              {/* Card top: avatar + name + rating */}
              <div className="px-4 pt-4 pb-3 flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="h-12 w-12 rounded-full flex items-center justify-center text-base font-black text-white shadow-md"
                    style={{ background:"#e8321a" }}>
                    {a.initials}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-extrabold text-gray-900 leading-tight truncate">{a.name}</p>
                  {a.rating != null ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-amber-400 text-sm leading-none">{"★".repeat(Math.round(a.rating))}</span>
                      <span className="text-xs font-bold text-gray-500">{a.rating.toFixed(1)}</span>
                      {a.ratingCount > 0 && <span className="text-[10px] text-gray-400">({a.ratingCount})</span>}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400 mt-0.5">No ratings yet</p>
                  )}
                </div>
              </div>

              <div className="h-px bg-gray-100 mx-4" />

              {/* Details */}
              <div className="px-4 py-3 flex-1 space-y-2">
                {a.localExpertise && (
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0" style={{ color:"#e8321a" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <span className="text-gray-700 text-xs font-semibold">{a.localExpertise}</span>
                  </div>
                )}
                {a.priceRangeLabel && (
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0" style={{ color:"#e8321a" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span className="text-gray-700 text-xs font-semibold">{a.priceRangeLabel}</span>
                  </div>
                )}
                {a.recentActivity && (
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0" style={{ color:"#e8321a" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span className="text-gray-700 text-xs font-semibold">{a.recentActivity}</span>
                  </div>
                )}
                {a.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {a.specialties.slice(0,3).map(s => (
                      <span key={s} className="rounded-full px-2.5 py-1 text-[10px] font-bold border border-rose-100"
                        style={{ background:"rgba(232,90,79,0.08)", color:"#e8321a" }}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="px-4 pb-4 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={connectingId === a.id}
                  onClick={() => handleConnectWhatsApp(a)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-bold text-white transition-all active:scale-95 disabled:opacity-60 hover:opacity-90"
                  style={{ background:"linear-gradient(135deg,#1fba53,#25d366)" }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  {connectingId === a.id ? "Opening WhatsApp…" : "Connect on WhatsApp"}
                </button>
                {user && (myRatings[a.id] || isRatingUnlocked(contactMap[a.id])) && (
                  <button
                    type="button"
                    onClick={() => handleOpenRating(a)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-all active:scale-95"
                    style={myRatings[a.id]
                      ? { borderColor:"rgba(251,191,36,0.5)", background:"rgba(251,191,36,0.08)", color:"#d97706" }
                      : { borderColor:"#e5e7eb", background:"transparent", color:"#9ca3af" }
                    }
                  >
                    {myRatings[a.id] ? (
                      <><span style={{ color:"#f59e0b" }}>{"★".repeat(myRatings[a.id])}</span><span>Your rating · tap to update</span></>
                    ) : (
                      <><span>⭐</span><span>Rate this agent</span></>
                    )}
                  </button>
                )}
              </div>
            </motion.article>
          ))}
        </div>

        {connectError && (
          <p className="mt-4 text-center text-sm text-red-500 font-medium">{connectError}</p>
        )}
        {!user && (
          <p className="mt-3 text-center text-xs text-gray-400">
            Sign in and complete your{" "}
            <Link to="/my-search" className="text-rose-500 font-semibold underline">search profile</Link>{" "}
            before connecting. Broker numbers are never shown on this page.
          </p>
        )}
        {filtered.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center text-3xl mb-4">🏠</div>
            <div className="text-lg font-black text-gray-800 mb-2">No agents match</div>
            <div className="text-gray-400 text-sm">Try clearing the area filter or searching a different name.</div>
          </div>
        )}

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
          transition={{ delay:0.15, ease:EASE }}
          className="mt-6 relative overflow-hidden rounded-2xl px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          style={{ background:"#e8321a" }}
        >
          <div>
            <div className="text-lg font-black text-white mb-1">Want us to find the perfect flat for you?</div>
            <p className="text-sm text-white/80 max-w-md">
              MovEAZY consultants shortlist, schedule visits, and negotiate rent on your behalf.
              One-time fee <strong className="text-white">₹1,499</strong> with a flat search guarantee.
            </p>
          </div>
          <Link
            to={FLAT_SEARCH_CTA.path}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-black bg-white transition-all active:scale-95 hover:bg-gray-100 whitespace-nowrap"
          >
            {FLAT_SEARCH_CTA.label} →
          </Link>
        </motion.div>
      </main>

      <Footer />

      {/* Priority picker modal */}
      {priorityPick && (
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setPriorityPick(null)}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 border border-gray-200 bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 sm:hidden" />

            <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Connecting with
            </div>
            <div className="mb-4 text-lg font-extrabold text-gray-900 leading-tight">
              {priorityPick.agent.name}
            </div>

            <div className="mb-3 text-sm font-semibold text-gray-700">
              What&apos;s your main priority?
            </div>
            {priorityPick.savedPriority && (
              <p className="mb-2 text-[11px] text-gray-400 font-medium">
                Pre-selected from your profile — tap to change or confirm.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {PRIORITIES.map((p) => {
                const isSelected = p === priorityPick.savedPriority;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePrioritySelect(p)}
                    className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold active:scale-[0.98] transition-all text-left"
                    style={{
                      borderColor: isSelected ? "#25D366" : "#e5e7eb",
                      background: isSelected ? "rgba(37,211,102,0.07)" : "transparent",
                      color: isSelected ? "#16a34a" : "#374151",
                    }}
                  >
                    <span className="h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                      style={{ borderColor: isSelected ? "#25D366" : "#d1d5db" }}>
                      {isSelected && <span className="h-2 w-2 rounded-full bg-[#25D366]" />}
                    </span>
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setPriorityPick(null)}
              className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rating modal */}
      {ratingModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setRatingModal(null)}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 border border-gray-200 bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 sm:hidden" />

            <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Rate your experience with
            </div>
            <div className="mb-4 text-lg font-extrabold text-gray-900 leading-tight">
              {ratingModal.name}
            </div>

            <div className="flex justify-center gap-2 mb-5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setRatingHover(star)}
                  onMouseLeave={() => setRatingHover(0)}
                  onClick={() => setRatingPick(star)}
                  className="text-4xl leading-none transition-transform hover:scale-110 focus:outline-none"
                  style={{ color: star <= (ratingHover || ratingPick) ? "#f59e0b" : "#e5e7eb" }}
                  aria-label={`${star} star`}
                >
                  ★
                </button>
              ))}
            </div>

            {ratingPick > 0 && (
              <p className="mb-4 text-center text-sm text-gray-500">
                {["", "Poor", "Fair", "Good", "Very good", "Excellent"][ratingPick]}
              </p>
            )}

            <button
              type="button"
              disabled={!ratingPick || ratingSubmitting}
              onClick={handleRatingSubmit}
              className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)" }}
            >
              {ratingSubmitting ? "Saving…" : ratingPick ? "Submit rating" : "Select a star to rate"}
            </button>

            <button
              type="button"
              onClick={() => setRatingModal(null)}
              className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
