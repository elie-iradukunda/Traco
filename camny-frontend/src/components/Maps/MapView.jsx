import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Component to handle map updates when location changes
function MapUpdater({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  
  return null;
}

const MapView = ({ 
  latitude, 
  longitude, 
  locationName = "Vehicle Location",
  height = "400px",
  zoom = 13,
  showPopup = true,
  routePath = null // Array of {lat, lng} points for route visualization
}) => {
  const position = latitude && longitude ? [latitude, longitude] : null;

  if (!position) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300"
        style={{ height }}
      >
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📍</div>
          <p className="text-lg font-semibold">Waiting for GPS coordinates...</p>
          <p className="text-sm">Location will appear here once available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg overflow-hidden shadow-lg border-2 border-gray-200" style={{ height }}>
      <MapContainer
        center={position}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater center={position} zoom={zoom} />
        
        <Marker position={position}>
          {showPopup && (
            <Popup>
              <div className="text-center">
                <div className="font-bold text-lg mb-1">{locationName}</div>
                <div className="text-sm text-gray-600">
                  <div>Lat: {latitude.toFixed(6)}</div>
                  <div>Lng: {longitude.toFixed(6)}</div>
                </div>
              </div>
            </Popup>
          )}
        </Marker>
        
        {/* Route path visualization */}
        {routePath && routePath.length > 1 && (
          <Polyline
            positions={routePath}
            pathOptions={{ color: "blue", weight: 4, opacity: 0.7 }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default MapView;
