import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const properties = [
  { id: 1, title: "Luxury 3BHK Apartment", price: "Rs.15,000/mo", type: "Rent", bhk: "3BHK", seller: "Settlin Zero Brokerage", contact: "9590039003", lat: 12.9279, lng: 77.6271, address: "Koramangala, Bengaluru" },
  { id: 2, title: "Spacious Villa", price: "Rs.2.5 Cr", type: "Sale", bhk: "4BHK", seller: "Marketing Team", contact: "09611615947", lat: 12.9141, lng: 77.6308, address: "HSR Layout, Bengaluru" },
  { id: 3, title: "Furnished 2BHK", price: "Rs.25,000/mo", type: "Rent", bhk: "2BHK", seller: "HomeSource", contact: "09972531093", lat: 12.9719, lng: 77.6412, address: "Indiranagar, Bengaluru" },
  { id: 4, title: "Commercial Office Space", price: "Rs.75,000/mo", type: "Rent", bhk: "Office", seller: "PROPSPIRES", contact: "08041488389", lat: 12.9308, lng: 77.5838, address: "Jayanagar, Bengaluru" },
  { id: 5, title: "Modern Studio Apartment", price: "Rs.12,000/mo", type: "Rent", bhk: "1RK", seller: "Leads Realty", contact: "09019000400", lat: 13.0279, lng: 77.5409, address: "Yeshwanthpur, Bengaluru" },
  { id: 6, title: "Independent House", price: "Rs.1.2 Cr", type: "Sale", bhk: "3BHK", seller: "Sugumar Properties", contact: "09845688500", lat: 12.9081, lng: 77.5872, address: "JP Nagar, Bengaluru" },
  { id: 7, title: "Penthouse Suite", price: "Rs.80,000/mo", type: "Rent", bhk: "3+BHK", seller: "Chandra Babu", contact: "09844759922", lat: 12.9925, lng: 77.7159, address: "Whitefield, Bengaluru" },
  { id: 8, title: "Cozy 1BHK", price: "Rs.18,000/mo", type: "Rent", bhk: "1BHK", seller: "Maven Realty", contact: "09739490514", lat: 12.9856, lng: 77.5255, address: "Rajajinagar, Bengaluru" },
  { id: 9, title: "Luxury Duplex", price: "Rs.3.1 Cr", type: "Sale", bhk: "4BHK", seller: "Siddardha Homes", contact: "09019343232", lat: 13.0604, lng: 77.5813, address: "Yelahanka, Bengaluru" },
  { id: 10, title: "Affordable 2BHK", price: "Rs.20,000/mo", type: "Rent", bhk: "2BHK", seller: "Gruhaa Marketing", contact: "9632445483", lat: 12.8452, lng: 77.6602, address: "Electronic City, Bengaluru" },
  { id: 11, title: "Premium Plot", price: "Rs.95 Lakhs", type: "Sale", bhk: "Plot", seller: "Syed Nadeem", contact: "09008395447", lat: 13.0031, lng: 77.6206, address: "Frazer Town, Bengaluru" },
];

const bhkColors = {
  "1RK": "#F59E0B",
  "1BHK": "#3B82F6",
  "2BHK": "#EF4444",
  "3BHK": "#EC4899",
  "3+BHK": "#10B981",
  "4BHK": "#8B5CF6",
  "Office": "#6B7280",
  "Plot": "#F97316",
};

function createBHKIcon(bhk) {
  const color = bhkColors[bhk] || "#3B82F6";
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};color:white;padding:4px 10px;border-radius:16px;font-weight:bold;font-size:12px;white-space:nowrap;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);text-align:center;cursor:pointer;">${bhk}</div>`,
    iconSize: [60, 28],
    iconAnchor: [30, 28],
    popupAnchor: [0, -28],
  });
}

export default function MapView() {
  const [selected, setSelected] = useState(null);

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #1e40af)', color: 'white', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>Moveasy</h1>
          <p style={{ fontSize: '12px', margin: 0, opacity: 0.8 }}>Interactive Property Map - Bengaluru</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>
          {properties.length} Listings Live
        </div>
      </div>

      {/* BHK Legend Bar */}
      <div style={{ background: '#f8fafc', padding: '8px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Filter:</span>
        {Object.entries(bhkColors).map(([bhk, color]) => (
          <span key={bhk} style={{ background: color, color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>{bhk}</span>
        ))}
      </div>

      {/* Main Content: Map + Sidebar */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer
            center={[12.9716, 77.5946]}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {properties.map((prop) => (
              <Marker
                key={prop.id}
                position={[prop.lat, prop.lng]}
                icon={createBHKIcon(prop.bhk)}
                eventHandlers={{ click: () => setSelected(prop) }}
              >
                <Popup>
                  <div style={{ minWidth: '220px', fontFamily: 'system-ui, sans-serif' }}>
                    <div style={{ background: bhkColors[prop.bhk], color: 'white', padding: '3px 10px', borderRadius: '10px', display: 'inline-block', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>{prop.bhk}</div>
                    <h3 style={{ margin: '4px 0', fontSize: '15px', fontWeight: 700 }}>{prop.title}</h3>
                    <p style={{ margin: '2px 0', fontSize: '13px', color: '#666' }}>📍 {prop.address}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0', paddingTop: '6px', borderTop: '1px solid #eee' }}>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#1e3a8a' }}>{prop.price}</span>
                      <span style={{ background: prop.type === 'Sale' ? '#dcfce7' : '#dbeafe', color: prop.type === 'Sale' ? '#166534' : '#1e40af', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700 }}>For {prop.type}</span>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '6px', fontSize: '13px', margin: '4px 0' }}>
                      <b>{prop.seller}</b>
                    </div>
                    <a href={'tel:' + prop.contact} style={{ display: 'block', textAlign: 'center', background: '#1e3a8a', color: 'white', padding: '8px', borderRadius: '6px', marginTop: '6px', textDecoration: 'none', fontWeight: 700, fontSize: '13px' }}>
                      📞 Call {prop.contact}
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Sidebar */}
        <div style={{ width: '320px', background: 'white', borderLeft: '1px solid #e2e8f0', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#334155' }}>Verified Listings</span>
            <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>{properties.length} Live</span>
          </div>
          {properties.map((prop) => (
            <div
              key={prop.id}
              onClick={() => setSelected(prop)}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f1f5f9',
                cursor: 'pointer',
                borderLeft: selected?.id === prop.id ? '4px solid #1e3a8a' : '4px solid transparent',
                background: selected?.id === prop.id ? '#eff6ff' : 'white',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ background: bhkColors[prop.bhk], color: 'white', padding: '1px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>{prop.bhk}</span>
                <span style={{ fontWeight: 800, color: '#166534', fontSize: '13px' }}>{prop.price}</span>
              </div>
              <h4 style={{ margin: '2px 0', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{prop.title}</h4>
              <p style={{ margin: '2px 0', fontSize: '12px', color: '#94a3b8' }}>📍 {prop.address}</p>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                <b>{prop.seller}</b> · {prop.contact}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
