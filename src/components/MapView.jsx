import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { applyListingFilters, FILTER_OPTIONS, getFiltersInitialState, getListings } from "../lib/store";
import { useAuth } from "../context/AuthContext";
import { isFirebaseConfigured } from "../lib/firebase";
import { getListingsData, addVisitRequestData } from "../lib/firestoreStore";
import PropertyModal from "./PropertyModal";

function MediaElement({ src, alt, style }) {
  if (!src) return null;
  const isVideo = src.match(/\.(mp4|webm|ogg|mov)$/i) || src.includes('video');
  if (isVideo) {
    return <video src={src} style={style} autoPlay muted loop playsInline />;
  }
  return <img src={src} alt={alt} loading="lazy" style={style} />;
}

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const bhkColors = {
  "1 RK": "#10b981",
  "1 BHK": "#2563eb",
  "2 BHK": "#f97316",
  "3 BHK": "#9333ea",
  "3+ BHK": "#0d9488",
  "Roommate needed": "#ca8a04",
};

function makeBhkIcon(bhk) {
  const c = bhkColors[bhk] || "#6b7280";
  return L.divIcon({
    className: "",
    html: '<div style="background:' + c + ';color:white;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:700;white-space:nowrap;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">' + bhk + "</div>",
    iconSize: [40, 20],
    iconAnchor: [20, 10],
  });
}

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

function ToggleOption({ label, active, onClick, activeColor = "#dc2626" }) {
  // Convert hex color to an RGBA with low opacity for the background
  const getLightBg = (hex) => {
    if (hex.startsWith("#") && hex.length === 7) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, 0.15)`;
    }
    return "#fee2e2";
  };

  return (
    <button
      onClick={onClick}
      style={{
        border: active ? `1px solid ${activeColor}` : "1px solid #e2e8f0",
        background: active ? getLightBg(activeColor) : "white",
        color: active ? activeColor : "#334155",
        borderRadius: "8px",
        padding: "6px 10px",
        fontSize: "12px",
        fontWeight: 700,
        cursor: "pointer",
        transition: "all 0.2s"
      }}
    >
      {label}
    </button>
  );
}

export default function MapView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [mapState, setMapState] = useState({ center: [12.9716, 77.5946], zoom: 12 });
  const [selected, setSelected] = useState(null);
  const [viewingProperty, setViewingProperty] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filters, setFilters] = useState(getFiltersInitialState());

  useEffect(() => {
    let alive = true;
    async function loadListings() {
      const rows = isFirebaseConfigured ? await getListingsData() : getListings();
      if (alive) setListings(rows);
    }
    loadListings().catch(() => setListings(getListings()));
    return () => { alive = false; };
  }, []);

  const filteredListings = useMemo(() => applyListingFilters(listings, filters), [listings, filters]);

  const toggleFilter = (key, value) => {
    setFilters((prev) => {
      const exists = prev[key].includes(value);
      const next = exists ? prev[key].filter((v) => v !== value) : [...prev[key], value];
      return { ...prev, [key]: next };
    });
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        .desktop-sidebar {
          width: clamp(220px, 26vw, 360px);
          overflow-y: auto;
          border-right: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 14px;
          flex-shrink: 0;
          transition: transform 0.3s ease-in-out;
        }
        .mobile-filter-btn {
          display: none;
        }
        .mobile-only-close {
          display: none;
        }
        @media (max-width: 768px) {
          .desktop-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 9999;
            width: 85vw;
            max-width: 320px;
            box-shadow: 4px 0 15px rgba(0,0,0,0.1);
            transform: translateX(-100%);
          }
          .desktop-sidebar.open {
            transform: translateX(0);
          }
          .mobile-filter-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            background: #1e293b;
            color: white;
            border: none;
            padding: 10px 24px;
            border-radius: 24px;
            font-weight: 700;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor: pointer;
          }
          .mobile-only-close {
            display: block !important;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #64748b;
          }
        }
      `}</style>
      <div style={{ background: "white", padding: "12px 20px", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => navigate("/")}
              style={{ border: "1px solid #cbd5e1", background: "white", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}
            >
              Home
            </button>
            {user?.role === "admin" && (
              <button
                onClick={() => navigate("/admin")}
                style={{ border: "1px solid #1e40af", background: "#eff6ff", color: "#1e40af", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}
              >
                Admin Controls
              </button>
            )}
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>Map Listings</div>
          </div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>{filteredListings.length} properties</div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <aside className={`desktop-sidebar ${showMobileFilters ? "open" : ""}`}>
          <h3 style={{ margin: "0 0 8px", color: "#1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Filters
            <button onClick={() => setShowMobileFilters(false)} style={{ display: "none" }} className="mobile-only-close">×</button>
          </h3>
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>BHK Type</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {FILTER_OPTIONS.bhkTypes.map((item) => (
                <ToggleOption 
                  key={item} 
                  label={item} 
                  active={filters.bhkTypes.includes(item)} 
                  onClick={() => toggleFilter("bhkTypes", item)} 
                  activeColor={bhkColors[item] || "#dc2626"}
                />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "6px" }}>Rent range: ₹ 10k to ₹ 1 Lakh</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <input type="number" value={filters.minRent} onChange={(e) => setFilters((p) => ({ ...p, minRent: Number(e.target.value || 0) }))} placeholder="Min" />
              <input type="number" value={filters.maxRent} onChange={(e) => setFilters((p) => ({ ...p, maxRent: Number(e.target.value || 0) }))} placeholder="Max" />
            </div>
          </div>

          {[
            ["availability", "Availability"],
            ["preferredTenants", "Preferred tenants"],
            ["propertyTypes", "Property type"],
            ["furnishing", "Furnishing"],
            ["parking", "Parking"],
          ].map(([key, label]) => (
            <div key={key} style={{ marginBottom: "14px" }}>
              <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>{label}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {FILTER_OPTIONS[key].map((item) => (
                  <ToggleOption key={item} label={item} active={filters[key].includes(item)} onClick={() => toggleFilter(key, item)} />
                ))}
              </div>
            </div>
          ))}
        </aside>

        <div style={{ flex: 1, minWidth: "360px", position: "relative" }}>
          <MapContainer center={mapState.center} zoom={mapState.zoom} style={{ height: "100%", width: "100%" }}>
            <ChangeView center={mapState.center} zoom={mapState.zoom} />
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap &copy; CARTO' />
            {filteredListings.map((l) => (
              <Marker key={l.id} position={[l.lat, l.lng]} icon={makeBhkIcon(l.bhk)} eventHandlers={{ click: () => setSelected(l) }}>
                <Popup>
                  <div style={{ minWidth: "180px" }}>
                    {l.image && <MediaElement src={l.image} alt={l.title} style={{ width: "100%", height: "90px", objectFit: "cover", borderRadius: "6px", marginBottom: "6px" }} />}
                    <div style={{ fontWeight: 700, fontSize: "14px" }}>{l.title}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{l.address}</div>
                    <div style={{ fontWeight: 800, color: "#16a34a", fontSize: "16px", margin: "4px 0" }}>{l.price}</div>
                    <div style={{ fontSize: "12px" }}>{l.seller} | {l.contact}</div>
                    <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                      <a href={"tel:" + l.contact} style={{ flex: 1, padding: "4px 8px", background: "#1e3a8a", color: "white", borderRadius: "4px", textAlign: "center", textDecoration: "none", fontSize: "12px", fontWeight: 600 }}>Call</a>
                      <button onClick={() => setViewingProperty(l)} style={{ flex: 1, padding: "4px 8px", background: "#b91c1c", color: "white", borderRadius: "4px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>Details</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          <button className="mobile-filter-btn" onClick={() => setShowMobileFilters(true)}>
            Filters
          </button>
        </div>

        <div
          style={{
            width: "clamp(220px, 24vw, 320px)",
            overflowY: "auto",
            background: "#f8fafc",
            borderLeft: "1px solid #e2e8f0",
            padding: "10px",
            height: "100%",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: "#1e293b" }}>Properties ({filteredListings.length})</div>
          {filteredListings.map((l) => (
            <div
              key={l.id}
              onClick={() => setViewingProperty(l)}
              onMouseEnter={() => setMapState({ center: [l.lat, l.lng], zoom: 17 })}
              style={{
                background: "white",
                borderRadius: "8px",
                padding: "10px",
                marginBottom: "8px",
                cursor: "pointer",
                border: selected?.id === l.id ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                transition: "all 0.2s",
              }}
            >
              {l.image && <MediaElement src={l.image} alt={l.title} style={{ width: "100%", height: "110px", objectFit: "cover", borderRadius: "8px", marginBottom: "8px" }} />}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ background: bhkColors[l.bhk] || "#6b7280", color: "white", padding: "1px 6px", borderRadius: "8px", fontSize: "10px", fontWeight: 700 }}>{l.bhk}</span>
                <span style={{ fontWeight: 700, color: "#16a34a", fontSize: "12px" }}>{l.price}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: "13px", color: "#1e293b" }}>{l.title}</div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>{l.address}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{l.seller} | {l.contact}</div>
            </div>
          ))}
        </div>
      </div>

      {viewingProperty && <PropertyModal property={viewingProperty} onClose={() => setViewingProperty(null)} />}
    </div>
  );
}
