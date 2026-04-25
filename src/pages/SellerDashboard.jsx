import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import initialListings from "../data/listingsData";


export default function SellerDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [listings, setListings] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ title: "", price: "", type: "Rent", bhk: "2BHK", address: "", contact: "" });


  useEffect(() => {
        const saved = localStorage.getItem("moveasy_listings");
        const all = saved ? JSON.parse(saved) : initialListings;
        setListings(all.filter((l) => l.sellerEmail === user?.email));
        const b = localStorage.getItem("moveasy_bookings");
        setBookings(b ? JSON.parse(b) : []);
  }, [user]);


  const handleAdd = (e) => {
        e.preventDefault();
        const newL = { ...form, id: Date.now(), seller: user?.name || "Seller", sellerEmail: user?.email, lat: 12.92 + Math.random() * 0.15, lng: 77.55 + Math.random() * 0.15, experience: "N/A", totalListings: 0, areas: form.address, company: user?.name || "Seller", contact: form.contact || "N/A" };
        const saved = localStorage.getItem("moveasy_listings");
        const all = saved ? JSON.parse(saved) : initialListings;
        all.unshift(newL);
        localStorage.setItem("moveasy_listings", JSON.stringify(all));
        setListings(all.filter((l) => l.sellerEmail === user?.email));
        setForm({ title: "", price: "", type: "Rent", bhk: "2BHK", address: "", contact: "" });
        setShowAdd(false);
  };


  const handleDelete = (id) => {
        const saved = localStorage.getItem("moveasy_listings");
        const all = saved ? JSON.parse(saved) : initialListings;
        const updated = all.filter((l) => l.id !== id);
        localStorage.setItem("moveasy_listings", JSON.stringify(updated));
        setListings(updated.filter((l) => l.sellerEmail === user?.email));
  };


  const myBookings = bookings.filter((b) => listings.some((l) => l.id === b.listingId));
    const st = { btn: { padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "13px", cursor: "pointer" } };


  return (
        <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
                <div style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)", color: "white", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div><h1 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>Seller Dashboard</h1><p style={{ fontSize: "12px", opacity: 0.7, margin: 0 }}>Welcome, {user?.name}</p></div>
                        <div style={{ display: "flex", gap: "8px" }}>
                                  <button onClick={() => navigate("/map")} style={{ ...st.btn, background: "rgba(255,255,255,0.15)", color: "white" }}>View Map</button>
                                  <button onClick={() => navigate("/")} style={{ ...st.btn, background: "rgba(255,255,255,0.15)", color: "white" }}>Home</button>
                                  <button onClick={() => { logout(); navigate("/login"); }} style={{ ...st.btn, background: "#ef4444", color: "white" }}>Logout</button>
                        </div>
                </div>
              <div style={{ padding: "20px 24px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>My Listings ({listings.length})</h2>
                                <button onClick={() => setShowAdd(!showAdd)} style={{ ...st.btn, background: "#1e3a8a", color: "white" }}>{showAdd ? "Cancel" : "+ Add Listing"}</button>
                      </div>
                {showAdd && (
                    <form onSubmit={handleAdd} style={{ background: "white", padding</div>

