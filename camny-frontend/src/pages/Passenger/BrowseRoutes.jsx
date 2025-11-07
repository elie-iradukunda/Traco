import React, { useEffect, useState } from "react";
import { getAllPassengerRoutes, bookTicket } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import LogoutButton from "../../components/LogoutButton";

const BrowseRoutes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingRoute, setBookingRoute] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user || user.role !== "passenger") {
      navigate("/login");
      return;
    }
    loadRoutes();
  }, [user]);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const res = await getAllPassengerRoutes();
      setRoutes(res.data || []);
    } catch (err) {
      console.error("Error loading routes:", err);
      setMessage("Failed to load routes");
    } finally {
      setLoading(false);
    }
  };

  const handleBookTicket = async (route) => {
    if (!window.confirm(`Book ticket for ${route.route_name}?`)) return;

    try {
      const res = await bookTicket({
        passenger_id: user.user_id,
        route_id: route.route_id,
        status: "confirmed",
      });

      setMessage(`✅ Ticket booked successfully! Ticket ID: ${res.data.ticket.ticket_id}`);
      setTimeout(() => {
        setMessage("");
        navigate("/passenger/tickets");
      }, 2000);
    } catch (err) {
      console.error("Booking error:", err);
      setMessage(err.response?.data?.error || "Failed to book ticket");
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
              Browse Routes
            </h1>
            <p className="text-gray-600">Find and book your next journey</p>
          </div>
          <div className="flex gap-4 items-center">
                <button
                  onClick={() => navigate("/passenger/dashboard")}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate("/passenger/tickets")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  My Tickets
                </button>
                <LogoutButton />
              </div>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.includes("✅")
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-xl text-gray-500">Loading routes...</div>
          </div>
        ) : routes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-500">No routes available at the moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routes.map((route) => (
              <div
                key={route.route_id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">
                      {route.route_name}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="font-medium">{route.start_location}</span>
                      <span className="text-blue-600">→</span>
                      <span className="font-medium">{route.end_location}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Distance:</span>
                    <span className="font-semibold">{route.distance_km || "N/A"} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-semibold">{route.estimated_duration || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fare:</span>
                    <span className="font-bold text-green-600 text-lg">
                      {route.fare_base || 0} RWF
                    </span>
                  </div>
                  {route.expected_start_time && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Departure Time:</span>
                      <span className="font-semibold text-blue-600">
                        {new Date(route.expected_start_time).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {route.status && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          route.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {route.status}
                      </span>
                    </div>
                  )}
                </div>

                {route.has_vehicle ? (
                  <button
                    onClick={() => navigate("/passenger/book", { state: { route } })}
                    className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Book Ticket
                  </button>
                ) : (
                  <div className="w-full bg-yellow-50 border-2 border-yellow-300 py-3 rounded-lg text-center">
                    <p className="text-yellow-800 font-semibold">⚠️ No vehicle assigned</p>
                    <p className="text-xs text-yellow-600 mt-1">Please contact admin</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseRoutes;
