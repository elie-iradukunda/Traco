import React, { useEffect, useState } from "react";
import { 
  getAllPassengerRoutes, 
  getAllAvailableVehicles, 
  getVehiclesForRoute,
  bookTicket,
  processPayment,
  getRouteStops,
  calculateFareBetweenStops
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import LogoutButton from "../../components/LogoutButton";

const BookTicket = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Route, 2: Destination, 3: Vehicle, 4: Passenger Details, 5: Payment
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Booking form state
  const [formData, setFormData] = useState({
    route_id: "",
    start_location: "",
    end_location: "",
    start_stop_id: "",
    end_stop_id: "",
    actual_start_location: "",
    actual_end_location: "",
    vehicle_id: "",
    passenger_name: user?.full_name || "",
    passenger_phone: user?.phone || "",
    passenger_email: user?.email || "",
    travel_date: "",
    seat_number: "",
    payment_phone: "",
    is_for_self: true
  });

  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeStops, setRouteStops] = useState([]);
  const [calculatedFare, setCalculatedFare] = useState(0);
  const [createdTicket, setCreatedTicket] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [loadingStops, setLoadingStops] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "passenger") {
      navigate("/login");
      return;
    }
    loadData();
    
    // Check if route was passed from BrowseRoutes
    const locationState = window.history.state?.usr || {};
    if (locationState.route) {
      handleRouteSelect(locationState.route);
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [routesRes, vehiclesRes] = await Promise.all([
        getAllPassengerRoutes(),
        getAllAvailableVehicles()
      ]);
      setRoutes(routesRes.data || []);
      setVehicles(vehiclesRes.data || []);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load routes and vehicles");
    } finally {
      setLoading(false);
    }
  };

  const handleRouteSelect = async (route) => {
    setSelectedRoute(route);
    setFormData({
      ...formData,
      route_id: route.route_id,
      start_location: route.start_location,
      end_location: route.end_location,
      start_stop_id: "",
      end_stop_id: "",
      actual_start_location: "",
      actual_end_location: ""
    });
    setCalculatedFare(route.fare_base || 0);
    
    // Load route stops if available
    try {
      setLoadingStops(true);
      const stopsRes = await getRouteStops(route.route_id);
      setRouteStops(stopsRes.data || []);
      
      // If no stops, use default route locations
      if (!stopsRes.data || stopsRes.data.length === 0) {
        setFormData(prev => ({
          ...prev,
          actual_start_location: route.start_location,
          actual_end_location: route.end_location
        }));
      }
    } catch (err) {
      console.error("Error loading route stops:", err);
      setRouteStops([]);
    } finally {
      setLoadingStops(false);
    }
    
    setStep(2);
  };
  
  const handleStopSelection = async (startStopId, endStopId) => {
    if (!startStopId || !endStopId || startStopId === endStopId) {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      start_stop_id: startStopId,
      end_stop_id: endStopId
    }));
    
    // Calculate fare based on selected stops
    try {
      const fareRes = await calculateFareBetweenStops(selectedRoute.route_id, startStopId, endStopId);
      setCalculatedFare(fareRes.data.fare || selectedRoute.fare_base || 0);
      
      // Update actual locations
      const startStop = routeStops.find(s => s.stop_id === parseInt(startStopId));
      const endStop = routeStops.find(s => s.stop_id === parseInt(endStopId));
      
      setFormData(prev => ({
        ...prev,
        actual_start_location: startStop?.stop_name || prev.start_location,
        actual_end_location: endStop?.stop_name || prev.end_location
      }));
    } catch (err) {
      console.error("Error calculating fare:", err);
      setCalculatedFare(selectedRoute.fare_base || 0);
    }
  };

  const handleDestinationSelect = async (destination) => {
    setFormData({ ...formData, end_location: destination });
    
    // Load vehicles for this route
    try {
      const res = await getVehiclesForRoute(formData.route_id);
      setVehicles(res.data || []);
    } catch (err) {
      console.error("Error loading vehicles:", err);
    }
    
    setStep(3);
  };

  const handleVehicleSelect = (vehicle) => {
    setFormData({ ...formData, vehicle_id: vehicle.vehicle_id });
    setStep(4);
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    
    if (!formData.passenger_name || !formData.passenger_phone) {
      setError("Passenger name and phone are required");
      return;
    }

    try {
      setLoading(true);
      const res = await bookTicket({
        passenger_id: user.user_id,
        route_id: formData.route_id,
        vehicle_id: formData.vehicle_id || null,
        start_stop_id: formData.start_stop_id || null,
        end_stop_id: formData.end_stop_id || null,
        actual_start_location: formData.actual_start_location || formData.start_location || null,
        actual_end_location: formData.actual_end_location || formData.end_location || null,
        passenger_name: formData.passenger_name,
        passenger_phone: formData.passenger_phone,
        passenger_email: formData.passenger_email || null,
        travel_date: formData.travel_date || null,
        seat_number: formData.seat_number || null,
        amount_paid: calculatedFare,
        payment_method: "mtn_mobile_money"
      });

      setCreatedTicket(res.data.ticket);
      setCalculatedFare(res.data.fare || calculatedFare);
      setStep(5);
      setMessage("");
      setError("");
    } catch (err) {
      console.error("Error creating ticket:", err);
      setError(err.response?.data?.error || "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!formData.payment_phone) {
      setError("Please enter your MTN Mobile Money phone number");
      return;
    }

    try {
      setProcessingPayment(true);
      const res = await processPayment({
        ticket_id: createdTicket.ticket_id,
        phone_number: formData.payment_phone
      });

      setMessage(`✅ Payment successful! Transaction ID: ${res.data.transaction_id}`);
      setTimeout(() => {
        navigate("/passenger/tickets");
      }, 2000);
    } catch (err) {
      console.error("Payment error:", err);
      setError(err.response?.data?.error || "Payment failed");
    } finally {
      setProcessingPayment(false);
    }
  };

  const toggleBookingFor = () => {
    setFormData({
      ...formData,
      is_for_self: !formData.is_for_self,
      passenger_name: formData.is_for_self ? "" : (user?.full_name || ""),
      passenger_phone: formData.is_for_self ? "" : (user?.phone || ""),
      passenger_email: formData.is_for_self ? "" : (user?.email || "")
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Book a Ticket</h1>
            <p className="text-gray-600">Complete your booking in a few simple steps</p>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => navigate("/passenger/browse")}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back to Browse
            </button>
            <LogoutButton />
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= s
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {s}
                </div>
                {s < 5 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step > s ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Route</span>
            <span>Destination</span>
            <span>Vehicle</span>
            <span>Details</span>
            <span>Payment</span>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
        )}
        {message && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg">{message}</div>
        )}

        {/* Step 1: Select Route */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Select Route</h2>
            {loading ? (
              <div className="text-center py-12">Loading routes...</div>
            ) : routes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No routes available</div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {routes.map((route) => (
                  <div
                    key={route.route_id}
                    onClick={() => handleRouteSelect(route)}
                    className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-600 cursor-pointer transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xl font-bold">{route.route_name}</h3>
                        <p className="text-gray-600">
                          {route.start_location} → {route.end_location}
                        </p>
                        <p className="text-green-600 font-bold mt-2">
                          {route.fare_base || 0} RWF
                        </p>
                        {route.expected_start_time && (
                          <p className="text-blue-600 font-semibold text-sm mt-1">
                            🕐 {new Date(route.expected_start_time).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Select
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Start and Destination Stops */}
        {step === 2 && selectedRoute && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Select Your Journey Points</h2>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold text-blue-900">{selectedRoute.route_name}</p>
              <p className="text-xs text-blue-700">{selectedRoute.start_location} → {selectedRoute.end_location}</p>
            </div>
            
            {loadingStops ? (
              <div className="text-center py-8">Loading stops...</div>
            ) : routeStops.length > 0 ? (
              <div className="space-y-6">
                {/* Start Point Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    🚩 Select Your Starting Point
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {routeStops.map((stop) => (
                      <button
                        key={stop.stop_id}
                        onClick={() => {
                          const newStart = stop.stop_id.toString();
                          setFormData(prev => ({ ...prev, start_stop_id: newStart }));
                          if (formData.end_stop_id && formData.end_stop_id !== newStart) {
                            handleStopSelection(newStart, formData.end_stop_id);
                          }
                        }}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          formData.start_stop_id === stop.stop_id.toString()
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <div className="font-semibold">{stop.stop_name}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          Order: {stop.stop_order} • Fare from start: {stop.fare_from_start} RWF
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* End Point Selection */}
                {formData.start_stop_id && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      🎯 Select Your Destination
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {routeStops
                        .filter(stop => stop.stop_id.toString() !== formData.start_stop_id)
                        .map((stop) => (
                          <button
                            key={stop.stop_id}
                            onClick={() => {
                              handleStopSelection(formData.start_stop_id, stop.stop_id.toString());
                            }}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${
                              formData.end_stop_id === stop.stop_id.toString()
                                ? "border-green-600 bg-green-50"
                                : "border-gray-200 hover:border-green-300"
                            }`}
                          >
                            <div className="font-semibold">{stop.stop_name}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              Order: {stop.stop_order} • Fare from start: {stop.fare_from_start} RWF
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Fare Display */}
                {formData.start_stop_id && formData.end_stop_id && (
                  <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Your Journey:</p>
                        <p className="text-lg font-bold text-gray-900">
                          {formData.actual_start_location} → {formData.actual_end_location}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Fare:</p>
                        <p className="text-2xl font-bold text-green-600">{calculatedFare} RWF</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">No sub-routes available. Using main route.</p>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-semibold">{selectedRoute.start_location} → {selectedRoute.end_location}</p>
                  <p className="text-lg font-bold text-green-600 mt-2">{calculatedFare} RWF</p>
                </div>
              </div>
            )}
            
            <div className="mt-6 flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Back
              </button>
              {(routeStops.length === 0 || (formData.start_stop_id && formData.end_stop_id)) && (
                <button
                  onClick={async () => {
                    // Load vehicles for this route
                    try {
                      const res = await getVehiclesForRoute(selectedRoute.route_id);
                      setVehicles(res.data || []);
                      setStep(3);
                    } catch (err) {
                      console.error("Error loading vehicles:", err);
                      setError("Failed to load vehicles");
                    }
                  }}
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Continue to Vehicle Selection
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Select Vehicle */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Select Vehicle</h2>
            {vehicles.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No vehicles available for this route. You can proceed without selecting a vehicle.
                <button
                  onClick={() => setStep(4)}
                  className="mt-4 block mx-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Continue Without Vehicle
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 mb-6">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.vehicle_id}
                    onClick={() => handleVehicleSelect(vehicle)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.vehicle_id === vehicle.vehicle_id
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-blue-600"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-lg">{vehicle.plate_number}</h3>
                        <p className="text-gray-600">{vehicle.model}</p>
                        {vehicle.driver_name && (
                          <p className="text-sm text-gray-500">Driver: {vehicle.driver_name}</p>
                        )}
                        <p className="text-sm text-gray-500">Capacity: {vehicle.capacity} seats</p>
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Select
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Back
              </button>
              {vehicles.length > 0 && (
                <button
                  onClick={() => setStep(4)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Skip Vehicle Selection
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Passenger Details */}
        {step === 4 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Passenger Details</h2>
            
            <div className="mb-4 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_for_self}
                  onChange={toggleBookingFor}
                  className="w-4 h-4"
                />
                <span>Book for myself</span>
              </label>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passenger Name *
                </label>
                <input
                  type="text"
                  value={formData.passenger_name}
                  onChange={(e) => setFormData({ ...formData, passenger_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passenger Phone *
                </label>
                <input
                  type="tel"
                  value={formData.passenger_phone}
                  onChange={(e) => setFormData({ ...formData, passenger_phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  placeholder="250XXXXXXXXX"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passenger Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.passenger_email}
                  onChange={(e) => setFormData({ ...formData, passenger_email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Travel Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.travel_date}
                  onChange={(e) => setFormData({ ...formData, travel_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seat Number (Optional)
                </label>
                <input
                  type="text"
                  value={formData.seat_number}
                  onChange={(e) => setFormData({ ...formData, seat_number: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  placeholder="e.g., 12A"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg">Total Fare:</span>
                  <span className="text-2xl font-bold text-green-600">{calculatedFare} RWF</span>
                </div>
                {selectedRoute?.expected_start_time && (
                  <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                    <span className="font-semibold text-sm">Expected Departure:</span>
                    <span className="font-bold text-blue-700">
                      {new Date(selectedRoute.expected_start_time).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 5: Payment */}
        {step === 5 && createdTicket && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Complete Payment</h2>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="text-sm text-gray-600 mb-2">Ticket Created:</div>
              <div className="font-bold text-lg">Ticket ID: #{createdTicket.ticket_id}</div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Route Information</h3>
                <p>{selectedRoute?.route_name}</p>
                <p className="text-gray-600">{formData.start_location} → {formData.end_location}</p>
                {selectedRoute?.expected_start_time && (
                  <p className="text-blue-600 font-semibold mt-2">
                    🕐 Departure: {new Date(selectedRoute.expected_start_time).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Passenger</h3>
                <p>{formData.passenger_name}</p>
                <p className="text-gray-600">{formData.passenger_phone}</p>
                {formData.passenger_email && (
                  <p className="text-gray-600">{formData.passenger_email}</p>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-lg">Amount to Pay:</span>
                  <span className="text-2xl font-bold text-green-600">{calculatedFare} RWF</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  MTN Mobile Money Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.payment_phone}
                  onChange={(e) => setFormData({ ...formData, payment_phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3"
                  placeholder="250XXXXXXXXX"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter your MTN Mobile Money number to complete payment
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => navigate("/passenger/tickets")}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Pay Later
              </button>
              <button
                onClick={handlePayment}
                disabled={processingPayment || !formData.payment_phone}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {processingPayment ? "Processing..." : "Pay Now (MTN Mobile Money)"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookTicket;

