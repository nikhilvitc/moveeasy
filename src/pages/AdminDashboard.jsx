import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { addAssignment, getAllUsers, getAssignments, getListings, getSellerRequests, removeListing, upsertListing } from "../lib/store";
import { ingestBrokerListings, ingestPartnerListings } from "../lib/externalFeeds";
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
  const [assignment, setAssignment] = useState({ listingId: "", customerEmail: "", sellerEmail: "", notes: "" });
  const [feedJson, setFeedJson] = useState("");
  const [importBrokerName, setImportBrokerName] = useState("");
  const [importSourceName, setImportSourceName] = useState("manual-transfer");

  const listings = useMemo(() => getListings(), [refreshTick]);
  const assignments = useMemo(() => getAssignments(), [refreshTick]);
  const users = useMemo(() => getAllUsers(), [refreshTick]);

  const customers = users.filter((u) => u.role === "customer");
  const sellers = users.filter((u) => u.role === "seller");
  const sellerReqs = useMemo(() => getSellerRequests().filter((r) => r.status === "pending"), [refreshTick]);
  const pendingSellerBadgeApps = useMemo(() => {
    if (typeof getPendingSellerBadgeApplications === 'function') {
      return getPendingSellerBadgeApplications();
    }
    return [];
  }, [refreshTick, getPendingSellerBadgeApplications]);

  const handleSubmitListing = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      id: editingId || Date.now(),
      lat: Number(pinPosition?.[0] ?? form.lat),
      lng: Number(pinPosition?.[1] ?? form.lng),
      preferredTenants: toList(form.preferredTenants, ["Family"]),
      parking: toList(form.parking, ["2 Wheeler"]),
      updatedAt: new Date().toISOString(),
    };
    upsertListing(payload);
    setEditingId(null);
    setForm(DEFAULT_FORM);
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

  const handleDelete = (id) => {
    removeListing(id);
    setRefreshTick((v) => v + 1);
  };

  const handleApprove = (email) => {
    approveSeller(email);
    setRefreshTick((v) => v + 1);
  };

  const handleReject = (email) => {
    rejectSeller(email);
    setRefreshTick((v) => v + 1);
  };

  const handleApproveSellerBadge = (email) => {
    approveSellerBadge(email);
    setRefreshTick((v) => v + 1);
  };

  const handleRejectSellerBadge = (email) => {
    rejectSellerBadge(email);
    setRefreshTick((v) => v + 1);
  };

  const handleAssign = (e) => {
    e.preventDefault();
    if (!assignment.listingId || !assignment.customerEmail || !assignment.sellerEmail) return;
    addAssignment({ ...assignment, listingId: Number(assignment.listingId), createdBy: user?.email });
    setAssignment({ listingId: "", customerEmail: "", sellerEmail: "", notes: "" });
    setRefreshTick((v) => v + 1);
  };

  const handleFeedImport = () => {
    if (!feedJson.trim()) return;
    try {
      const parsed = JSON.parse(feedJson);
      const result = ingestPartnerListings(parsed, "partner-import");
      alert("Imported " + result.imported + " listings");
      setFeedJson("");
      setRefreshTick((v) => v + 1);
    } catch {
      alert("Invalid JSON feed format");
    }
  };

  const handleBrokerImport = () => {
    if (!importBrokerName.trim()) {
      alert("Enter broker name first");
      return;
    }
    if (!feedJson.trim()) {
      alert("Paste broker listing export data first");
      return;
    }
    const result = ingestBrokerListings({
      brokerName: importBrokerName.trim(),
      rawInput: feedJson,
      sourceName: importSourceName || "manual-transfer",
    });
    if (!result.imported) {
      alert("No listings imported.");
      return;
    }
    alert("Imported " + result.imported + " listings for broker " + importBrokerName.trim());
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
                <div style={{ fontSize: "12px", color: "#64748b" }}>{l.bhk} | {l.address} | {l.seller}</div>
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
