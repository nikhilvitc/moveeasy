import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { addAssignment, getAllUsers, getAssignments, getListings, getSellerRequests, removeListing, upsertListing } from "../lib/store";
import { ingestPartnerListings } from "../lib/externalFeeds";
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
  const { user, logout, approveSeller, rejectSeller } = useAuth();
  const navigate = useNavigate();
  const [refreshTick, setRefreshTick] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [pinPosition, setPinPosition] = useState([DEFAULT_FORM.lat, DEFAULT_FORM.lng]);
  const [assignment, setAssignment] = useState({ listingId: "", customerEmail: "", sellerEmail: "", notes: "" });
  const [feedJson, setFeedJson] = useState("");

  const listings = useMemo(() => getListings(), [refreshTick]);
  const assignments = useMemo(() => getAssignments(), [refreshTick]);
  const users = useMemo(() => getAllUsers(), [refreshTick]);
  const customers = users.filter((u) => u.role === "customer");
  const sellers = users.filter((u) => u.role === "seller");
  const sellerReqs = useMemo(() => getSellerRequests().filter((r) => r.status === "pending"), [refreshTick]);

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
      alert(`Imported ${result.imported} listings`);
      setFeedJson("");
      setRefreshTick((v) => v + 1);
    } catch {
      alert("Invalid JSON feed format");
    }
  };

  const btn = { padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "13px", cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      <div style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)", color: "white", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
            <input placeholder="Price label (₹ 25,000/mo)" required value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
            <input type="number" placeholder="Monthly rent" required value={form.monthlyRent} onChange={(e) => setForm((p) => ({ ...p, monthlyRent: Number(e.target.value) }))} />
            <select value={form.bhk} onChange={(e) => setForm((p) => ({ ...p, bhk: e.target.value }))}><option>1 RK</option><option>1 BHK</option><option>2 BHK</option><option>3 BHK</option><option>3+ BHK</option><option>Roommate needed</option></select>
            <input placeholder="Address" required value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            <input placeholder="Seller / broker name" required value={form.seller} onChange={(e) => setForm((p) => ({ ...p, seller: e.target.value }))} />
            <input placeholder="Seller email" required value={form.sellerEmail} onChange={(e) => setForm((p) => ({ ...p, sellerEmail: e.target.value }))} />
            <input placeholder="Contact" value={form.contact} onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))} />
            <select value={form.availability} onChange={(e) => setForm((p) => ({ ...p, availability: e.target.value }))}><option>Immediate</option><option>Within 15 days</option><option>Within 30 days</option><option>After 30 days</option></select>
            <select value={form.propertyType} onChange={(e) => setForm((p) => ({ ...p, propertyType: e.target.value }))}><option>Gated Societies</option><option>Apartment</option><option>Independent House/Villa</option><option>Gated Community Villa</option></select>
            <select value={form.furnishing} onChange={(e) => setForm((p) => ({ ...p, furnishing: e.target.value }))}><option>Full</option><option>Semi</option><option>None</option></select>
            <input type="text" placeholder="Parking (comma separated)" value={form.parking.join(", ")} onChange={(e) => setForm((p) => ({ ...p, parking: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }))} />
            <input type="text" placeholder="Preferred tenants (comma separated)" value={form.preferredTenants.join(", ")} onChange={(e) => setForm((p) => ({ ...p, preferredTenants: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }))} />
            <input
              type="number"
              step="0.0001"
              placeholder="Latitude"
              value={Number(pinPosition?.[0] ?? form.lat)}
              onChange={(e) => {
                const lat = Number(e.target.value);
                setForm((p) => ({ ...p, lat }));
                setPinPosition((prev) => [lat, Number(prev?.[1] ?? form.lng)]);
              }}
            />
            <input
              type="number"
              step="0.0001"
              placeholder="Longitude"
              value={Number(pinPosition?.[1] ?? form.lng)}
              onChange={(e) => {
                const lng = Number(e.target.value);
                setForm((p) => ({ ...p, lng }));
                setPinPosition((prev) => [Number(prev?.[0] ?? form.lat), lng]);
              }}
            />
            <button type="submit" style={{ ...btn, background: "#16a34a", color: "white" }}>{editingId ? "Update listing" : "Create listing"}</button>
          </form>
          <div style={{ marginTop: "12px", fontSize: "12px", color: "#475569" }}>
            Click on the map to pinpoint the exact listing location.
            <span style={{ marginLeft: "8px", fontWeight: 700 }}>
              {`Lat: ${Number(pinPosition?.[0]).toFixed(5)}, Lng: ${Number(pinPosition?.[1]).toFixed(5)}`}
            </span>
          </div>
          <div style={{ marginTop: "10px", height: "260px", borderRadius: "10px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <MapContainer center={pinPosition} zoom={14} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationPicker position={pinPosition} onPick={setPinPosition} />
            </MapContainer>
          </div>
        </div>

        <div style={{ background: "white", padding: "16px", borderRadius: "12px", marginBottom: "16px" }}>
          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>Partner Feed Import</div>
          <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#64748b" }}>Paste a legal partner JSON feed array to import broker listings.</p>
          <textarea value={feedJson} onChange={(e) => setFeedJson(e.target.value)} rows={5} style={{ width: "100%", marginBottom: "8px" }} placeholder='[{"title":"2 BHK in HSR","monthlyRent":28000,"lat":12.91,"lng":77.63}]' />
          <button onClick={handleFeedImport} style={{ ...btn, background: "#7c3aed", color: "white", marginBottom: "16px" }}>Import Feed</button>
        </div>

        <div style={{ background: "white", padding: "16px", borderRadius: "12px", marginBottom: "16px" }}>
          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>Assign listing to customer and broker</div>
          <form onSubmit={handleAssign} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr auto", gap: "8px" }}>
            <select value={assignment.listingId} onChange={(e) => setAssignment((p) => ({ ...p, listingId: e.target.value }))}>
              <option value="">Select listing</option>
              {listings.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
            <select value={assignment.customerEmail} onChange={(e) => setAssignment((p) => ({ ...p, customerEmail: e.target.value }))}>
              <option value="">Customer</option>
              {customers.map((c) => <option key={c.email} value={c.email}>{c.name}</option>)}
            </select>
            <select value={assignment.sellerEmail} onChange={(e) => setAssignment((p) => ({ ...p, sellerEmail: e.target.value }))}>
              <option value="">Seller/Broker</option>
              {sellers.map((s) => <option key={s.email} value={s.email}>{s.name}</option>)}
            </select>
            <input placeholder="Notes" value={assignment.notes} onChange={(e) => setAssignment((p) => ({ ...p, notes: e.target.value }))} />
            <button type="submit" style={{ ...btn, background: "#1e3a8a", color: "white" }}>Assign</button>
          </form>
          <div style={{ marginTop: "10px", maxHeight: "160px", overflowY: "auto" }}>
            {assignments.map((a) => (
              <div key={a.id} style={{ fontSize: "12px", borderBottom: "1px solid #f1f5f9", padding: "6px 0" }}>
                Listing #{a.listingId} → {a.customerEmail} (Broker: {a.sellerEmail})
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "18px", fontWeight: 700 }}>All Listings ({listings.length})</div>
        </div>
        <div style={{ background: "white", borderRadius: "12px", overflow: "hidden" }}>
          {listings.map((l, i) => (
            <div key={l.id} style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: i % 2 ? "#fafafa" : "white" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "14px" }}>{l.title}</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>{l.bhk} | {l.address} | {l.seller} | {l.contact}</div>
              </div>
              <div style={{ fontWeight: 700, color: "#16a34a", marginRight: "16px", fontSize: "13px" }}>{l.price}</div>
              <button onClick={() => handleEdit(l)} style={{ ...btn, background: "#dbeafe", color: "#1d4ed8", fontSize: "12px", padding: "4px 10px", marginRight: "8px" }}>Edit</button>
              <button onClick={() => handleDelete(l.id)} style={{ ...btn, background: "#fef2f2", color: "#dc2626", fontSize: "12px", padding: "4px 10px" }}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
