import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Truck, Home, AlertTriangle, Package, Navigation } from 'lucide-react';
import { getCategoryIcon, getUrgencyColor, getStatusColor, getPriorityColor } from '../utils/helpers';

// Fix Leaflet marker icon issue
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const CampMarker = ({ camp, onClick, isSelected }) => {
  const isActive = camp.status === 'active';
  const color = isActive ? '#22c55e' : camp.status === 'full' ? '#f59e0b' : '#ef4444';
  
  return (
    <Marker 
      position={[camp.lat, camp.lng]} 
      onClick={(e) => { e.originalEvent.stopPropagation(); onClick?.(camp); }}
    >
      <div className="flex flex-col items-center">
        <div 
          className={`w-4 h-4 rounded-full border-2 border-white shadow-lg ${isSelected ? 'ring-2 ring-primary-500' : ''}`}
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-medium text-slate-700 bg-white px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap mt-1">
          {camp.name}
        </span>
      </div>
      <Popup>
        <div className="p-2 min-w-[200px]">
          <h3 className="font-semibold text-slate-900">{camp.name}</h3>
          <p className="text-sm text-slate-500">{camp.location?.address || `${camp.lat.toFixed(4)}, ${camp.lng.toFixed(4)}`}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-slate-500">Capacity:</span> <span className="font-medium">{camp.capacity}</span></div>
            <div><span className="text-slate-500">Population:</span> <span className="font-medium">{camp.currentPopulation}</span></div>
            <div><span className="text-slate-500">Status:</span> <span className={`badge ${getStatusColor(camp.status)}`}>{camp.status}</span></div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

const TransferLine = ({ transfer, camps }) => {
  const fromCamp = camps.find(c => c._id === transfer.fromCampId?._id || c._id === transfer.fromCampId);
  const toCamp = camps.find(c => c._id === transfer.toCampId?._id || c._id === transfer.toCampId);
  
  if (!fromCamp || !toCamp) return null;
  
  const getColor = () => {
    switch (transfer.status) {
      case 'delivered': return '#22c55e';
      case 'in_transit': return '#f59e0b';
      case 'assigned': return '#3b82f6';
      case 'cancelled': return '#ef4444';
      case 'failed': return '#6b7280';
      default: return '#94a3b8';
    }
  };
  
  const getDashArray = () => {
    return transfer.status === 'in_transit' ? '10,5' : 'none';
  };
  
  return (
    <Polyline
      positions={[
        [fromCamp.lat, fromCamp.lng],
        [toCamp.lat, toCamp.lng]
      ]}
      color={getColor()}
      weight={3}
      opacity={0.8}
      dashArray={getDashArray()}
      className="transfer-line"
    >
      <Popup>
        <div className="p-2 min-w-[220px]">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-5 h-5" style={{ color: getColor() }} />
            <h4 className="font-semibold text-slate-900">Transfer</h4>
          </div>
          <p className="text-sm text-slate-600">
            {transfer.itemName} • {transfer.quantity} {transfer.unit}
          </p>
          <p className="text-xs text-slate-500">
            {fromCamp.name} → {toCamp.name}
          </p>
          <p className="text-xs text-slate-500">
            {transfer.routeDistanceKm} km • {transfer.routeDurationMinutes} min
          </p>
          <span className={`badge ${getPriorityColor(transfer.priority)} mt-1 inline-block`}>
            {transfer.priority}
          </span>
          <span className={`badge ${getStatusColor(transfer.status)} ml-1 inline-block`}>
            {transfer.status.replace('_', ' ')}
          </span>
        </div>
      </Popup>
    </Polyline>
  );
};

const MapView = ({ 
  camps = [], 
  transfers = [], 
  requests = [],
  selectedCamp = null,
  onCampClick,
  center = [12.9716, 77.5946], // Default to Bangalore
  zoom = 7,
  height = '500px'
}) => {
  const mapRef = useRef(null);
  const [mapCenter, setMapCenter] = useState(center);
  const [mapZoom, setMapZoom] = useState(zoom);
  const [showTransfers, setShowTransfers] = useState(true);
  const [showRequests, setShowRequests] = useState(false);

  const activeTransfers = transfers.filter(t => 
    ['proposed', 'assigned', 'in_transit'].includes(t.status)
  );
  
  const openRequests = requests.filter(r => 
    ['open', 'partial', 'matched'].includes(r.status)
  );

  return (
    <div className="card" style={{ height }}>
      <div className="card-header flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Map View</h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showTransfers}
              onChange={(e) => setShowTransfers(e.target.checked)}
              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            Transfers
          </label>
          <label className="flex items-center gap-1 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showRequests}
              onChange={(e) => setShowRequests(e.target.checked)}
              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            Requests
          </label>
        </div>
      </div>
      <div className="card-body p-0" style={{ height: 'calc(100% - 56px)' }}>
        <MapContainer
          ref={mapRef}
          center={mapCenter}
          zoom={mapZoom}
          onMoveend={(e) => {
            const center = e.target.getCenter();
            const zoom = e.target.getZoom();
            setMapCenter([center.lat, center.lng]);
            setMapZoom(zoom);
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Transfer routes */}
          {showTransfers && activeTransfers.map(transfer => (
            <TransferLine key={transfer._id} transfer={transfer} camps={camps} />
          ))}
          
          {/* Camps */}
          {camps.map(camp => (
            <CampMarker
              key={camp._id}
              camp={camp}
              isSelected={selectedCamp?._id === camp._id}
              onClick={onCampClick}
            />
          ))}
          
          {/* Request markers */}
          {showRequests && openRequests.map(request => {
            const camp = camps.find(c => c._id === request.campId?._id || c._id === request.campId);
            if (!camp) return null;
            
            return (
              <CircleMarker
                key={request._id}
                center={[camp.lat, camp.lng]}
                radius={12}
                color="#ef4444"
                fillColor="#ef4444"
                fillOpacity={0.3}
                weight={2}
                className="animate-pulse"
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-danger-600" />
                      <h4 className="font-semibold text-slate-900">Urgent Need</h4>
                    </div>
                    <p className="text-sm text-slate-600">
                      {request.itemName} • {request.quantityNeeded} {request.unit}
                    </p>
                    <p className="text-xs text-slate-500">
                      Category: {request.category}
                    </p>
                    <span className={`badge ${getUrgencyColor(request.urgency)} mt-1 inline-block`}>
                      {request.urgency}
                    </span>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapView;