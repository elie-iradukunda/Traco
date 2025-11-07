import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/Admin/AdminLayout";
import { getAllVehicleLocations } from "../../services/api";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Ensure Leaflet default icons render correctly
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const BoundsUpdater = ({ positions }) => {
  const map = useMap();

  useEffect(() => {
    if (!positions.length) return;
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [positions, map]);

  return null;
};

const FleetMap = ({ vehicles }) => {
  const markers = useMemo(
    () =>
      vehicles
        .map((vehicle) => ({
          ...vehicle,
          latitude: vehicle.latitude !== null ? Number(vehicle.latitude) : null,
          longitude: vehicle.longitude !== null ? Number(vehicle.longitude) : null,
        }))
        .filter((vehicle) =>
          Number.isFinite(vehicle.latitude) && Number.isFinite(vehicle.longitude)
        ),
    [vehicles]
  );

  const defaultCenter = markers.length
    ? [markers[0].latitude, markers[0].longitude]
    : [0.3476, 32.5825]; // Kampala (fallback)

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-xl border border-gray-200" style={{ height: "520px" }}>
      <MapContainer
        center={defaultCenter}
        zoom={markers.length ? 12 : 5}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {markers.length > 1 && (
          <BoundsUpdater positions={markers.map((marker) => [marker.latitude, marker.longitude])} />
        )}

        {markers.map((vehicle) => (
          <Marker
            key={vehicle.vehicle_id}
            position={[vehicle.latitude, vehicle.longitude]}
          >
            <Popup minWidth={240}>
              <div className="space-y-1">
                <div className="font-bold text-lg">{vehicle.plate_number || "Vehicle"}</div>
                <div className="text-sm text-gray-600">{vehicle.route_name || "Unassigned Route"}</div>
                <div className="text-xs text-gray-500 mt-2">
                  <div>Latitude: {vehicle.latitude.toFixed(5)}</div>
                  <div>Longitude: {vehicle.longitude.toFixed(5)}</div>
                  {vehicle.current_location && (
                    <div>Location: {vehicle.current_location}</div>
                  )}
                  {vehicle.estimated_arrival && (
                    <div>ETA: {vehicle.estimated_arrival}</div>
                  )}
                  <div>
                    Updated: {vehicle.last_updated
                      ? new Date(vehicle.last_updated).toLocaleString()
                      : "Unknown"}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

const LiveTracking = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const loadLocations = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      const response = await getAllVehicleLocations();
      setVehicles(Array.isArray(response.data) ? response.data : []);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error("Failed to load vehicle locations", err);
      setError(err.response?.data?.error || "Unable to fetch vehicle GPS data");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => loadLocations(true), 15000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const activeVehicles = useMemo(
    () =>
      vehicles.filter(
        (vehicle) =>
          Number.isFinite(Number(vehicle.latitude)) &&
          Number.isFinite(Number(vehicle.longitude))
      ),
    [vehicles]
  );

  const calculateTimeAgo = (timestamp) => {
    if (!timestamp) return "Unknown";
    const diff = Date.now() - new Date(timestamp).getTime();
    const diffMinutes = Math.floor(diff / 60000);
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">🚦 Live Fleet Tracking</h1>
            <p className="text-gray-600">
              Monitor every active vehicle in real-time across all routes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
              />
              Auto-refresh (15s)
            </label>
            <button
              onClick={() => loadLocations()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              🔄 Refresh Now
            </button>
            <div className="text-xs text-gray-500">
              Last updated: {lastRefreshedAt ? lastRefreshedAt.toLocaleTimeString() : "--"}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64 bg-white rounded-2xl shadow-lg">
            <div className="text-xl text-gray-500">Loading live vehicle positions...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="text-2xl font-bold text-red-900 mb-2">GPS Tracking Unavailable</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => loadLocations()}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🚗</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Live Vehicles</h3>
            <p className="text-gray-600">
              Once drivers enable GPS tracking, vehicles will appear here in real-time.
            </p>
          </div>
        ) : (
          <>
            <FleetMap vehicles={vehicles} />

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <span>Vehicle Activity Overview</span>
                <span className="text-sm font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                  {activeVehicles.length} active on map
                </span>
                <span className="text-sm font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                  {vehicles.length} total reporting
                </span>
              </h2>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Vehicle
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Route
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Coordinates
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Speed
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Driver
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Last Update
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 text-sm">
                    {vehicles.map((vehicle) => (
                      <tr key={vehicle.vehicle_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{vehicle.plate_number || `Vehicle ${vehicle.vehicle_id}`}</div>
                          <div className="text-xs text-gray-500">{vehicle.model || "Model N/A"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-800 font-medium">{vehicle.route_name || "Not assigned"}</div>
                          <div className="text-xs text-gray-500">
                            {vehicle.start_location && vehicle.end_location
                              ? `${vehicle.start_location} → ${vehicle.end_location}`
                              : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-900">{vehicle.current_location || "GPS only"}</div>
                          {vehicle.estimated_arrival && (
                            <div className="text-xs text-green-600 font-semibold mt-1">
                              ETA: {vehicle.estimated_arrival}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {vehicle.latitude && vehicle.longitude ? (
                            <div className="font-mono text-xs text-gray-700">
                              {Number(vehicle.latitude).toFixed(5)}, {" "}
                              {Number(vehicle.longitude).toFixed(5)}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No coordinates</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {vehicle.speed ? (
                            <span className="font-semibold text-blue-600">{vehicle.speed} km/h</span>
                          ) : (
                            <span className="text-xs text-gray-400">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-800">{vehicle.driver_name || "N/A"}</div>
                          <div className="text-xs text-gray-500">Driver ID: {vehicle.driver_id || "--"}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          <div>{vehicle.last_updated ? new Date(vehicle.last_updated).toLocaleString() : "Unknown"}</div>
                          <div className="text-green-600 font-medium">{calculateTimeAgo(vehicle.last_updated)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default LiveTracking;

