import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import MapView from "../../components/Maps/MapView";

const TrackVehicle = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { ticketId } = useParams();
  const [loading, setLoading] = useState(true);
  const [vehicleData, setVehicleData] = useState(null);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "passenger") {
      navigate("/login");
      return;
    }
    loadVehicleLocation();
  }, [user, ticketId]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadVehicleLocation(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, ticketId]);

  const loadVehicleLocation = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5000/api/tracking/my-vehicle/${ticketId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setVehicleData(response.data);
    } catch (err) {
      console.error("Error loading vehicle location:", err);
      setError(err.response?.data?.error || "Failed to load vehicle location");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const calculateTimeAgo = (timestamp) => {
    if (!timestamp) return "Unknown";
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Track Vehicle</h1>
            <p className="text-gray-600">Real-time location tracking for your journey</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate("/passenger/my-tickets")}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Back to Tickets
            </button>
            <button
              onClick={() => loadVehicleLocation()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-xl text-gray-500">Loading vehicle location...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="text-2xl font-bold text-red-900 mb-2">Error</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => loadVehicleLocation()}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : vehicleData ? (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {vehicleData.ticket.route_name}
                  </h2>
                  <p className="text-gray-600">
                    {vehicleData.ticket.start_location} → {vehicleData.ticket.end_location}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Vehicle</p>
                  <p className="text-lg font-bold text-gray-900">
                    {vehicleData.ticket.plate_number}
                  </p>
                  <p className="text-sm text-gray-600">{vehicleData.ticket.vehicle_model}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
                  <p className="text-sm text-gray-600 mb-1">Ticket ID</p>
                  <p className="font-mono font-bold text-gray-900">#{vehicleData.ticket.ticket_id}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-600">
                  <p className="text-sm text-gray-600 mb-1">Seat Number</p>
                  <p className="font-bold text-gray-900">{vehicleData.ticket.seat_number}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-gray-700">Auto-refresh every 10 seconds</span>
                </label>
              </div>
            </div>

            {vehicleData.location ? (
              <>
                {/* Embedded Map View */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    🗺️ Live Map Tracking
                    <span className="text-sm font-normal text-green-600 bg-green-100 px-3 py-1 rounded-full">
                      ● Live
                    </span>
                  </h3>
                  <MapView
                    latitude={parseFloat(vehicleData.location.latitude)}
                    longitude={parseFloat(vehicleData.location.longitude)}
                    locationName={vehicleData.location.current_location || `${vehicleData.ticket.plate_number} - ${vehicleData.ticket.route_name}`}
                    height="500px"
                    zoom={15}
                    showPopup={true}
                  />
                  <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
                    <span>Last updated: {calculateTimeAgo(vehicleData.location.last_updated)}</span>
                    <a
                      href={`https://www.google.com/maps?q=${vehicleData.location.latitude},${vehicleData.location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      Open in Google Maps →
                    </a>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-xl shadow-lg p-8 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">📍 Current Location</h3>
                    <span className="bg-white bg-opacity-20 px-4 py-2 rounded-lg text-sm">
                      Live Tracking
                    </span>
                  </div>
                  
                  <div className="bg-white bg-opacity-20 rounded-lg p-6 mb-4">
                    <p className="text-3xl font-bold mb-2">
                      {vehicleData.location.current_location || "Location Updating..."}
                    </p>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="opacity-80">Latitude: </span>
                        <span className="font-mono font-semibold">{vehicleData.location.latitude}</span>
                      </div>
                      <div>
                        <span className="opacity-80">Longitude: </span>
                        <span className="font-mono font-semibold">{vehicleData.location.longitude}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {vehicleData.location.speed && (
                      <div className="bg-white bg-opacity-20 rounded-lg p-4">
                        <p className="text-sm opacity-80 mb-1">Speed</p>
                        <p className="text-2xl font-bold">{vehicleData.location.speed} km/h</p>
                      </div>
                    )}
                    {vehicleData.location.heading && (
                      <div className="bg-white bg-opacity-20 rounded-lg p-4">
                        <p className="text-sm opacity-80 mb-1">Heading</p>
                        <p className="text-2xl font-bold">{vehicleData.location.heading}°</p>
                      </div>
                    )}
                    {vehicleData.location.estimated_arrival && (
                      <div className="bg-white bg-opacity-20 rounded-lg p-4">
                        <p className="text-sm opacity-80 mb-1">ETA</p>
                        <p className="text-lg font-bold">{vehicleData.location.estimated_arrival}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 text-sm opacity-80">
                    Last updated: {calculateTimeAgo(vehicleData.location.last_updated)}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Location Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Vehicle ID</span>
                      <span className="font-semibold">{vehicleData.location.vehicle_id}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Coordinates</span>
                      <span className="font-mono font-semibold">
                        {vehicleData.location.latitude}, {vehicleData.location.longitude}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Last Update</span>
                      <span className="font-semibold">
                        {new Date(vehicleData.location.last_updated).toLocaleString()}
                      </span>
                    </div>
                  </div>

                </div>
              </>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
                <div className="text-6xl mb-4">🚗</div>
                <h3 className="text-2xl font-bold text-yellow-900 mb-2">
                  Location Not Yet Available
                </h3>
                <p className="text-yellow-700 mb-4">
                  The driver hasn't started sharing their location yet. 
                  Location tracking will become available once the journey begins.
                </p>
                <button
                  onClick={() => loadVehicleLocation()}
                  className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Check Again
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">❓</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Data</h3>
            <p className="text-gray-600">Unable to load vehicle information</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackVehicle;
