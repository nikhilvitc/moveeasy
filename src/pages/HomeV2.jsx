import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getListings } from "../lib/store";
import PropertyModal from "../components/PropertyModal";

const palette = {
  primary: "#ff385c",
  primaryActive: "#e00b41",
  ink: "#222222",
  body: "#3f3f3f",
  muted: "#6a6a6a",
  hairline: "#dddddd",
  surfaceSoft: "#f7f7f7",
  canvas: "#ffffff",
};

const navTabs = [
  { id: "homes", label: "Homes" },
  { id: "experiences", label: "Experiences", isNew: true },
  { id: "services", label: "Services", isNew: true },
];

export default function HomeV2() {
  const navigate = useNavigate();
  const listings = useMemo(() => getListings().slice(0, 8), []);
  const [viewingProperty, setViewingProperty] = useState(null);

  return (
    <div style={{ minHeight: "100vh", background: palette.canvas, color: palette.ink }}>
      <header style={{ borderBottom: `1px solid ${palette.hairline}`, position: "sticky", top: 0, zIndex: 30, background: palette.canvas }}>
        <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{ border: "none", background: "none", color: "#ff385c", fontWeight: 700, fontSize: "34px", lineHeight: 1, cursor: "pointer" }}
          >
            moveasy
          </button>
          <nav style={{ display: "flex", alignItems: "center", gap: "22px", flexWrap: "wrap", justifyContent: "center" }}>
            {navTabs.map((tab) => (
              <div key={tab.id} style={{ display: "flex", alignItems: "center", gap: "6px", color: palette.ink, fontSize: "16px", fontWeight: 600 }}>
                <span>{tab.label}</span>
                {tab.isNew && (
                  <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.32px", borderRadius: "9999px", padding: "2px 6px", border: `1px solid ${palette.hairline}` }}>
                    NEW
                  </span>
                )}
              </div>
            ))}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button type="button" onClick={() => navigate("/map")} style={{ border: `1px solid ${palette.hairline}`, borderRadius: "9999px", padding: "10px 14px", background: palette.canvas, fontWeight: 500 }}>
              Explore map
            </button>
            <button type="button" onClick={() => navigate("/login")} style={{ border: `1px solid ${palette.hairline}`, borderRadius: "9999px", padding: "10px 14px", background: palette.canvas, fontWeight: 500 }}>
              Login
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "1240px", margin: "0 auto", padding: "32px 20px 64px" }}>
        <section style={{ marginBottom: "32px" }}>
          <h1 style={{ margin: "0 0 16px", fontSize: "28px", lineHeight: 1.25, fontWeight: 700 }}>Find your next home in Bengaluru</h1>
          <div style={{ border: `1px solid ${palette.hairline}`, borderRadius: "9999px", height: "64px", display: "flex", alignItems: "center", padding: "8px", boxShadow: "rgba(0,0,0,0.04) 0 2px 6px" }}>
            <div style={{ flex: 1, padding: "0 16px", borderRight: `1px solid ${palette.hairline}` }}>
              <div style={{ fontSize: "12px", fontWeight: 700 }}>Where</div>
              <div style={{ fontSize: "14px", color: palette.muted }}>Indiranagar, HSR, Whitefield...</div>
            </div>
            <div style={{ flex: 1, padding: "0 16px", borderRight: `1px solid ${palette.hairline}` }}>
              <div style={{ fontSize: "12px", fontWeight: 700 }}>When</div>
              <div style={{ fontSize: "14px", color: palette.muted }}>Add move-in date</div>
            </div>
            <div style={{ flex: 1, padding: "0 16px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700 }}>Who</div>
              <div style={{ fontSize: "14px", color: palette.muted }}>Family, bachelor, company</div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/map")}
              style={{
                height: "48px",
                width: "48px",
                borderRadius: "9999px",
                border: "none",
                background: palette.primary,
                color: "#fff",
                fontSize: "20px",
                cursor: "pointer",
              }}
              onMouseDown={(e) => { e.currentTarget.style.background = palette.primaryActive; }}
              onMouseUp={(e) => { e.currentTarget.style.background = palette.primary; }}
            >
              ⌕
            </button>
          </div>
        </section>

        <section style={{ marginBottom: "32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          {["Apartments", "Independent houses", "Family friendly", "Immediate move-in"].map((chip) => (
            <div key={chip} style={{ borderRadius: "20px", background: palette.surfaceSoft, padding: "14px 18px", fontSize: "14px", fontWeight: 500 }}>
              {chip}
            </div>
          ))}
        </section>

        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 500 }}>Homes we think you'll love</h2>
            <button type="button" onClick={() => navigate("/map")} style={{ border: "none", background: "none", color: palette.ink, textDecoration: "underline", fontSize: "14px" }}>
              View all on map
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
            {listings.map((listing) => {
              const image = listing.image || listing.images?.[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=1000";
              const isVideo = image.match(/\.(mp4|webm|ogg|mov)$/i) || image.includes('video');
              return (
                <article key={listing.id} onClick={() => setViewingProperty(listing)} style={{ background: "#fff", borderRadius: "14px", cursor: "pointer", transition: "transform 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"} onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>
                  <div style={{ position: "relative" }}>
                    {isVideo ? (
                      <video src={image} style={{ width: "100%", height: "220px", objectFit: "cover", borderRadius: "14px" }} autoPlay muted loop playsInline />
                    ) : (
                      <img src={image} alt={listing.title} style={{ width: "100%", height: "220px", objectFit: "cover", borderRadius: "14px" }} />
                    )}
                    <span style={{ position: "absolute", top: "10px", left: "10px", background: "#fff", borderRadius: "9999px", padding: "4px 10px", fontSize: "11px", fontWeight: 600 }}>
                      Guest favorite
                    </span>
                  </div>
                  <div style={{ padding: "10px 2px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                      <div style={{ fontSize: "15px", fontWeight: 600, color: palette.ink }}>{listing.title}</div>
                      <div style={{ fontSize: "14px", color: palette.ink }}>★ 4.8</div>
                    </div>
                    <div style={{ fontSize: "14px", color: palette.muted, marginTop: "2px" }}>{listing.address || listing.location || "Bengaluru"}</div>
                    <div style={{ fontSize: "14px", color: palette.muted, marginTop: "2px" }}>{listing.availability || "Immediate"} · {listing.bhk}</div>
                    <div style={{ marginTop: "6px", fontSize: "15px", color: palette.body }}>
                      <strong>{listing.price || `₹ ${listing.monthlyRent}`}</strong> month
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
      {viewingProperty && <PropertyModal property={viewingProperty} onClose={() => setViewingProperty(null)} />}
    </div>
  );
}
