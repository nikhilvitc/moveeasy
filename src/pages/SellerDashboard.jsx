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

export default function SellerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", price: "", type: "Rent", bhk: "2BHK", address: "", contact: "" });
  const [pinPosition, setPinPosition] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("moveasy_listings");
    const all = saved ? JSON.parse(saved) : initialListings;
    setListings(all.filter((l) => l.sellerEmail === user?.email));
  }, [user]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!pinPosition) { alert("Please click on the map to set property location"); return; }
    const newItem = { ...form, id: Date.now(), seller: user?.name || "Seller", sellerEmail: user?.email, lat: pinPosition[0], lng: pinPosition[1], experience: "N/A", totalListings: 0, areas: form.address, company: user?.name, contact: form.contact || "N/A" };
    const saved = localStorage.getItem("moveasy_listings");
    const all = saved ? JSON.parse(saved) : initialListings;
    all.unshift(newItem);
    localStorage.setItem("moveasy_listings", JSON.stringify(all));
    setListings(all.filter((l) => l.sellerEmail === user?.email));
    setForm({ title: "", price: "", type: "Rent", bhk: "2BHK", address: "", contact: "" });
    setPinPosition(null);
    setShowAdd(false);
  };

  const handleDelete = (id) => {
    const saved = localStorage.getItem("moveasy_listings");
    const all = saved ? JSON.parse(saved) : initialListings;
    const updated = all.filter((l) => l.id !== id);
    localStorage.setItem("moveasy_listings", JSON.stringify(updated));
    setListings(updated.filter((l) => l.sellerEmail === user?.email));
  };

  const btn = { padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "13px", cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "18px", fontWeight: 700 }}>My Listings ({listings.length})</div>
          <button onClick={() => setShowAdd(!showAdd)} style={{ ...btn, background: "#1e3a8a", color: "white" }}>{showAdd ? "Cancel" : "+ Add Listing"}</button>
        </div>
        {showAdd && (
          <div style={{ background: "white", padding: "16px", borderRadius: "12px", marginBottom: "16px" }}>
            <form onSubmit={handleAdd} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
              <input placeholder="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <input placeholder="Price" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <select value={form.bhk} onChange={(e) => setForm({ ...form, bhk: e.target.value })} style={{ padding: "8px", border: "1px solid #e2e8f0", borderRadius: "6px" }}><option>1RK</option><option>1BHK</option><option>2BHK</option><option>3BHK</option><option>4BHK</option></select>
              <input placeholder="Address" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <input placeholder="Contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <div style={{ fontSize: "12px", color: pinPosition ? "#16a34a" : "#dc2626", fontWeight: 600, display: "flex", alignItems: "center" }}>{pinPosition ? "Pin set" : "Click map below"}</div>
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
          {listings.map((l) => (
            <div key={l.id} style={{ background: "white", borderRadius: "12px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>{l.bhk}</span>
                <span style={{ fontWeight: 800, color: "#16a34a" }}>{l.price}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: "15px" }}>{l.title}</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>{l.address}</div>
              <button onClick={() => handleDelete(l.id)} style={{ marginTop: "8px", width: "100%", padding: "6px", borderRadius: "6px", border: "none", fontWeight: 600, fontSize: "12px", cursor: "pointer", background: "#fef2f2", color: "#dc2626" }}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
