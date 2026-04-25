import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import initialListings from "../data/listingsData";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", price: "", type: "Rent", bhk: "2BHK", address: "", contact: "", seller: "" });

  useEffect(() => {
    const saved = localStorage.getItem("moveasy_listings");
    setListings(saved ? JSON.parse(saved) : initialListings);
  }, []);

  useEffect(() => {
    if (listings.length) localStorage.setItem("moveasy_listings", JSON.stringify(listings));
  }, [listings]);

  const handleAdd = (e) => {
    e.preventDefault();
    const newItem = { ...form, id: Date.now(), lat: 12.92 + Math.random() * 0.15, lng: 77.55 + Math.random() * 0.15, sellerEmail: "admin@moveasy.com", experience: "N/A", totalListings: 0, areas: form.address, company: form.seller };
    setListings([newItem, ...listings]);
    setForm({ title: "", price: "", type: "Rent", bhk: "2BHK", address: "", contact: "", seller: "" });
    setShowAdd(false);
  };

  const handleDelete = (id) => setListings(listings.filter((l) => l.id !== id));

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      <div style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)", color: "white", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>Admin Dashboard</div>
          <div style={{ fontSize: "12px", opacity: 0.7 }}>Logged in as {user?.email}</div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => navigate("/map")} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "13px", cursor: "pointer", background: "rgba(255,255,255,0.15)", color: "white" }}>View Map</button>
          <button onClick={() => navigate("/")} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "13px", cursor: "pointer", background: "rgba(255,255,255,0.15)", color: "white" }}>Home</button>
          <button onClick={() => { logout(); navigate("/login"); }} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "13px", cursor: "pointer", background: "#ef4444", color: "white" }}>Logout</button>
        </div>
      </div>
      <div style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b" }}>All Listings ({listings.length})</div>
          <button onClick={() => setShowAdd(!showAdd)} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "13px", cursor: "pointer", background: "#1e3a8a", color: "white" }}>{showAdd ? "Cancel" : "+ Add Listing"}</button>
        </div>
        {showAdd && (
          <form onSubmit={handleAdd} style={{ background: "white", padding: "16px", borderRadius: "12px", marginBottom: "16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <input placeholder="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }} />
            <input placeholder="Price" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }} />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ padding: "8px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }}><option>Rent</option><option>Sale</option></select>
            <select value={form.bhk} onChange={(e) => setForm({ ...form, bhk: e.target.value })} style={{ padding: "8px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }}><option>1RK</option><option>1BHK</option><option>2BHK</option><option>3BHK</option><option>3+BHK</option><option>4BHK</option><option>Office</option><option>Plot</option></select>
            <input placeholder="Address" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }} />
            <input placeholder="Contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }} />
            <input placeholder="Seller Name" required value={form.seller} onChange={(e) => setForm({ ...form, seller: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }} />
            <button type="submit" style={{ padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "13px", cursor: "pointer", background: "#16a34a", color: "white", gridColumn: "span 2" }}>Save Listing</button>
          </form>
        )}
        <div style={{ background: "white", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          {listings.map((l, i) => (
            <div key={l.id} style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: i % 2 ? "#fefefe" : "white" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "14px" }}>{l.title}</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>{l.bhk} | {l.address} | {l.seller} | {l.contact}</div>
              </div>
              <div style={{ fontWeight: 700, color: "#16a34a", marginRight: "16px" }}>{l.price}</div>
              <button onClick={() => handleDelete(l.id)} style={{ padding: "4px 10px", borderRadius: "6px", border: "none", fontWeight: 600, fontSize: "12px", cursor: "pointer", background: "#fef2f2", color: "#dc2626" }}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
