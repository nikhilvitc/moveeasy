import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { getListings } from "../lib/store";
import PropertyModal from "../components/PropertyModal";
import { isFirebaseConfigured } from "../lib/firebase";
import { getListingsData, isListingPubliclyVisible } from "../lib/firestoreStore";

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

export default function HomeV2() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [viewingProperty, setViewingProperty] = useState(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const data = isFirebaseConfigured ? await getListingsData({ limitCount: 12 }) : getListings().slice(0, 12);
        if (alive) setListings(data.filter(isListingPubliclyVisible));
      } catch {
        if (alive) setListings(getListings().slice(0, 12).filter(isListingPubliclyVisible));
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const goMap = () => navigate("/map?openFilters=1");

  return (
    <div style={{ minHeight: "100vh", background: palette.canvas, color: palette.ink }}>
      <Navbar />

      <main style={{ maxWidth: "1240px", margin: "0 auto", padding: "32px 20px 64px" }}>
        <section style={{ marginBottom: "32px" }}>
          <h1 style={{ margin: "0 0 16px", fontSize: "28px", lineHeight: 1.25, fontWeight: 700 }}>Find your next home in Bengaluru</h1>
          <div
            style={{
              border: `1px solid ${palette.hairline}`,
              borderRadius: "9999px",
              height: "64px",
              display: "flex",
              alignItems: "center",
              padding: "8px",
              boxShadow: "rgba(0,0,0,0.04) 0 2px 6px",
            }}
          >
            <button
              type="button"
              onClick={goMap}
              style={{
                flex: 1,
                padding: "0 16px",
                borderRight: `1px solid ${palette.hairline}`,
                textAlign: "left",
                border: "none",
                background: "none",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: 700 }}>Where</div>
              <div style={{ fontSize: "14px", color: palette.muted }}>Indiranagar, HSR, Whitefield…</div>
            </button>
            <button
              type="button"
              onClick={goMap}
              style={{
                flex: 1,
                padding: "0 16px",
                borderRight: `1px solid ${palette.hairline}`,
                textAlign: "left",
                border: "none",
                background: "none",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: 700 }}>When</div>
              <div style={{ fontSize: "14px", color: palette.muted }}>Add move-in date</div>
            </button>
            <button type="button" onClick={goMap} style={{ flex: 1, padding: "0 16px", textAlign: "left", border: "none", background: "none", cursor: "pointer" }}>
              <div style={{ fontSize: "12px", fontWeight: 700 }}>Who</div>
              <div style={{ fontSize: "14px", color: palette.muted }}>Family, bachelor, company</div>
            </button>
            <button
              type="button"
              onClick={goMap}
              aria-label="Search on map"
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
              onMouseDown={(e) => {
                e.currentTarget.style.background = palette.primaryActive;
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.background = palette.primary;
              }}
            >
              ⌕
            </button>
          </div>
        </section>

        <section style={{ marginBottom: "32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          {["Apartments", "Independent houses", "Family friendly", "Immediate move-in"].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={goMap}
              style={{
                borderRadius: "20px",
                background: palette.surfaceSoft,
                padding: "14px 18px",
                fontSize: "14px",
                fontWeight: 500,
                border: `1px solid ${palette.hairline}`,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {chip}
            </button>
          ))}
        </section>

        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 500 }}>Homes we think you&apos;ll love</h2>
            <button type="button" onClick={() => navigate("/map")} style={{ border: "none", background: "none", color: palette.ink, textDecoration: "underline", fontSize: "14px", cursor: "pointer" }}>
              View all on map
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
            {listings.map((listing) => {
              const image = listing.image || listing.images?.[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=1000";
              const isVideo = image.match(/\.(mp4|webm|ogg|mov)$/i) || image.includes("video");
              return (
                <article
                  key={listing.id}
                  onClick={() => setViewingProperty(listing)}
                  style={{ background: "#fff", borderRadius: "14px", cursor: "pointer", transition: "transform 0.2s", border: `1px solid ${palette.hairline}` }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
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
                  <div style={{ padding: "10px 12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                      <div style={{ fontSize: "15px", fontWeight: 600, color: palette.ink }}>{listing.title}</div>
                      <div style={{ fontSize: "14px", color: palette.ink }}>★ 4.8</div>
                    </div>
                    <div style={{ fontSize: "14px", color: palette.muted, marginTop: "2px" }}>{listing.address || listing.location || "Bengaluru"}</div>
                    <div style={{ fontSize: "14px", color: palette.muted, marginTop: "2px" }}>
                      {listing.availability || "Immediate"} · {listing.bhk}
                    </div>
                    <div style={{ marginTop: "6px", fontSize: "15px", color: palette.body }}>
                      <strong>{listing.price || `₹ ${listing.monthlyRent}`}</strong> / month
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <Footer />

      {viewingProperty ? (
        <PropertyModal property={viewingProperty} listings={listings} onSelectListing={(l) => setViewingProperty(l)} onClose={() => setViewingProperty(null)} />
      ) : null}
    </div>
  );
}
