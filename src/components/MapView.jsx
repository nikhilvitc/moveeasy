import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon issue in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const properties = [
  { id: 1, title: 'Luxury 3BHK Apartment', price: 'Rs. 15,000/mo', type: 'Rent', seller: 'Settlin Zero Brokerage', contact: '9590039003', lat: 12.9279, lng: 77.6271, address: 'Koramangala, Bengaluru' },
  { id: 2, title: 'Spacious Villa', price: 'Rs. 2.5 Cr', type: 'Sale', seller: 'Marketing Team', contact: '09611615947', lat: 12.9141, lng: 77.6308, address: 'HSR Layout, Bengaluru' },
  { id: 3, title: 'Furnished 2BHK', price: 'Rs. 25,000/mo', type: 'Rent', seller: 'HomeSource', contact: '09972531093', lat: 12.9719, lng: 77.6412, address: 'Indiranagar, Bengaluru' },
  { id: 4, title: 'Commercial Office Space', price: 'Rs. 75,000/mo', type: 'Rent', seller: 'PROPSPIRES', contact: '08041488389', lat: 12.9308, lng: 77.5838, address: 'Jayanagar, Bengaluru' },
  { id: 5, title: 'Modern Studio Apartment', price: 'Rs. 12,000/mo', type: 'Rent', seller: 'Leads Realty', contact: '09019000400', lat: 13.0279, lng: 77.5409, address: 'Yeshwanthpur, Bengaluru' },
  { id: 6, title: 'Independent House', price: 'Rs. 1.2 Cr', type: 'Sale', seller: 'Sugumar Properties', contact: '09845688500', lat: 12.9081, lng: 77.5872, address: 'JP Nagar, Bengaluru' },
  { id: 7, title: 'Penthouse Suite', price: 'Rs. 80,000/mo', type: 'Rent', seller: 'Chandra Babu', contact: '09844759922', lat: 12.9925, lng: 77.7159, address: 'Whitefield, Bengaluru' },
  { id: 8, title: 'Cozy 1BHK', price: 'Rs. 18,000/mo', type: 'Rent', seller: 'Maven Realty', contact: '09739490514', lat: 12.9856, lng: 77.5255, address: 'Rajajinagar, Bengaluru' },
  { id: 9, title: 'Luxury Duplex', price: 'Rs. 3.1 Cr', type: 'Sale', seller: 'Siddardha Homes', contact: '09019343232', lat: 13.0604, lng: 77.5813, address: 'Yelahanka, Bengaluru' },
  { id: 10, title: 'Affordable 2BHK', price: 'Rs. 20,000/mo', type: 'Rent', seller: 'Gruhaa Marketing', contact: '9632445483', lat: 12.8452, lng: 77.6602, address: 'Electronic City, Bengaluru' },
  { id: 11, title: 'Premium Plot', price: 'Rs. 95 Lakhs', type: 'Sale', seller: 'Syed Nadeem', contact: '09008395447', lat: 13.0031, lng: 77.6206, address: 'Frazer Town, Bengaluru' },
];

export default function MapView() {
  const [selected, setSelected] = useState(null);

  return (
    <div className='flex flex-col lg:flex-row h-screen bg-gray-50'>
      <div className='w-full lg:w-96 bg-white shadow-xl z-10 flex flex-col h-full overflow-hidden'>
        <div className='p-6 bg-gradient-to-r from-blue-900 to-blue-700 text-white'>
          <h1 className='text-2xl font-extrabold tracking-tight'>Moveasy</h1>
          <p className='text-blue-200 text-sm mt-1'>Interactive Property Map</p>
        </div>
        <div className='p-3 border-b bg-gray-50 flex justify-between items-center'>
          <span className='font-bold text-gray-700 text-sm'>Verified Listings</span>
          <span className='bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold'>{properties.length} Live</span>
        </div>
        <div className='flex-1 overflow-y-auto p-3 space-y-3'>
          {properties.map((prop) => (
            <div
              key={prop.id}
              onClick={() => setSelected(prop)}
              className={'bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition cursor-pointer border-l-4 ' + (selected && selected.id === prop.id ? 'border-l-blue-500 bg-blue-50' : 'border-l-blue-900 hover:border-l-blue-500')}
            >
              <div className='flex justify-between items-start mb-1'>
                <span className={'text-xs font-bold px-2 py-0.5 rounded ' + (prop.type === 'Sale' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800')}>{prop.type}</span>
                <span className='font-extrabold text-green-700 text-sm'>{prop.price}</span>
              </div>
              <h3 className='font-bold text-gray-800 text-sm leading-tight'>{prop.title}</h3>
              <p className='text-xs text-gray-500 mt-1'>Address: {prop.address}</p>
              <div className='mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded'>
                <span className='font-semibold'>{prop.seller}</span> . {prop.contact}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className='flex-1 relative'>
        <MapContainer center={[12.9716, 77.5946]} zoom={11} className='h-full w-full z-0' style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; OpenStreetMap' url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
          {properties.map((prop) => (
            <Marker key={prop.id} position={[prop.lat, prop.lng]} eventHandlers={{ click: () => setSelected(prop) }}>
              <Popup>
                <div className='p-1 min-w-[200px]'>
                  <h3 className='font-bold text-base text-gray-900'>{prop.title}</h3>
                  <p className='text-gray-600 text-sm'>Address: {prop.address}</p>
                  <div className='flex justify-between items-center mt-2 border-t pt-2'>
                    <span className='text-lg font-black text-blue-900'>{prop.price}</span>
                  </div>
                  <a href={'tel:' + prop.contact} className='mt-2 block w-full text-center bg-blue-900 text-white font-bold py-2 rounded shadow hover:bg-blue-800 transition text-sm'>Call {prop.contact}</a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
