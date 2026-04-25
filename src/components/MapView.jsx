import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import listingsData from '../data/listingsData';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const bhkColors = {
  '1RK': '#F59E0B',
  '1BHK': '#3B82F6',
  '2BHK': '#EF4444',
  '3BHK': '#EC4899',
  '3+BHK': '#10B981',
  '4BHK': '#8B5CF6',
  'Office': '#6B7280',
  'Plot': '#F97316',
};

const areas = {
  'Koramangala': [12.9351, 77.6244],
  'HSR Layout': [12.9141, 77.6361],
  'Indiranagar': [12.9719, 77.6412],
  'Jayanagar': [12.9308, 77.5838],
  'JP Nagar': [12.9063, 77.5857],
  'Whitefield': [12.9698, 77.7500],
};

function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

function createBHKIcon(bhk) {
  const color = bhkColors[bhk] || '#3B82F6';
  return L.divIcon({
    className: '',
    html: '<div style="background:' + color + ';color:white;padding:4px 10px;border-radius:16px;font-weight:bold;font-size:12px;white-space:nowrap;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);text-align:center;cursor:pointer;">' + bhk + '</div>',
    iconSize: [60, 28],
    iconAnchor: [30, 28],
    popupAnchor: [0, -28],
  });
}

export default function MapView() {
  const [selected, setSelected] = useState(null);
  const [mapState, setMapState] = useState({ center: [12.9716, 77.5946], zoom: 12 });
  const properties = listingsData;

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #1e40af)', color: 'white', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>Moveasy</h1>
          <p style={{ fontSize: '12px', margin: 0, opacity: 0.8 }}>Interactive Property Map - Bengaluru</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {Object.keys(areas).slice(0, 3).map(area => (
            <button
              key={area}
              onClick={() => setMapState({ center: areas[area], zoom: 14 })}
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '15px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: '#f8fafc', padding: '8px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Filter BHK:</span>
        {Object.entries(bhkColors).map(([bhk, color]) => (
          <span key={bhk} style={{ background: color, color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>{bhk}</span>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {Object.keys(areas).slice(3).map(area => (
            <button
              key={area}
              onClick={() => setMapState({ center: areas[area], zoom: 14 })}
              style={{ background: 'white', color: '#1e3a8a', border: '1px solid #1e3a8a', padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer
            center={mapState.center}
            zoom={mapState.zoom}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <ChangeView center={mapState.center} zoom={mapState.zoom} />
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
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

        <div style={{ width: '320px', background: 'white', borderLeft: '1px solid #e2e8f0', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#334155' }}>Verified Listings</span>
            <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>{properties.length} Live</span>
          </div>
          {properties.map((prop) => (
            <div
              key={prop.id}
              onClick={() => {
                setSelected(prop);
                setMapState({ center: [prop.lat, prop.lng], zoom: 15 });
              }}
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
                <b>{prop.seller}</b> - {prop.contact}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
                                  }
