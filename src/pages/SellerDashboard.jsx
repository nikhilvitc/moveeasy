import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/layout/PageShell";
import { isFirebaseConfigured } from "../lib/firebase";
import {
  getAssignmentsForSellerEmail,
  getListingsForSellerEmail,
  withdrawListingBySeller,
  republishListingBySeller,
  uploadListingFiles,
  upsertListingData,
  getVisitsForSellerEmail,
  getInterestsForSellerEmail,
  getSellerNotificationsData,
  markNotificationReadData,
  isListingPubliclyVisible,
  updateInterestSellerNotesData,
} from "../lib/firestoreStore";
import { getProfileByEmail } from "../lib/profileService";
import MediaUploadField from "../components/MediaUploadField";

async function readUserRow(email) {
  if (!email) return null;
  if (isFirebaseConfigured) return getProfileByEmail(email);
  try {
    const users = JSON.parse(localStorage.getItem("moveasy_users") || "{}");
    return users[email] || null;
  } catch {
    return null;
  }
}
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getAssignments, getListings, upsertListing, withdrawListingLocal, republishListingLocal, getInterestsGlobal, getNotificationsLocal, markNotificationLocalRead } from "../lib/store";

function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) { setPosition([e.latlng.lat, e.latlng.lng]); },
  });
  return position ? <Marker position={position} /> : null;
}

export default function SellerDashboard() {
  const { user, logout, submitSellerBadgeApplication } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const emptyForm = () => ({
    title: "", price: "", type: "Rent", bhk: "2BHK", address: "", contact: "", imagesText: "",
    securityDeposit: "", maintenanceCost: "", brokerage: "", builtUpArea: "", bathrooms: "", balcony: "",
    floorNumber: "", totalFloors: "", leaseType: "", ageOfProperty: "", parkingInfo: "", gasPipeline: "",
    gatedCommunity: "", furnishingsText: "", amenitiesText: "",
    description: "",
    propertyType: "Apartment",
    furnishing: "Semi",
    availability: "Immediate",
    preferredTenantsText: "Family",
    parkingText: "2 Wheeler",
    sourceUrl: "",
    areaUnit: "sq ft",
  });
  const [form, setForm] = useState(emptyForm);
  const [pinPosition, setPinPosition] = useState(null);
  const [myAssignments, setMyAssignments] = useState([]);
  const [sellerRow, setSellerRow] = useState(null);
  const [badgeForm, setBadgeForm] = useState({ businessName: "", phone: "", gst: "" });
  const [badgeMsg, setBadgeMsg] = useState("");
  const [badgeMsgKind, setBadgeMsgKind] = useState("ok");
  const [listingSaveMsg, setListingSaveMsg] = useState("");
  const [listingSaveKind, setListingSaveKind] = useState("ok");
  const [photoFiles, setPhotoFiles] = useState([]);
  const [visitRequests, setVisitRequests] = useState([]);
  const [leadInterests, setLeadInterests] = useState([]);
  const [sellerNotifs, setSellerNotifs] = useState([]);
  const [dashTick, setDashTick] = useState(0);
  const [sellerMainTab, setSellerMainTab] = useState("leads");
  const [sellerNoteDrafts, setSellerNoteDrafts] = useState({});
  const [savingInterestId, setSavingInterestId] = useState(null);

  const listingTitleById = useMemo(() => {
    const m = new Map();
    listings.forEach((l) => m.set(String(l.id), l.title || `Listing #${l.id}`));
    return m;
  }, [listings]);

  const interestsByListingId = useMemo(() => {
    const map = new Map();
    leadInterests.forEach((i) => {
      const k = String(i.listingId || "");
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(i);
    });
    return map;
  }, [leadInterests]);

  useEffect(() => {
    setSellerNoteDrafts((prev) => {
      const next = { ...prev };
      leadInterests.forEach((i) => {
        if (next[i.id] === undefined) next[i.id] = i.sellerNotes || "";
      });
      return next;
    });
  }, [leadInterests]);

  useEffect(() => {
    let alive = true;
    async function load() {
      const em = String(user?.email || "").toLowerCase().trim();
      const [allListings, allAssignments, row, allVisits, interestsAll, notifs] = isFirebaseConfigured
        ? await Promise.all([
            getListingsForSellerEmail(em),
            getAssignmentsForSellerEmail(em),
            readUserRow(user?.email),
            getVisitsForSellerEmail(em),
            getInterestsForSellerEmail(em),
            getSellerNotificationsData(user?.email),
          ])
        : [getListings(), getAssignments(), await readUserRow(user?.email), [], getInterestsGlobal(), getNotificationsLocal().filter((n) => n.audience === "seller" && String(n.targetEmail || "").toLowerCase() === em)];
      if (!alive) return;
      setListings(
        isFirebaseConfigured
          ? allListings
          : allListings.filter((l) => String(l.sellerEmail || "").toLowerCase().trim() === em)
      );
      setMyAssignments(Array.isArray(allAssignments) ? allAssignments : []);
      setSellerRow(row);
      setVisitRequests(Array.isArray(allVisits) ? allVisits : []);
      setLeadInterests(Array.isArray(interestsAll) ? interestsAll : []);
      setSellerNotifs(Array.isArray(notifs) ? notifs : []);
    }
    load().catch(() => undefined);
    return () => { alive = false; };
  }, [user, dashTick]);

  const markSellerNotifRead = async (n) => {
    if (isFirebaseConfigured) await markNotificationReadData(n.id);
    else markNotificationLocalRead(n.id);
    setDashTick((t) => t + 1);
  };

  const handleBadgeSubmit = async (e) => {
    e.preventDefault();
    setBadgeMsg("");
    setBadgeMsgKind("ok");
    try {
      const res = await submitSellerBadgeApplication(badgeForm);
      if (!res.success) {
        setBadgeMsgKind("err");
        setBadgeMsg(res.error || "Could not submit");
        return;
      }
      setBadgeForm({ businessName: "", phone: "", gst: "" });
      setSellerRow(await readUserRow(user?.email));
      setBadgeMsgKind("ok");
      setBadgeMsg("Application submitted. Admin will review for a verified badge.");
    } catch (err) {
      setBadgeMsgKind("err");
      setBadgeMsg(err?.message || String(err) || "Could not submit");
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setListingSaveMsg("");
    if (!pinPosition) { alert("Please click on the map to set property location"); return; }
    const authEmail = String(user?.email || "").toLowerCase().trim();
    const id = form.id || String(Date.now());
    try {
      const uploadedImages = photoFiles.length ? await uploadListingFiles(photoFiles, id) : [];
      const manualImages = String(form.imagesText || "").split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
      const mergedImages = [...uploadedImages, ...manualImages];
      const finalImages = mergedImages.length ? mergedImages : (form.images || []);
      const preferredTenants = String(form.preferredTenantsText || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const parking = String(form.parkingText || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const newItem = {
        ...form,
        id,
        seller: user?.name || "Seller",
        sellerEmail: authEmail,
        ownerEmail: authEmail,
        lat: pinPosition[0],
        lng: pinPosition[1],
        experience: "N/A",
        totalListings: 0,
        areas: form.address,
        company: user?.name,
        contact: form.contact || "N/A",
        monthlyRent: Number(String(form.price).replace(/[^\d]/g, "")) || Number(form.monthlyRent) || 0,
        availability: form.availability || "Immediate",
        propertyType: form.propertyType || "Apartment",
        furnishing: form.furnishing || "Semi",
        preferredTenants: preferredTenants.length ? preferredTenants : ["Family"],
        parking: parking.length ? parking : ["2 Wheeler"],
        leaseType: String(form.leaseType || "").trim(),
        balcony: String(form.balcony || "").trim(),
        floorNumber: String(form.floorNumber || "").trim(),
        totalFloors: String(form.totalFloors || "").trim(),
        ageOfProperty: String(form.ageOfProperty || "").trim(),
        gasPipeline: String(form.gasPipeline || "").trim(),
        gatedCommunity: String(form.gatedCommunity || "").trim(),
        parkingInfo: String(form.parkingInfo || "").trim(),
        sourceUrl: String(form.sourceUrl || "").trim(),
        areaUnit: String(form.areaUnit || "sq ft").trim() || "sq ft",
        description: String(form.description || "").trim(),
        amenities: String(form.amenitiesText || "").split(",").map((x) => x.trim()).filter(Boolean),
        furnishings: String(form.furnishingsText || "").split(",").map((x) => x.trim()).filter(Boolean),
        images: finalImages,
        image: finalImages[0] || "",
      };
      if (isFirebaseConfigured) await upsertListingData(newItem, user);
      else upsertListing(newItem);
      const all = isFirebaseConfigured ? await getListingsForSellerEmail(authEmail) : getListings();
      setListings(
        isFirebaseConfigured ? all : all.filter((l) => String(l.sellerEmail || "").toLowerCase().trim() === authEmail)
      );
      setForm(emptyForm());
      setPinPosition(null);
      setPhotoFiles([]);
      setShowAdd(false);
      setListingSaveKind("ok");
      setListingSaveMsg("Listing saved successfully.");
    } catch (err) {
      console.error(err);
      setListingSaveKind("err");
      setListingSaveMsg(err?.message || String(err) || "Save failed. If this persists, check that your account is a seller in Firestore (userRoles) and try again.");
    }
  };

  const handleEdit = (listing) => {
    setForm({
      ...emptyForm(),
      ...listing,
      imagesText: Array.isArray(listing.images) ? listing.images.join("\n") : (listing.imagesText || ""),
      amenitiesText: Array.isArray(listing.amenities) ? listing.amenities.join(", ") : (listing.amenitiesText || ""),
      furnishingsText: Array.isArray(listing.furnishings) ? listing.furnishings.join(", ") : (listing.furnishingsText || ""),
      preferredTenantsText: Array.isArray(listing.preferredTenants) ? listing.preferredTenants.join(", ") : (listing.preferredTenantsText || "Family"),
      parkingText: Array.isArray(listing.parking) ? listing.parking.join(", ") : (listing.parkingText || listing.parkingInfo || "2 Wheeler"),
      description: listing.description || "",
      propertyType: listing.propertyType || listing.type || "Apartment",
      furnishing: listing.furnishing || "Semi",
      availability: listing.availability || "Immediate",
      sourceUrl: listing.sourceUrl || "",
      areaUnit: listing.areaUnit || "sq ft",
    });
    setPinPosition([listing.lat, listing.lng]);
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleWithdrawListing = async (id) => {
    try {
      if (isFirebaseConfigured) await withdrawListingBySeller(id);
      else withdrawListingLocal(id);
    } catch {
      alert("Could not withdraw listing. Try again or contact support.");
      return;
    }
    const em = String(user?.email || "").toLowerCase().trim();
    const all = isFirebaseConfigured ? await getListingsForSellerEmail(em) : getListings();
    setListings(isFirebaseConfigured ? all : all.filter((l) => String(l.sellerEmail || "").toLowerCase().trim() === em));
  };

  const handleRelist = async (id) => {
    try {
      if (isFirebaseConfigured) await republishListingBySeller(id);
      else republishListingLocal(id);
    } catch {
      alert("Could not relist. Try again or contact support.");
      return;
    }
    const em = String(user?.email || "").toLowerCase().trim();
    const all = isFirebaseConfigured ? await getListingsForSellerEmail(em) : getListings();
    setListings(isFirebaseConfigured ? all : all.filter((l) => String(l.sellerEmail || "").toLowerCase().trim() === em));
  };

  const handleSaveInterestSellerNote = async (interestId) => {
    if (!isFirebaseConfigured) {
      alert("Saving notes to the cloud requires Firebase.");
      return;
    }
    setSavingInterestId(interestId);
    try {
      await updateInterestSellerNotesData(interestId, sellerNoteDrafts[interestId] ?? "");
      setDashTick((t) => t + 1);
    } catch (err) {
      alert(err?.message || String(err) || "Could not save note.");
    } finally {
      setSavingInterestId(null);
    }
  };

  const btn = { padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "13px", cursor: "pointer" };

  return (
    <PageShell variant="marketing" overlayOnly className="bg-slate-100">
      <div style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)", color: "white", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>Seller Dashboard</div>
          <div style={{ fontSize: "12px", opacity: 0.7 }}>Welcome, {user?.name}</div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => navigate("/map")} style={{ ...btn, background: "rgba(255,255,255,0.15)", color: "white" }}>Map</button>
          <button onClick={() => navigate("/")} style={{ ...btn, background: "rgba(255,255,255,0.15)", color: "white" }}>Home</button>
          <button onClick={() => { logout(); navigate("/login"); }} style={{ ...btn, background: "#ef4444", color: "white" }}>Logout</button>
        </div>
      </div>
      <div style={{ padding: "20px 24px" }}>
        <div role="tablist" aria-label="Seller sections" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {[
            ["leads", "Leads & customers"],
            ["listings", "My listings"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSellerMainTab(id)}
              style={{
                ...btn,
                fontSize: "13px",
                background: sellerMainTab === id ? "#1e293b" : "#fff",
                color: sellerMainTab === id ? "#fff" : "#334155",
                border: `1px solid ${sellerMainTab === id ? "#1e293b" : "#cbd5e1"}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {sellerMainTab === "leads" && (
        <>
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "12px", padding: "12px 14px", marginBottom: "16px", fontSize: "12px", color: "#14532d", lineHeight: 1.55 }}>
          <strong>Your access:</strong> See renter applications, admin-assigned leads, and visit requests tied to your listings. <strong>Pipeline status</strong> (new → contacted → …) is updated by MovEasy admin. You can add <strong>private notes</strong> on each application. Use <em>My listings</em> to add or edit homes, withdraw from search, or relist.
        </div>
        {sellerNotifs.length > 0 && (
          <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px" }}>
            <div style={{ fontWeight: 800, fontSize: "15px", color: "#9f1239", marginBottom: "8px" }}>Notifications ({sellerNotifs.filter((n) => !n.read).length} unread)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: 220, overflowY: "auto" }}>
              {sellerNotifs.map((n) => (
                <div key={n.id} style={{ background: "white", borderRadius: "10px", padding: "10px 12px", border: n.read ? "1px solid #e2e8f0" : "2px solid #f43f5e" }}>
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>{n.title}</div>
                  <div style={{ fontSize: "13px", color: "#475569", marginTop: "4px", lineHeight: 1.45 }}>{n.body}</div>
                  {!n.read ? (
                    <button type="button" onClick={() => markSellerNotifRead(n)} style={{ ...btn, marginTop: "8px", background: "#0f172a", color: "white", fontSize: "12px" }}>
                      Mark read
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ background: "white", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "8px", color: "#0f172a" }}>Renter applications (by listing)</div>
          {leadInterests.length === 0 ? (
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: 1.55 }}>No applications yet. When someone uses <strong>Submit interest</strong> on the map for one of your properties, their request appears here.</p>
          ) : (
            Array.from(interestsByListingId.entries()).map(([listingId, rows]) => (
              <div key={listingId || "unknown"} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px", marginBottom: "12px", background: "#fafafa" }}>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "14px" }}>
                    {listingTitleById.get(String(listingId)) || rows[0]?.listingTitle || `Listing #${listingId}`}
                  </div>
                  {listingId ? (
                    <button type="button" onClick={() => navigate(`/map?listingId=${encodeURIComponent(String(listingId))}`)} style={{ ...btn, fontSize: "11px", padding: "6px 10px", background: "#1e40af", color: "white" }}>
                      Open on map
                    </button>
                  ) : null}
                </div>
                {rows.map((i) => (
                  <div key={i.id} style={{ borderTop: "1px solid #e2e8f0", paddingTop: "10px", marginTop: "10px", fontSize: "13px", color: "#334155", lineHeight: 1.55 }}>
                    <div style={{ fontWeight: 700 }}>
                      {i.customerName || "Applicant"}{" "}
                      <a href={`mailto:${encodeURIComponent(i.customerEmail || "")}`} style={{ color: "#2563eb", fontWeight: 600 }}>{i.customerEmail}</a>
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                      {i.tenancyPreference} · {i.adultsSharing} people · status: <em>{i.status || "new"}</em> (admin-managed)
                    </div>
                    {i.notes ? <div style={{ fontSize: "12px", marginTop: "6px", fontStyle: "italic", color: "#475569" }}>Renter note: {i.notes}</div> : null}
                    {i.sellerNotes ? <div style={{ fontSize: "11px", marginTop: "4px", color: "#64748b" }}>Saved {i.sellerNotesUpdatedAt?.toDate ? i.sellerNotesUpdatedAt.toDate().toLocaleString() : ""}</div> : null}
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", marginTop: "10px" }}>Your private notes (only you + admin)</label>
                    <textarea
                      value={sellerNoteDrafts[i.id] ?? ""}
                      onChange={(e) => setSellerNoteDrafts((p) => ({ ...p, [i.id]: e.target.value }))}
                      rows={2}
                      placeholder="Call outcome, visit time agreed, follow-up…"
                      style={{ width: "100%", marginTop: "4px", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12px", resize: "vertical" }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveInterestSellerNote(i.id)}
                      disabled={savingInterestId === i.id}
                      style={{ ...btn, marginTop: "6px", fontSize: "11px", padding: "6px 12px", background: savingInterestId === i.id ? "#94a3b8" : "#0f766e", color: "white" }}
                    >
                      {savingInterestId === i.id ? "Saving…" : "Save note"}
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
        {myAssignments.length > 0 && (
          <div style={{ background: "#ecfeff", border: "1px solid #a5f3fc", borderRadius: "12px", padding: "12px", marginBottom: "16px" }}>
            <div style={{ fontWeight: 700, marginBottom: "6px" }}>Assigned Leads ({myAssignments.length})</div>
            {myAssignments.map((a) => (
              <div key={a.id} style={{ fontSize: "12px", marginBottom: "10px", padding: "8px 10px", background: "#fff", borderRadius: "8px", border: "1px solid #bae6fd" }}>
                <div style={{ fontWeight: 700, color: "#0c4a6e" }}>{a.listingTitle || `Listing #${a.listingId}`}</div>
                <div style={{ marginTop: "4px" }}>
                  <strong>Customer:</strong> {a.customerName ? `${a.customerName} · ` : ""}{a.customerEmail}
                  {a.customerPhone ? <span> · <strong>Phone:</strong> {a.customerPhone}</span> : null}
                </div>
                {a.notes ? <div style={{ marginTop: "4px", color: "#64748b", fontStyle: "italic" }}>{a.notes}</div> : null}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: "8px", alignItems: "center" }}>
                  <a href={`mailto:${encodeURIComponent(a.customerEmail || "")}`} style={{ fontSize: "11px", color: "#2563eb", fontWeight: 700 }}>Email customer</a>
                  {a.customerPhone ? (
                    <a href={`tel:${String(a.customerPhone).replace(/\s/g, "")}`} style={{ fontSize: "11px", color: "#2563eb", fontWeight: 700 }}>Call customer</a>
                  ) : null}
                  <button type="button" onClick={() => navigate(`/map?listingId=${encodeURIComponent(String(a.listingId))}`)} style={{ ...btn, fontSize: "11px", padding: "4px 10px", background: "#eef2ff", color: "#3730a3" }}>Listing on map</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {visitRequests.length > 0 && (
          <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "12px", padding: "12px", marginBottom: "16px" }}>
            <div style={{ fontWeight: 700, marginBottom: "6px", color: "#b45309" }}>Plan a Visit Requests ({visitRequests.length})</div>
            {visitRequests.map((v) => (
              <div key={v.id} style={{ fontSize: "12px", marginBottom: "8px", color: "#92400e", paddingBottom: 8, borderBottom: "1px solid #fde68a" }}>
                <strong>Time:</strong> {v.visitTime} | <strong>Phone:</strong> {v.customerPhone}{" "}
                {v.customerPhone ? (
                  <a href={`tel:${String(v.customerPhone).replace(/\s/g, "")}`} style={{ color: "#b45309", fontWeight: 700 }}>Call</a>
                ) : null}
                <br />
                Customer: <a href={`mailto:${encodeURIComponent(v.customerEmail || "")}`} style={{ color: "#92400e", fontWeight: 600 }}>{v.customerEmail}</a>
                <br />
                <span style={{ fontSize: "11px", color: "#78350f" }}>
                  {listingTitleById.get(String(v.listingId)) ? `${listingTitleById.get(String(v.listingId))} (#${v.listingId})` : `Listing #${v.listingId}`}
                </span>
                {v.listingId ? (
                  <button type="button" onClick={() => navigate(`/map?listingId=${encodeURIComponent(String(v.listingId))}`)} style={{ ...btn, marginLeft: 8, fontSize: "10px", padding: "4px 8px", background: "#fff", color: "#92400e" }}>
                    Map
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
        </>
        )}
        {sellerMainTab === "listings" && (
        <>
        <div style={{ background: "white", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "6px" }}>Seller trust badge (optional)</div>
          <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 10px", lineHeight: 1.45 }}>
            You can use MovEasy immediately after sign-up. For a <strong>verified seller</strong> badge (closer to how large marketplaces gate trusted sellers), submit business details; an admin reviews this separately from your login.
          </p>
          {sellerRow?.sellerBadgeStatus === "verified" && (
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#15803d" }}>Status: Verified seller</div>
          )}
          {sellerRow?.sellerBadgeStatus === "pending" && (
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#b45309" }}>Status: Badge application under review</div>
          )}
          {sellerRow?.sellerBadgeStatus === "rejected" && (
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#b91c1c" }}>Status: Badge application not approved</div>
          )}
          {(!sellerRow?.sellerBadgeStatus || sellerRow.sellerBadgeStatus === "none" || sellerRow.sellerBadgeStatus === "rejected") && (
            <form onSubmit={handleBadgeSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
              <input required placeholder="Business / broker name" value={badgeForm.businessName} onChange={(e) => setBadgeForm((p) => ({ ...p, businessName: e.target.value }))} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <input required placeholder="Phone (WhatsApp preferred)" value={badgeForm.phone} onChange={(e) => setBadgeForm((p) => ({ ...p, phone: e.target.value }))} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <input placeholder="GSTIN (optional)" value={badgeForm.gst} onChange={(e) => setBadgeForm((p) => ({ ...p, gst: e.target.value }))} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", gridColumn: "span 2" }} />
              <button type="submit" style={{ ...btn, background: "#0f766e", color: "white", gridColumn: "span 2" }}>Submit for verified badge</button>
            </form>
          )}
          {badgeMsg && (
            <div style={{ marginTop: "8px", fontSize: "12px", color: badgeMsgKind === "err" ? "#b91c1c" : "#0f766e", fontWeight: 600 }}>{badgeMsg}</div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "18px", fontWeight: 700 }}>My Listings ({listings.length})</div>
          <button
            type="button"
            onClick={() => {
              setListingSaveMsg("");
              setShowAdd(!showAdd);
            }}
            style={{ ...btn, background: "#1e3a8a", color: "white" }}
          >
            {showAdd ? "Cancel" : "+ Add Listing"}
          </button>
        </div>
        {listingSaveMsg ? (
          <div
            style={{
              marginBottom: "14px",
              padding: "12px 14px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 600,
              border: `1px solid ${listingSaveKind === "err" ? "#fecaca" : "#bbf7d0"}`,
              background: listingSaveKind === "err" ? "#fef2f2" : "#f0fdf4",
              color: listingSaveKind === "err" ? "#b91c1c" : "#15803d",
            }}
          >
            {listingSaveMsg}
          </div>
        ) : null}
        {showAdd && (
          <div style={{ background: "white", padding: "16px", borderRadius: "12px", marginBottom: "16px" }}>
            <form onSubmit={handleAdd} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
              <input placeholder="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <input placeholder="Price" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <select value={form.bhk} onChange={(e) => setForm({ ...form, bhk: e.target.value })} style={{ padding: "8px", border: "1px solid #e2e8f0", borderRadius: "6px" }}><option>1RK</option><option>1BHK</option><option>2BHK</option><option>3BHK</option><option>4BHK</option></select>
              <input placeholder="Address" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <select value={form.propertyType || "Apartment"} onChange={(e) => setForm({ ...form, propertyType: e.target.value })} style={{ padding: "8px", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                <option>Apartment</option><option>Independent House</option><option>Villa</option><option>Studio</option><option>PG</option>
              </select>
              <select value={form.furnishing || "Semi"} onChange={(e) => setForm({ ...form, furnishing: e.target.value })} style={{ padding: "8px", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                <option>Unfurnished</option><option>Semi</option><option>Fully</option>
              </select>
              <input placeholder="Available from (e.g. Immediate, After 30 days)" value={form.availability || ""} onChange={(e) => setForm({ ...form, availability: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <input placeholder="Preferred tenants (comma: Family, Bachelors...)" value={form.preferredTenantsText || ""} onChange={(e) => setForm({ ...form, preferredTenantsText: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <input placeholder="Parking (comma: 2 Wheeler, 4 Wheeler)" value={form.parkingText || ""} onChange={(e) => setForm({ ...form, parkingText: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", gridColumn: "span 2" }} />
              <input placeholder="Contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <input placeholder="Brokerage (optional)" value={form.brokerage || ""} onChange={(e) => setForm({ ...form, brokerage: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <input placeholder="Security deposit (optional)" value={form.securityDeposit || ""} onChange={(e) => setForm({ ...form, securityDeposit: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <input placeholder="Maintenance (optional)" value={form.maintenanceCost || ""} onChange={(e) => setForm({ ...form, maintenanceCost: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <input placeholder="Built up area (optional)" value={form.builtUpArea || ""} onChange={(e) => setForm({ ...form, builtUpArea: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <select value={form.areaUnit || "sq ft"} onChange={(e) => setForm({ ...form, areaUnit: e.target.value })} style={{ padding: "8px", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                <option>sq ft</option><option>sq m</option>
              </select>
              <input placeholder="Bathrooms (optional)" value={form.bathrooms || ""} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <input placeholder="Balcony (optional)" value={form.balcony || ""} onChange={(e) => setForm({ ...form, balcony: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <input placeholder="Lease type (optional)" value={form.leaseType || ""} onChange={(e) => setForm({ ...form, leaseType: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <input placeholder="Floor number (optional)" value={form.floorNumber || ""} onChange={(e) => setForm({ ...form, floorNumber: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <input placeholder="Total floors (optional)" value={form.totalFloors || ""} onChange={(e) => setForm({ ...form, totalFloors: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <input placeholder="Age of property (optional)" value={form.ageOfProperty || ""} onChange={(e) => setForm({ ...form, ageOfProperty: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <select value={form.gasPipeline || ""} onChange={(e) => setForm({ ...form, gasPipeline: e.target.value })} style={{ padding: "8px", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                <option value="">Gas pipeline —</option><option>Yes</option><option>No</option>
              </select>
              <select value={form.gatedCommunity || ""} onChange={(e) => setForm({ ...form, gatedCommunity: e.target.value })} style={{ padding: "8px", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                <option value="">Gated community —</option><option>Yes</option><option>No</option>
              </select>
              <input placeholder="Parking note (optional, shown if set)" value={form.parkingInfo || ""} onChange={(e) => setForm({ ...form, parkingInfo: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", gridColumn: "span 2" }} />
              <input placeholder="Source URL (optional)" value={form.sourceUrl || ""} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", gridColumn: "span 2" }} />
              <textarea placeholder="Description" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", gridColumn: "span 2", minHeight: "72px" }} />
              <textarea placeholder="Furnishings (comma separated)" value={form.furnishingsText || ""} onChange={(e) => setForm({ ...form, furnishingsText: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", gridColumn: "span 2", minHeight: "64px" }} />
              <textarea placeholder="Amenities (comma separated: lift, power backup, geyser...)" value={form.amenitiesText || ""} onChange={(e) => setForm({ ...form, amenitiesText: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", gridColumn: "span 2", minHeight: "64px" }} />
              <textarea placeholder="Extra media URLs (one per line)" value={form.imagesText || ""} onChange={(e) => setForm({ ...form, imagesText: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", gridColumn: "span 2", minHeight: "68px" }} />
              <div style={{ gridColumn: "span 2" }}>
                <MediaUploadField files={photoFiles} setFiles={setPhotoFiles} maxFiles={12} title="Listing Media Upload" />
              </div>
              <div style={{ fontSize: "12px", color: pinPosition ? "#16a34a" : "#dc2626", fontWeight: 600, display: "flex", alignItems: "center", gridColumn: "span 2" }}>{pinPosition ? "Pin set" : "Click map below to set location"}</div>
              <button type="submit" style={{ ...btn, background: "#16a34a", color: "white", gridColumn: "span 2" }}>Save</button>
            </form>
            <div style={{ height: "250px", borderRadius: "8px", overflow: "hidden", border: "2px solid #e2e8f0" }}>
              <MapContainer center={[12.9716, 77.5946]} zoom={12} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker position={pinPosition} setPosition={setPinPosition} />
              </MapContainer>
            </div>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
          {listings.map((l) => {
            const live = isListingPubliclyVisible(l);
            return (
            <div key={l.id} style={{ background: "white", borderRadius: "12px", padding: "16px", border: live ? "1px solid #e2e8f0" : "2px solid #f59e0b" }}>
              {l.image && <img src={l.image} alt={l.title} loading="lazy" style={{ width: "100%", height: "150px", objectFit: "cover", borderRadius: "8px", marginBottom: "10px" }} />}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>{l.bhk}</span>
                {!live ? (
                  <span style={{ background: "#fff7ed", color: "#c2410c", padding: "2px 8px", borderRadius: "10px", fontSize: "10px", fontWeight: 800 }}>OFF MARKET</span>
                ) : null}
                <span style={{ fontWeight: 800, color: "#16a34a", marginLeft: "auto" }}>{l.price}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: "15px" }}>{l.title}</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>{l.address}</div>
              <p style={{ fontSize: "11px", color: "#64748b", margin: "8px 0 0", lineHeight: 1.45 }}>
                {live
                  ? "Withdraw hides this home from search and the map. Permanent removal is done by MovEasy admin (audit trail)."
                  : "This listing is hidden from renters. Relist when it is available again."}
              </p>
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button onClick={() => handleEdit(l)} style={{ flex: 1, padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", fontWeight: 600, fontSize: "12px", cursor: "pointer", background: "white", color: "#334155" }}>Edit</button>
                {live ? (
                  <button type="button" onClick={() => handleWithdrawListing(l.id)} style={{ flex: 1, padding: "6px", borderRadius: "6px", border: "none", fontWeight: 600, fontSize: "12px", cursor: "pointer", background: "#fff7ed", color: "#c2410c" }}>Withdraw</button>
                ) : (
                  <button type="button" onClick={() => handleRelist(l.id)} style={{ flex: 1, padding: "6px", borderRadius: "6px", border: "none", fontWeight: 600, fontSize: "12px", cursor: "pointer", background: "#ecfdf5", color: "#047857" }}>Relist</button>
                )}
              </div>
            </div>
            );
          })}
        </div>
        </>
        )}
      </div>
    </PageShell>
  );
}
