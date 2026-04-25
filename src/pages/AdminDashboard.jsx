import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import initialListings from "../data/listingsData";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) { setPosition([e.latlng.lat, e.latlng.lng]); },
  });
  return position ? <Marker position={position} /> : null;
}

export default function AdminDashboard() {
  const { user, logout, getSellerRequests, approveSeller, rejectSeller } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", price: "", type: "Rent", bhk: "2BHK", address: "", contact: "", seller: "" });
  const [pinPosition, setPinPosition] = useState(null);
  const [sellerReqs, setSellerReqs] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("moveasy_listings");
    setListings(saved ? JSON.parse(saved) : initialListings);
    setSellerReqs(getSellerRequests().filter((r) => r.status === "pending"));
  }, []);

  useEffect(() => {
    if (listings.length) localStorage.setItem("moveasy_listings", JSON.stringify(listings));
  }, [listings]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!pinPosition) { alert("Please click on the map to set property location"); return; }
    const newItem = { ...form, id: Date.now(), lat: pinPosition[0], lng: pinPosition[1], sellerEmail: "admin@moveasy.com", experience: "N/A", totalListings: 0, areas: form.address, company: form.seller };
    setListings([newItem, ...listings]);
    setForm({ title: "", price: "", type: "Rent", bhk: "2BHK", address: "", contact: "", seller: "" });
    setPinPosition(null);
    setShowAdd(false);
  };

  const handleDelete = (id) => setListings(listings.filter((l) => l.id !== id));

  const handleApprove = (email) => {
    approveSeller(email);
    setSellerReqs(sellerReqs.filter((r) => r.email !== email));
  };

  const handleReject = (email) => {
    rejectSeller(email);
    setSellerReqs(sellerReqs.filter((r) => r.email !== email));
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "18px", fontWeight: 700 }}>All Listings ({listings.length})</div>
          <button onClick={() => setShowAdd(!showAdd)} style={{ ...btn, background: "#1e3a8a", color: "white" }}>{showAdd ? "Cancel" : "+ Add Listing"}</button>
        </div>
        {showAdd && (
          <div style={{ background: "white", padding: "16px", borderRadius: "12px", marginBottom: "16px" }}>
            <form onSubmit={handleAdd} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "12px" }}>
              <input placeholder="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }} />
              <input placeholder="Price" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }} />
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ padding: "8px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }}><option>Rent</option><option>Sale</option></select>
              <select value={form.bhk} onChange={(e) => setForm({ ...form, bhk: e.target.value })} style={{ padding: "8px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }}><option>1RK</option><option>1BHK</option><option>2BHK</option><option>3BHK</option><option>3+BHK</option><option>4BHK</option><option>Office</option><option>Plot</option></select>
              <input placeholder="Address" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }} />
              <input placeholder="Contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }} />
              <input placeholder="Seller Name" required value={form.seller} onChange={(e) => setForm({ ...form, seller: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }} />
              <div style={{ fontSize: "12px", color: pinPosition ? "#16a34a" : "#dc2626", fontWeight: 600, display: "flex", alignItems: "center" }}>{pinPosition ? "Pin: " + pinPosition[0].toFixed(4) + ", " + pinPosition[1].toFixed(4) : "Click map below to set location"}</div>
              <button type="submit" style={{ ...btn, background: "#16a34a", color: "white" }}>Save Listing</button>
            </form>
            <div style={{ height: "300px", borderRadius: "8px", overflow: "hidden", border: "2px solid #e2e8f0" }}>
              <MapContainer center={[12.9716, 77.5946]} zoom={12} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker position={pinPosition} setPosition={setPinPosition} />
              </MapContainer>
            </div>
          </div>
        )}
        <div style={{ background: "white", borderRadius: "12px", overflow: "hidden" }}>
          {listings.map((l, i) => (
            <div key={l.id} style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: i % 2 ? "#fafafa" : "white" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "14px" }}>{l.title}</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>{l.bhk} | {l.address} | {l.seller} | {l.contact}</div>
              </div>
              <div style={{ fontWeight: 700, color: "#16a34a", marginRight: "16px", fontSize: "13px" }}>{l.price}</div>
              <button onClick={() => handleDelete(l.id)} style={{ ...btn, background: "#fef2f2", color: "#dc2626", fontSize: "12px", padding: "4px 10px" }}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
