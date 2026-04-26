import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import initialListings from "../data/listingsData";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} /> : null;
}

export default function AdminDashboard() {
  const { user, logout, getSellerRequests, approveSeller, rejectSeller, getAllUsers, promoteToAdmin, updateLeadStatus } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [activeTab, setActiveTab] = useState("listings");

  // Form State for Adding/Editing
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    rent: "",
    bhk: "2 BHK",
    type: "Flat",
    location: "Mumbai",
    coords: [19.076, 72.877],
    availability: "Immediate",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800",
    images: []
  });

  useEffect(() => {
    const saved = localStorage.getItem("moveasy_listings");
    if (saved) setListings(JSON.parse(saved));
    else setListings(initialListings);
  }, []);

  const saveToLocal = (newListings) => {
    setListings(newListings);
    localStorage.setItem("moveasy_listings", JSON.stringify(newListings));
  };

  const handleEdit = (listing) => {
    setEditingId(listing.id);
    setFormData({ ...listing, images: listing.images || [] });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this listing?")) {
      const filtered = listings.filter(l => l.id !== id);
      saveToLocal(filtered);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      const updated = listings.map(l => l.id === editingId ? { ...formData, id: editingId } : l);
      saveToLocal(updated);
    } else {
      const newListing = { ...formData, id: Date.now() };
      saveToLocal([newListing, ...listings]);
    }
    setShowModal(false);
    setEditingId(null);
    setFormData({ title: "", rent: "", bhk: "2 BHK", type: "Flat", location: "Mumbai", coords: [19.076, 72.877], availability: "Immediate", image: "", images: [] });
  };

  // Stats
  const sellers = Object.values(getAllUsers()).filter(u => u.role === "seller");
  const sellerReqs = getSellerRequests().filter(r => r.status === "pending");
  const leads = JSON.parse(localStorage.getItem("moveasy_bookings") || "[]");

  if (!user || user.role !== "admin") {
    return <div style={{ padding: "100px", textAlign: "center" }}>Access Denied</div>;
  }

  const navItem = (id, label) => (
    <button 
      onClick={() => setActiveTab(id)}
      style={{ padding: "12px 24px", background: activeTab === id ? "#1e3a8a" : "transparent", color: activeTab === id ? "white" : "#64748b", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, transition: "0.2s" }}>
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex" }}>
      {/* Sidebar */}
      <div style={{ width: "280px", background: "#0f172a", color: "white", padding: "40px 20px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 40px", color: "#38bdf8" }}>Admin Console</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {navItem("listings", "All Listings")}
          {navItem("leads", "Customer Leads")}
          {navItem("sellers", "Seller Management")}
          {navItem("users", "User Directory")}
        </div>
        <button onClick={logout} style={{ marginTop: "100px", width: "100%", padding: "12px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 800 }}>Logout</button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "40px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#1e293b" }}>
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </h1>
          {activeTab === "listings" && (
            <button onClick={() => setShowModal(true)} style={{ padding: "12px 24px", background: "#1e3a8a", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}>
              + Add Property
            </button>
          )}
        </header>

        {activeTab === "listings" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
            {listings.map(l => (
              <div key={l.id} style={{ background: "white", borderRadius: "16px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                <img src={l.image} alt="" style={{ width: "100%", height: "180px", objectFit: "cover" }} />
                <div style={{ padding: "20px" }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: "18px" }}>{l.title}</h3>
                  <p style={{ color: "#1e3a8a", fontWeight: 800, fontSize: "20px", margin: "0 0 16px" }}>₹{l.rent}/mo</p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => handleEdit(l)} style={{ flex: 1, padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}>Edit</button>
                    <button onClick={() => handleDelete(l.id)} style={{ flex: 1, padding: "8px", background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: "6px", cursor: "pointer" }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "leads" && (
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "2px solid #f1f5f9" }}>
                  <th style={{ padding: "16px" }}>Customer</th>
                  <th>Property</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "16px" }}>{lead.userName}<br/><span style={{fontSize:"12px", color:"#64748b"}}>{lead.userEmail}</span></td>
                    <td>{Object.values(listings).find(l=>l.id == lead.listingId)?.title || "Unknown Property"}</td>
                    <td>
                      <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, background: lead.status === "Assigned" ? "#dcfce7" : "#fff7ed", color: lead.status === "Assigned" ? "#166534" : "#9a3412" }}>
                        {lead.status || "Open"}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => updateLeadStatus(idx, "Assigned")} style={{ padding: "6px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}>Assign Broker</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "sellers" && (
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: "0 0 20px" }}>Pending Requests ({sellerReqs.length})</h3>
            {sellerReqs.length === 0 && <p style={{color:"#64748b"}}>No pending requests found.</p>}
            {sellerReqs.map(r => (
              <div key={r.email} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: "#f8fafc", borderRadius: "10px", marginBottom: "12px" }}>
                <div>
                  <p style={{ fontWeight: 700, margin: 0 }}>{r.name}</p>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>{r.email}</p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => approveSeller(r.email)} style={{ padding: "8px 16px", background: "#166534", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>Approve</button>
                  <button onClick={() => rejectSeller(r.email)} style={{ padding: "8px 16px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "white", padding: "32px", borderRadius: "24px", width: "100%", maxWidth: "800px", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ marginBottom: "24px" }}>{editingId ? "Edit Property" : "Add New Property"}</h2>
            <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Title</label>
                <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Rent (₹)</label>
                <input type="number" value={formData.rent} onChange={e => setFormData({ ...formData, rent: e.target.value })} required style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>BHK</label>
                <select value={formData.bhk} onChange={e => setFormData({ ...formData, bhk: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
                  <option>1 BHK</option><option>2 BHK</option><option>3 BHK</option><option>4+ BHK</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Availability</label>
                <select value={formData.availability} onChange={e => setFormData({ ...formData, availability: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
                  <option>Immediate</option><option>Within 15 Days</option><option>Within 30 Days</option>
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Thumbnail URL</label>
                <input type="text" value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} placeholder="https://..." style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Pick Location on Map</label>
                <div style={{ height: "300px", borderRadius: "12px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
                  <MapContainer center={formData.coords} zoom={12} style={{ height: "100%", width: "100%" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationPicker position={formData.coords} setPosition={(pos) => setFormData({ ...formData, coords: pos })} />
                  </MapContainer>
                </div>
                <p style={{ fontSize: "12px", color: "#64748b", marginTop: "8px" }}>Selected Coords: {formData.coords[0].toFixed(4)}, {formData.coords[1].toFixed(4)}</p>
              </div>
              <div style={{ gridColumn: "span 2", display: "flex", gap: "12px", marginTop: "12px" }}>
                <button type="submit" style={{ flex: 1, padding: "14px", background: "#1e3a8a", color: "white", border: "none", borderRadius: "10px", fontWeight: 800 }}>{editingId ? "Update Listing" : "Create Listing"}</button>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: "14px", background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: "10px", fontWeight: 800 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
