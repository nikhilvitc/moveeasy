import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  getAllUsers,
  getListings,
  getSellerRequests,
  removeListing,
  upsertListing,
  addUserLocally,
  removeUserLocally,
  updateUserLocally,
  getInterestsGlobal,
  updateInterestGlobal,
  getAssignments,
  addAssignment,
  getNotificationsLocal,
  markNotificationLocalRead,
  getUserActivityEvents,
  pushNotificationLocal,
} from "../lib/store";
import { ingestBrokerListings, ingestPartnerListings, normalizeBrokerListings, normalizePartnerListings } from "../lib/externalFeeds";
import { isFirebaseConfigured } from "../lib/firebase";
import {
  addUserProfileData,
  getAllUsersData,
  getListingsData,
  getSellerRequestsData,
  removeListingData,
  removeUserProfileData,
  uploadListingFiles,
  upsertListingData,
  getVisitsData,
  updateUserProfileData,
  getInterestsData,
  getAssignmentsData,
  getAdminNotificationsData,
  markNotificationReadData,
  updateInterestStatusData,
  getActivityEventsForEmail,
  addAssignmentData,
  addNotificationData,
} from "../lib/firestoreStore";
import { notifyCustomerInterestStatusChanged, notifyCustomerListingAssigned } from "../lib/crmSync";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import MediaUploadField from "../components/MediaUploadField";
import { getBookings } from "../lib/userActivity";
import {
  CONTACT_GRADIENTS,
  DEFAULT_SITE_PUBLIC,
  fetchSitePublicSettings,
  saveSitePublicSettings,
} from "../lib/sitePublicSettings";

const DEFAULT_FORM = {
  title: "",
  price: "",
  bhk: "2 BHK",
  address: "",
  seller: "",
  sellerEmail: "",
  contact: "",
  image: "",
  imagesText: "",
  source: "manual",
  sourceUrl: "",
  description: "",
  monthlyRent: 25000,
  availability: "Immediate",
  propertyType: "Apartment",
  furnishing: "Semi",
  preferredTenants: ["Family"],
  parking: ["2 Wheeler"],
  securityDeposit: "",
  maintenanceCost: "",
  brokerage: "",
  builtUpArea: "",
  areaUnit: "sq ft",
  bathrooms: "",
  balcony: "",
  floorNumber: "",
  totalFloors: "",
  leaseType: "",
  ageOfProperty: "",
  parkingInfo: "",
  gasPipeline: "",
  gatedCommunity: "",
  amenitiesText: "",
  furnishingsText: "",
  lat: 12.9716,
  lng: 77.5946,
};

function LocationPicker({ position, onPick }) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} /> : null;
}

function toList(value, fallback) {
  if (Array.isArray(value) && value.length) return value;
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return fallback;
}

function listingToForm(listing) {
  return {
    title: listing.title || "",
    price: listing.price || "",
    bhk: listing.bhk || "2 BHK",
    address: listing.address || "",
    seller: listing.seller || "",
    sellerEmail: listing.sellerEmail || "",
    contact: listing.contact || "",
    image: listing.image || listing.images?.[0] || "",
    imagesText: Array.isArray(listing.images) ? listing.images.join("\n") : "",
    source: listing.source || "manual",
    sourceUrl: listing.sourceUrl || "",
    description: listing.description || "",
    monthlyRent: Number(listing.monthlyRent || 25000),
    availability: listing.availability || "Immediate",
    propertyType: listing.propertyType || "Apartment",
    furnishing: listing.furnishing || "Semi",
    preferredTenants: toList(listing.preferredTenants, ["Family"]),
    parking: toList(listing.parking, ["2 Wheeler"]),
    securityDeposit: listing.securityDeposit || "",
    maintenanceCost: listing.maintenanceCost || "",
    brokerage: listing.brokerage || "",
    builtUpArea: listing.builtUpArea || "",
    areaUnit: listing.areaUnit || "sq ft",
    bathrooms: listing.bathrooms || "",
    balcony: listing.balcony || "",
    floorNumber: listing.floorNumber || "",
    totalFloors: listing.totalFloors || "",
    leaseType: listing.leaseType || "",
    ageOfProperty: listing.ageOfProperty || "",
    parkingInfo: listing.parkingInfo || "",
    gasPipeline: listing.gasPipeline || "",
    gatedCommunity: listing.gatedCommunity || "",
    amenitiesText: Array.isArray(listing.amenities) ? listing.amenities.join(", ") : (listing.amenities || ""),
    furnishingsText: Array.isArray(listing.furnishings) ? listing.furnishings.join(", ") : (listing.furnishings || ""),
    lat: Number(listing.lat || 12.9716),
    lng: Number(listing.lng || 77.5946),
  };
}

export default function AdminDashboard() {
  const {
    user,
    logout,
    approveSeller,
    rejectSeller,
    getPendingSellerBadgeApplications,
    approveSellerBadge,
    rejectSellerBadge,
  } = useAuth();
  const navigate = useNavigate();

  const [refreshTick, setRefreshTick] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [pinPosition, setPinPosition] = useState([DEFAULT_FORM.lat, DEFAULT_FORM.lng]);
  const [feedJson, setFeedJson] = useState("");
  const [importBrokerName, setImportBrokerName] = useState("");
  const [importSourceName, setImportSourceName] = useState("manual-transfer");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("customer");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [listingsState, setListingsState] = useState([]);
  const [usersState, setUsersState] = useState([]);
  const [editingUserEmail, setEditingUserEmail] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ name: "", role: "customer", phone: "" });
  const [sellerReqsState, setSellerReqsState] = useState([]);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [visitRequests, setVisitRequests] = useState([]);
  const [interestsState, setInterestsState] = useState([]);
  const [assignmentsState, setAssignmentsState] = useState([]);
  const [adminNotifs, setAdminNotifs] = useState([]);
  const [userListTab, setUserListTab] = useState("all");
  const [historyUser, setHistoryUser] = useState(null);
  const [historyBundle, setHistoryBundle] = useState(null);
  const [assignCustomerEmail, setAssignCustomerEmail] = useState("");
  const [assignListingId, setAssignListingId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 900 : false);
  const [sitePublicDraft, setSitePublicDraft] = useState(() => ({
    ...DEFAULT_SITE_PUBLIC,
    contacts: DEFAULT_SITE_PUBLIC.contacts.map((c) => ({ ...c })),
  }));
  const [sitePublicStatus, setSitePublicStatus] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      if (isFirebaseConfigured) {
        const [
          remoteListings,
          remoteUsers,
          remoteSellerReqs,
          remoteVisits,
          remoteInterests,
          remoteAssigns,
          remoteNotifs,
          sitePub,
        ] = await Promise.all([
          getListingsData(),
          getAllUsersData(),
          getSellerRequestsData(),
          getVisitsData(),
          getInterestsData(),
          getAssignmentsData(),
          getAdminNotificationsData(),
          fetchSitePublicSettings(),
        ]);
        if (!alive) return;
        setListingsState(remoteListings);
        setUsersState(remoteUsers);
        setSellerReqsState(remoteSellerReqs);
        setVisitRequests(remoteVisits);
        setInterestsState(remoteInterests);
        setAssignmentsState(remoteAssigns);
        setAdminNotifs(remoteNotifs);
        setSitePublicDraft({
          ...sitePub,
          contacts: (sitePub.contacts || []).map((c) => ({ ...c })),
        });
      } else {
        setListingsState(getListings());
        setUsersState(getAllUsers());
        setSellerReqsState(getSellerRequests().filter((r) => r.status === "pending"));
        setVisitRequests([]);
        setInterestsState(getInterestsGlobal());
        setAssignmentsState(getAssignments());
        setAdminNotifs(getNotificationsLocal().filter((n) => n.audience === "admin"));
      }
    }
    load().catch(() => undefined);
    return () => { alive = false; };
  }, [refreshTick]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const listings = listingsState;
  const users = usersState;

  const sellerReqs = sellerReqsState;
  const pendingSellerBadgeApps = useMemo(() => {
    if (typeof getPendingSellerBadgeApplications === 'function') {
      return getPendingSellerBadgeApplications();
    }
    return [];
  }, [getPendingSellerBadgeApplications]);

  const addContactRow = () => {
    setSitePublicDraft((p) => ({
      ...p,
      contacts: [
        ...p.contacts,
        {
          name: "",
          title: "",
          phone: "",
          phoneRaw: "",
          avatar: "",
          gradient: CONTACT_GRADIENTS[p.contacts.length % CONTACT_GRADIENTS.length],
        },
      ].slice(0, 12),
    }));
  };

  const removeContactRow = (idx) => {
    setSitePublicDraft((p) => ({
      ...p,
      contacts: p.contacts.filter((_, i) => i !== idx),
    }));
  };

  const updateContactField = (idx, field, value) => {
    setSitePublicDraft((p) => ({
      ...p,
      contacts: p.contacts.map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    }));
  };

  const handleSaveSitePublic = async () => {
    if (!isFirebaseConfigured) {
      alert("Firebase is not configured — site settings save is disabled.");
      return;
    }
    setSitePublicStatus("Saving…");
    try {
      await saveSitePublicSettings(sitePublicDraft);
      setSitePublicStatus("Saved. Contact page and Terms/Privacy will pick this up on refresh.");
      setTimeout(() => setSitePublicStatus(""), 5000);
    } catch (e) {
      setSitePublicStatus(String(e?.message || e || "Save failed"));
    }
  };

  const handleSubmitListing = async (e) => {
    e.preventDefault();
    const uploadedImages = photoFiles.length ? await uploadListingFiles(photoFiles, editingId || crypto.randomUUID()) : [];
    const manualImages = String(form.imagesText || form.image || "").split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
    const allImages = [...uploadedImages, ...manualImages];
    const payload = {
      ...form,
      id: editingId || String(Date.now()),
      lat: Number(pinPosition?.[0] ?? form.lat),
      lng: Number(pinPosition?.[1] ?? form.lng),
      preferredTenants: toList(form.preferredTenants, ["Family"]),
      parking: toList(form.parking, ["2 Wheeler"]),
      images: allImages,
      image: form.image || allImages[0] || "",
      amenities: String(form.amenitiesText || "").split(",").map((x) => x.trim()).filter(Boolean),
      furnishings: String(form.furnishingsText || "").split(",").map((x) => x.trim()).filter(Boolean),
      updatedAt: new Date().toISOString(),
    };
    if (isFirebaseConfigured) await upsertListingData(payload, user);
    else upsertListing(payload);
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setPhotoFiles([]);
    setPinPosition([DEFAULT_FORM.lat, DEFAULT_FORM.lng]);
    setRefreshTick((v) => v + 1);
  };

  const handleEdit = (listing) => {
    setEditingId(listing.id);
    const nextForm = listingToForm(listing);
    setForm(nextForm);
    setPinPosition([nextForm.lat, nextForm.lng]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (isFirebaseConfigured) await removeListingData(id);
    else removeListing(id);
    setRefreshTick((v) => v + 1);
  };

  const handleApprove = async (email) => {
    await approveSeller(email);
    setRefreshTick((v) => v + 1);
  };

  const handleReject = (email) => {
    rejectSeller(email);
    setRefreshTick((v) => v + 1);
  };

  const handleApproveSellerBadge = async (email) => {
    await approveSellerBadge(email);
    setRefreshTick((v) => v + 1);
  };

  const handleRejectSellerBadge = async (email) => {
    await rejectSellerBadge(email);
    setRefreshTick((v) => v + 1);
  };

  const handleRemoveUser = async (email) => {
    if (isFirebaseConfigured) await removeUserProfileData(email);
    else removeUserLocally(email);
    setRefreshTick((v) => v + 1);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;
    if (isFirebaseConfigured) await addUserProfileData(newUserEmail, newUserName, newUserRole, newUserPhone);
    else addUserLocally(newUserEmail, newUserName, newUserRole, newUserPhone);
    setNewUserEmail("");
    setNewUserName("");
    setNewUserPhone("");
    setRefreshTick((v) => v + 1);
  };

  const handleEditUser = (u) => {
    setEditingUserEmail(u.email);
    setEditUserForm({ name: u.name || "", role: u.role || "customer", phone: u.phone || "" });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (isFirebaseConfigured) await updateUserProfileData(editingUserEmail, editUserForm);
    else updateUserLocally(editingUserEmail, editUserForm);
    setEditingUserEmail(null);
    setRefreshTick((v) => v + 1);
  };

  const customersList = useMemo(
    () => users.filter((u) => u.role === "customer" && !String(u.uid || "").startsWith("reserved")),
    [users]
  );
  const sellersList = useMemo(() => users.filter((u) => u.role === "seller"), [users]);
  const displayUsers = useMemo(() => {
    if (userListTab === "customer") return customersList;
    if (userListTab === "seller") return sellersList;
    return users;
  }, [users, userListTab, customersList, sellersList]);

  const handleInterestStatus = async (row, status) => {
    if (isFirebaseConfigured) await updateInterestStatusData(row.id, status);
    else updateInterestGlobal(row.id, { status });
    await notifyCustomerInterestStatusChanged(row, status);
    setRefreshTick((v) => v + 1);
  };

  const handleNotifRead = async (n) => {
    if (isFirebaseConfigured) await markNotificationReadData(n.id);
    else markNotificationLocalRead(n.id);
    setRefreshTick((v) => v + 1);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    const listing = listings.find((l) => String(l.id) === String(assignListingId));
    if (!listing || !assignCustomerEmail.trim()) {
      alert("Pick a listing and customer email.");
      return;
    }
    const sellerEmail = (listing.sellerEmail || "").trim().toLowerCase();
    if (isFirebaseConfigured) {
      await addAssignmentData({
        listingId: assignListingId,
        customerEmail: assignCustomerEmail.trim().toLowerCase(),
        sellerEmail,
        notes: assignNotes,
        createdBy: user?.email,
      });
    } else {
      addAssignment({
        listingId: assignListingId,
        customerEmail: assignCustomerEmail.trim().toLowerCase(),
        sellerEmail,
        notes: assignNotes,
        createdBy: user?.email,
      });
    }
    if (sellerEmail) {
      const body = `Admin assigned listing #${assignListingId} to ${assignCustomerEmail.trim().toLowerCase()}.`;
      try {
        if (isFirebaseConfigured) {
          await addNotificationData({
            audience: "seller",
            targetEmail: sellerEmail,
            title: "New lead assignment",
            body,
            type: "assignment",
            meta: { listingId: String(assignListingId), customerEmail: assignCustomerEmail.trim().toLowerCase() },
          });
        } else {
          pushNotificationLocal({
            audience: "seller",
            targetEmail: sellerEmail,
            title: "New lead assignment",
            body,
            type: "assignment",
            meta: { listingId: String(assignListingId) },
          });
        }
      } catch {
        /* non-fatal */
      }
    }
    await notifyCustomerListingAssigned({
      customerEmail: assignCustomerEmail.trim().toLowerCase(),
      listingId: assignListingId,
      listingTitle: listing.title,
      notes: assignNotes,
      sellerEmail: listing.sellerEmail,
    });
    setAssignNotes("");
    setAssignListingId("");
    setAssignCustomerEmail("");
    alert("Assignment recorded. The seller sees this on their dashboard.");
    setRefreshTick((v) => v + 1);
  };

  useEffect(() => {
    if (!historyUser?.email) {
      setHistoryBundle(null);
      return;
    }
    let alive = true;
    (async () => {
      const email = String(historyUser.email).toLowerCase().trim();
      let acts = [];
      if (isFirebaseConfigured) {
        try {
          acts = await getActivityEventsForEmail(email);
        } catch {
          acts = [];
        }
      } else {
        acts = getUserActivityEvents(email);
      }
      const visits = visitRequests.filter((v) => String(v.customerEmail || "").toLowerCase() === email);
      const interests = interestsState.filter((i) => String(i.customerEmail || "").toLowerCase() === email);
      const bookings = getBookings().filter((b) => String(b.customerEmail || "").toLowerCase() === email);
      const assigns = assignmentsState.filter((a) => String(a.customerEmail || "").toLowerCase() === email);
      if (alive) setHistoryBundle({ acts, visits, interests, bookings, assigns });
    })();
    return () => {
      alive = false;
    };
  }, [historyUser, visitRequests, interestsState, assignmentsState, refreshTick]);

  const handleFeedImport = async () => {
    if (!feedJson.trim()) return;
    try {
      const parsed = JSON.parse(feedJson);
      const rows = normalizePartnerListings(parsed, "partner-import");
      if (isFirebaseConfigured) await Promise.all(rows.map((row) => upsertListingData(row, user)));
      else ingestPartnerListings(parsed, "partner-import");
      const result = { imported: rows.length };
      alert("Imported " + result.imported + " listings");
      setFeedJson("");
      setRefreshTick((v) => v + 1);
    } catch {
      alert("Invalid JSON feed format");
    }
  };

  const handleBrokerImport = async () => {
    if (!importBrokerName.trim()) {
      alert("Enter broker name first");
      return;
    }
    if (!feedJson.trim()) {
      alert("Paste broker listing export data first");
      return;
    }
    const rows = normalizeBrokerListings({ brokerName: importBrokerName.trim(), rawInput: feedJson });
    if (isFirebaseConfigured) await Promise.all(rows.map((row) => upsertListingData({ ...row, source: `${importSourceName || "manual-transfer"}:${importBrokerName.trim()}` }, user)));
    else ingestBrokerListings({
      brokerName: importBrokerName.trim(),
      rawInput: feedJson,
      sourceName: importSourceName || "manual-transfer",
    });
    const imported = rows.length;
    if (!imported) {
      alert("No listings imported.");
      return;
    }
    alert("Imported " + imported + " listings for broker " + importBrokerName.trim());
    setFeedJson("");
    setRefreshTick((v) => v + 1);
  };

  const btn = { padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "13px", cursor: "pointer" };
  const sectionCard = { background: "white", padding: isMobile ? "12px" : "16px", borderRadius: "12px", marginBottom: "16px" };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      <div style={{ background: "linear-gradient(135deg, #DC2626, #EF4444)", color: "white", padding: isMobile ? "14px 12px" : "16px 24px", display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "10px" : 0 }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>Admin Dashboard</div>
          <div style={{ fontSize: "12px", opacity: 0.7 }}>{user?.email}</div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/map")} style={{ ...btn, background: "rgba(255,255,255,0.15)", color: "white" }}>Map</button>
          <button onClick={() => navigate("/")} style={{ ...btn, background: "rgba(255,255,255,0.15)", color: "white" }}>Home</button>
          <button onClick={() => { logout(); navigate("/login"); }} style={{ ...btn, background: "#ef4444", color: "white" }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: isMobile ? "12px" : "20px 24px" }}>
        <div style={{ ...sectionCard, border: "1px solid #bfdbfe", background: "#f0f9ff", marginBottom: "20px" }}>
          <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "6px", color: "#0c4a6e" }}>Website — Contact page & legal lines</div>
          <p style={{ fontSize: "13px", color: "#0369a1", marginBottom: "14px", lineHeight: 1.5 }}>
            Public read, admin-only write (<code style={{ fontSize: 12 }}>siteSettings/public</code>). Contact cards appear on{" "}
            <strong>/contact</strong>; support email, privacy email, and main phone appear in Terms &amp; Privacy.
          </p>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: "#0f172a" }}>Consultant cards ({sitePublicDraft.contacts.length} / 12)</div>
          {sitePublicDraft.contacts.map((c, idx) => (
            <div
              key={`row-${idx}`}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 12,
                marginBottom: 10,
                background: "#fff",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
                <input
                  placeholder="Name"
                  value={c.name}
                  onChange={(e) => updateContactField(idx, "name", e.target.value)}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}
                />
                <input
                  placeholder="Title (e.g. Sales Lead)"
                  value={c.title}
                  onChange={(e) => updateContactField(idx, "title", e.target.value)}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}
                />
                <input
                  placeholder="Phone (+91 … or digits for WhatsApp)"
                  value={c.phone}
                  onChange={(e) => updateContactField(idx, "phone", e.target.value)}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, gridColumn: isMobile ? undefined : "1 / -1" }}
                />
                <label style={{ fontSize: 12, color: "#64748b", gridColumn: isMobile ? undefined : "1 / -1", display: "flex", flexDirection: "column", gap: 4 }}>
                  Optional: WhatsApp digits only (auto-filled from phone if empty)
                  <input
                    placeholder="9170…"
                    value={c.phoneRaw}
                    onChange={(e) => updateContactField(idx, "phoneRaw", e.target.value.replace(/\D/g, ""))}
                    style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}
                  />
                </label>
              </div>
              <button type="button" onClick={() => removeContactRow(idx)} style={{ ...btn, marginTop: 8, background: "#f1f5f9", color: "#64748b", fontSize: "12px" }}>
                Remove card
              </button>
            </div>
          ))}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            <button type="button" onClick={addContactRow} disabled={sitePublicDraft.contacts.length >= 12} style={{ ...btn, background: "#0ea5e9", color: "white" }}>
              + Add contact card
            </button>
            <button type="button" onClick={() => navigate("/contact")} style={{ ...btn, background: "#e0f2fe", color: "#0369a1" }}>
              Preview contact page
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }}>
              Terms — support email
              <input
                value={sitePublicDraft.supportEmail}
                onChange={(e) => setSitePublicDraft((p) => ({ ...p, supportEmail: e.target.value }))}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }}>
              Privacy — DPO email
              <input
                value={sitePublicDraft.privacyEmail}
                onChange={(e) => setSitePublicDraft((p) => ({ ...p, privacyEmail: e.target.value }))}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "flex", flexDirection: "column", gap: 4, gridColumn: isMobile ? undefined : "1 / -1" }}>
              Terms &amp; Privacy — main phone (display text)
              <input
                value={sitePublicDraft.legalPhoneDisplay}
                onChange={(e) => setSitePublicDraft((p) => ({ ...p, legalPhoneDisplay: e.target.value }))}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}
              />
            </label>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={handleSaveSitePublic} style={{ ...btn, background: "#0284c7", color: "white", fontWeight: 800 }}>
              Save to Firestore
            </button>
            {sitePublicStatus ? <span style={{ fontSize: 13, color: sitePublicStatus.startsWith("Saved") ? "#15803d" : "#b91c1c" }}>{sitePublicStatus}</span> : null}
          </div>
        </div>

        {pendingSellerBadgeApps.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#0f766e", marginBottom: "10px" }}>
              Pending verified seller badge ({pendingSellerBadgeApps.length})
            </div>
            {pendingSellerBadgeApps.map((p) => (
              <div key={p.email} style={{ background: "white", padding: "12px 16px", borderRadius: "8px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>{p.email}</div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button type="button" onClick={() => handleApproveSellerBadge(p.email)} style={{ ...btn, background: "#16a34a", color: "white", fontSize: "12px" }}>Approve badge</button>
                  <button type="button" onClick={() => handleRejectSellerBadge(p.email)} style={{ ...btn, background: "#dc2626", color: "white", fontSize: "12px" }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {sellerReqs.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#dc2626", marginBottom: "10px" }}>Pending Seller Requests ({sellerReqs.length})</div>
            {sellerReqs.map((r) => (
              <div key={r.email} style={{ background: "white", padding: "12px 16px", borderRadius: "8px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: "10px" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>{r.email}</div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => handleApprove(r.email)} style={{ ...btn, background: "#16a34a", color: "white", fontSize: "12px" }}>Approve</button>
                  <button onClick={() => handleReject(r.email)} style={{ ...btn, background: "#dc2626", color: "white", fontSize: "12px" }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {visitRequests.length > 0 && (
          <div style={{ background: "#fffbeb", padding: "16px", borderRadius: "12px", marginBottom: "16px", border: "1px solid #fcd34d" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#b45309", marginBottom: "10px" }}>Global Visit Requests</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
              {visitRequests.map((v) => (
                <div key={v.id} style={{ background: "white", padding: "12px", borderRadius: "8px", border: "1px solid #fde68a" }}>
                  <div style={{ fontSize: "13px", color: "#92400e" }}><strong>Time:</strong> {v.visitTime}</div>
                  <div style={{ fontSize: "13px", color: "#92400e" }}><strong>Phone:</strong> {v.customerPhone}</div>
                  <div style={{ fontSize: "12px", color: "#78350f", marginTop: "4px" }}>Customer: {v.customerEmail}</div>
                  <div style={{ fontSize: "12px", color: "#78350f" }}>Seller: {v.sellerEmail}</div>
                  <div style={{ fontSize: "12px", color: "#78350f" }}>Listing: #{v.listingId}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminNotifs.length > 0 && (
          <div style={{ ...sectionCard, border: "1px solid #fecdd3", background: "#fff1f2" }}>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#9f1239", marginBottom: "10px" }}>Admin notifications ({adminNotifs.filter((n) => !n.read).length} unread)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: 280, overflowY: "auto" }}>
              {adminNotifs.map((n) => (
                <div key={n.id} style={{ background: "white", borderRadius: "10px", padding: "10px 12px", border: n.read ? "1px solid #e2e8f0" : "2px solid #f43f5e", opacity: n.read ? 0.85 : 1 }}>
                  <div style={{ fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>{n.title}</div>
                  <div style={{ fontSize: "13px", color: "#475569", marginTop: "4px", lineHeight: 1.45 }}>{n.body}</div>
                  {!n.read ? (
                    <button type="button" onClick={() => handleNotifRead(n)} style={{ ...btn, marginTop: "8px", background: "#0f172a", color: "white", fontSize: "12px" }}>
                      Mark read
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={sectionCard}>
          <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "10px", color: "#0f172a" }}>Listing interests and applications</div>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px", lineHeight: 1.5 }}>
            Every “Submit interest” from the map is stored here. Update status as your team progresses the lead.
          </p>
          {interestsState.length === 0 ? (
            <div style={{ fontSize: "14px", color: "#64748b" }}>No interests yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "8px 6px" }}>When</th>
                    <th style={{ padding: "8px 6px" }}>Customer</th>
                    <th style={{ padding: "8px 6px" }}>Listing</th>
                    <th style={{ padding: "8px 6px" }}>Preference</th>
                    <th style={{ padding: "8px 6px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {interestsState.map((row) => (
                    <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 6px", color: "#64748b", whiteSpace: "nowrap" }}>
                        {row.createdAt?.toDate ? row.createdAt.toDate().toLocaleString() : row.submittedAt || row.createdAt || "—"}
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <div style={{ fontWeight: 700 }}>{row.customerName}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{row.customerEmail}</div>
                      </td>
                      <td style={{ padding: "8px 6px", maxWidth: 220 }}>
                        <div style={{ fontWeight: 600 }}>{row.listingTitle}</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>#{row.listingId}</div>
                      </td>
                      <td style={{ padding: "8px 6px", fontSize: "12px" }}>
                        {row.tenancyPreference} · {row.adultsSharing} people
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <select
                          value={row.status || "new"}
                          onChange={(e) => handleInterestStatus(row, e.target.value)}
                          style={{ padding: "6px 8px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="visit_scheduled">Visit scheduled</option>
                          <option value="closed_won">Closed — won</option>
                          <option value="closed_lost">Closed — lost</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={sectionCard}>
          <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px", color: "#0f172a" }}>Assign apartment to customer</div>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px", lineHeight: 1.5 }}>
            Links a listing to a customer email and notifies the listing&apos;s seller on their dashboard (assignments list).
          </p>
          <form onSubmit={handleAssignSubmit} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: "10px", alignItems: "end" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "4px" }}>Customer email</label>
              <input
                value={assignCustomerEmail}
                onChange={(e) => setAssignCustomerEmail(e.target.value)}
                placeholder="customer@email.com"
                required
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "8px" }}
              />
            </div>
            <div style={{ gridColumn: isMobile ? "auto" : "span 2" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "4px" }}>Listing</label>
              <select
                value={assignListingId}
                onChange={(e) => setAssignListingId(e.target.value)}
                required
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "8px" }}
              >
                <option value="">Select listing…</option>
                {listings.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    #{l.id} — {l.title?.slice(0, 60)}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "4px" }}>Notes (optional)</label>
              <input value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} placeholder="Internal note" style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "8px" }} />
            </div>
            <button type="submit" style={{ ...btn, background: "#b91c1c", color: "white", gridColumn: isMobile ? "auto" : "1 / -1" }}>
              Save assignment
            </button>
          </form>
          {assignmentsState.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ fontWeight: 700, marginBottom: "8px", fontSize: "14px" }}>Recent assignments</div>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#475569", lineHeight: 1.6 }}>
                {assignmentsState.slice(0, 15).map((a) => (
                  <li key={a.id}>
                    Listing #{a.listingId} → customer {a.customerEmail} (seller {a.sellerEmail || "—"})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* User Management Section */}
        <div style={sectionCard}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ fontSize: "18px", fontWeight: 700 }}>Users</div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {[
                ["all", `All (${users.length})`],
                ["customer", `Customers (${customersList.length})`],
                ["seller", `Sellers (${sellersList.length})`],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setUserListTab(key)}
                  style={{
                    ...btn,
                    fontSize: "12px",
                    padding: "6px 12px",
                    background: userListTab === key ? "#1e3a8a" : "#f1f5f9",
                    color: userListTab === key ? "white" : "#334155",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "10px", color: "#64748b" }}>Directory · {displayUsers.length} shown</div>
          
          <form onSubmit={handleAddUser} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) minmax(0,1.1fr) minmax(0,1fr) minmax(100px,0.75fr) auto", gap: "10px", marginBottom: "16px" }}>
            <input placeholder="Full Name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} required style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "6px" }} />
            <input type="email" placeholder="Email Address" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "6px" }} />
            <input type="tel" placeholder="Phone (optional) — +91 9876543210" value={newUserPhone} onChange={(e) => setNewUserPhone(e.target.value)} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "6px" }} />
            <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "6px" }}>
              <option value="customer">Customer</option>
              <option value="seller">Seller / Broker</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" style={{ ...btn, background: "#16a34a", color: "white" }}>Add User</button>
          </form>

          <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
            {displayUsers.map((u) => (
              <div key={u.uid || u.email} style={{ padding: "10px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "10px" : 0 }}>
                {editingUserEmail === u.email ? (
                  <form onSubmit={handleUpdateUser} style={{ flex: 1, display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <input value={editUserForm.name} onChange={(e) => setEditUserForm(p => ({...p, name: e.target.value}))} placeholder="Name" style={{ padding: "6px", border: "1px solid #cbd5e1", borderRadius: "4px" }} />
                    <input value={editUserForm.phone} onChange={(e) => setEditUserForm(p => ({...p, phone: e.target.value}))} placeholder="Phone" style={{ padding: "6px", border: "1px solid #cbd5e1", borderRadius: "4px" }} />
                    <select value={editUserForm.role} onChange={(e) => setEditUserForm(p => ({...p, role: e.target.value}))} style={{ padding: "6px", border: "1px solid #cbd5e1", borderRadius: "4px" }}>
                      <option value="customer">Customer</option>
                      <option value="seller">Seller</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button type="submit" style={{ ...btn, background: "#16a34a", color: "white", padding: "6px 12px" }}>Save</button>
                    <button type="button" onClick={() => setEditingUserEmail(null)} style={{ ...btn, background: "#94a3b8", color: "white", padding: "6px 12px" }}>Cancel</button>
                  </form>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>
                        {u.name}{" "}
                        <span style={{ fontSize: "11px", color: "white", background: u.role === "admin" ? "#7c3aed" : u.role === "seller" ? "#f59e0b" : "#3b82f6", padding: "2px 6px", borderRadius: "4px", marginLeft: "6px" }}>{u.role}</span>
                        {u.sellerBadgeStatus && u.role === "seller" ? (
                          <span style={{ fontSize: "10px", marginLeft: "6px", color: "#64748b" }}>badge: {u.sellerBadgeStatus}</span>
                        ) : null}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>
                        <div><strong>Email:</strong> {u.email}</div>
                        <div><strong>Phone:</strong> {u.phone?.trim() ? u.phone : "—"}</div>
                        <div style={{ fontSize: "11px", wordBreak: "break-all" }}><strong>User id:</strong> {u.uid || "—"}</div>
                        {(u.customerOfficeLocation || (Array.isArray(u.customerFlatTypes) && u.customerFlatTypes.length)) ? (
                          <div style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}>
                            {u.customerOfficeLocation ? <span><strong>Office:</strong> {u.customerOfficeLocation}</span> : null}
                            {Array.isArray(u.customerFlatTypes) && u.customerFlatTypes.length ? (
                              <span>{u.customerOfficeLocation ? " · " : null}<strong>Flat types:</strong> {u.customerFlatTypes.join(", ")}</span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {(u.role === "customer" || u.role === "seller") && !String(u.uid || "").startsWith("reserved") ? (
                        <button type="button" onClick={() => setHistoryUser(u)} style={{ ...btn, background: "#ecfdf5", color: "#166534", fontSize: "12px", padding: "6px 12px" }}>
                          History
                        </button>
                      ) : null}
                      <button type="button" onClick={() => handleEditUser(u)} style={{ ...btn, background: "#dbeafe", color: "#1d4ed8", fontSize: "12px", padding: "6px 12px" }}>Edit</button>
                      {String(u.uid || "").startsWith("reserved-admin") ? null : (
                        <button type="button" onClick={() => handleRemoveUser(u.email)} style={{ ...btn, background: "#fef2f2", color: "#dc2626", fontSize: "12px", padding: "6px 12px" }}>Remove</button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={sectionCard}>
          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>{editingId ? "Edit listing" : "Create listing"}</div>
          <form onSubmit={handleSubmitListing} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)", gap: "10px" }}>
            <input placeholder="Title" required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            <input placeholder="Price label" required value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
            <input type="number" placeholder="Monthly rent" required value={form.monthlyRent} onChange={(e) => setForm((p) => ({ ...p, monthlyRent: Number(e.target.value) }))} />
            <select value={form.bhk} onChange={(e) => setForm((p) => ({ ...p, bhk: e.target.value }))}><option>1 BHK</option><option>2 BHK</option><option>3 BHK</option></select>
            <input placeholder="Address" required value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            <input placeholder="Seller name" required value={form.seller} onChange={(e) => setForm((p) => ({ ...p, seller: e.target.value }))} />
            <input placeholder="Seller email" required value={form.sellerEmail} onChange={(e) => setForm((p) => ({ ...p, sellerEmail: e.target.value }))} />
            <input placeholder="Contact phone" value={form.contact} onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))} />
            <input placeholder="Main photo URL" value={form.image} onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))} />
            <input placeholder="Source / portal" value={form.source} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))} />
            <input placeholder="Source URL" value={form.sourceUrl} onChange={(e) => setForm((p) => ({ ...p, sourceUrl: e.target.value }))} />
            <textarea placeholder="Gallery photo URLs, one per line" value={form.imagesText} onChange={(e) => setForm((p) => ({ ...p, imagesText: e.target.value }))} style={{ gridColumn: isMobile ? "auto" : "span 2", minHeight: "70px" }} />
            <textarea placeholder="Listing description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} style={{ gridColumn: isMobile ? "auto" : "span 2", minHeight: "70px" }} />
            <input placeholder="Security deposit (optional) — 50000" value={form.securityDeposit} onChange={(e) => setForm((p) => ({ ...p, securityDeposit: e.target.value }))} />
            <input placeholder="Maintenance cost (optional) — 2000" value={form.maintenanceCost} onChange={(e) => setForm((p) => ({ ...p, maintenanceCost: e.target.value }))} />
            <input placeholder="Brokerage (optional) — Half month rent" value={form.brokerage} onChange={(e) => setForm((p) => ({ ...p, brokerage: e.target.value }))} />
            <input placeholder="Built up area (optional) — 1200" value={form.builtUpArea} onChange={(e) => setForm((p) => ({ ...p, builtUpArea: e.target.value }))} />
            <input placeholder="Bathrooms (optional) — 2" value={form.bathrooms} onChange={(e) => setForm((p) => ({ ...p, bathrooms: e.target.value }))} />
            <input placeholder="Balcony (optional) — 1 wide" value={form.balcony} onChange={(e) => setForm((p) => ({ ...p, balcony: e.target.value }))} />
            <input placeholder="Floor no. (optional) — 4" value={form.floorNumber} onChange={(e) => setForm((p) => ({ ...p, floorNumber: e.target.value }))} />
            <input placeholder="Total floors (optional) — 12" value={form.totalFloors} onChange={(e) => setForm((p) => ({ ...p, totalFloors: e.target.value }))} />
            <input placeholder="Lease type (optional) — 11 months" value={form.leaseType} onChange={(e) => setForm((p) => ({ ...p, leaseType: e.target.value }))} />
            <input placeholder="Age of property (optional) — 3 years" value={form.ageOfProperty} onChange={(e) => setForm((p) => ({ ...p, ageOfProperty: e.target.value }))} />
            <input placeholder="Parking info (optional) — 1 covered car" value={form.parkingInfo} onChange={(e) => setForm((p) => ({ ...p, parkingInfo: e.target.value }))} />
            <input placeholder="Gas pipeline (optional) — Yes" value={form.gasPipeline} onChange={(e) => setForm((p) => ({ ...p, gasPipeline: e.target.value }))} />
            <input placeholder="Gated community (optional) — Yes" value={form.gatedCommunity} onChange={(e) => setForm((p) => ({ ...p, gatedCommunity: e.target.value }))} />
            <textarea placeholder="Furnishings (comma separated, optional) — Sofa, Fridge, Washing machine" value={form.furnishingsText} onChange={(e) => setForm((p) => ({ ...p, furnishingsText: e.target.value }))} style={{ gridColumn: isMobile ? "auto" : "span 2", minHeight: "64px" }} />
            <textarea placeholder="Amenities (comma separated, optional) — Gym, Pool, Power backup" value={form.amenitiesText} onChange={(e) => setForm((p) => ({ ...p, amenitiesText: e.target.value }))} style={{ gridColumn: isMobile ? "auto" : "span 2", minHeight: "64px" }} />
            <MediaUploadField files={photoFiles} setFiles={setPhotoFiles} maxFiles={12} title="Listing Media Upload" />
            <button type="submit" style={{ ...btn, background: "#16a34a", color: "white" }}>{editingId ? "Update listing" : "Create listing"}</button>
          </form>
          <div style={{ marginTop: "12px", fontSize: "12px" }}>
            Location: {pinPosition?.[0]?.toFixed(4)}, {pinPosition?.[1]?.toFixed(4)}
          </div>
          <div style={{ marginTop: "10px", height: "260px" }}>
            <MapContainer center={pinPosition} zoom={13} style={{ height: "100%" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <LocationPicker position={pinPosition} onPick={setPinPosition} />
            </MapContainer>
          </div>
        </div>

        <div style={sectionCard}>
          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>Broker Bulk Import</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
            <input placeholder="Broker name" value={importBrokerName} onChange={(e) => setImportBrokerName(e.target.value)} />
            <input placeholder="Source name" value={importSourceName} onChange={(e) => setImportSourceName(e.target.value)} />
          </div>
          <div style={{ marginBottom: "8px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Or Upload File (CSV, JSON, TSV)</label>
            <input 
              type="file" 
              accept=".csv, .json, .txt, .tsv"
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => setFeedJson(evt.target.result);
                reader.readAsText(file);
              }}
              style={{ padding: "4px", border: "1px solid #e2e8f0", borderRadius: "6px", width: "100%", fontSize: "12px" }}
            />
          </div>
          <textarea
            value={feedJson}
            onChange={(e) => setFeedJson(e.target.value)}
            rows={6}
            style={{ width: "100%", marginBottom: "8px" }}
            placeholder={'JSON example: [{"title":"2 BHK in HSR","brokerName":"Rahul Estates","monthlyRent":28000,"lat":12.91,"lng":77.63}]\nCSV example header: title,brokerName,monthlyRent,lat,lng,address'}
          />
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={handleBrokerImport} style={{ ...btn, background: "#7c3aed", color: "white" }}>Import by Broker Name</button>
            <button onClick={handleFeedImport} style={{ ...btn, background: "#475569", color: "white" }}>Generic Import (legacy)</button>
          </div>
        </div>

        <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>All Listings ({listings.length})</div>
        <div style={{ background: "white", borderRadius: "12px", overflow: "hidden" }}>
          {listings.map((l) => (
            <div key={l.id} style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "8px" : 0 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{l.title}</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>{l.bhk} | {l.address} | {l.seller} | {l.contact} | {l.source}</div>
              </div>
              <div style={{ fontWeight: 700, color: "#16a34a", marginRight: isMobile ? 0 : "16px" }}>{l.price}</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button onClick={() => handleEdit(l)} style={{ ...btn, background: "#dbeafe", color: "#1d4ed8", fontSize: "12px" }}>Edit</button>
                <button type="button" title="Permanent removal from database. Sellers can only withdraw (hide) their listings." onClick={() => handleDelete(l.id)} style={{ ...btn, background: "#fef2f2", color: "#dc2626", fontSize: "12px" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>

        {historyUser ? (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
              background: "rgba(15, 23, 42, 0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onClick={() => setHistoryUser(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "white",
                borderRadius: 16,
                maxWidth: 720,
                width: "100%",
                maxHeight: "90vh",
                overflow: "auto",
                padding: isMobile ? "16px" : "22px 24px",
                boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a" }}>User journey</div>
                  <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
                    {historyUser.name} · {historyUser.email} · {historyUser.role}
                  </div>
                </div>
                <button type="button" onClick={() => setHistoryUser(null)} style={{ ...btn, background: "#f1f5f9", color: "#334155" }}>
                  Close
                </button>
              </div>
              {!historyBundle ? (
                <div style={{ color: "#64748b" }}>Loading…</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <section>
                    <div style={{ fontWeight: 800, marginBottom: 8, color: "#1e293b" }}>Timeline (saves, interests)</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569", lineHeight: 1.65 }}>
                      {(historyBundle.acts || []).slice(0, 80).map((a) => (
                        <li key={a.id}>
                          <strong>{a.type}</strong> — {a.summary}{" "}
                          <span style={{ color: "#94a3b8" }}>
                            ({a.createdAt?.toDate ? a.createdAt.toDate().toLocaleString() : a.createdAt})
                          </span>
                        </li>
                      ))}
                      {!(historyBundle.acts || []).length ? <li>No logged events yet.</li> : null}
                    </ul>
                  </section>
                  <section>
                    <div style={{ fontWeight: 800, marginBottom: 8, color: "#1e293b" }}>Interests / applications</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569", lineHeight: 1.65 }}>
                      {(historyBundle.interests || []).map((i) => (
                        <li key={i.id}>
                          {i.listingTitle} (#{i.listingId}) — {i.status} — {i.tenancyPreference}
                        </li>
                      ))}
                      {!(historyBundle.interests || []).length ? <li>None.</li> : null}
                    </ul>
                  </section>
                  <section>
                    <div style={{ fontWeight: 800, marginBottom: 8, color: "#1e293b" }}>Visit requests</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569", lineHeight: 1.65 }}>
                      {(historyBundle.visits || []).map((v) => (
                        <li key={v.id}>
                          Listing #{v.listingId} — {v.visitTime} — {v.customerPhone}
                        </li>
                      ))}
                      {!(historyBundle.visits || []).length ? <li>None.</li> : null}
                    </ul>
                  </section>
                  <section>
                    <div style={{ fontWeight: 800, marginBottom: 8, color: "#1e293b" }}>Bookings (this device)</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569", lineHeight: 1.65 }}>
                      {(historyBundle.bookings || []).map((b, idx) => (
                        <li key={idx}>
                          {b.listingTitle} — {b.status} — {b.date ? new Date(b.date).toLocaleString() : ""}
                        </li>
                      ))}
                      {!(historyBundle.bookings || []).length ? <li>None.</li> : null}
                    </ul>
                  </section>
                  <section>
                    <div style={{ fontWeight: 800, marginBottom: 8, color: "#1e293b" }}>Assignments</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569", lineHeight: 1.65 }}>
                      {(historyBundle.assigns || []).map((a) => (
                        <li key={a.id}>
                          Listing #{a.listingId} — seller {a.sellerEmail || "—"} — {a.notes || "no notes"}
                        </li>
                      ))}
                      {!(historyBundle.assigns || []).length ? <li>None.</li> : null}
                    </ul>
                  </section>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
