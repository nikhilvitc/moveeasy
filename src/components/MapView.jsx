import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import initialListings from "../data/listingsData";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const bhkColors = { "1RK": "#8b5cf6", "1BHK": "#3b82f6", "2BHK": "#22c55e", "3BHK": "#f59e0b", "3+BHK": "#ef4444", "4BHK": "#ec4899", "Office": "#6366f1", "Plot": "#14b8a6" };

function makeBhkIcon(bhk) {
  const c = bhkColors[bhk] || "#6b7280";
  return L.divIcon({
    className: "",
    html: '<div style="background:' + c + ';color:white;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:700;white-space:nowrap;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">' + bhk + "</div>",
    iconSize: [40, 20],
    iconAnchor: [20, 10],
  });
}

const areas = {
  "Koramangala": [12.9352, 77.6245],
  "HSR Layout": [12.9116, 77.6389],
  "Indiranagar": [12.9784, 77.6408],
  "Jayanagar": [12.9250, 77.5838],
  "JP Nagar": [12.9060, 77.5856],
  "Whitefield": [12.9698, 77.7500],
  "BTM Layout": [12.9166, 77.6101],
  "Electronic City": [12.8399, 77.6770],
  "Marathahalli": [12.9591, 77.7009],
};

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => { 
    map.invalidateSize(); 
    map.setView(center, zoom); 
  }, [center, zoom, map]);
  return null;
}

export default function MapView() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [mapState, setMapState] = useState({ center: [12.9716, 77.5946], zoom: 12 });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("moveasy_listings");
    setListings(saved ? JSON.parse(saved) : initialListings);
    
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 500);
  }, []);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(135deg, #1e3a8a, #3b82f6)", padding: "12px 20px", color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "white", padding: "4px 12px", borderRadius: "20px", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>← Home</button>
            <div style={{ fontSize: "18px", fontWeight: 800 }}>Moveasy Map</div>
          </div>
          <div style={{ fontSize: "12px", opacity: 0.8 }}>{listings.length} properties</div>
        </div>
        
        <div style={{ marginTop: "8px" }}>
          <select 
            onChange={(e) => {
              if (e.target.value === "All") setMapState({ center: [12.9716, 77.5946], zoom: 12 });
              else setMapState({ center: areas[e.target.value], zoom: 16 });
            }}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #94a3b8", outline: "none", fontSize: "14px", fontWeight: 600, color: "#1e3a8a", cursor: "pointer", width: "100%", maxWidth: "300px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
          >
            <option value="All">📍 All Bengaluru</option>
            {Object.keys(areas).map((a) => (
              <option key={a} value={a}>📍 {a}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <MapContainer center={mapState.center} zoom={mapState.zoom} style={{ height: "100%", width: "100%" }}>
            <ChangeView center={mapState.center} zoom={mapState.zoom} />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            {listings.map((l) => (
              <Marker key={l.id} position={[l.lat, l.lng]} icon={makeBhkIcon(l.bhk)} eventHandlers={{ click: () => setSelected(l) }}>
                <Popup>
                  <div style={{ minWidth: "180px" }}>
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

        <div style={{ width: "320px", overflowY: "auto", background: "#f8fafc", borderLeft: "1px solid #e2e8f0", padding: "10px", height: "100%" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: "#1e293b" }}>Properties ({listings.length})</div>
          {listings.map((l) => (
            <div key={l.id} onClick={() => setMapState({ center: [l.lat, l.lng], zoom: 17 })} style={{ background: "white", borderRadius: "8px", padding: "10px", marginBottom: "8px", cursor: "pointer", border: selected?.id === l.id ? "2px solid #3b82f6" : "1px solid #e2e8f0", transition: "all 0.2s" }}>
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
