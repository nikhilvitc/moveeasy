import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { addVisitRequestData } from "../lib/firestoreStore";
import { isFirebaseConfigured } from "../lib/firebase";
import { triggerVisitNotificationEmail } from "../lib/emailService";

function MediaElement({ src, alt, style }) {
  if (!src) return null;
  const isVideo = src.match(/\.(mp4|webm|ogg|mov)$/i) || src.includes('video');
  if (isVideo) {
    return <video src={src} style={style} controls playsInline preload="metadata" />;
  }
  return <img src={src} alt={alt} loading="lazy" style={style} />;
}

export default function PropertyModal({ property, onClose }) {
  const { user } = useAuth();
  const [visitForm, setVisitForm] = useState({ phone: "", time: "", notes: "" });
  const [visitSuccess, setVisitSuccess] = useState("");
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 768 : false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!property) return null;

  const images = property.images && property.images.length > 0 ? property.images : [property.image].filter(Boolean);
  if (images.length === 0) images.push("https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=1000");
  const numericRent = Number(String(property.monthlyRent || property.rent || "0").replace(/[^0-9.]/g, "")) || 0;
  const parseMoney = (raw) => {
    const n = Number(String(raw ?? "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const depositFromField = parseMoney(property.securityDeposit);
  const maintenanceFromField = parseMoney(property.maintenanceCost);
  const securityDeposit = depositFromField ?? (numericRent > 0 ? Math.round(numericRent * 2.5) : 0);
  const maintenance = maintenanceFromField ?? (numericRent > 0 ? Math.round(numericRent * 0.08) : 0);
  const moveInCharges = maintenance + 1999;
  const formatInr = (n) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;
  const depositSidebar =
    depositFromField != null
      ? formatInr(depositFromField)
      : String(property.securityDeposit || "").trim()
        ? String(property.securityDeposit)
        : formatInr(securityDeposit);
  const maintenanceSidebar =
    maintenanceFromField != null
      ? formatInr(maintenanceFromField)
      : String(property.maintenanceCost || "").trim()
        ? String(property.maintenanceCost)
        : formatInr(maintenance);
  const dash = (v) => {
    if (v == null || v === "") return "—";
    if (Array.isArray(v) && v.length === 0) return "—";
    return String(v);
  };
  const amenities = property.amenities && property.amenities.length ? property.amenities : [];
  const furnishings = property.furnishings && property.furnishings.length ? property.furnishings : [];
  const builtUpLabel = property.builtUpArea
    ? `${property.builtUpArea}${property.areaUnit ? ` ${property.areaUnit}` : ""}`
    : "—";
  const floorLabel =
    property.floorNumber || property.totalFloors
      ? `${dash(property.floorNumber)} of ${dash(property.totalFloors)} floors`
      : "—";
  const detailRows = [
    ["Security deposit", property.securityDeposit ? dash(property.securityDeposit) : formatInr(securityDeposit)],
    ["Area unit", dash(property.areaUnit) !== "—" ? property.areaUnit : "sq ft"],
    ["Brokerage", dash(property.brokerage)],
    ["Maintenance", property.maintenanceCost ? dash(property.maintenanceCost) : formatInr(maintenance)],
    ["Built-up area", builtUpLabel],
    ["Furnishing (type)", dash(property.furnishing)],
    ["Bathrooms", dash(property.bathrooms)],
    ["Balcony", dash(property.balcony)],
    ["Available from", dash(property.availableFrom || property.availability)],
    ["Floor / total floors", floorLabel],
    ["Lease type", dash(property.leaseType)],
    ["Age of property", dash(property.ageOfProperty)],
    ["Parking", dash(property.parkingInfo) !== "—" ? property.parkingInfo : property.parking?.join(", ") || "—"],
    ["Gas pipeline", dash(property.gasPipeline)],
    ["Gated community", dash(property.gatedCommunity)],
    ["Source URL", property.sourceUrl ? property.sourceUrl : "—"],
  ];

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
      triggerVisitNotificationEmail({
        customerEmail: user.email,
        customerPhone: visitForm.phone,
        sellerEmail: property.sellerEmail || property.ownerEmail || "",
        visitTime: visitForm.time,
        notes: visitForm.notes,
        listingId: property.id
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

  const [isSaved, setIsSaved] = useState(false);
  const [shareText, setShareText] = useState("↗ Share");
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareText("✓ Copied!");
    setTimeout(() => setShareText("↗ Share"), 2000);
  };

  const scrollRef = useRef(null);

  useEffect(() => {
    setActiveMediaIndex(0);
  }, [property?.id]);

  const activeMedia = images[activeMediaIndex] || images[0];
  const isActiveVideo = String(activeMedia || "").match(/\.(mp4|webm|ogg|mov)$/i) || String(activeMedia || "").includes("video");
  const goPrevMedia = () => setActiveMediaIndex((prev) => (prev - 1 + images.length) % images.length);
  const goNextMedia = () => setActiveMediaIndex((prev) => (prev + 1) % images.length);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: el.offsetTop - 50, // slightly offset for header
        behavior: "smooth"
      });
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, zIndex: 99999, background: "rgba(15, 23, 42, 0.95)",
          display: "flex", justifyContent: "center", alignItems: "center", padding: isMobile ? "8px" : "20px"
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          style={{
            background: "linear-gradient(180deg, #fffdfd 0%, #fff8f8 100%)", width: "100%", maxWidth: "1100px", height: isMobile ? "95vh" : "90vh",
            borderRadius: isMobile ? "14px" : "16px", overflow: "hidden", display: "flex", flexDirection: "column",
            position: "relative", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              zIndex: 20,
              width: "36px",
              height: "36px",
              borderRadius: "999px",
              border: "1px solid #e2e8f0",
              background: "rgba(255,255,255,0.95)",
              color: "#0f172a",
              fontWeight: 800,
              fontSize: "18px",
              lineHeight: 1,
              cursor: "pointer",
            }}
            aria-label="Close property modal"
          >
            ×
          </button>

          {/* Header */}
          <div style={{ padding: isMobile ? "12px 14px" : "16px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff9f7", zIndex: 10, paddingRight: isMobile ? "52px" : "24px" }}>
            <div style={{ display: "flex", gap: isMobile ? "10px" : "16px", alignItems: "center" }}>
              <div style={{ fontSize: isMobile ? "16px" : "20px", fontWeight: 800, color: "#e11d48" }}>MovEasy</div>
              <div style={{ display: "flex", gap: isMobile ? "10px" : "16px", color: "#475569", fontWeight: 600, fontSize: isMobile ? "12px" : "14px" }}>
                <span onClick={() => scrollTo("overview")} style={{ cursor: "pointer" }}>Overview</span>
                <span onClick={() => scrollTo("facts")} style={{ cursor: "pointer" }}>Facts & Features</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setIsSaved(!isSaved)} style={{ background: "none", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 12px", fontWeight: 600, fontSize: "13px", cursor: "pointer", color: isSaved ? "#e11d48" : "#334155" }}>
                {isMobile ? (isSaved ? "♥" : "♡") : (isSaved ? "♥ Saved" : "♡ Save")}
              </button>
              <button onClick={handleShare} style={{ background: "none", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "6px 12px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                {isMobile ? "↗" : shareText}
              </button>
            </div>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", position: "relative" }}>
            {/* Gallery */}
            <div style={{ height: isMobile ? "300px" : "420px", padding: "10px 10px 6px", background: "#f8fafc" }}>
              <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#0f172a", borderRadius: "14px" }}>
                <MediaElement src={activeMedia} alt={property.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {isActiveVideo && (
                  <div style={{ position: "absolute", top: "10px", left: "10px", background: "rgba(15,23,42,0.7)", color: "white", fontSize: "11px", fontWeight: 700, borderRadius: "999px", padding: "5px 9px" }}>
                    VIDEO
                  </div>
                )}
                {images.length > 1 && (
                  <div
                    style={{ position: "absolute", inset: 0 }}
                    onTouchStart={(e) => setTouchStartX(e.changedTouches?.[0]?.clientX ?? null)}
                    onTouchEnd={(e) => {
                      if (touchStartX == null) return;
                      const endX = e.changedTouches?.[0]?.clientX ?? touchStartX;
                      const delta = endX - touchStartX;
                      if (Math.abs(delta) >= 40) {
                        if (delta < 0) goNextMedia();
                        else goPrevMedia();
                      }
                      setTouchStartX(null);
                    }}
                  />
                )}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={goPrevMedia}
                      style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "34px", height: "34px", borderRadius: "999px", border: "1px solid #e2e8f0", background: "rgba(255,255,255,0.92)", color: "#0f172a", fontWeight: 700 }}
                      aria-label="Previous media"
                    >
                      {"<"}
                    </button>
                    <button
                      type="button"
                      onClick={goNextMedia}
                      style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", width: "34px", height: "34px", borderRadius: "999px", border: "1px solid #e2e8f0", background: "rgba(255,255,255,0.92)", color: "#0f172a", fontWeight: 700 }}
                      aria-label="Next media"
                    >
                      {">"}
                    </button>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveMediaIndex(idx)}
                      style={{
                        width: idx === activeMediaIndex ? "22px" : "8px",
                        height: "8px",
                        borderRadius: "999px",
                        border: "none",
                        background: idx === activeMediaIndex ? "#334155" : "#cbd5e1",
                        transition: "all 0.2s ease",
                      }}
                      aria-label={`Go to media ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
              {images.length > 1 && (
                <div style={{ marginTop: "10px", display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "2px" }}>
                  {images.map((src, idx) => {
                    const isVideoThumb = String(src || "").match(/\.(mp4|webm|ogg|mov)$/i) || String(src || "").includes("video");
                    return (
                      <button
                        key={`${src}-${idx}`}
                        type="button"
                        onClick={() => setActiveMediaIndex(idx)}
                        style={{
                          border: idx === activeMediaIndex ? "2px solid #334155" : "1px solid #cbd5e1",
                          borderRadius: "10px",
                          padding: 0,
                          background: "white",
                          minWidth: "72px",
                          width: "72px",
                          height: "52px",
                          overflow: "hidden",
                          position: "relative",
                        }}
                        aria-label={`Select media ${idx + 1}`}
                      >
                        {isVideoThumb ? (
                          <video src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                        ) : (
                          <img src={src} alt={`Media thumbnail ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}
                        {isVideoThumb && (
                          <span style={{ position: "absolute", right: "4px", bottom: "4px", fontSize: "9px", color: "white", background: "rgba(0,0,0,0.7)", borderRadius: "999px", padding: "2px 5px", fontWeight: 700 }}>
                            VIDEO
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Content Area */}
            <div style={{ display: "flex", flexWrap: "wrap", padding: isMobile ? "14px" : "32px", gap: isMobile ? "18px" : "40px", maxWidth: "1000px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
              
              {/* Left Column (Details) */}
              <div id="overview" style={{ flex: "1 1 500px", minWidth: 0 }}>
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

                <div id="facts" style={{ marginBottom: "32px" }}>
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
                    <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "8px" }}>
                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Coordinates</div>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{property.lat && property.lng ? `${property.lat}, ${property.lng}` : "Not available"}</div>
                    </div>
                    <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "8px" }}>
                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Move-in</div>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{property.availableFrom || property.availability || "Immediate"}</div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "32px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", fontSize: "18px", fontWeight: 700, color: "#0f172a", borderBottom: "1px solid #e2e8f0" }}>
                    Listing specifications <span style={{ fontSize: "13px", fontWeight: 500, color: "#64748b" }}>(from listing / broker)</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px", padding: "0 16px" }}>
                    {detailRows.map(([label, value], idx) => (
                      <div key={label} style={{ padding: "12px 0", borderBottom: idx < detailRows.length - 1 ? "1px solid #e2e8f0" : "none" }}>
                        <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "4px" }}>{label}</div>
                        <div style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a", wordBreak: "break-word" }}>
                          {label === "Source URL" && value !== "—" ? (
                            <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>
                              {value}
                            </a>
                          ) : (
                            value
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: "32px" }}>
                  <h2 style={{ margin: "0 0 12px", fontSize: "18px", color: "#0f172a" }}>Furnishings</h2>
                  {furnishings.length ? (
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0,1fr))", gap: "10px" }}>
                      {furnishings.map((item) => (
                        <div key={item} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 12px", fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                          {item}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>—</p>
                  )}
                </div>

                <div style={{ marginBottom: "32px" }}>
                  <h2 style={{ margin: "0 0 12px", fontSize: "18px", color: "#0f172a" }}>Amenities</h2>
                  {amenities.length ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                      {amenities.map((item) => (
                        <span key={item} style={{ background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", padding: "7px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600 }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>—</p>
                  )}
                </div>
              </div>

              {/* Right Column (Sticky Action Card) */}
              <div style={{ flex: "1 1 320px", position: "relative" }}>
                <div style={{ position: "sticky", top: "32px", background: "white", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: "32px", fontWeight: 800, color: "#16a34a", marginBottom: "4px" }}>
                    {property.price || `₹ ${property.monthlyRent || 0}`}
                  </div>
                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px" }}>Rent per month</div>
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", marginBottom: "6px" }}>
                      <span>Security deposit</span><strong style={{ color: "#0f172a" }}>{depositSidebar}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", marginBottom: "6px" }}>
                      <span>Maintenance (est.)</span><strong style={{ color: "#0f172a" }}>{maintenanceSidebar}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569" }}>
                      <span>Move-in charges</span><strong style={{ color: "#0f172a" }}>{formatInr(moveInCharges)}</strong>
                    </div>
                  </div>

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
                      <a href={`https://wa.me/${String(property.contact || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", width: "100%", padding: "14px", background: "#ecfdf3", color: "#166534", border: "1px solid #86efac", borderRadius: "8px", fontSize: "15px", fontWeight: 700, cursor: "pointer", textDecoration: "none", boxSizing: "border-box" }}>
                        WhatsApp Seller
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
