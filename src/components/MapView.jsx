import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { applyListingFilters, FILTER_OPTIONS, getFiltersInitialState, getListings } from "../lib/store";
import { useAuth } from "../context/AuthContext";
import { isFirebaseConfigured } from "../lib/firebase";
import { getListingsData } from "../lib/firestoreStore";

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

function ToggleOption({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: active ? "1px solid #dc2626" : "1px solid #e2e8f0",
        background: active ? "#fee2e2" : "white",
        color: active ? "#b91c1c" : "#334155",
        borderRadius: "8px",
        padding: "6px 10px",
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
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
        <aside
          style={{
            width: "clamp(220px, 26vw, 360px)",
            overflowY: "auto",
            borderRight: "1px solid #e2e8f0",
            background: "#f8fafc",
            padding: "14px",
            flexShrink: 0,
          }}
        >
          <h3 style={{ margin: "0 0 8px", color: "#b91c1c" }}>Filters</h3>
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>BHK Type</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {FILTER_OPTIONS.bhkTypes.map((item) => (
                <ToggleOption key={item} label={item} active={filters.bhkTypes.includes(item)} onClick={() => toggleFilter("bhkTypes", item)} />
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
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            {filteredListings.map((l) => (
              <Marker key={l.id} position={[l.lat, l.lng]} icon={makeBhkIcon(l.bhk)} eventHandlers={{ click: () => setSelected(l) }}>
                <Popup>
                  <div style={{ minWidth: "180px" }}>
                    {l.image && <img src={l.image} alt={l.title} loading="lazy" style={{ width: "100%", height: "90px", objectFit: "cover", borderRadius: "6px", marginBottom: "6px" }} />}
                    <div style={{ fontWeight: 700, fontSize: "14px" }}>{l.title}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{l.address}</div>
                    <div style={{ fontWeight: 800, color: "#16a34a", fontSize: "16px", margin: "4px 0" }}>{l.price}</div>
                    <div style={{ fontSize: "12px" }}>{l.seller} | {l.contact}</div>
                    <a href={"tel:" + l.contact} style={{ display: "block", marginTop: "6px", padding: "4px 8px", background: "#1e3a8a", color: "white", borderRadius: "4px", textAlign: "center", textDecoration: "none", fontSize: "12px", fontWeight: 600 }}>Call Now</a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
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
              onClick={() => setMapState({ center: [l.lat, l.lng], zoom: 17 })}
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
              {l.image && <img src={l.image} alt={l.title} loading="lazy" style={{ width: "100%", height: "110px", objectFit: "cover", borderRadius: "8px", marginBottom: "8px" }} />}
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
    </div>
  );
}
