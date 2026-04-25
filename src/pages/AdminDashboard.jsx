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

  useEffect(() => { if (listings.length) localStorage.setItem("moveasy_listings", JSON.stringify(listings)); }, [listings]);

  const handleAdd = (e) => {
    e.preventDefault();
    const newL = { ...form, id: Date.now(), lat: 12.92 + Math.random() * 0.15, lng: 77.55 + Math.random() * 0.15, sellerEmail: "admin@moveasy.com", experience: "N/A", totalListings: 0, areas: form.address, company: form.seller };
    setListings([newL, ...listings]);
    setForm({ title: "", price: "", type: "Rent", bhk: "2BHK", address: "", contact: "", seller: "" });
    setShowAdd(false);
  };

  const handleDelete = (id) => { setListings(listings.filter((l) => l.id !== id)); };

  const s = { header: { background: "linear-gradient(135deg, #0f172a, #1e3a8a)", color: "white", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }, btn: { padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "13px", cursor: "pointer" } };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      <div style={s.header}>
        <div><h1 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>Admin Dashboard</h1><p style={{ fontSize: "12px", opacity: 0.7, margin: 0 }}>Logged in as {user?.email}</p></div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => navigate("/map")} style={{ ...s.btn, background: "rgba(255,255,255,0.15)", color: "white" }}>View Map</button>
          <button onClick={() => navigate("/")} style={{ ...s.btn, background: "rgba(255,255,255,0.15)", color: "white" }}>Home</button>
          <button onClick={() => { logout(); navigate("/login"); }} style={{ ...s.btn, background: "#ef4444", color: "white" }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", margin: 0 }}>All Listings ({listings.length})</h2>
          <button onClick={() => setShowAdd(!showAdd)} style={{ ...s.btn, background: "#1e3a8a", color: "white" }}>{showAdd ? "Cancel" : "+ Add Listing"}</button>
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} style={{ background: "white", padding: "16px", borderRadius: "12px", marginBottom: "16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <input placeholder="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }} />
            <input placeholder="Price (e.g. Rs.25,000/mo)" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }} />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ padding: "8px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }}><option>Rent</option><option>Sale</option></select>
            <select value={form.bhk} onChange={(e) => setForm({ ...form, bhk: e.target.value })} style={{ padding: "8px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }}><option>1RK</option><option>1BHK</option><option>2BHK</option><option>3BHK</option><option>3+BHK</option><option>4BHK</option><option>Office</option><option>Plot</option></select>
            <input placeholder="Address" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }} />
            <input placeholder="Contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }} />
            <input placeholder="Seller Name" required value={form.seller} onChange={(e) => setForm({ ...form, seller: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px" }} />
            <button type="submit" style={{ ...s.btn, background: "#16a34a", color: "white", gridColumn: "span 2" }}>Save Listing</button>
          </form>
        )}

        <div style={{ background: "white", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead><tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Title</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569" }}>BHK</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Price</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Type</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Seller</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Contact</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Address</th>
              <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "#475569" }}>Action</th>
            </tr></thead>
            <tbody>
              {listings.map((l, i) => (
                <tr key={l.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 ? "#fefefe" : "white" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>{l.title}</td>
                  <td style={{ padding: "8px 12px" }}><span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>{l.bhk}</span></td>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: "#16a34a" }}>{l.price}</td>
                  <td style={{ padding: "8px 12px" }}>{l.type}</td>
                  <td style={{ padding: "8px 12px" }}>{l.seller}</td>
                  <td style={{ padding: "8px 12px" }}>{l.contact}</td>
                  <td style={{ padding: "8px 12px", fontSize: "12px", color: "#64748b" }}>{l.address}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}><button onClick={() => handleDelete(l.id)} style={{ ...s.btn, background: "#fef2f2", color: "#dc2626", fontSize: "12px", padding: "4px 10px" }}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
