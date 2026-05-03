import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  getAssignments,
  getListings,
  getInterestsGlobal,
  getNotificationsLocal,
  markNotificationLocalRead,
} from "../lib/store";
import { isFirebaseConfigured } from "../lib/firebase";
import {
  addVisitRequestData,
  getInterestsForCustomerEmail,
  getCustomerNotificationsData,
  getAssignmentsForCustomerEmail,
  markNotificationReadData,
} from "../lib/firestoreStore";
import { triggerVisitNotificationEmail } from "../lib/emailService";
import { interestStatusToCustomerLabel } from "../lib/crmSync";

export default function CustomerDashboard() {
  const { user, logout, requestSeller, refreshRole } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sellerRequested, setSellerRequested] = useState(false);
  const [visitForms, setVisitForms] = useState({});
  const [openVisitFor, setOpenVisitFor] = useState(null);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 900 : false);
  const [crmInterests, setCrmInterests] = useState([]);
  const [customerNotifs, setCustomerNotifs] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [dashTick, setDashTick] = useState(0);

  useEffect(() => {
    setListings(getListings());
    refreshRole();
    const reqs = JSON.parse(localStorage.getItem("moveasy_seller_requests") || "[]");
    setSellerRequested(reqs.some((r) => r.email === user?.email));
  }, []);

  useEffect(() => {
    let alive = true;
    const em = String(user?.email || "").toLowerCase().trim();
    const b = JSON.parse(localStorage.getItem("moveasy_bookings") || "[]");
    if (alive) setBookings(b);
    if (!em) {
      setCrmInterests([]);
      setCustomerNotifs([]);
      setMyAssignments([]);
      return () => {
        alive = false;
      };
    }
    (async () => {
      if (isFirebaseConfigured) {
        try {
          const [allInt, notifs, assigns] = await Promise.all([
            getInterestsForCustomerEmail(em),
            getCustomerNotificationsData(em),
            getAssignmentsForCustomerEmail(em),
          ]);
          if (!alive) return;
          setCrmInterests(Array.isArray(allInt) ? allInt : []);
          setCustomerNotifs(Array.isArray(notifs) ? notifs : []);
          setMyAssignments(Array.isArray(assigns) ? assigns : []);
        } catch (e) {
          console.error("Customer CRM load failed", e);
        }
      } else {
        if (!alive) return;
        setCrmInterests(getInterestsGlobal().filter((i) => String(i.customerEmail || "").toLowerCase() === em));
        setCustomerNotifs(
          getNotificationsLocal().filter(
            (n) => n.audience === "customer" && String(n.targetEmail || "").toLowerCase() === em
          )
        );
        setMyAssignments(getAssignments().filter((a) => String(a.customerEmail || "").toLowerCase() === em));
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.email, dashTick]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (user?.role === "seller") navigate("/seller");
  }, [user]);

  const handleBook = (listing) => {
    const booking = {
      listingId: listing.id,
      listingTitle: listing.title,
      customerName: user?.name,
      customerEmail: user?.email,
      seller: listing.seller,
      contact: listing.contact,
      sellerEmail: listing.sellerEmail || "",
      date: new Date().toISOString(),
      status: "Applied",
    };
    const updated = [...bookings, booking];
    setBookings(updated);
    localStorage.setItem("moveasy_bookings", JSON.stringify(updated));
    setDashTick((t) => t + 1);
  };

  const handleUnapply = (listingId) => {
    const updated = bookings.filter((b) => !(b.listingId === listingId && b.customerEmail === user?.email));
    setBookings(updated);
    localStorage.setItem("moveasy_bookings", JSON.stringify(updated));
    setDashTick((t) => t + 1);
  };

  const updateVisitForm = (listingId, key, value) => {
    setVisitForms((prev) => ({
      ...prev,
      [listingId]: {
        phone: prev[listingId]?.phone || "",
        time: prev[listingId]?.time || "",
        notes: prev[listingId]?.notes || "",
        [key]: value,
      },
    }));
  };

  const handleVisitSubmit = async (listing) => {
    const values = visitForms[listing.id] || {};
    if (!values.phone?.trim() || !values.time?.trim()) {
      alert("Please add phone and preferred visit time.");
      return;
    }
    if (isFirebaseConfigured) {
      await addVisitRequestData({
        listingId: listing.id,
        customerEmail: user?.email,
        customerPhone: values.phone,
        sellerEmail: listing.sellerEmail || "",
        visitTime: values.time,
        notes: values.notes || "",
      });
      await triggerVisitNotificationEmail({
        customerEmail: user?.email,
        customerPhone: values.phone,
        sellerEmail: listing.sellerEmail || "",
        visitTime: values.time,
        notes: values.notes || "",
        listingId: listing.id,
      });
    }
    alert("Visit request sent.");
    setOpenVisitFor(null);
  };

  const openWhatsAppFor = (listing) => {
    const digits = String(listing.contact || "").replace(/\D/g, "");
    if (!digits) {
      alert("Seller phone is not available for WhatsApp.");
      return;
    }
    const text = encodeURIComponent(`Hi ${listing.seller || "there"}, I am interested in "${listing.title}" on MovEazy. Is this still available?`);
    window.open(`https://wa.me/91${digits}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleRequestSeller = () => {
    requestSeller();
    setSellerRequested(true);
  };

  const isBooked = (id) => bookings.some((b) => b.listingId === id && b.customerEmail === user?.email);
  const bhkTypes = ["All", "1RK", "1BHK", "2BHK", "3BHK", "3+BHK", "4BHK"];
  const filtered = listings.filter((l) => (filter === "All" || l.bhk === filter || l.bhk.replace(" ", "") === filter) && (!search || l.title.toLowerCase().includes(search.toLowerCase()) || l.address.toLowerCase().includes(search.toLowerCase())));
  const btn = { padding: "8px 16px", borderRadius: "10px", border: "none", fontWeight: 600, fontSize: "13px", cursor: "pointer" };

  const markCustomerNotifRead = async (n) => {
    if (isFirebaseConfigured) await markNotificationReadData(n.id);
    else markNotificationLocalRead(n.id);
    setDashTick((t) => t + 1);
  };

  const formatWhen = (ts) => {
    if (ts?.toDate) return ts.toDate().toLocaleString();
    if (ts?.toMillis) return new Date(ts.toMillis()).toLocaleString();
    if (typeof ts === "string") return new Date(ts).toLocaleString();
    return "";
  };

  const applicationRows = (() => {
    const em = String(user?.email || "").toLowerCase().trim();
    if (!em) return [];
    const byLid = new Map();
    for (const b of bookings.filter((x) => String(x.customerEmail || "").toLowerCase() === em)) {
      byLid.set(String(b.listingId), { booking: b, interest: null });
    }
    for (const i of crmInterests) {
      const k = String(i.listingId);
      const cur = byLid.get(k) || { booking: null, interest: null };
      cur.interest = i;
      byLid.set(k, cur);
    }
    return [...byLid.entries()].map(([listingId, { booking, interest }]) => {
      const title = interest?.listingTitle || booking?.listingTitle || `Listing #${listingId}`;
      const rawStatus = interest?.status || booking?.applicationStatusCode || null;
      const statusLabel = rawStatus
        ? interestStatusToCustomerLabel(rawStatus)
        : booking?.status || "Applied — awaiting admin review";
      const source = interest ? "Listing / map application" : "Dashboard apply";
      const when =
        formatWhen(interest?.updatedAt) ||
        formatWhen(interest?.createdAt) ||
        interest?.submittedAt ||
        (booking?.date ? new Date(booking.date).toLocaleString() : "");
      return { listingId, title, statusLabel, source, when, interest, booking };
    });
  })();

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #eef4ff 0%, #f7f9ff 42%, #f8fafc 100%)" }}>
      <div style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)", color: "white", padding: isMobile ? "12px" : "16px 24px", display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "10px" : 0 }}>
        <div>
          <div style={{ fontSize: isMobile ? "18px" : "20px", fontWeight: 800 }}>Welcome, {user?.name}</div>
          <div style={{ fontSize: "12px", opacity: 0.7 }}>Find your perfect home</div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {!sellerRequested && (
            <button onClick={handleRequestSeller} style={{ ...btn, background: "#f59e0b", color: "#1e293b" }}>Apply as Seller</button>
          )}
          {sellerRequested && (
            <span style={{ ...btn, background: "rgba(255,255,255,0.1)", color: "#fbbf24", cursor: "default" }}>Seller Request Pending</span>
          )}
          <button onClick={() => navigate("/map")} style={{ ...btn, background: "rgba(255,255,255,0.15)", color: "white" }}>Map</button>
          <button onClick={() => navigate("/")} style={{ ...btn, background: "rgba(255,255,255,0.15)", color: "white" }}>Home</button>
          <button onClick={() => { logout(); navigate("/login"); }} style={{ ...btn, background: "#ef4444", color: "white" }}>Logout</button>
        </div>
      </div>
      <div style={{ padding: isMobile ? "12px" : "16px 24px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" onClick={() => setDashTick((t) => t + 1)} style={{ ...btn, background: "#1e3a8a", color: "white" }}>
            Refresh status
          </button>
          <span style={{ fontSize: "12px", color: "#64748b" }}>Pull latest application steps and messages from MovEazy.</span>
        </div>
        {customerNotifs.length > 0 && (
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px" }}>
            <div style={{ fontWeight: 800, fontSize: "15px", color: "#1e3a8a", marginBottom: "8px" }}>
              Updates from MovEazy ({customerNotifs.filter((n) => !n.read).length} unread)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: 240, overflowY: "auto" }}>
              {customerNotifs.map((n) => (
                <div key={n.id} style={{ background: "white", borderRadius: "10px", padding: "10px 12px", border: n.read ? "1px solid #e2e8f0" : "2px solid #2563eb" }}>
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>{n.title}</div>
                  <div style={{ fontSize: "13px", color: "#475569", marginTop: "4px", lineHeight: 1.45 }}>{n.body}</div>
                  {!n.read ? (
                    <button type="button" onClick={() => markCustomerNotifRead(n)} style={{ ...btn, marginTop: "8px", background: "#0f172a", color: "white", fontSize: "12px" }}>
                      Mark read
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
        {applicationRows.length > 0 && (
          <div style={{ background: "white", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px", border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(15,23,42,0.06)" }}>
            <div style={{ fontWeight: 800, fontSize: "16px", color: "#0f172a", marginBottom: "6px" }}>Your applications</div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 12px", lineHeight: 1.5 }}>
              Each row is a home you applied for. Status updates when the MovEazy team moves your application forward; you also get an email when your inbox is a real address (not guest mode).
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "8px 6px" }}>Listing</th>
                    <th style={{ padding: "8px 6px" }}>Source</th>
                    <th style={{ padding: "8px 6px" }}>Status</th>
                    <th style={{ padding: "8px 6px" }}>Last update</th>
                  </tr>
                </thead>
                <tbody>
                  {applicationRows.map((row) => (
                    <tr key={row.listingId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 6px", fontWeight: 600, color: "#1e293b" }}>{row.title}</td>
                      <td style={{ padding: "10px 6px", color: "#475569" }}>{row.source}</td>
                      <td style={{ padding: "10px 6px", color: "#b45309", fontWeight: 600 }}>{row.statusLabel}</td>
                      <td style={{ padding: "10px 6px", color: "#64748b", whiteSpace: "nowrap" }}>{row.when || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: "10px", marginBottom: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <input placeholder="Search by title or area..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", width: isMobile ? "100%" : "260px" }} />
          {bhkTypes.map((b) => (
            <button key={b} onClick={() => setFilter(b)} style={{ ...btn, background: filter === b ? "#1e3a8a" : "white", color: filter === b ? "white" : "#64748b", border: "1px solid #e2e8f0", fontSize: "12px", padding: "6px 12px" }}>{b}</button>
          ))}
        </div>
        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>Showing {filtered.length} properties</p>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px" }}>
          {filtered.map((l) => (
            <div key={l.id} style={{ background: "white", borderRadius: "14px", padding: isMobile ? "14px" : "16px", border: "1px solid #edf1f7", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>{l.bhk}</span>
                <span style={{ background: l.type === "Sale" ? "#dcfce7" : "#fef3c7", color: l.type === "Sale" ? "#166534" : "#92400e", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>For {l.type}</span>
                <span style={{ background: "#fee2e2", color: "#b91c1c", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>{l.availability}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b", margin: "4px 0" }}>{l.title}</div>
              <div style={{ fontSize: "13px", color: "#64748b" }}>{l.address}</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#16a34a", margin: "8px 0" }}>{l.price}</div>
              <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: "6px", marginBottom: "10px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>{l.seller}</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>{l.company}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <a href={"tel:" + l.contact} style={{ flex: 1, textAlign: "center", padding: "8px", background: "#1e3a8a", color: "white", borderRadius: "6px", textDecoration: "none", fontWeight: 600, fontSize: "13px" }}>Call</a>
                <button onClick={() => !isBooked(l.id) && handleBook(l)} disabled={isBooked(l.id)} style={{ flex: 1, ...btn, background: isBooked(l.id) ? "#94a3b8" : "#16a34a", color: "white" }}>{isBooked(l.id) ? "Applied" : "Book"}</button>
                <button onClick={() => openWhatsAppFor(l)} style={{ ...btn, background: "#22c55e", color: "white", gridColumn: "span 1" }}>WhatsApp</button>
                <button onClick={() => setOpenVisitFor(openVisitFor === l.id ? null : l.id)} style={{ ...btn, background: "#f97316", color: "white", gridColumn: "span 1" }}>{openVisitFor === l.id ? "Close Visit" : "Book Visit"}</button>
                {isBooked(l.id) && (
                  <button onClick={() => handleUnapply(l.id)} style={{ ...btn, background: "#ef4444", color: "white", gridColumn: "1 / -1" }}>
                    Unapply
                  </button>
                )}
              </div>
              {openVisitFor === l.id && (
                <div style={{ marginTop: "10px", padding: "10px", borderRadius: "10px", background: "#fff7ed", border: "1px solid #fed7aa", display: "grid", gap: "8px" }}>
                  <input placeholder="Phone number" value={visitForms[l.id]?.phone || ""} onChange={(e) => updateVisitForm(l.id, "phone", e.target.value)} style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                  <input placeholder="Preferred time (e.g. Tomorrow 5 PM)" value={visitForms[l.id]?.time || ""} onChange={(e) => updateVisitForm(l.id, "time", e.target.value)} style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                  <textarea rows={2} placeholder="Notes (optional)" value={visitForms[l.id]?.notes || ""} onChange={(e) => updateVisitForm(l.id, "notes", e.target.value)} style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                  <button onClick={() => handleVisitSubmit(l)} style={{ ...btn, background: "#ea580c", color: "white" }}>Send Visit Request</button>
                </div>
              )}
            </div>
          ))}
        </div>
        {bookings.filter((b) => b.customerEmail === user?.email).length > 0 && (
          <div style={{ marginTop: "24px" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px" }}>My Bookings</div>
            {bookings.filter((b) => b.customerEmail === user?.email).map((b, i) => (
              <div key={i} style={{ background: "white", padding: "12px 16px", borderRadius: "8px", marginBottom: "8px", fontSize: "13px", display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <b>{b.listingTitle}</b> — {new Date(b.date).toLocaleDateString()} — <span style={{ color: "#f59e0b", fontWeight: 600 }}>{b.status}</span>
                  {b.tenancyPreference ? (
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                      Preference:{" "}
                      <strong style={{ color: "#334155" }}>
                        {b.tenancyPreference === "entire_unit"
                          ? "Whole unit"
                          : b.tenancyPreference === "seeking_flatmate"
                            ? "Seeking flatmate"
                            : b.tenancyPreference === "open_to_share"
                              ? "Open to share"
                              : b.tenancyPreference}
                      </strong>
                      {b.adultsSharing ? (
                        <>
                          {" "}
                          · Split among <strong>{b.adultsSharing}</strong> people
                        </>
                      ) : null}
                    </div>
                  ) : null}
                  {b.notes ? <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", fontStyle: "italic" }}>{b.notes}</div> : null}
                </div>
                <button onClick={() => handleUnapply(b.listingId)} style={{ ...btn, background: "#ef4444", color: "white", padding: "6px 10px", fontSize: "12px" }}>Unapply</button>
              </div>
            ))}
          </div>
        )}
        {myAssignments.length > 0 && (
          <div style={{ marginTop: "24px" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px" }}>Listings assigned by admin</div>
            {myAssignments.map((a) => (
              <div key={a.id} style={{ background: "#ecfeff", padding: "12px 16px", borderRadius: "8px", marginBottom: "8px", fontSize: "13px" }}>
                Listing #{a.listingId} — broker <b>{a.sellerEmail}</b>
                {a.notes ? ` — ${a.notes}` : ""}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
