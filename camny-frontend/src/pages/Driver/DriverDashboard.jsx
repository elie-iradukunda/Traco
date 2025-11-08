import React, { useEffect, useState } from "react";
import { 
  getMyDriverAssignments, 
  getVehiclePassengers,
  scanTicket,
  confirmBoarding,
  updateLocation,
  updateVehicleLocation,
  startJourney,
  stopJourney
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import LogoutButton from "../../components/LogoutButton";
import MapView from "../../components/Maps/MapView";
import DarkModeToggle from "../../components/Common/DarkModeToggle";

const DriverDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [passengers, setPassengers] = useState([]);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("assignments"); // assignments, passengers, scanner, journey
  
  // Scanner state
  const [qrCodeInput, setQrCodeInput] = useState("");
  const [scannedTicket, setScannedTicket] = useState(null);
  const [scanning, setScanning] = useState(false);
  
  // Journey tracking state
  const [journeyStarted, setJourneyStarted] = useState(false);
  const [currentLocation, setCurrentLocation] = useState("");
  const [estimatedArrival, setEstimatedArrival] = useState("");
  const [locationUpdateInterval, setLocationUpdateInterval] = useState(null);
  const [storedLocation, setStoredLocation] = useState(""); // Store location for auto updates
  const [gpsCoordinates, setGpsCoordinates] = useState({ latitude: null, longitude: null });
  const [gettingLocation, setGettingLocation] = useState(false);
  const [autoGpsTracking, setAutoGpsTracking] = useState(false);
  const [gpsWatchId, setGpsWatchId] = useState(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);
  const [lastApiUpdate, setLastApiUpdate] = useState(null);

  useEffect(() => {
    if (!user || user.role !== "driver") {
      navigate("/login");
      return;
    }
    loadData();
    
    // Cleanup interval on unmount
    return () => {
      if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
      }
      if (gpsWatchId !== null) {
        navigator.geolocation.clearWatch(gpsWatchId);
      }
    };
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assignmentsRes, passengersRes] = await Promise.all([
        getMyDriverAssignments(),
        getVehiclePassengers()
      ]);
      setAssignments(assignmentsRes.data || []);
      if (passengersRes.data) {
        setPassengers(passengersRes.data.passengers || []);
        setVehicle(passengersRes.data.vehicle);
        // Check if journey is already in progress
        if (passengersRes.data.journey_in_progress) {
          setJourneyStarted(true);
        } else {
          setJourneyStarted(false);
        }
      }
      
      // Log for debugging
      if (passengersRes.data) {
        console.log("Passengers loaded:", passengersRes.data.passengers?.length || 0);
        console.log("Vehicle:", passengersRes.data.vehicle);
        console.log("Journey in progress:", passengersRes.data.journey_in_progress);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      console.error("Error details:", err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleScanTicket = async () => {
    if (!qrCodeInput.trim() || !vehicle?.vehicle_id) {
      alert("Please enter QR code and ensure vehicle is assigned");
      return;
    }

    try {
      setScanning(true);
      const res = await scanTicket({
        qr_code: qrCodeInput.trim(),
        vehicle_id: vehicle.vehicle_id
      });

      if (res.data.valid) {
        setScannedTicket(res.data.ticket);
        alert(`✅ Valid ticket for ${res.data.ticket.passenger_name}`);
      }
    } catch (err) {
      console.error("Scan error:", err);
      alert(err.response?.data?.error || "Invalid ticket");
      setScannedTicket(null);
    } finally {
      setScanning(false);
    }
  };

  const handleConfirmBoarding = async (ticketId) => {
    if (!window.confirm("Confirm passenger boarding?")) return;

    try {
      await confirmBoarding({ ticket_id: ticketId });
      alert("✅ Boarding confirmed! Passenger notified.");
      loadData(); // Refresh passenger list
      setScannedTicket(null);
      setQrCodeInput("");
    } catch (err) {
      console.error("Error confirming boarding:", err);
      alert(err.response?.data?.error || "Failed to confirm boarding");
    }
  };

  const handleStartJourney = async () => {
    if (!vehicle?.vehicle_id) {
      alert("No vehicle assigned");
      return;
    }

    if (!window.confirm("Start journey? This will notify all passengers and enable automatic GPS tracking.")) return;

    try {
      await startJourney({ vehicle_id: vehicle.vehicle_id });
      alert("✅ Journey started! All passengers notified. GPS tracking will start automatically.");
      setJourneyStarted(true);
      loadData();
      
      // Start automatic GPS tracking
      startAutomaticGpsTracking();
    } catch (err) {
      console.error("Error starting journey:", err);
      alert(err.response?.data?.error || "Failed to start journey");
    }
  };

  const handleStopJourney = async () => {
    if (!vehicle?.vehicle_id) {
      alert("No vehicle assigned");
      return;
    }

    if (!window.confirm("Stop journey? This will notify all passengers that the journey has ended.")) return;

    try {
      await stopJourney({ vehicle_id: vehicle.vehicle_id });
      alert("✅ Journey stopped! All passengers notified.");
      setJourneyStarted(false);
      
      // Stop all tracking
      if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
        setLocationUpdateInterval(null);
      }
      stopAutomaticGpsTracking();
      
      loadData();
    } catch (err) {
      console.error("Error stopping journey:", err);
      alert(err.response?.data?.error || "Failed to stop journey");
    }
  };

  const getCurrentPosition = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setGettingLocation(false);
        alert(`✅ GPS coordinates obtained: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
      },
      (error) => {
        setGettingLocation(false);
        alert(`Failed to get GPS location: ${error.message}`);
        console.error("Geolocation error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleUpdateLocation = async () => {
    if (!vehicle?.vehicle_id) {
      alert("No vehicle assigned");
      return;
    }

    if (!currentLocation.trim() && (!gpsCoordinates.latitude || !gpsCoordinates.longitude)) {
      alert("Please enter current location or get GPS coordinates");
      return;
    }

    try {
      const payload = {
        vehicle_id: vehicle.vehicle_id,
        current_location: currentLocation.trim() || `${gpsCoordinates.latitude}, ${gpsCoordinates.longitude}`,
        estimated_arrival: estimatedArrival || null
      };

      if (gpsCoordinates.latitude && gpsCoordinates.longitude) {
        payload.latitude = gpsCoordinates.latitude;
        payload.longitude = gpsCoordinates.longitude;
      }

      const response = await updateLocation(payload);
      alert(`✅ Location updated! ${response.data.passengers_notified || 0} passengers notified.`);
      setCurrentLocation("");
      setEstimatedArrival("");
    } catch (err) {
      console.error("Error updating location:", err);
      alert(err.response?.data?.error || "Failed to update location");
    }
  };

  const startAutoLocationUpdates = () => {
    const locationToUse = currentLocation.trim() || storedLocation;
    if (!locationToUse || !vehicle?.vehicle_id) {
      alert("Please enter current location first before starting auto updates");
      return;
    }

    // Store the location for auto updates
    if (currentLocation.trim()) {
      setStoredLocation(currentLocation.trim());
    }

    if (locationUpdateInterval) {
      clearInterval(locationUpdateInterval);
    }

    // Send first update immediately
    const locationForUpdate = currentLocation.trim() || storedLocation;
    updateLocation({
      vehicle_id: vehicle.vehicle_id,
      current_location: locationForUpdate,
      estimated_arrival: estimatedArrival || null
    }).catch(err => console.error("Auto location update error:", err));

    // Then set interval for every 30 minutes (30 * 60 * 1000 = 1800000 ms)
    const interval = setInterval(() => {
      const locationToSend = currentLocation.trim() || storedLocation;
      if (locationToSend && vehicle?.vehicle_id) {
        updateLocation({
          vehicle_id: vehicle.vehicle_id,
          current_location: locationToSend,
          estimated_arrival: estimatedArrival || null
        })
        .then(() => {
          console.log("✅ Auto location update sent to all passengers");
        })
        .catch(err => {
          console.error("Auto location update error:", err);
        });
      } else {
        // If location is cleared, stop auto updates
        clearInterval(interval);
        setLocationUpdateInterval(null);
        alert("⚠️ Auto location updates stopped - location is empty");
      }
    }, 30 * 60 * 1000); // Every 30 minutes

    setLocationUpdateInterval(interval);
    alert("✅ Auto location updates started (every 30 minutes). All passengers will be notified automatically.");
  };

  const stopAutoLocationUpdates = () => {
    if (locationUpdateInterval) {
      clearInterval(locationUpdateInterval);
      setLocationUpdateInterval(null);
      setStoredLocation(""); // Clear stored location
      alert("Auto location updates stopped");
    }
  };

  // Automatic GPS tracking function
  const startAutomaticGpsTracking = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    if (!vehicle?.vehicle_id) {
      alert("No vehicle assigned");
      return;
    }

    setAutoGpsTracking(true);

    // Watch position continuously
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const speed = position.coords.speed ? (position.coords.speed * 3.6) : null; // Convert m/s to km/h
        const heading = position.coords.heading;

        // Update GPS coordinates state (always update for map display)
        setGpsCoordinates({ latitude, longitude });
        setLastLocationUpdate(new Date());

        // Throttle API updates to every 30 seconds to prevent excessive calls
        const now = new Date();
        const timeSinceLastUpdate = lastApiUpdate ? (now - lastApiUpdate) / 1000 : 999; // seconds

        if (timeSinceLastUpdate >= 30) {
          // Send location update to server
          try {
            const locationName = currentLocation.trim() || `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            
            await updateVehicleLocation({
              vehicle_id: vehicle.vehicle_id,
              latitude: latitude,
              longitude: longitude,
              current_location: locationName,
              speed: speed,
              heading: heading,
              estimated_arrival: estimatedArrival || null
            });

            setLastApiUpdate(now);
            console.log("✅ Automatic GPS location update sent");
          } catch (err) {
            console.error("Error sending automatic GPS update:", err);
          }
        }
      },
      (error) => {
        console.error("GPS tracking error:", error);
        alert(`GPS tracking error: ${error.message}`);
        stopAutomaticGpsTracking();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    setGpsWatchId(watchId);
    alert("✅ Automatic GPS tracking started! Your location will be updated every time it changes.");
  };

  const stopAutomaticGpsTracking = async () => {
    if (gpsWatchId !== null) {
      navigator.geolocation.clearWatch(gpsWatchId);
      setGpsWatchId(null);
      setAutoGpsTracking(false);
      
      // Notify admin that GPS tracking has stopped
      if (vehicle?.vehicle_id) {
        try {
          await updateVehicleLocation({
            vehicle_id: vehicle.vehicle_id,
            latitude: null,
            longitude: null,
            current_location: "GPS tracking stopped",
            speed: null,
            heading: null,
            estimated_arrival: null
          });
        } catch (err) {
          console.error("Error notifying admin about GPS stop:", err);
        }
      }
      
      alert("GPS tracking stopped. Admin has been notified.");
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
              Driver Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome back, {user.full_name || "Driver"}!
            </p>
            {vehicle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Vehicle: {vehicle.plate_number}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <DarkModeToggle />
            <LogoutButton />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {[
              { id: "assignments", label: "Assignments", icon: "📋" },
              { id: "passengers", label: "Passengers", icon: "👥" },
              { id: "scanner", label: "QR Scanner", icon: "📱" },
              { id: "journey", label: "Journey", icon: "🚗" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-600 dark:bg-blue-700 text-white border-b-2 border-blue-600 dark:border-blue-700"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="text-xl text-gray-500 dark:text-gray-400">Loading...</div>
          </div>
        ) : (
          <>
            {/* Assignments Tab */}
            {activeTab === "assignments" && (
              <div className="space-y-4">
                {assignments.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
                    <div className="text-6xl mb-4">🚗</div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Assignments</h3>
                    <p className="text-gray-600 dark:text-gray-400">You don't have any route assignments yet.</p>
                  </div>
                ) : (
                  assignments.map((assignment) => (
                    <div
                      key={assignment.route_id}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
                    >
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        {assignment.route_name || "Route"}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Route:</span>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {assignment.start_location} → {assignment.end_location}
                          </p>
                        </div>
                        {assignment.plate_number && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Vehicle:</span>
                            <p className="font-semibold text-gray-900 dark:text-white">{assignment.plate_number}</p>
                          </div>
                        )}
                        {assignment.expected_start_time && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Start Time:</span>
                            <p className="font-semibold text-blue-600 dark:text-blue-400">
                              {new Date(assignment.expected_start_time).toLocaleString()}
                            </p>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Status:</span>
                          <p className="font-semibold text-green-600 dark:text-green-400">Active</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Passengers Tab */}
            {activeTab === "passengers" && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Passengers ({passengers.length})
                  </h2>
                  <button
                    onClick={loadData}
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
                  >
                    Refresh
                  </button>
                </div>

                {passengers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No passengers for this vehicle yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {passengers.map((passenger) => (
                      <div
                        key={passenger.ticket_id}
                        className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-600 dark:hover:border-blue-500 transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                              {passenger.passenger_name}
                            </h3>
                            <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                                <p className="font-semibold text-gray-900 dark:text-white">{passenger.passenger_phone}</p>
                              </div>
                              {passenger.seat_number && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Seat:</span>
                                  <p className="font-semibold text-gray-900 dark:text-white">{passenger.seat_number}</p>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Route:</span>
                                <p className="font-semibold text-gray-900 dark:text-white">{passenger.route_name}</p>
                              </div>
                              {(passenger.actual_start_location || passenger.actual_end_location) && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Journey:</span>
                                  <p className="font-semibold text-blue-600 dark:text-blue-400">
                                    {passenger.actual_start_location || passenger.start_location} → {passenger.actual_end_location || passenger.end_location}
                                  </p>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">QR Code:</span>
                                <p className="font-mono text-xs text-gray-900 dark:text-white">{passenger.qr_code || "N/A"}</p>
                              </div>
                            </div>
                          </div>
                          <div className="ml-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                passenger.boarding_status === "confirmed"
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                                  : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                              }`}
                            >
                              {passenger.boarding_status || "Pending"}
                            </span>
                            {passenger.boarding_status !== "confirmed" && (
                              <button
                                onClick={() => handleConfirmBoarding(passenger.ticket_id)}
                                className="mt-2 block w-full px-3 py-1 bg-green-600 dark:bg-green-700 text-white text-xs rounded hover:bg-green-700 dark:hover:bg-green-600"
                              >
                                Confirm
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* QR Scanner Tab */}
            {activeTab === "scanner" && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Scan Ticket QR Code</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Enter QR Code
                    </label>
                    <input
                      type="text"
                      value={qrCodeInput}
                      onChange={(e) => setQrCodeInput(e.target.value)}
                      placeholder="Enter or scan QR code..."
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      onKeyPress={(e) => e.key === "Enter" && handleScanTicket()}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      You can manually enter the QR code or use a QR scanner app
                    </p>
                  </div>

                  <button
                    onClick={handleScanTicket}
                    disabled={scanning || !qrCodeInput.trim()}
                    className="w-full px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {scanning ? "Scanning..." : "Scan Ticket"}
                  </button>

                  {scannedTicket && (
                    <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
                      <h3 className="font-bold text-green-800 dark:text-green-300 mb-2">✅ Valid Ticket</h3>
                      <div className="space-y-2 text-sm">
                        <p className="text-gray-900 dark:text-white"><span className="font-semibold">Passenger:</span> {scannedTicket.passenger_name}</p>
                        <p className="text-gray-900 dark:text-white"><span className="font-semibold">Phone:</span> {scannedTicket.passenger_phone}</p>
                        {scannedTicket.seat_number && (
                          <p className="text-gray-900 dark:text-white"><span className="font-semibold">Seat:</span> {scannedTicket.seat_number}</p>
                        )}
                        <p className="text-gray-900 dark:text-white"><span className="font-semibold">Route:</span> {scannedTicket.route_name}</p>
                        <button
                          onClick={() => handleConfirmBoarding(scannedTicket.ticket_id)}
                          className="mt-4 w-full px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 font-semibold"
                        >
                          Confirm Boarding
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Journey Tab */}
            {activeTab === "journey" && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Journey Management</h2>
                  
                  {!journeyStarted && (
                    <button
                      onClick={handleStartJourney}
                      className="w-full px-6 py-4 bg-green-600 dark:bg-green-700 text-white rounded-lg font-bold text-lg hover:bg-green-700 dark:hover:bg-green-600 shadow-lg mb-6"
                    >
                      🚀 Start Journey
                    </button>
                  )}

                  {journeyStarted && (
                    <div className="mb-6 space-y-4">
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg flex justify-between items-center">
                        <p className="text-green-800 dark:text-green-300 font-semibold">✅ Journey in Progress</p>
                        {autoGpsTracking && (
                          <span className="text-sm bg-green-600 dark:bg-green-700 text-white px-3 py-1 rounded-full">
                            📡 GPS Tracking Active
                          </span>
                        )}
                      </div>
                      <button
                        onClick={handleStopJourney}
                        className="w-full px-6 py-4 bg-red-600 dark:bg-red-700 text-white rounded-lg font-bold text-lg hover:bg-red-700 dark:hover:bg-red-600 shadow-lg"
                      >
                        🛑 Stop Journey
                      </button>
                    </div>
                  )}

                  {/* Embedded Map View */}
                  {gpsCoordinates.latitude && gpsCoordinates.longitude && (
                    <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        🗺️ Your Current Location
                        {autoGpsTracking && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                            Live
                          </span>
                        )}
                      </h3>
                      <MapView
                        latitude={gpsCoordinates.latitude}
                        longitude={gpsCoordinates.longitude}
                        locationName={currentLocation.trim() || `Vehicle ${vehicle?.plate_number || ''}`}
                        height="400px"
                        zoom={15}
                        showPopup={true}
                      />
                      {lastLocationUpdate && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Last GPS update: {lastLocationUpdate.toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">📍 GPS Tracking</h3>
                      {!autoGpsTracking ? (
                        <>
                          <button
                            onClick={getCurrentPosition}
                            disabled={gettingLocation}
                            className="w-full px-4 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 mb-2"
                          >
                            {gettingLocation ? "Getting GPS Location..." : "📡 Get My GPS Location"}
                          </button>
                          {journeyStarted && (
                            <button
                              onClick={startAutomaticGpsTracking}
                              className="w-full px-4 py-3 bg-green-600 dark:bg-green-700 text-white rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-600"
                            >
                              🚀 Start Automatic GPS Tracking
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={stopAutomaticGpsTracking}
                          className="w-full px-4 py-3 bg-red-600 dark:bg-red-700 text-white rounded-lg font-semibold hover:bg-red-700 dark:hover:bg-red-600"
                        >
                          ⏹️ Stop Automatic GPS Tracking
                        </button>
                      )}
                      {gpsCoordinates.latitude && gpsCoordinates.longitude && (
                        <div className="mt-3 p-3 bg-white dark:bg-gray-700 rounded border border-blue-200 dark:border-blue-800">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-semibold">Latitude:</span> {gpsCoordinates.latitude.toFixed(6)}
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-semibold">Longitude:</span> {gpsCoordinates.longitude.toFixed(6)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Current Location (Optional if GPS used)
                      </label>
                      <input
                        type="text"
                        value={currentLocation}
                        onChange={(e) => setCurrentLocation(e.target.value)}
                        placeholder="Enter location name (e.g., City Center, Mile 15)"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Estimated Arrival Time (Optional)
                      </label>
                      <input
                        type="text"
                        value={estimatedArrival}
                        onChange={(e) => setEstimatedArrival(e.target.value)}
                        placeholder="e.g., Arriving in 30 minutes"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={handleUpdateLocation}
                        disabled={!currentLocation.trim() && (!gpsCoordinates.latitude || !gpsCoordinates.longitude)}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-700 dark:to-green-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-green-700 dark:hover:from-blue-600 dark:hover:to-green-600 disabled:opacity-50 shadow-lg"
                      >
                        📍 Update Location
                      </button>
                      {!locationUpdateInterval ? (
                        <button
                          onClick={startAutoLocationUpdates}
                          disabled={!currentLocation.trim()}
                          className="flex-1 px-6 py-3 bg-purple-600 dark:bg-purple-700 text-white rounded-lg font-semibold hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50"
                        >
                          🔄 Auto (30min)
                        </button>
                      ) : (
                        <button
                          onClick={stopAutoLocationUpdates}
                          className="flex-1 px-6 py-3 bg-red-600 dark:bg-red-700 text-white rounded-lg font-semibold hover:bg-red-700 dark:hover:bg-red-600"
                        >
                          ⏹️ Stop Auto
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;
