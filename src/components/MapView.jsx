import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import { useLocation, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { applyListingFilters, FILTER_OPTIONS, getFiltersInitialState, getListings } from "../lib/store";
import { useAuth } from "../context/AuthContext";
import { isFirebaseConfigured } from "../lib/firebase";
import { getListingsData } from "../lib/firestoreStore";
import { geocodePlace } from "../lib/geocode";
import { haversineKm } from "../lib/geo";
import PropertyModal from "./PropertyModal";

const MAP_NEARBY_KM = 12;

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
    html:
      '<div style="background:' +
      c +
      ';color:white;padding:6px 14px;border-radius:22px;font-size:15px;font-weight:800;white-space:nowrap;border:2px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.35)">' +
      bhk +
      "</div>",
    iconSize: [72, 30],
    iconAnchor: [36, 15],
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

/** Zoom map to show listing pins; optional fallback center when the filtered set is empty. */
function FitListingsBounds({ listings, enabled, fallbackCenter, fallbackZoom = 13 }) {
  const map = useMap();
  const signature = listings.map((l) => l.id).join(",");
  useEffect(() => {
    if (!enabled) return;
    const pts = listings
      .filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng))
      .map((l) => [l.lat, l.lng]);
    requestAnimationFrame(() => {
      if (pts.length === 1) {
        map.setView(pts[0], 15, { animate: false });
        return;
      }
      if (pts.length > 1) {
        const b = L.latLngBounds(pts);
        map.fitBounds(b, { padding: [72, 72], maxZoom: 15, animate: false });
        return;
      }
      if (fallbackCenter && Number.isFinite(fallbackCenter[0]) && Number.isFinite(fallbackCenter[1])) {
        map.setView(fallbackCenter, fallbackZoom, { animate: false });
      }
    });
  }, [map, signature, enabled, listings.length, fallbackCenter, fallbackZoom]);
  return null;
}

/** Leaflet caches tile layout size; must invalidate when sidebars / mode change or the map leaves a grey gap. */
function InvalidateMapSize({ layoutRevision }) {
  const map = useMap();
  useEffect(() => {
    const nudge = () => {
      map.invalidateSize({ animate: false, pan: false });
    };
    nudge();
    const raf = requestAnimationFrame(nudge);
    const t1 = setTimeout(nudge, 80);
    const t2 = setTimeout(nudge, 280);
    window.addEventListener("resize", nudge);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", nudge);
    };
  }, [map, layoutRevision]);
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
        borderRadius: "10px",
        padding: "8px 14px",
        fontSize: "14px",
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
  const location = useLocation();
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [mapState, setMapState] = useState({ center: [12.9716, 77.5946], zoom: 14 });
  const [selected, setSelected] = useState(null);
  const [viewingProperty, setViewingProperty] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMobileListings, setShowMobileListings] = useState(false);
  const [filters, setFilters] = useState(getFiltersInitialState());
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 768 : false);
  const [selectedLocality, setSelectedLocality] = useState("");
  const [mapSearchInput, setMapSearchInput] = useState("");
  const [mapSearchLoading, setMapSearchLoading] = useState(false);
  const [mapSearchError, setMapSearchError] = useState("");
  const [placeAnchor, setPlaceAnchor] = useState(null);
  const [desktopMode, setDesktopMode] = useState("split");
  const [showDesktopFilters, setShowDesktopFilters] = useState(true);
  const [showDesktopListings, setShowDesktopListings] = useState(true);

  useEffect(() => {
    let alive = true;
    async function loadListings() {
      const rows = isFirebaseConfigured ? await getListingsData() : getListings();
      if (alive) setListings(rows);
    }
    loadListings().catch(() => setListings(getListings()));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const listingIdFromUrl = useMemo(() => new URLSearchParams(location.search).get("listingId") || "", [location.search]);

  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const bhk = qs.get("bhk");
    const propertyType = qs.get("propertyType");
    const locality = qs.get("locality") || "";
    const minRent = Number(qs.get("minRent") || 0);
    const maxRent = Number(qs.get("maxRent") || 0);
    setSelectedLocality(locality);
    if (locality) setMapSearchInput(locality);
    setFilters((prev) => ({
      ...prev,
      bhkTypes: bhk ? [bhk] : prev.bhkTypes,
      propertyTypes: propertyType ? [propertyType] : prev.propertyTypes,
      minRent: minRent > 0 ? minRent : prev.minRent,
      maxRent: maxRent > 0 ? maxRent : prev.maxRent,
    }));
  }, [location.search]);

  useEffect(() => {
    if (!listingIdFromUrl || !listings.length) return;
    const found = listings.find((l) => String(l.id) === String(listingIdFromUrl));
    if (!found) return;
    setViewingProperty(found);
    setSelected(found);
    setMapState({ center: [found.lat, found.lng], zoom: 16 });
  }, [listingIdFromUrl, listings]);

  const filteredListings = useMemo(() => {
    const base = applyListingFilters(listings, filters);
    if (!selectedLocality.trim()) return base;
    const q = selectedLocality.toLowerCase().trim();
    return base.filter((l) =>
      [l.title, l.address, l.location].filter(Boolean).some((text) => String(text).toLowerCase().includes(q))
    );
  }, [listings, filters, selectedLocality]);

  const mapListings = useMemo(() => {
    if (!placeAnchor) return filteredListings;
    return filteredListings.filter((l) => {
      if (!Number.isFinite(Number(l.lat)) || !Number.isFinite(Number(l.lng))) return false;
      return haversineKm(placeAnchor.lat, placeAnchor.lng, Number(l.lat), Number(l.lng)) <= MAP_NEARBY_KM;
    });
  }, [filteredListings, placeAnchor]);

  const runMapPlaceSearch = async () => {
    const q = mapSearchInput.trim();
    setMapSearchError("");
    if (!q) {
      setPlaceAnchor(null);
      setSelectedLocality("");
      return;
    }
    setMapSearchLoading(true);
    try {
      const r = await geocodePlace(q);
      if (r.ok) {
        setPlaceAnchor({ lat: r.lat, lng: r.lng, label: r.displayName });
        setMapState({ center: [r.lat, r.lng], zoom: 15 });
        setSelectedLocality("");
        setMapSearchError("");
      } else {
        setPlaceAnchor(null);
        setSelectedLocality(q);
        setMapSearchError(r.error || "");
      }
    } catch {
      setMapSearchError("Search failed. Check your connection.");
    } finally {
      setMapSearchLoading(false);
    }
  };

  useEffect(() => {
    if (!filteredListings.length || !selectedLocality.trim()) return;
    const first = filteredListings[0];
    setMapState({ center: [first.lat, first.lng], zoom: 14 });
  }, [filteredListings, selectedLocality]);

  const toggleFilter = (key, value) => {
    setFilters((prev) => {
      const exists = prev[key].includes(value);
      const next = exists ? prev[key].filter((v) => v !== value) : [...prev[key], value];
      return { ...prev, [key]: next };
    });
  };

  const mapLayoutKey = `${desktopMode}|${showDesktopFilters}|${showDesktopListings}|${isMobile}`;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "linear-gradient(180deg, #fff4f2 0%, #f8fbff 100%)" }}>
      <style>{`
        .desktop-sidebar {
          width: clamp(300px, 24vw, 440px);
          overflow-y: auto;
          border-right: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 18px 20px;
          flex-shrink: 0;
          font-size: 15px;
          transition: transform 0.3s ease-in-out;
        }
        .desktop-sidebar input[type="number"] {
          width: 100%;
          padding: 10px 12px;
          font-size: 15px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          background: #fff;
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
            z-index: 1000;
            background: #1e293b;
            color: white;
            border: none;
            padding: 10px 14px;
            border-radius: 24px;
            font-weight: 700;
            font-size: 13px;
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
      <div style={{ background: "#ffffff", padding: isMobile ? "12px 14px" : "14px 24px", borderBottom: "1px solid #e2e8f0", position: "relative", zIndex: 1001, isolation: "isolate", boxShadow: "0 1px 0 rgba(15,23,42,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", marginBottom: isMobile ? "8px" : "10px", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "8px" : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/")}
              style={{ border: "1px solid #cbd5e1", background: "white", borderRadius: "10px", padding: "10px 16px", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}
            >
              Home
            </button>
            {user?.role === "admin" && (
              <button
                onClick={() => navigate("/admin")}
                style={{ border: "1px solid #1e40af", background: "#eff6ff", color: "#1e40af", borderRadius: "10px", padding: "10px 16px", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}
              >
                Admin Controls
              </button>
            )}
            <div style={{ fontSize: isMobile ? "18px" : "22px", fontWeight: 800, color: "#0f172a" }}>Map Listings</div>
          </div>
          <div style={{ fontSize: "15px", color: "#64748b", fontWeight: 600 }}>
            {mapListings.length} properties
            {placeAnchor ? <span style={{ fontWeight: 500, color: "#94a3b8" }}> · within ~{MAP_NEARBY_KM} km of pin</span> : null}
          </div>
        </div>
        {isMobile && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={mapSearchInput}
                onChange={(e) => setMapSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runMapPlaceSearch();
                }}
                placeholder="Place or landmark (e.g. Google Bangalore)"
                style={{ flex: "1 1 180px", border: "1px solid #cbd5e1", background: "white", borderRadius: "10px", padding: "10px 12px", fontSize: "14px", minHeight: "44px" }}
              />
              <button
                type="button"
                disabled={mapSearchLoading}
                onClick={runMapPlaceSearch}
                style={{ border: "1px solid #cbd5e1", background: "#0f172a", color: "white", borderRadius: "10px", padding: "10px 16px", fontSize: "14px", fontWeight: 700, minHeight: "44px", cursor: mapSearchLoading ? "wait" : "pointer" }}
              >
                {mapSearchLoading ? "…" : "Go"}
              </button>
            </div>
            {placeAnchor ? (
              <div style={{ fontSize: "12px", color: "#475569", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                <span style={{ flex: 1, minWidth: 0 }}>Near: {placeAnchor.label}</span>
                <button
                  type="button"
                  onClick={() => {
                    setPlaceAnchor(null);
                    setMapSearchError("");
                  }}
                  style={{ border: "1px solid #cbd5e1", background: "white", borderRadius: "8px", padding: "4px 10px", fontSize: "12px", fontWeight: 600 }}
                >
                  Clear map search
                </button>
              </div>
            ) : null}
            {mapSearchError ? <div style={{ fontSize: "12px", color: "#b91c1c" }}>{mapSearchError}</div> : null}
          </div>
        )}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <select
              value={desktopMode}
              onChange={(e) => {
                const v = e.target.value;
                setDesktopMode(v);
                if (v === "map") {
                  setShowDesktopListings(false);
                }
              }}
              style={{ border: "1px solid #cbd5e1", background: "white", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", fontWeight: 700, minHeight: "44px" }}
            >
              <option value="split">Split View</option>
              <option value="map">Full Map</option>
            </select>
            <button type="button" onClick={() => setShowDesktopFilters((v) => !v)} style={{ border: "1px solid #cbd5e1", background: "white", borderRadius: "10px", padding: "10px 16px", fontSize: "14px", fontWeight: 700, minHeight: "44px" }}>
              {showDesktopFilters ? "Hide Filters" : "Show Filters"}
            </button>
            <button type="button" onClick={() => setShowDesktopListings((v) => !v)} style={{ border: "1px solid #cbd5e1", background: "white", borderRadius: "10px", padding: "10px 16px", fontSize: "14px", fontWeight: 700, minHeight: "44px" }}>
              {showDesktopListings ? "Hide Properties" : "Show Properties"}
            </button>
            <input
              value={mapSearchInput}
              onChange={(e) => setMapSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runMapPlaceSearch();
              }}
              placeholder="Search map: landmark or area"
              style={{ border: "1px solid #cbd5e1", background: "white", borderRadius: "10px", padding: "10px 16px", fontSize: "14px", minWidth: "220px", minHeight: "44px", flex: "1 1 220px" }}
            />
            <button
              type="button"
              disabled={mapSearchLoading}
              onClick={runMapPlaceSearch}
              style={{ border: "1px solid #cbd5e1", background: "#0f172a", color: "white", borderRadius: "10px", padding: "10px 18px", fontSize: "14px", fontWeight: 700, minHeight: "44px", cursor: mapSearchLoading ? "wait" : "pointer" }}
            >
              {mapSearchLoading ? "…" : "Search map"}
            </button>
            {placeAnchor ? (
              <button
                type="button"
                onClick={() => {
                  setPlaceAnchor(null);
                  setMapSearchError("");
                }}
                style={{ border: "1px solid #fca5a5", background: "#fff1f2", color: "#b91c1c", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: 700, minHeight: "44px" }}
              >
                Clear area pin
              </button>
            ) : null}
          </div>
        )}
        {!isMobile && mapSearchError ? (
          <div style={{ fontSize: "12px", color: "#b91c1c", marginTop: "4px" }}>{mapSearchError}</div>
        ) : null}
        {!isMobile && placeAnchor ? (
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px", maxWidth: "720px", lineHeight: 1.4 }}>
            Showing rentals within ~{MAP_NEARBY_KM} km of: <strong style={{ color: "#334155" }}>{placeAnchor.label}</strong>
          </div>
        ) : null}
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {(isMobile ||
          (showDesktopFilters && (desktopMode === "split" || desktopMode === "map"))) && (
        <aside className={`desktop-sidebar ${showMobileFilters ? "open" : ""}`}>
          <h3 style={{ margin: "0 0 12px", color: "#1e293b", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "18px", fontWeight: 800 }}>
            Filters
            <button onClick={() => setShowMobileFilters(false)} style={{ display: "none" }} className="mobile-only-close">×</button>
          </h3>
          <div style={{ marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "8px", color: "#334155" }}>Search map</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <input
                value={mapSearchInput}
                onChange={(e) => setMapSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runMapPlaceSearch();
                }}
                placeholder="Landmark or address"
                style={{ flex: "1 1 140px", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "8px 10px", fontSize: "14px" }}
              />
              <button
                type="button"
                disabled={mapSearchLoading}
                onClick={runMapPlaceSearch}
                style={{ border: "none", background: "#0f172a", color: "white", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: 700, cursor: mapSearchLoading ? "wait" : "pointer" }}
              >
                {mapSearchLoading ? "…" : "Go"}
              </button>
            </div>
            {placeAnchor ? (
              <button
                type="button"
                onClick={() => {
                  setPlaceAnchor(null);
                  setMapSearchError("");
                }}
                style={{ marginTop: "8px", border: "1px solid #fecdd3", background: "#fff1f2", color: "#be123c", borderRadius: "8px", padding: "6px 10px", fontSize: "12px", fontWeight: 600 }}
              >
                Clear map pin & radius
              </button>
            ) : null}
            {mapSearchError ? <div style={{ fontSize: "12px", color: "#b91c1c", marginTop: "8px" }}>{mapSearchError}</div> : null}
          </div>
          <div style={{ marginBottom: "18px" }}>
            <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "10px" }}>BHK Type</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
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

          <div style={{ marginBottom: "18px" }}>
            <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "8px" }}>Rent range: ₹ 10k to ₹ 1 Lakh</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
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
            <div key={key} style={{ marginBottom: "18px" }}>
              <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "10px" }}>{label}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {FILTER_OPTIONS[key].map((item) => (
                  <ToggleOption key={item} label={item} active={filters[key].includes(item)} onClick={() => toggleFilter(key, item)} />
                ))}
              </div>
            </div>
          ))}
        </aside>
        )}

        <div style={{ flex: "1 1 0%", minWidth: isMobile ? 0 : 280, position: "relative", background: "#fff" }}>
          <MapContainer center={mapState.center} zoom={mapState.zoom} style={{ height: "100%", width: "100%", zIndex: 1 }}>
            <InvalidateMapSize layoutRevision={mapLayoutKey} />
            <ChangeView center={mapState.center} zoom={mapState.zoom} />
            <FitListingsBounds
              listings={mapListings}
              enabled={!selectedLocality.trim()}
              fallbackCenter={placeAnchor ? [placeAnchor.lat, placeAnchor.lng] : null}
              fallbackZoom={13}
            />
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap &copy; CARTO' />
            {placeAnchor && (
              <>
                <Circle
                  center={[placeAnchor.lat, placeAnchor.lng]}
                  radius={MAP_NEARBY_KM * 1000}
                  pathOptions={{ color: "#2563eb", fillColor: "#93c5fd", fillOpacity: 0.15, weight: 2 }}
                />
                <Marker position={[placeAnchor.lat, placeAnchor.lng]}>
                  <Popup>
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>Searched place</div>
                    <div style={{ fontSize: "12px", color: "#64748b", maxWidth: "220px" }}>{placeAnchor.label}</div>
                  </Popup>
                </Marker>
              </>
            )}
            {mapListings.map((l) => (
              <Marker 
                key={l.id} 
                position={[l.lat, l.lng]} 
                icon={makeBhkIcon(l.bhk)} 
                eventHandlers={{ 
                  click: () => setSelected(l),
                  mouseover: (e) => e.target.openPopup()
                }}
              >
                <Popup>
                  <div style={{ minWidth: "220px" }}>
                    {l.image && <MediaElement src={l.image} alt={l.title} style={{ width: "100%", height: "108px", objectFit: "cover", borderRadius: "8px", marginBottom: "8px" }} />}
                    <div style={{ fontWeight: 700, fontSize: "15px" }}>{l.title}</div>
                    <div style={{ fontSize: "13px", color: "#64748b" }}>{l.address}</div>
                    <div style={{ fontWeight: 800, color: "#16a34a", fontSize: "17px", margin: "6px 0" }}>{l.price}</div>
                    <div style={{ fontSize: "13px" }}>{l.seller} | {l.contact}</div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                      <a href={"tel:" + l.contact} style={{ flex: 1, padding: "8px 10px", background: "#1e3a8a", color: "white", borderRadius: "8px", textAlign: "center", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}>Call</a>
                      <button type="button" onClick={() => setViewingProperty(l)} style={{ flex: 1, padding: "8px 10px", background: "#b91c1c", color: "white", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>Details</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          {isMobile && (
            <div style={{ position: "absolute", top: 12, right: 12, zIndex: 1000, display: "flex", gap: "8px" }}>
              <button className="mobile-filter-btn" onClick={() => setShowMobileFilters(true)} style={{ position: "static", transform: "none", margin: 0 }}>
                Filters
              </button>
              <button
                onClick={() => setShowMobileListings((v) => !v)}
                style={{
                  background: "#0f172a",
                  color: "white",
                  border: "none",
                  padding: "10px 16px",
                  borderRadius: "24px",
                  fontWeight: 700,
                  fontSize: "14px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                {showMobileListings ? "Hide" : "Properties"}
              </button>
            </div>
          )}
        </div>

        {(isMobile || (desktopMode === "split" && showDesktopListings)) && (
        <div
          style={{
            width: isMobile ? "100%" : "clamp(320px, 28vw, 480px)",
            overflowY: "auto",
            background: "#f8fafc",
            borderLeft: isMobile ? "none" : "1px solid #e2e8f0",
            padding: isMobile ? "12px" : "16px 18px",
            fontSize: "15px",
            height: isMobile ? "45vh" : "100%",
            flexShrink: 0,
            position: isMobile ? "absolute" : "static",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: isMobile ? 1002 : "auto",
            boxShadow: isMobile ? "0 -8px 24px rgba(15, 23, 42, 0.18)" : "none",
            transform: isMobile ? (showMobileListings ? "translateY(0)" : "translateY(102%)") : "none",
            transition: "transform 0.25s ease",
          }}
        >
          <div style={{ fontSize: "17px", fontWeight: 800, marginBottom: "12px", color: "#1e293b" }}>Properties ({mapListings.length})</div>
          {mapListings.map((l) => (
            <div
              key={l.id}
              onClick={() => setViewingProperty(l)}
              onMouseEnter={() => setMapState({ center: [l.lat, l.lng], zoom: 17 })}
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "14px",
                marginBottom: "12px",
                cursor: "pointer",
                border: selected?.id === l.id ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                transition: "all 0.2s",
              }}
            >
              {l.image && <MediaElement src={l.image} alt={l.title} style={{ width: "100%", height: "148px", objectFit: "cover", borderRadius: "10px", marginBottom: "10px" }} />}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", alignItems: "center", gap: "8px" }}>
                <span style={{ background: bhkColors[l.bhk] || "#6b7280", color: "white", padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 700 }}>{l.bhk}</span>
                <span style={{ fontWeight: 800, color: "#16a34a", fontSize: "15px", flexShrink: 0 }}>{l.price}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: "16px", color: "#1e293b", lineHeight: 1.35 }}>{l.title}</div>
              <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px", lineHeight: 1.45 }}>{l.address}</div>
              <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "6px" }}>{l.seller} | {l.contact}</div>
            </div>
          ))}
        </div>
        )}
      </div>

      {viewingProperty && (
        <PropertyModal
          property={viewingProperty}
          listings={listings}
          onSelectListing={(l) => setViewingProperty(l)}
          onClose={() => {
            setViewingProperty(null);
            if (listingIdFromUrl) {
              const qs = new URLSearchParams(location.search);
              qs.delete("listingId");
              const next = qs.toString();
              navigate({ pathname: location.pathname, search: next ? `?${next}` : "" }, { replace: true });
            }
          }}
        />
      )}
    </div>
  );
}
