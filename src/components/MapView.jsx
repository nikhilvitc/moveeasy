import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import { useLocation, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { applyListingFilters, FILTER_OPTIONS, getFiltersInitialState, getListings } from "../lib/store";
import { useAuth } from "../context/AuthContext";
import { isFirebaseConfigured } from "../lib/firebase";
import { getListingsData, isListingPubliclyVisible } from "../lib/firestoreStore";
import { geocodePlace } from "../lib/geocode";
import { haversineKm } from "../lib/geo";
import PropertyModal from "./PropertyModal";
import { AREA_NAMES_SORTED } from "../data/listingsData";
import { BANGALORE_WORKPLACES, matchWorkplacePreset } from "../data/bangaloreWorkplaces";
import {
  appendFilterHistory,
  consumeMapRestorePayload,
  isListingSaved,
  toggleSavedListing,
} from "../lib/userActivity";
import { logSavedListingChange } from "../lib/crmSync";

const MAP_NEARBY_KM = 12;
/** Listings within this radius (km) of geocoded office / company */
const COMMUTE_NEARBY_KM = 14;

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

/** Zoom map to show listing pins; optional fallback center when the filtered set is empty.
 *  Important: do not put `fallbackCenter` in the effect dependency array — it was tied to map pan/hover
 *  and caused fitBounds to re-run on every listing-card hover (zoomed-out map). */
function FitListingsBounds({ listings, enabled, fallbackCenter, fallbackZoom = 14 }) {
  const map = useMap();
  const signature = listings.map((l) => l.id).join(",");
  const fallbackRef = useRef(fallbackCenter);
  fallbackRef.current = fallbackCenter;
  useEffect(() => {
    if (!enabled) return;
    const pts = listings
      .filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng))
      .map((l) => [l.lat, l.lng]);
    const fc = fallbackRef.current;
    requestAnimationFrame(() => {
      if (pts.length === 1) {
        map.setView(pts[0], 17, { animate: false });
        return;
      }
      if (pts.length > 1) {
        const b = L.latLngBounds(pts);
        map.fitBounds(b, { padding: [36, 36], maxZoom: 17, animate: false });
        return;
      }
      if (fc && Number.isFinite(fc[0]) && Number.isFinite(fc[1])) {
        map.setView(fc, fallbackZoom, { animate: false });
      }
    });
  }, [map, signature, enabled, listings.length, fallbackZoom]);
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
        color: active ? activeColor : "#0f172a",
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
  /** Central Bangalore — street-level default for local inventory */
  const [mapState, setMapState] = useState({ center: [12.9716, 77.5946], zoom: 15 });
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
  /** Desktop: start collapsed so the map uses full width; use map search card + “Show Filters” for the panel. */
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);
  const [showDesktopListings, setShowDesktopListings] = useState(true);
  /** On-map search card (area / metro / workplace) — independent from sidebar “Filters”. */
  const [showMapSearchOverlay, setShowMapSearchOverlay] = useState(true);
  /** 'local' = filter listings by area name; 'place' = geocode landmark / metro and radius filter */
  const [searchMode, setSearchMode] = useState("local");
  const [helpWidgetOpen, setHelpWidgetOpen] = useState(false);
  const [workplaceAnchor, setWorkplaceAnchor] = useState(null);
  const [workplaceError, setWorkplaceError] = useState("");
  const [savedRevision, setSavedRevision] = useState(0);
  const mapSearchOverlayBodyRef = useRef(null);

  const openFullFilterPanel = useCallback(() => {
    if (isMobile) {
      setShowMobileFilters(true);
      setShowMobileListings(true);
    } else {
      setShowDesktopFilters(true);
      setShowDesktopListings(true);
      setDesktopMode("split");
    }
  }, [isMobile]);

  useEffect(() => {
    let alive = true;
    async function loadListings() {
      // Extract primary filters for server-side optimization
      const bhk = filters.bhkTypes.length === 1 ? filters.bhkTypes[0] : null;
      const maxRent = filters.maxRent < 100000 ? filters.maxRent : null;
      
      const options = {
        limitCount: isMobile ? 40 : 100,
        bhk,
        maxRent
      };

      const rows = isFirebaseConfigured ? await getListingsData(options) : getListings();
      if (alive) {
        // Still apply client-side filtering for complex multi-selects
        setListings(rows.filter(isListingPubliclyVisible));
      }
    }
    loadListings().catch((err) => {
      console.warn("Firestore query failed (possibly missing index):", err);
      setListings(getListings().filter(isListingPubliclyVisible));
    });
    return () => { alive = false; };
  }, [filters.bhkTypes, filters.maxRent, filters.neighborhoods, isMobile]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const listingIdFromUrl = useMemo(() => new URLSearchParams(location.search).get("listingId") || "", [location.search]);

  /** Hero / deep link: always derive filters from URL (avoids stale BHK/rent from a previous session). */
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const base = getFiltersInitialState();
    const locality = qs.get("locality") || "";
    const bhk = qs.get("bhk");
    const propertyType = qs.get("propertyType");
    const minRent = Number(qs.get("minRent") || 0);
    const maxRent = Number(qs.get("maxRent") || 0);
    setSelectedLocality(locality);
    setMapSearchInput(locality);
    const locNorm = locality.trim();
    const neighborhoodFromUrl = locNorm && AREA_NAMES_SORTED.includes(locNorm) ? [locNorm] : [];
    setFilters({
      ...base,
      bhkTypes: bhk ? [bhk] : [],
      propertyTypes: propertyType ? [propertyType] : [],
      minRent: minRent > 0 ? minRent : base.minRent,
      maxRent: maxRent > 0 ? maxRent : base.maxRent,
      neighborhoods: neighborhoodFromUrl,
    });
  }, [location.search]);

  /** Hero “More Filters” opens the map with the filter drawer visible. */
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    if (qs.get("openFilters") !== "1") return;
    const id = requestAnimationFrame(() => {
      openFullFilterPanel();
      qs.delete("openFilters");
      const rest = qs.toString();
      navigate({ pathname: location.pathname, search: rest ? `?${rest}` : "" }, { replace: true });
    });
    return () => cancelAnimationFrame(id);
  }, [location.search, location.pathname, navigate, openFullFilterPanel]);

  useEffect(() => {
    const payload = consumeMapRestorePayload();
    if (!payload || typeof payload !== "object") return;
    if (payload.filters && typeof payload.filters === "object") {
      setFilters((prev) => ({
        ...prev,
        ...payload.filters,
        neighborhoods: Array.isArray(payload.filters.neighborhoods) ? payload.filters.neighborhoods : prev.neighborhoods || [],
      }));
    }
    if (payload.selectedLocality !== undefined) setSelectedLocality(String(payload.selectedLocality || ""));
    if (payload.mapSearchInput !== undefined) setMapSearchInput(String(payload.mapSearchInput || ""));
    if (payload.searchMode === "local" || payload.searchMode === "place") setSearchMode(payload.searchMode);
    if (payload.placeAnchor && Number.isFinite(payload.placeAnchor.lat)) {
      setPlaceAnchor({
        lat: payload.placeAnchor.lat,
        lng: payload.placeAnchor.lng,
        label: String(payload.placeAnchor.label || "Saved place"),
      });
    } else if (payload.placeAnchor === null) setPlaceAnchor(null);
    if (payload.workplaceAnchor && Number.isFinite(payload.workplaceAnchor.lat)) {
      setWorkplaceAnchor({
        lat: payload.workplaceAnchor.lat,
        lng: payload.workplaceAnchor.lng,
        label: String(payload.workplaceAnchor.label || "Office"),
      });
    } else if (payload.workplaceAnchor === null) setWorkplaceAnchor(null);
  }, []);

  useEffect(() => {
    if (!listingIdFromUrl || !listings.length) return;
    const found = listings.find((l) => String(l.id) === String(listingIdFromUrl));
    if (!found) return;
    setViewingProperty(found);
    setSelected(found);
    setMapState({ center: [found.lat, found.lng], zoom: 17 });
  }, [listingIdFromUrl, listings]);

  const filteredListings = useMemo(() => {
    const base = applyListingFilters(listings, filters);
    if (!selectedLocality.trim()) return base;
    const q = selectedLocality.toLowerCase().trim();
    return base.filter((l) =>
      [l.title, l.address, l.location, l.seller, l.company, l.sellerEmail]
        .filter(Boolean)
        .some((text) => String(text).toLowerCase().includes(q))
    );
  }, [listings, filters, selectedLocality]);

  const mapListings = useMemo(() => {
    let rows = filteredListings;
    if (placeAnchor) {
      rows = rows.filter((l) => {
        if (!Number.isFinite(Number(l.lat)) || !Number.isFinite(Number(l.lng))) return false;
        return haversineKm(placeAnchor.lat, placeAnchor.lng, Number(l.lat), Number(l.lng)) <= MAP_NEARBY_KM;
      });
    }
    if (workplaceAnchor) {
      rows = rows.filter((l) => {
        if (!Number.isFinite(Number(l.lat)) || !Number.isFinite(Number(l.lng))) return false;
        return haversineKm(workplaceAnchor.lat, workplaceAnchor.lng, Number(l.lat), Number(l.lng)) <= COMMUTE_NEARBY_KM;
      });
    }
    return rows;
  }, [filteredListings, placeAnchor, workplaceAnchor]);

  /** If strict filters + commute pins hide everything, still show pins so the map is never a blank void. */
  const relaxedFallbackListings = useMemo(() => {
    if (mapListings.length > 0) return [];
    let rows = listings.filter((l) => Number.isFinite(Number(l.lat)) && Number.isFinite(Number(l.lng)));
    const loc = selectedLocality.trim().toLowerCase();
    if (loc) {
      rows = rows.filter((l) =>
        [l.title, l.address, l.location, l.seller, l.company, l.sellerEmail]
          .filter(Boolean)
          .some((text) => String(text).toLowerCase().includes(loc))
      );
    }
    if (placeAnchor) {
      rows = rows.filter((l) => haversineKm(placeAnchor.lat, placeAnchor.lng, Number(l.lat), Number(l.lng)) <= MAP_NEARBY_KM);
    }
    if (workplaceAnchor) {
      rows = rows.filter((l) => haversineKm(workplaceAnchor.lat, workplaceAnchor.lng, Number(l.lat), Number(l.lng)) <= COMMUTE_NEARBY_KM);
    }
    return rows.slice(0, 45);
  }, [mapListings.length, listings, selectedLocality, placeAnchor, workplaceAnchor]);

  const displayPins = useMemo(() => {
    if (mapListings.length > 0) return mapListings;
    if (relaxedFallbackListings.length > 0) return relaxedFallbackListings;
    return listings.filter((l) => Number.isFinite(Number(l.lat)) && Number.isFinite(Number(l.lng))).slice(0, 35);
  }, [mapListings, relaxedFallbackListings, listings]);

  const usingRelaxedPins = mapListings.length === 0 && displayPins.length > 0;

  useEffect(() => {
    const t = setTimeout(() => {
      appendFilterHistory(user, {
        filters: JSON.parse(JSON.stringify(filters)),
        selectedLocality,
        searchMode,
        placeLabel: placeAnchor?.label || "",
        workplaceLabel: workplaceAnchor?.label || "",
        placeLat: placeAnchor?.lat,
        placeLng: placeAnchor?.lng,
        workLat: workplaceAnchor?.lat,
        workLng: workplaceAnchor?.lng,
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [user, filters, selectedLocality, searchMode, placeAnchor, workplaceAnchor]);

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
        setMapState({ center: [r.lat, r.lng], zoom: 16 });
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

  const runMapLocalSearch = () => {
    const q = mapSearchInput.trim();
    setMapSearchError("");
    setPlaceAnchor(null);
    if (!q) {
      setSelectedLocality("");
      return;
    }
    setSelectedLocality(q);
  };

  const submitMapSearch = async () => {
    const q = mapSearchInput.trim();
    setMapSearchError("");
    setWorkplaceError("");
    if (!q) {
      setPlaceAnchor(null);
      setSelectedLocality("");
      setWorkplaceAnchor(null);
      return;
    }
    const preset = matchWorkplacePreset(q);
    if (preset) {
      applyWorkplaceFromList(preset);
      setMapSearchInput("");
      return;
    }
    if (searchMode === "place") {
      await runMapPlaceSearch();
    } else {
      runMapLocalSearch();
    }
  };

  const chipLabel = (text, max = 22) => {
    const t = String(text || "").trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1)}…`;
  };

  const firstLocalitySig = filteredListings[0]
    ? `${filteredListings[0].id}:${filteredListings[0].lat}:${filteredListings[0].lng}`
    : "";
  useEffect(() => {
    const loc = selectedLocality.trim();
    if (!loc || !firstLocalitySig) return;
    const first = filteredListings[0];
    if (!first) return;
    setMapState({ center: [first.lat, first.lng], zoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- firstLocalitySig tracks the first row; avoid running on every filteredListings identity change
  }, [selectedLocality, firstLocalitySig]);

  /** Area search with zero strict rows: center map on the neighborhood name. */
  useEffect(() => {
    if (!selectedLocality.trim() || filteredListings.length > 0 || listingIdFromUrl) return;
    let cancelled = false;
    (async () => {
      const r = await geocodePlace(`${selectedLocality.trim()}, Bengaluru, India`);
      if (cancelled || !r.ok) return;
      setMapState({ center: [r.lat, r.lng], zoom: 15 });
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedLocality, filteredListings.length, listingIdFromUrl]);

  const toggleFilter = (key, value) => {
    setFilters((prev) => {
      const exists = prev[key].includes(value);
      const next = exists ? prev[key].filter((v) => v !== value) : [...prev[key], value];
      return { ...prev, [key]: next };
    });
  };

  const toggleNeighborhood = (name) => {
    setFilters((prev) => {
      const n = prev.neighborhoods || [];
      const exists = n.includes(name);
      const next = exists ? n.filter((x) => x !== name) : [...n, name];
      return { ...prev, neighborhoods: next };
    });
  };

  const applyWorkplaceFromList = useCallback((wp) => {
    setWorkplaceError("");
    setWorkplaceAnchor({ lat: wp.lat, lng: wp.lng, label: wp.name });
    setMapState({ center: [wp.lat, wp.lng], zoom: 16 });
    requestAnimationFrame(() => {
      mapSearchOverlayBodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, []);

  const mapLayoutKey = `${desktopMode}|${showDesktopFilters}|${showDesktopListings}|${showMapSearchOverlay}|${isMobile}`;
  /** Map search card and desktop sidebar filters are mutually exclusive; overlay can also be dismissed for a clear map. */
  const showMapSearchCard = showMapSearchOverlay && (isMobile || !showDesktopFilters);

  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ background: "#f1f5f9" }}
    >
      <style>{`
        .desktop-sidebar {
          width: clamp(300px, 24vw, 440px);
          overflow-y: auto;
          border-right: 1px solid #e2e8f0;
          background: #ffffff;
          padding: 18px 20px;
          flex-shrink: 0;
          font-size: 15px;
          transition: transform 0.3s ease-in-out;
          position: relative;
          z-index: 10;
          isolation: isolate;
          box-shadow: 1px 0 0 rgba(15, 23, 42, 0.06);
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
            z-index: 10000;
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
            <button
              type="button"
              onClick={() => navigate("/activity")}
              style={{ border: "1px solid #fecdd3", background: "#fff1f2", color: "#b91c1c", borderRadius: "10px", padding: "10px 16px", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}
            >
              Saved · activity
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
            {usingRelaxedPins ? (
              <span>
                <span style={{ color: "#b45309" }}>0 exact matches</span>
                {" · "}
                showing {displayPins.length} nearby homes — widen filters in the panel
              </span>
            ) : (
              <span>
                {mapListings.length} properties
                {placeAnchor ? <span style={{ fontWeight: 500, color: "#94a3b8" }}> · within ~{MAP_NEARBY_KM} km of metro pin</span> : null}
                {workplaceAnchor ? <span style={{ fontWeight: 500, color: "#94a3b8" }}> · within ~{COMMUTE_NEARBY_KM} km of workplace</span> : null}
              </span>
            )}
          </div>
        </div>
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <select
              value={desktopMode}
              onChange={(e) => {
                const v = e.target.value;
                setDesktopMode(v);
                if (v === "map") {
                  setShowDesktopListings(false);
                  setShowDesktopFilters(false);
                }
              }}
              style={{ border: "1px solid #cbd5e1", background: "white", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", fontWeight: 700, minHeight: "44px" }}
            >
              <option value="split">Split View</option>
              <option value="map">Full Map</option>
            </select>
            <button
              type="button"
              onClick={() => setShowMapSearchOverlay((v) => !v)}
              style={{ border: "1px solid #cbd5e1", background: "white", borderRadius: "10px", padding: "10px 16px", fontSize: "14px", fontWeight: 700, minHeight: "44px" }}
            >
              {showMapSearchOverlay ? "Hide search" : "Show search"}
            </button>
            <button type="button" onClick={() => setShowDesktopFilters((v) => !v)} style={{ border: "1px solid #cbd5e1", background: "white", borderRadius: "10px", padding: "10px 16px", fontSize: "14px", fontWeight: 700, minHeight: "44px" }}>
              {showDesktopFilters ? "Hide Filters" : "Show Filters"}
            </button>
            <button type="button" onClick={() => setShowDesktopListings((v) => !v)} style={{ border: "1px solid #cbd5e1", background: "white", borderRadius: "10px", padding: "10px 16px", fontSize: "14px", fontWeight: 700, minHeight: "44px" }}>
              {showDesktopListings ? "Hide Properties" : "Show Properties"}
            </button>
            <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>Hide search clears the on-map card · Show Filters opens rent & area panel</span>
          </div>
        )}
      </div>

      {isMobile && showMobileFilters ? (
        <button
          type="button"
          aria-label="Close filters"
          onClick={() => setShowMobileFilters(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            border: "none",
            padding: 0,
            margin: 0,
            background: "rgba(15, 23, 42, 0.45)",
            cursor: "pointer",
          }}
        />
      ) : null}

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {(isMobile ||
          (showDesktopFilters && (desktopMode === "split" || desktopMode === "map"))) && (
        <aside className={`desktop-sidebar ${showMobileFilters ? "open" : ""}`}>
          <h3 style={{ margin: "0 0 12px", color: "#0f172a", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "18px", fontWeight: 800, gap: 10 }}>
            Filters
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {!isMobile ? (
                <button
                  type="button"
                  onClick={() => setShowDesktopFilters(false)}
                  style={{
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    borderRadius: 10,
                    padding: "6px 12px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              ) : null}
              <button type="button" onClick={() => setShowMobileFilters(false)} className="mobile-only-close" aria-label="Close filters">
                ×
              </button>
            </span>
          </h3>
          <div style={{ marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid #e2e8f0", fontSize: "14px", color: "#334155", lineHeight: 1.55, fontWeight: 500 }}>
            {isMobile ? (
              <>
                Use the <strong style={{ color: "#0f172a" }}>search card on the map</strong> for area, landmark, or workplace. Fine-tune rent and more here.
              </>
            ) : (
              <>
                Rent range, BHK, building type, and area chips. <strong style={{ color: "#0f172a" }}>Hide filters</strong> when you want the map search card back (metro, workplace, free-text).
              </>
            )}
          </div>
          <div style={{ marginBottom: "18px" }}>
            <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "8px", color: "#0f172a" }}>Areas (tap — no typing)</div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                maxHeight: isMobile ? 200 : 240,
                overflowY: "auto",
                padding: "4px 2px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                background: "#fff",
              }}
            >
              {AREA_NAMES_SORTED.map((name) => {
                const on = (filters.neighborhoods || []).includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleNeighborhood(name)}
                    style={{
                      border: on ? "1px solid #b91c1c" : "1px solid #cbd5e1",
                      background: on ? "#fff1f2" : "#ffffff",
                      color: on ? "#9f1239" : "#0f172a",
                      borderRadius: "999px",
                      padding: "6px 11px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            {(filters.neighborhoods || []).length > 0 && (
              <button
                type="button"
                onClick={() => setFilters((p) => ({ ...p, neighborhoods: [] }))}
                style={{ marginTop: "8px", border: "none", background: "transparent", color: "#64748b", fontSize: "12px", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
              >
                Clear selected areas
              </button>
            )}
          </div>
          <div style={{ marginBottom: "18px" }}>
            <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "10px", color: "#0f172a" }}>BHK Type</div>
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
            <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "8px", color: "#0f172a" }}>Rent range: ₹ 10k to ₹ 1 Lakh</div>
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
              <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "10px", color: "#0f172a" }}>{label}</div>
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
              listings={displayPins}
              enabled={displayPins.length > 0}
              fallbackCenter={
                workplaceAnchor
                  ? [workplaceAnchor.lat, workplaceAnchor.lng]
                  : placeAnchor
                    ? [placeAnchor.lat, placeAnchor.lng]
                    : mapState.center && Number.isFinite(mapState.center[0])
                      ? mapState.center
                      : null
              }
              fallbackZoom={15}
            />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {placeAnchor && (
              <>
                <Circle
                  center={[placeAnchor.lat, placeAnchor.lng]}
                  radius={MAP_NEARBY_KM * 1000}
                  pathOptions={{ color: "#2563eb", fillColor: "#93c5fd", fillOpacity: 0.15, weight: 2 }}
                />
                <Marker position={[placeAnchor.lat, placeAnchor.lng]}>
                  <Popup>
                    <div style={{ backgroundColor: "#ffffff", color: "#0f172a", maxWidth: "240px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 600 }}>Searched place</div>
                      <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>{placeAnchor.label}</div>
                    </div>
                  </Popup>
                </Marker>
              </>
            )}
            {workplaceAnchor && (
              <>
                <Circle
                  center={[workplaceAnchor.lat, workplaceAnchor.lng]}
                  radius={COMMUTE_NEARBY_KM * 1000}
                  pathOptions={{ color: "#b45309", fillColor: "#fcd34d", fillOpacity: 0.12, weight: 2, dashArray: "6 6" }}
                />
                <Marker position={[workplaceAnchor.lat, workplaceAnchor.lng]}>
                  <Popup>
                    <div style={{ backgroundColor: "#ffffff", color: "#0f172a", maxWidth: "240px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 600 }}>Workplace</div>
                      <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>{workplaceAnchor.label}</div>
                    </div>
                  </Popup>
                </Marker>
              </>
            )}
            {displayPins.map((l) => (
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
                  <div
                    style={{
                      minWidth: "220px",
                      maxWidth: "280px",
                      backgroundColor: "#ffffff",
                      color: "#0f172a",
                      borderRadius: "8px",
                      isolation: "isolate",
                    }}
                  >
                    {l.image && <MediaElement src={l.image} alt={l.title} style={{ width: "100%", height: "108px", objectFit: "cover", borderRadius: "8px", marginBottom: "8px" }} />}
                    <div style={{ fontWeight: 700, fontSize: "15px", lineHeight: 1.35 }}>{l.title}</div>
                    <div style={{ fontSize: "13px", color: "#475569", marginTop: "2px" }}>{l.address}</div>
                    <div style={{ fontWeight: 800, color: "#15803d", fontSize: "17px", margin: "6px 0" }}>{l.price}</div>
                    <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.4 }}>{l.seller} | {l.contact}</div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                      <a href={"tel:" + l.contact} style={{ flex: 1, padding: "8px 10px", background: "#1e3a8a", color: "white", borderRadius: "8px", textAlign: "center", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}>Call</a>
                      <button type="button" onClick={() => setViewingProperty(l)} style={{ flex: 1, padding: "8px 10px", background: "#b91c1c", color: "white", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>Details</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {showMapSearchCard ? (
          <div
            style={{
              position: "absolute",
              top: isMobile ? 56 : 14,
              left: 12,
              right: isMobile ? 12 : "auto",
              zIndex: 1005,
              maxWidth: isMobile ? "none" : 520,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                pointerEvents: "auto",
                background: "#ffffff",
                borderRadius: 16,
                boxShadow: "0 12px 40px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(226, 232, 240, 0.9)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 14px",
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 800, color: "#334155" }}>Search & location</span>
                <button
                  type="button"
                  aria-label="Hide search panel"
                  onClick={() => setShowMapSearchOverlay(false)}
                  style={{
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    borderRadius: 10,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#475569",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Hide
                </button>
              </div>
              <div
                ref={mapSearchOverlayBodyRef}
                style={{
                  maxHeight: isMobile ? "min(56vh, 500px)" : 440,
                  overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
                }}
              >
              <div style={{ padding: "12px 14px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                {(placeAnchor || selectedLocality || workplaceAnchor) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", width: "100%" }}>
                    {workplaceAnchor && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "#fffbeb",
                          color: "#92400e",
                          borderRadius: 999,
                          padding: "6px 10px 6px 12px",
                          fontSize: 13,
                          fontWeight: 700,
                          maxWidth: "100%",
                        }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Office: {chipLabel(workplaceAnchor.label, 24)}</span>
                        <button
                          type="button"
                          aria-label="Remove workplace"
                          onClick={() => {
                            setWorkplaceAnchor(null);
                            setWorkplaceError("");
                          }}
                          style={{
                            border: "none",
                            background: "rgba(146, 64, 14, 0.12)",
                            color: "#78350f",
                            width: 22,
                            height: 22,
                            borderRadius: 999,
                            cursor: "pointer",
                            fontSize: 14,
                            lineHeight: 1,
                            fontWeight: 800,
                          }}
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {placeAnchor && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          borderRadius: 999,
                          padding: "6px 10px 6px 12px",
                          fontSize: 13,
                          fontWeight: 700,
                          maxWidth: "100%",
                        }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chipLabel(placeAnchor.label, 28)}</span>
                        <button
                          type="button"
                          aria-label="Remove place pin"
                          onClick={() => {
                            setPlaceAnchor(null);
                            setMapSearchError("");
                          }}
                          style={{
                            border: "none",
                            background: "rgba(29, 78, 216, 0.12)",
                            color: "#1e40af",
                            width: 22,
                            height: 22,
                            borderRadius: 999,
                            cursor: "pointer",
                            fontSize: 14,
                            lineHeight: 1,
                            fontWeight: 800,
                          }}
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {selectedLocality && !placeAnchor && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          borderRadius: 999,
                          padding: "6px 10px 6px 12px",
                          fontSize: 13,
                          fontWeight: 700,
                          maxWidth: "100%",
                        }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chipLabel(selectedLocality, 28)}</span>
                        <button
                          type="button"
                          aria-label="Clear area filter"
                          onClick={() => {
                            setSelectedLocality("");
                            setMapSearchInput("");
                          }}
                          style={{
                            border: "none",
                            background: "rgba(29, 78, 216, 0.12)",
                            color: "#1e40af",
                            width: 22,
                            height: 22,
                            borderRadius: 999,
                            cursor: "pointer",
                            fontSize: 14,
                            lineHeight: 1,
                            fontWeight: 800,
                          }}
                        >
                          ×
                        </button>
                      </span>
                    )}
                  </div>
                )}
                <input
                  value={mapSearchInput}
                  onChange={(e) => setMapSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitMapSearch();
                  }}
                  placeholder={
                    searchMode === "place"
                      ? "Metro, landmark, company (e.g. Google)…"
                      : "Area, society, broker / company name…"
                  }
                  style={{
                    flex: "1 1 160px",
                    minWidth: 0,
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "10px 12px",
                    fontSize: 15,
                    outline: "none",
                    background: "#f8fafc",
                  }}
                />
                <div
                  style={{
                    display: "inline-flex",
                    borderRadius: 999,
                    background: "#f1f5f9",
                    padding: 3,
                    flexShrink: 0,
                  }}
                >
                  {["local", "place"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSearchMode(m)}
                      style={{
                        border: "none",
                        borderRadius: 999,
                        padding: "7px 12px",
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: "pointer",
                        background: searchMode === m ? "#ffffff" : "transparent",
                        color: searchMode === m ? "#b91c1c" : "#64748b",
                        boxShadow: searchMode === m ? "0 1px 4px rgba(15,23,42,0.12)" : "none",
                      }}
                    >
                      {m === "local" ? "Location" : "Metro"}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={mapSearchLoading}
                  onClick={submitMapSearch}
                  aria-label="Search"
                  style={{
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    border: "none",
                    borderRadius: 12,
                    background: "#b91c1c",
                    color: "#fff",
                    cursor: mapSearchLoading ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 800,
                    boxShadow: "0 4px 14px rgba(185, 28, 28, 0.35)",
                  }}
                >
                  {mapSearchLoading ? "…" : "⌕"}
                </button>
              </div>
              <p style={{ width: "100%", margin: "4px 0 0", padding: "0 2px", fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
                Same search box: <strong>company</strong> (e.g. Google, Amazon), <strong>campus</strong> name, or switch{" "}
                <strong>Location</strong> / <strong>Metro</strong> for area vs map pin.
              </p>
              <div
                style={{
                  borderTop: "1px solid #f1f5f9",
                  padding: "10px 14px 12px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  alignItems: "center",
                  background: "#fafafa",
                }}
              >
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 800, color: "#64748b", flex: "1 1 140px", minWidth: 120 }}>
                    BHK type
                    <select
                      value={filters.bhkTypes.length === 1 ? filters.bhkTypes[0] : ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFilters((p) => ({ ...p, bhkTypes: v ? [v] : [] }));
                      }}
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 10,
                        padding: "10px 10px",
                        fontSize: 14,
                        fontWeight: 600,
                        background: "#fff",
                      }}
                    >
                      <option value="">Any</option>
                      {FILTER_OPTIONS.bhkTypes.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 800, color: "#64748b", flex: "1 1 160px", minWidth: 140 }}>
                    Building type
                    <select
                      value={filters.propertyTypes.length === 1 ? filters.propertyTypes[0] : ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFilters((p) => ({ ...p, propertyTypes: v ? [v] : [] }));
                      }}
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 10,
                        padding: "10px 10px",
                        fontSize: 14,
                        fontWeight: 600,
                        background: "#fff",
                      }}
                    >
                      <option value="">Any</option>
                      {FILTER_OPTIONS.propertyTypes.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              {workplaceError ? (
                <div style={{ padding: "0 14px 10px", fontSize: 12, color: "#b91c1c", fontWeight: 600, background: "#fffbeb" }}>{workplaceError}</div>
              ) : null}
              {workplaceAnchor && !workplaceError ? (
                <div style={{ padding: "0 14px 10px", fontSize: 12, color: "#78350f", background: "#fffbeb", lineHeight: 1.45 }}>
                  Showing homes within ~{COMMUTE_NEARBY_KM} km commute of <strong>{workplaceAnchor.label}</strong>
                </div>
              ) : null}
              <div
                style={{
                  width: "100%",
                  borderTop: "1px solid #fde68a",
                  padding: "10px 14px 12px",
                  background: "#fffbeb",
                  maxHeight: 130,
                  overflowY: "auto",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 800, color: "#92400e", marginBottom: 8, letterSpacing: "0.03em" }}>
                  POPULAR BENGALURU CAMPUSES (TAP)
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {BANGALORE_WORKPLACES.map((wp) => (
                    <button
                      key={wp.id}
                      type="button"
                      onClick={() => applyWorkplaceFromList(wp)}
                      style={{
                        border: workplaceAnchor?.label === wp.name ? "2px solid #b45309" : "1px solid #fcd34d",
                        background: workplaceAnchor?.label === wp.name ? "#fef3c7" : "#fff",
                        borderRadius: 999,
                        padding: "5px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#78350f",
                        cursor: "pointer",
                        maxWidth: "100%",
                        textAlign: "left",
                      }}
                    >
                      {wp.name}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ borderTop: "1px solid #f1f5f9", padding: "8px 12px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "flex-end", background: "#fff" }}>
                <button
                  type="button"
                  onClick={openFullFilterPanel}
                  style={{
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    color: "#b91c1c",
                    fontSize: 13,
                    fontWeight: 800,
                    borderRadius: 10,
                    padding: "8px 12px",
                    cursor: "pointer",
                  }}
                >
                  Full filter panel
                </button>
              </div>
              {(mapSearchError || placeAnchor) && (
                <div style={{ borderTop: "1px solid #f1f5f9", padding: "8px 14px 10px", fontSize: 12, lineHeight: 1.45 }}>
                  {mapSearchError ? <div style={{ color: "#b91c1c", fontWeight: 600 }}>{mapSearchError}</div> : null}
                  {placeAnchor && !mapSearchError ? (
                    <div style={{ color: "#64748b" }}>
                      Showing within ~{MAP_NEARBY_KM} km of <strong style={{ color: "#334155" }}>{placeAnchor.label}</strong>
                    </div>
                  ) : null}
                </div>
              )}
              </div>
            </div>
          </div>
          ) : null}

          {helpWidgetOpen ? (
            <div
              style={{
                position: "absolute",
                right: 12,
                bottom: isMobile ? (showMobileListings ? "calc(45vh + 14px)" : "92px") : 18,
                zIndex: 1006,
                maxWidth: 280,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  pointerEvents: "auto",
                  background: "#ffffff",
                  borderRadius: 14,
                  padding: "14px 16px",
                  boxShadow: "0 10px 36px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(226, 232, 240, 0.95)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#b91c1c",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 15,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      M
                    </span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Need help?</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, lineHeight: 1.45 }}>
                        Reach MovEazy on our contact page — we will get back to you quickly.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Dismiss"
                    onClick={() => setHelpWidgetOpen(false)}
                    style={{
                      border: "none",
                      background: "#f1f5f9",
                      color: "#64748b",
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 16,
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/contact")}
                  style={{
                    width: "100%",
                    border: "none",
                    borderRadius: 999,
                    padding: "10px 14px",
                    background: "#b91c1c",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(185, 28, 28, 0.3)",
                  }}
                >
                  Go to contact
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setHelpWidgetOpen(true)}
              aria-label="Need help"
              style={{
                position: "absolute",
                right: 14,
                bottom: isMobile ? (showMobileListings ? "calc(45vh + 14px)" : "92px") : 18,
                zIndex: 1006,
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: "none",
                background: "#b91c1c",
                color: "#fff",
                fontSize: 20,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 8px 24px rgba(185, 28, 28, 0.4)",
              }}
            >
              ?
            </button>
          )}
          
          {isMobile && (
            <div style={{ position: "absolute", top: 12, right: 12, zIndex: 1000, display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "calc(100% - 24px)" }}>
              {!showMapSearchOverlay ? (
                <button
                  type="button"
                  onClick={() => setShowMapSearchOverlay(true)}
                  style={{
                    background: "#ffffff",
                    color: "#0f172a",
                    border: "1px solid #e2e8f0",
                    padding: "10px 16px",
                    borderRadius: "24px",
                    fontWeight: 700,
                    fontSize: "14px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  }}
                >
                  Show search
                </button>
              ) : null}
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
            background: "#ffffff",
            borderLeft: isMobile ? "none" : "1px solid #e2e8f0",
            padding: isMobile ? `12px 12px ${helpWidgetOpen ? 120 : 72}px` : "16px 18px",
            fontSize: "15px",
            height: isMobile ? "45vh" : "100%",
            flexShrink: 0,
            position: isMobile ? "absolute" : "static",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: isMobile ? 1002 : 4,
            isolation: "isolate",
            boxShadow: isMobile ? "0 -8px 24px rgba(15, 23, 42, 0.18)" : "inset 1px 0 0 rgba(15, 23, 42, 0.04)",
            transform: isMobile ? (showMobileListings ? "translateY(0)" : "translateY(102%)") : "none",
            transition: "transform 0.25s ease",
          }}
        >
          <div style={{ fontSize: "17px", fontWeight: 800, marginBottom: "8px", color: "#0f172a" }}>
            Properties ({displayPins.length})
            {usingRelaxedPins ? (
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#b45309", marginTop: "4px" }}>
                Shown for context — adjust filters for exact matches.
              </div>
            ) : null}
          </div>
          {displayPins.map((l) => (
            <div
              key={l.id}
              onClick={() => setViewingProperty(l)}
              onMouseEnter={() => setMapState({ center: [l.lat, l.lng], zoom: 18 })}
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
              <div style={{ position: "relative", marginBottom: "10px" }}>
                {l.image ? (
                  <MediaElement src={l.image} alt={l.title} style={{ width: "100%", height: "148px", objectFit: "cover", borderRadius: "10px", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", height: "148px", borderRadius: "10px", background: "#e2e8f0" }} aria-hidden />
                )}
                <button
                  type="button"
                  aria-label={isListingSaved(user, l.id) ? "Remove from saved" : "Save listing"}
                  onClick={(e) => {
                    e.stopPropagation();
                    const now = toggleSavedListing(user, l.id, l.title);
                    void logSavedListingChange(user, l.id, now, l.title);
                    setSavedRevision((v) => v + 1);
                  }}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    border: "1px solid rgba(255,255,255,0.9)",
                    background: "rgba(255,255,255,0.95)",
                    boxShadow: "0 2px 10px rgba(15,23,42,0.15)",
                    cursor: "pointer",
                    fontSize: 18,
                    lineHeight: 1,
                    color: isListingSaved(user, l.id) ? "#b91c1c" : "#64748b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isListingSaved(user, l.id) ? "♥" : "♡"}
                </button>
              </div>
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
          onSavedChange={() => setSavedRevision((v) => v + 1)}
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
