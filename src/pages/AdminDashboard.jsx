import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getAllUsers, getListings, getSellerRequests, removeListing, upsertListing, addUserLocally, removeUserLocally } from "../lib/store";
import { ingestBrokerListings, ingestPartnerListings, normalizeBrokerListings, normalizePartnerListings } from "../lib/externalFeeds";
import { isFirebaseConfigured } from "../lib/firebase";
import { addUserProfileData, getAllUsersData, getListingsData, getSellerRequestsData, removeListingData, removeUserProfileData, uploadListingFiles, upsertListingData, getVisitsData } from "../lib/firestoreStore";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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
  const [listingsState, setListingsState] = useState([]);
  const [usersState, setUsersState] = useState([]);
  const [sellerReqsState, setSellerReqsState] = useState([]);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [visitRequests, setVisitRequests] = useState([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (isFirebaseConfigured) {
        const [remoteListings, remoteUsers, remoteSellerReqs, remoteVisits] = await Promise.all([getListingsData(), getAllUsersData(), getSellerRequestsData(), getVisitsData()]);
        if (!alive) return;
        setListingsState(remoteListings);
        setUsersState(remoteUsers);
        setSellerReqsState(remoteSellerReqs);
        setVisitRequests(remoteVisits);
      } else {
        setListingsState(getListings());
        setUsersState(getAllUsers());
        setSellerReqsState(getSellerRequests().filter((r) => r.status === "pending"));
        setVisitRequests([]);
      }
    }
    load().catch(() => undefined);
    return () => { alive = false; };
  }, [refreshTick]);

  const listings = listingsState;
  const users = usersState;

  const sellerReqs = sellerReqsState;
  const pendingSellerBadgeApps = useMemo(() => {
    if (typeof getPendingSellerBadgeApplications === 'function') {
      return getPendingSellerBadgeApplications();
    }
    return [];
  }, [getPendingSellerBadgeApplications]);

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
    if (isFirebaseConfigured) await addUserProfileData(newUserEmail, newUserName, newUserRole);
    else addUserLocally(newUserEmail, newUserName, newUserRole);
    setNewUserEmail("");
    setNewUserName("");
    setRefreshTick((v) => v + 1);
  };

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

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      <div style={{ background: "linear-gradient(135deg, #DC2626, #EF4444)", color: "white", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>Admin Dashboard</div>
          <div style={{ fontSize: "12px", opacity: 0.7 }}>{user?.email}</div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => navigate("/map")} style={{ ...btn, background: "rgba(255,255,255,0.15)", color: "white" }}>Map</button>
          <button onClick={() => navigate("/")} style={{ ...btn, background: "rgba(255,255,255,0.15)", color: "white" }}>Home</button>
          <button onClick={() => { logout(); navigate("/login"); }} style={{ ...btn, background: "#ef4444", color: "white" }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: "20px 24px" }}>
        {pendingSellerBadgeApps.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#0f766e", marginBottom: "10px" }}>
              Pending verified seller badge ({pendingSellerBadgeApps.length})
            </div>
            {pendingSellerBadgeApps.map((p) => (
              <div key={p.email} style={{ background: "white", padding: "12px 16px", borderRadius: "8px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
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
              <div key={r.email} style={{ background: "white", padding: "12px 16px", borderRadius: "8px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
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

        {/* User Management Section */}
        <div style={{ background: "white", padding: "16px", borderRadius: "12px", marginBottom: "16px" }}>
          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>User Management ({users.length} total)</div>
          
          <form onSubmit={handleAddUser} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "10px", marginBottom: "16px" }}>
            <input placeholder="Full Name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} required style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "6px" }} />
            <input type="email" placeholder="Email Address" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "6px" }} />
            <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "6px" }}>
              <option value="customer">Customer</option>
              <option value="seller">Seller / Broker</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" style={{ ...btn, background: "#16a34a", color: "white" }}>Add User</button>
          </form>

          <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
            {users.map((u) => (
              <div key={u.email} style={{ padding: "10px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{u.name} <span style={{ fontSize: "11px", color: "white", background: u.role === "seller" ? "#f59e0b" : "#3b82f6", padding: "2px 6px", borderRadius: "4px", marginLeft: "6px" }}>{u.role}</span></div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>{u.email}</div>
                </div>
                <button type="button" onClick={() => handleRemoveUser(u.email)} style={{ ...btn, background: "#fef2f2", color: "#dc2626", fontSize: "12px", padding: "6px 12px" }}>Remove</button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "white", padding: "16px", borderRadius: "12px", marginBottom: "16px" }}>
          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>{editingId ? "Edit listing" : "Create listing"}</div>
          <form onSubmit={handleSubmitListing} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
            <input placeholder="Title" required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            <input placeholder="Price label" required value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
            <input type="number" placeholder="Monthly rent" required value={form.monthlyRent} onChange={(e) => setForm((p) => ({ ...p, monthlyRent: Number(e.target.value) }))} />
            <select value={form.bhk} onChange={(e) => setForm((p) => ({ ...p, bhk: e.target.value }))}><option>1 BHK</option><option>2 BHK</option><option>3 BHK</option></select>
            <input placeholder="Address" required value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            <input placeholder="Seller name" required value={form.seller} onChange={(e) => setForm((p) => ({ ...p, seller: e.target.value }))} />
            <input placeholder="Seller email" required value={form.sellerEmail} onChange={(e) => setForm((p) => ({ ...p, sellerEmail: e.target.value }))} />
            <input placeholder="Contact phone" value={form.contact} onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))} />
            <input placeholder="Main photo URL" value={form.image} onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))} />
            <input type="file" accept="image/*,video/*" multiple onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))} />
            <input placeholder="Source / portal" value={form.source} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))} />
            <input placeholder="Source URL" value={form.sourceUrl} onChange={(e) => setForm((p) => ({ ...p, sourceUrl: e.target.value }))} />
            <textarea placeholder="Gallery photo URLs, one per line" value={form.imagesText} onChange={(e) => setForm((p) => ({ ...p, imagesText: e.target.value }))} style={{ gridColumn: "span 2", minHeight: "70px" }} />
            <textarea placeholder="Listing description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} style={{ gridColumn: "span 2", minHeight: "70px" }} />
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

        <div style={{ background: "white", padding: "16px", borderRadius: "12px", marginBottom: "16px" }}>
          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>Broker Bulk Import</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
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
            <div key={l.id} style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{l.title}</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>{l.bhk} | {l.address} | {l.seller} | {l.contact} | {l.source}</div>
              </div>
              <div style={{ fontWeight: 700, color: "#16a34a", marginRight: "16px" }}>{l.price}</div>
              <button onClick={() => handleEdit(l)} style={{ ...btn, background: "#dbeafe", color: "#1d4ed8", fontSize: "12px", marginRight: "8px" }}>Edit</button>
              <button onClick={() => handleDelete(l.id)} style={{ ...btn, background: "#fef2f2", color: "#dc2626", fontSize: "12px" }}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
