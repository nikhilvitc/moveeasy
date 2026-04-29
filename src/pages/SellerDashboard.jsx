import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { isFirebaseConfigured } from "../lib/firebase";
import { getAssignmentsData, getListingsData, removeListingData, uploadListingFiles, upsertListingData } from "../lib/firestoreStore";
import { getProfileByEmail } from "../lib/profileService";

async function readUserRow(email) {
  if (!email) return null;
  if (isFirebaseConfigured) return getProfileByEmail(email);
  try {
    const users = JSON.parse(localStorage.getItem("moveasy_users") || "{}");
    return users[email] || null;
  } catch {
    return null;
  }
}
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getAssignments, getListings, upsertListing, removeListing } from "../lib/store";

function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) { setPosition([e.latlng.lat, e.latlng.lng]); },
  });
  return position ? <Marker position={position} /> : null;
}

export default function SellerDashboard() {
  const { user, logout, submitSellerBadgeApplication } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", price: "", type: "Rent", bhk: "2BHK", address: "", contact: "" });
  const [pinPosition, setPinPosition] = useState(null);
  const [myAssignments, setMyAssignments] = useState([]);
  const [sellerRow, setSellerRow] = useState(null);
  const [badgeForm, setBadgeForm] = useState({ businessName: "", phone: "", gst: "" });
  const [badgeMsg, setBadgeMsg] = useState("");
  const [photoFiles, setPhotoFiles] = useState([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      const [allListings, allAssignments, row] = isFirebaseConfigured
        ? await Promise.all([getListingsData(), getAssignmentsData(), readUserRow(user?.email)])
        : [getListings(), getAssignments(), await readUserRow(user?.email)];
      if (!alive) return;
      setListings(allListings.filter((l) => l.sellerEmail === user?.email));
      setMyAssignments(allAssignments.filter((a) => a.sellerEmail === user?.email));
      setSellerRow(row);
    }
    load().catch(() => undefined);
    return () => { alive = false; };
  }, [user]);

  const handleBadgeSubmit = async (e) => {
    e.preventDefault();
    setBadgeMsg("");
    const res = await submitSellerBadgeApplication(badgeForm);
    if (!res.success) {
      setBadgeMsg(res.error || "Could not submit");
      return;
    }
    setBadgeForm({ businessName: "", phone: "", gst: "" });
    setSellerRow(await readUserRow(user?.email));
    setBadgeMsg("Application submitted. Admin will review for a verified badge.");
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!pinPosition) { alert("Please click on the map to set property location"); return; }
    const id = String(Date.now());
    const uploadedImages = photoFiles.length ? await uploadListingFiles(photoFiles, id) : [];
    const newItem = { ...form, id, seller: user?.name || "Seller", sellerEmail: user?.email, ownerEmail: user?.email, lat: pinPosition[0], lng: pinPosition[1], experience: "N/A", totalListings: 0, areas: form.address, company: user?.name, contact: form.contact || "N/A", monthlyRent: Number(String(form.price).replace(/[^\d]/g, "")) || 0, availability: "Immediate", propertyType: "Apartment", furnishing: "Semi", preferredTenants: ["Family"], parking: ["2 Wheeler"], images: uploadedImages, image: uploadedImages[0] || "" };
    if (isFirebaseConfigured) await upsertListingData(newItem, user);
    else upsertListing(newItem);
    const all = isFirebaseConfigured ? await getListingsData() : getListings();
    setListings(all.filter((l) => l.sellerEmail === user?.email));
    setForm({ title: "", price: "", type: "Rent", bhk: "2BHK", address: "", contact: "" });
    setPinPosition(null);
    setPhotoFiles([]);
    setShowAdd(false);
  };

  const handleDelete = async (id) => {
    if (isFirebaseConfigured) await removeListingData(id);
    else removeListing(id);
    const all = isFirebaseConfigured ? await getListingsData() : getListings();
    setListings(all.filter((l) => l.sellerEmail === user?.email));
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
        <div style={{ background: "white", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "6px" }}>Seller trust badge (optional)</div>
          <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 10px", lineHeight: 1.45 }}>
            You can use MovEasy immediately after sign-up. For a <strong>verified seller</strong> badge (closer to how large marketplaces gate trusted sellers), submit business details; an admin reviews this separately from your login.
          </p>
          {sellerRow?.sellerBadgeStatus === "verified" && (
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#15803d" }}>Status: Verified seller</div>
          )}
          {sellerRow?.sellerBadgeStatus === "pending" && (
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#b45309" }}>Status: Badge application under review</div>
          )}
          {sellerRow?.sellerBadgeStatus === "rejected" && (
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#b91c1c" }}>Status: Badge application not approved</div>
          )}
          {(!sellerRow?.sellerBadgeStatus || sellerRow.sellerBadgeStatus === "none" || sellerRow.sellerBadgeStatus === "rejected") && (
            <form onSubmit={handleBadgeSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
              <input required placeholder="Business / broker name" value={badgeForm.businessName} onChange={(e) => setBadgeForm((p) => ({ ...p, businessName: e.target.value }))} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <input required placeholder="Phone (WhatsApp preferred)" value={badgeForm.phone} onChange={(e) => setBadgeForm((p) => ({ ...p, phone: e.target.value }))} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              <input placeholder="GSTIN (optional)" value={badgeForm.gst} onChange={(e) => setBadgeForm((p) => ({ ...p, gst: e.target.value }))} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px", gridColumn: "span 2" }} />
              <button type="submit" style={{ ...btn, background: "#0f766e", color: "white", gridColumn: "span 2" }}>Submit for verified badge</button>
            </form>
          )}
          {badgeMsg && <div style={{ marginTop: "8px", fontSize: "12px", color: "#0f766e", fontWeight: 600 }}>{badgeMsg}</div>}
        </div>
        {myAssignments.length > 0 && (
          <div style={{ background: "#ecfeff", border: "1px solid #a5f3fc", borderRadius: "12px", padding: "12px", marginBottom: "16px" }}>
            <div style={{ fontWeight: 700, marginBottom: "6px" }}>Assigned Leads ({myAssignments.length})</div>
            {myAssignments.map((a) => (
              <div key={a.id} style={{ fontSize: "12px", marginBottom: "4px" }}>
                Customer: {a.customerEmail} | Listing #{a.listingId}
              </div>
            ))}
          </div>
        )}
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
              <input type="file" accept="image/*" multiple onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
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
              {l.image && <img src={l.image} alt={l.title} loading="lazy" style={{ width: "100%", height: "150px", objectFit: "cover", borderRadius: "8px", marginBottom: "10px" }} />}
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
