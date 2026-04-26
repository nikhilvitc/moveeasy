import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import initialListings from "../data/listingsData";

// Fix for default marker icons in Leaflet + React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const bhkColors = {
  "1 BHK": "#3b82f6",
  "2 BHK": "#22c55e",
  "3 BHK": "#f59e0b",
  "4+ BHK": "#ef4444"
};

function makeBhkIcon(bhk) {
  const color = bhkColors[bhk] || "#6366f1";
  return new L.DivIcon({
    className: "custom-div-icon",
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><div style="transform: rotate(45deg); color: white; font-weight: 800; font-size: 10px;">${bhk.split(' ')[0]}</div></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30]
  });
}

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function MapView() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({ bhk: "All", rent: "All", type: "All", availability: "All" });

  useEffect(() => {
    const saved = localStorage.getItem("moveasy_listings");
    const data = saved ? JSON.parse(saved) : initialListings;
    setListings(data);
    setFiltered(data);
  }, []);

  const handleFilter = (key, val) => {
    const newFilters = { ...filters, [key]: val };
    setFilters(newFilters);
    
    let result = listings;
    if (newFilters.bhk !== "All") result = result.filter(l => l.bhk === newFilters.bhk);
    if (newFilters.rent !== "All") {
       const [min, max] = newFilters.rent.split('-').map(Number);
       result = result.filter(l => {
          const r = parseInt(l.rent.replace(/,/g, ''));
          return max ? (r >= min && r <= max) : (r >= min);
       });
    }
    if (newFilters.type !== "All") result = result.filter(l => l.type === newFilters.type);
    if (newFilters.availability !== "All") result = result.filter(l => l.availability === newFilters.availability);
    setFiltered(result);
  };

  const sidebarStyle = { width: "350px", height: "calc(100vh - 80px)", background: "white", padding: "20px", overflowY: "auto", boxShadow: "2px 0 10px rgba(0,0,0,0.1)", zIndex: 10 };
  const filterLabel = { fontSize: "12px", fontWeight: 700, color: "#64748b", margin: "12px 0 6px", display: "block" };
  const filterSelect = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none", fontSize: "14px" };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 80px)", background: "#f8fafc" }}>
      {/* Filters Sidebar */}
      <div style={sidebarStyle}>
        <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#1e3a8a", marginBottom: "20px" }}>Map Filters</h2>
        
        <label style={filterLabel}>BHK Type</label>
        <select value={filters.bhk} onChange={e => handleFilter("bhk", e.target.value)} style={filterSelect}>
          <option>All</option><option>1 BHK</option><option>2 BHK</option><option>3 BHK</option><option>4+ BHK</option>
        </select>

        <label style={filterLabel}>Rent Range</label>
        <select value={filters.rent} onChange={e => handleFilter("rent", e.target.value)} style={filterSelect}>
          <option>All</option>
          <option value="0-20000">Below 20k</option>
          <option value="20000-50000">20k - 50k</option>
          <option value="50000-100000">50k - 1L</option>
          <option value="100000">Above 1L</option>
        </select>

        <label style={filterLabel}>Property Type</label>
        <select value={filters.type} onChange={e => handleFilter("type", e.target.value)} style={filterSelect}>
          <option>All</option><option>Flat</option><option>House</option><option>Villa</option>
        </select>

        <label style={filterLabel}>Availability</label>
        <select value={filters.availability} onChange={e => handleFilter("availability", e.target.value)} style={filterSelect}>
          <option>All</option><option>Immediate</option><option>Within 15 Days</option><option>Within 30 Days</option>
        </select>

        <hr style={{ margin: "24px 0", border: "none", borderTop: "1px solid #f1f5f9" }} />

        <p style={{ fontSize: "14px", color: "#64748b" }}>Showing <b>{filtered.length}</b> listings on map</p>
        
        <div style={{ marginTop: "20px" }}>
          {filtered.slice(0, 5).map(l => (
            <div key={l.id} onClick={() => navigate(`/listing/${l.id}`)} style={{ padding: "12px", background: "#f8fafc", borderRadius: "10px", marginBottom: "10px", cursor: "pointer", border: "1px solid transparent" }} onMouseOver={e=>e.currentTarget.style.borderColor="#1e3a8a"} onMouseOut={e=>e.currentTarget.style.borderColor="transparent"}>
               <p style={{ margin: 0, fontWeight: 700, fontSize: "14px" }}>{l.title}</p>
               <p style={{ margin: 0, color: "#1e3a8a", fontSize: "13px", fontWeight: 600 }}>₹{l.rent}</p>
            </div>
          ))}
          {filtered.length > 5 && <p style={{textAlign:"center", fontSize:"12px", color:"#94a3b8"}}>+ {filtered.length - 5} more houses</p>}
        </div>
      </div>

      {/* Map View */}
      <div style={{ flex: 1, zIndex: 1 }}>
        <MapContainer center={[19.076, 72.877]} zoom={12} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {filtered.map(l => (
            <Marker key={l.id} position={l.coords} icon={makeBhkIcon(l.bhk)}>
              <Popup>
                <div style={{ width: "200px" }}>
                  <img src={l.image} alt="" style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "8px" }} />
                  <h4 style={{ margin: "10px 0 5px" }}>{l.title}</h4>
                  <p style={{ margin: "0", color: "#1e3a8a", fontWeight: 700 }}>₹{l.rent}/mo</p>
                  <button onClick={() => navigate(`/listing/${l.id}`)} style={{ width: "100%", marginTop: "10px", padding: "8px", background: "#1e3a8a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>View Details</button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
