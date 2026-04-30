import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { addVisitRequestData } from "../lib/firestoreStore";
import { isFirebaseConfigured } from "../lib/firebase";

function MediaElement({ src, alt, style }) {
  if (!src) return null;
  const isVideo = src.match(/\.(mp4|webm|ogg|mov)$/i) || src.includes('video');
  if (isVideo) {
    return <video src={src} style={style} autoPlay muted loop playsInline />;
  }
  return <img src={src} alt={alt} loading="lazy" style={style} />;
}

export default function PropertyModal({ property, onClose }) {
  const { user } = useAuth();
  const [visitForm, setVisitForm] = useState({ phone: "", time: "", notes: "" });
  const [visitSuccess, setVisitSuccess] = useState("");
  const [showVisitForm, setShowVisitForm] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, []);

  if (!property) return null;

  const images = property.images && property.images.length > 0 ? property.images : [property.image].filter(Boolean);
  if (images.length === 0) images.push("https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=1000");

  const submitVisit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Please log in to schedule a visit.");
      return;
    }
    if (isFirebaseConfigured) {
      await addVisitRequestData({
        listingId: property.id,
        customerEmail: user.email,
        customerPhone: visitForm.phone,
        sellerEmail: property.sellerEmail || property.ownerEmail || "",
        visitTime: visitForm.time,
        notes: visitForm.notes
      });
    }
    setVisitSuccess("Visit scheduled successfully! The seller has been notified.");
    setTimeout(() => {
      setVisitSuccess("");
      setShowVisitForm(false);
    }, 2500);
  };

  const badgeStyles = {
    padding: "6px 12px",
    background: "#f1f5f9",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#334155",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.6)",
          display: "flex", justifyContent: "center", alignItems: "center", padding: "20px"
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          style={{
            background: "white", width: "100%", maxWidth: "1100px", height: "90vh",
            borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column",
            position: "relative", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", zIndex: 10 }}>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#e11d48" }}>MovEasy</div>
              <div style={{ display: "flex", gap: "16px", color: "#475569", fontWeight: 600, fontSize: "14px" }}>
                <span style={{ color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: "16px", marginBottom: "-17px" }}>Overview</span>
                <span style={{ cursor: "pointer" }}>Facts & Features</span>
                <span style={{ cursor: "pointer" }}>Neighborhood</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button style={{ background: "none", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 12px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>♡ Save</button>
              <button style={{ background: "none", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 12px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>↗ Share</button>
              <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: "8px", padding: "6px 12px", fontWeight: 700, fontSize: "14px", cursor: "pointer", color: "#475569" }}>Close ×</button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {/* Gallery */}
            <div style={{ display: "grid", gridTemplateColumns: images.length > 1 ? "2fr 1fr" : "1fr", gap: "4px", height: "400px", padding: "4px", background: "#f8fafc" }}>
              <div style={{ width: "100%", height: "100%", overflow: "hidden", background: "black" }}>
                <MediaElement src={images[0]} alt={property.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
              {images.length > 1 && (
                <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: "4px" }}>
                  <div style={{ overflow: "hidden", background: "black" }}>
                    <MediaElement src={images[1]} alt="Gallery 1" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  {images[2] ? (
                    <div style={{ overflow: "hidden", background: "black" }}>
                      <MediaElement src={images[2]} alt="Gallery 2" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ) : (
                    <div style={{ background: "#e2e8f0", width: "100%", height: "100%" }} />
                  )}
                </div>
              )}
            </div>

            {/* Content Area */}
            <div style={{ display: "flex", flexWrap: "wrap", padding: "32px", gap: "40px", maxWidth: "1000px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
              
              {/* Left Column (Details) */}
              <div style={{ flex: "1 1 500px", minWidth: 0 }}>
                {property.badge && (
                  <div style={{ background: "#fef2f2", color: "#e11d48", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 700, display: "inline-block", marginBottom: "12px" }}>
                    {property.badge.toUpperCase()}
                  </div>
                )}
                <h1 style={{ fontSize: "28px", margin: "0 0 8px", fontWeight: 800, color: "#0f172a" }}>{property.title}</h1>
                <p style={{ fontSize: "16px", color: "#64748b", margin: "0 0 16px" }}>{property.address || property.areas || "Location not provided"}</p>
                
                <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
                  <div style={badgeStyles}>🏢 {property.propertyType || property.type || "Apartment"}</div>
                  <div style={badgeStyles}>🛏️ {property.bhk || "2 BHK"}</div>
                  <div style={badgeStyles}>🛋️ {property.furnishing || "Semi"}</div>
                  <div style={badgeStyles}>🚗 {property.parking && property.parking.length > 0 ? property.parking.join(", ") : "Available"}</div>
                  <div style={badgeStyles}>👨‍👩‍👧‍👦 {property.preferredTenants && property.preferredTenants.length > 0 ? property.preferredTenants.join(", ") : "Anyone"}</div>
                </div>

                <div style={{ background: "#f8fafc", padding: "24px", borderRadius: "12px", marginBottom: "32px", border: "1px solid #e2e8f0" }}>
                  <h2 style={{ margin: "0 0 12px", fontSize: "18px", color: "#0f172a" }}>What's special</h2>
                  <p style={{ margin: 0, fontSize: "15px", color: "#475569", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                    {property.description || "Stunning property located in a prime neighborhood. Contact the seller to learn more about the unprecedented amenities and layout. Perfect for those looking for comfort and convenience in one place."}
                  </p>
                </div>

                <div style={{ marginBottom: "32px" }}>
                  <h2 style={{ margin: "0 0 16px", fontSize: "18px", color: "#0f172a" }}>Facts, features & policies</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "8px" }}>
                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Availability</div>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{property.availability || "Immediate"}</div>
                    </div>
                    <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "8px" }}>
                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Listed By</div>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{property.seller || property.company || "Owner"}</div>
                    </div>
                    <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "8px" }}>
                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Contact</div>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{property.contact || "N/A"}</div>
                    </div>
                    <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "8px" }}>
                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Source</div>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{property.source || "Direct"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (Sticky Action Card) */}
              <div style={{ flex: "1 1 320px", position: "relative" }}>
                <div style={{ position: "sticky", top: "32px", background: "white", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: "32px", fontWeight: 800, color: "#16a34a", marginBottom: "4px" }}>
                    {property.price || `₹ ${property.monthlyRent || 0}`}
                  </div>
                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px" }}>Rent per month</div>

                  {showVisitForm ? (
                    <form onSubmit={submitVisit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <h3 style={{ margin: "0 0 8px", fontSize: "16px" }}>Schedule a Visit</h3>
                      {visitSuccess ? (
                        <div style={{ background: "#dcfce7", color: "#166534", padding: "12px", borderRadius: "8px", fontWeight: 600, textAlign: "center", fontSize: "13px" }}>
                          {visitSuccess}
                        </div>
                      ) : (
                        <>
                          <input type="tel" required placeholder="Phone Number" value={visitForm.phone} onChange={(e) => setVisitForm({ ...visitForm, phone: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", boxSizing: "border-box", fontSize: "14px" }} />
                          <input type="text" required placeholder="Date & Time (e.g. Tomorrow 5PM)" value={visitForm.time} onChange={(e) => setVisitForm({ ...visitForm, time: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", boxSizing: "border-box", fontSize: "14px" }} />
                          <textarea rows={2} placeholder="Any questions?" value={visitForm.notes} onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", boxSizing: "border-box", fontSize: "14px" }} />
                          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                            <button type="button" onClick={() => setShowVisitForm(false)} style={{ flex: 1, padding: "12px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                            <button type="submit" style={{ flex: 2, padding: "12px", background: "#e11d48", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}>Confirm</button>
                          </div>
                        </>
                      )}
                    </form>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <button onClick={() => setShowVisitForm(true)} style={{ width: "100%", padding: "14px", background: "#e11d48", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                        Request a tour
                      </button>
                      <button onClick={() => setShowVisitForm(true)} style={{ width: "100%", padding: "14px", background: "white", color: "#e11d48", border: "1px solid #e11d48", borderRadius: "8px", fontSize: "15px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                        Check availability
                      </button>
                      <a href={`tel:${property.contact}`} style={{ display: "block", textAlign: "center", width: "100%", padding: "14px", background: "#f8fafc", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "15px", fontWeight: 700, cursor: "pointer", textDecoration: "none", boxSizing: "border-box" }}>
                        Call Seller: {property.contact}
                      </a>
                    </div>
                  )}

                  <div style={{ marginTop: "20px", display: "flex", gap: "12px", alignItems: "flex-start", background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "20px" }}>💡</div>
                    <div style={{ fontSize: "12px", color: "#475569", lineHeight: "1.5" }}>
                      <strong>MovEasy Guarantee Plan Available.</strong> Avoid unfair deductions and secure your deposit with our legal support.
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
