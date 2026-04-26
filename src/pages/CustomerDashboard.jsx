import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getAssignments, getListings } from "../lib/store";

export default function CustomerDashboard() {
  const { user, logout, requestSeller, refreshRole } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sellerRequested, setSellerRequested] = useState(false);

  useEffect(() => {
    setListings(getListings());
    const b = localStorage.getItem("moveasy_bookings");
    setBookings(b ? JSON.parse(b) : []);
    refreshRole();
    const reqs = JSON.parse(localStorage.getItem("moveasy_seller_requests") || "[]");
    setSellerRequested(reqs.some((r) => r.email === user?.email));
  }, []);

  useEffect(() => {
    if (user?.role === "seller") navigate("/seller");
  }, [user]);

  const handleBook = (listing) => {
    const booking = { listingId: listing.id, listingTitle: listing.title, customerName: user?.name, customerEmail: user?.email, date: new Date().toISOString(), status: "Pending" };
    const updated = [...bookings, booking];
    setBookings(updated);
    localStorage.setItem("moveasy_bookings", JSON.stringify(updated));
  };

  const handleRequestSeller = () => {
    requestSeller();
    setSellerRequested(true);
  };

  const isBooked = (id) => bookings.some((b) => b.listingId === id && b.customerEmail === user?.email);
  const bhkTypes = ["All", "1RK", "1BHK", "2BHK", "3BHK", "3+BHK", "4BHK"];
  const filtered = listings.filter((l) => (filter === "All" || l.bhk === filter || l.bhk.replace(" ", "") === filter) && (!search || l.title.toLowerCase().includes(search.toLowerCase()) || l.address.toLowerCase().includes(search.toLowerCase())));
  const myAssignments = getAssignments().filter((a) => a.customerEmail === user?.email);
  const btn = { padding: "8px 16px", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "13px", cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      <div style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)", color: "white", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>Welcome, {user?.name}</div>
          <div style={{ fontSize: "12px", opacity: 0.7 }}>Find your perfect home</div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {!sellerRequested && (
            <button onClick={handleRequestSeller} style={{ ...btn, background: "#f59e0b", color: "#1e293b" }}>Apply as Seller</button>
          )}
          {sellerRequested && (
            <span style={{ ...btn, background: "rgba(255,255,255,0.1)", color: "#fbbf24", cursor: "default" }}>Seller Request Pending</span>
          )}
          <button onClick={() => navigate("/map")} style={{ ...btn, background: "rgba(255,255,255,0.15)", color: "white" }}>Map</button>
          <button onClick={() => navigate("/")} style={{ ...btn, background: "rgba(255,255,255,0.15)", color: "white" }}>Home</button>
          <button onClick={() => { logout(); navigate("/login"); }} style={{ ...btn, background: "#ef4444", color: "white" }}>Logout</button>
        </div>
      </div>
      <div style={{ padding: "16px 24px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <input placeholder="Search by title or area..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "13px", width: "250px" }} />
          {bhkTypes.map((b) => (
            <button key={b} onClick={() => setFilter(b)} style={{ ...btn, background: filter === b ? "#1e3a8a" : "white", color: filter === b ? "white" : "#64748b", border: "1px solid #e2e8f0", fontSize: "12px", padding: "6px 12px" }}>{b}</button>
          ))}
        </div>
        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>Showing {filtered.length} properties</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px" }}>
          {filtered.map((l) => (
            <div key={l.id} style={{ background: "white", borderRadius: "12px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>{l.bhk}</span>
                <span style={{ background: l.type === "Sale" ? "#dcfce7" : "#fef3c7", color: l.type === "Sale" ? "#166534" : "#92400e", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>For {l.type}</span>
                <span style={{ background: "#fee2e2", color: "#b91c1c", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>{l.availability}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b", margin: "4px 0" }}>{l.title}</div>
              <div style={{ fontSize: "13px", color: "#64748b" }}>{l.address}</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#16a34a", margin: "8px 0" }}>{l.price}</div>
              <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: "6px", marginBottom: "10px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>{l.seller}</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>{l.company}</div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <a href={"tel:" + l.contact} style={{ flex: 1, textAlign: "center", padding: "8px", background: "#1e3a8a", color: "white", borderRadius: "6px", textDecoration: "none", fontWeight: 600, fontSize: "13px" }}>Call</a>
                <button onClick={() => !isBooked(l.id) && handleBook(l)} disabled={isBooked(l.id)} style={{ flex: 1, ...btn, background: isBooked(l.id) ? "#94a3b8" : "#16a34a", color: "white" }}>{isBooked(l.id) ? "Applied" : "Book"}</button>
              </div>
            </div>
          ))}
        </div>
        {bookings.filter((b) => b.customerEmail === user?.email).length > 0 && (
          <div style={{ marginTop: "24px" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px" }}>My Bookings</div>
            {bookings.filter((b) => b.customerEmail === user?.email).map((b, i) => (
              <div key={i} style={{ background: "white", padding: "12px 16px", borderRadius: "8px", marginBottom: "8px", fontSize: "13px" }}>
                <b>{b.listingTitle}</b> — {new Date(b.date).toLocaleDateString()} — <span style={{ color: "#f59e0b", fontWeight: 600 }}>{b.status}</span>
              </div>
            ))}
          </div>
        )}
        {myAssignments.length > 0 && (
          <div style={{ marginTop: "24px" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px" }}>Listings Assigned By Admin</div>
            {myAssignments.map((a) => (
              <div key={a.id} style={{ background: "#ecfeff", padding: "12px 16px", borderRadius: "8px", marginBottom: "8px", fontSize: "13px" }}>
                Listing #{a.listingId} assigned with broker <b>{a.sellerEmail}</b>{a.notes ? ` — ${a.notes}` : ""}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
