import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { 
  getPassengerTickets, 
  getUserNotifications
} from "../../services/api";
import LogoutButton from "../../components/LogoutButton";
import LoyaltyPoints from "../../components/Loyalty/LoyaltyPoints";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationUpdates, setLocationUpdates] = useState([]);

  useEffect(() => {
    if (!user || user.role !== "passenger") {
      navigate("/login");
      return;
    }
    loadData();
    
    // Refresh data every 30 seconds for real-time updates
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ticketsRes, notificationsRes] = await Promise.all([
        getPassengerTickets(user.user_id),
        getUserNotifications(user.user_id)
      ]);
      
      setTickets(ticketsRes.data || []);
      setNotifications(notificationsRes.data || []);
      
      // Find active journey (in_progress)
      const active = (ticketsRes.data || []).find(
        t => t.journey_status === "in_progress" || t.boarding_status === "confirmed"
      );
      setActiveTicket(active);
      
      // If there's an active ticket, load location updates
      if (active) {
        loadLocationUpdates(notificationsRes.data || []);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadLocationUpdates = (allNotifications) => {
    try {
      // Extract location updates from notifications
      const updates = allNotifications
        .filter(n => 
          n.message?.includes("Location update") || 
          n.message?.includes("Currently at")
        )
        .map(n => ({
          location: n.message?.match(/Currently at (.+?)(?:\.|$)/)?.[1] || 
                    n.message?.match(/at (.+?)(?:\.|$)/)?.[1] || 
                    "Unknown",
          timestamp: n.created_at,
          message: n.message
        }))
        .reverse();
      
      setLocationUpdates(updates);
    } catch (err) {
      console.error("Error loading location updates:", err);
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
              Passenger Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome, {user.full_name || "Passenger"}! Track your journeys and stay updated.
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => navigate("/passenger/browse")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Routes
            </button>
            <button
              onClick={() => navigate("/passenger/tickets")}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              My Tickets
            </button>
            <LogoutButton />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-xl text-gray-500">Loading dashboard...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Journey Tracking */}
            <div className="lg:col-span-2 space-y-6">
              {activeTicket ? (
                <ActiveJourneyCard 
                  ticket={activeTicket} 
                  locationUpdates={locationUpdates}
                />
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                  <div className="text-6xl mb-4">🚌</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">No Active Journey</h3>
                  <p className="text-gray-600 mb-6">
                    You don't have any active journeys right now. Book a ticket to start tracking!
                  </p>
                  <button
                    onClick={() => navigate("/passenger/browse")}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-green-700 transition-all duration-300"
                  >
                    Browse Routes
                  </button>
                </div>
              )}

              {/* Recent Tickets */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Tickets</h2>
                {tickets.length > 0 ? (
                  <div className="space-y-3">
                    {tickets.slice(0, 3).map((ticket) => (
                      <div
                        key={ticket.ticket_id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-600 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-900">{ticket.route_name}</h3>
                            <p className="text-sm text-gray-600">
                              {ticket.start_location} → {ticket.end_location}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Ticket ID: #{ticket.ticket_id}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              ticket.journey_status === "in_progress"
                                ? "bg-blue-100 text-blue-800"
                                : ticket.payment_status === "completed"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {ticket.journey_status === "in_progress"
                              ? "In Journey"
                              : ticket.payment_status || "Pending"}
                          </span>
                        </div>
                        <button
                          onClick={() => navigate("/passenger/tickets")}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                        >
                          View Details →
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No tickets yet</p>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Loyalty Points */}
              <LoyaltyPoints />
              
              {/* Notifications */}
              <NotificationsPanel 
                notifications={notifications}
                onRefresh={loadData}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Active Journey Tracking Card
const ActiveJourneyCard = ({ ticket, locationUpdates }) => {
  const [showMap, setShowMap] = useState(false);
  
  // Extract map_url from ticket (it should come from routes table)
  const mapUrl = ticket.map_url || null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-600">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Active Journey</h2>
          <p className="text-gray-600">{ticket.route_name}</p>
        </div>
        <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
          🚗 In Progress
        </span>
      </div>

      {/* Route Information */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">From</p>
          <p className="font-semibold text-gray-900">
            {ticket.actual_start_location || ticket.start_location}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">To</p>
          <p className="font-semibold text-gray-900">
            {ticket.actual_end_location || ticket.end_location}
          </p>
        </div>
      </div>

      {/* Vehicle Info */}
      {ticket.plate_number && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">Vehicle</p>
          <p className="font-semibold text-blue-900">{ticket.plate_number}</p>
        </div>
      )}

      {/* Map Display */}
      {mapUrl && (
        <div className="mb-4">
          <button
            onClick={() => setShowMap(!showMap)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium mb-2"
          >
            {showMap ? "Hide" : "Show"} Route Map
          </button>
          {showMap && (
            <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden border-2 border-blue-300">
              <iframe
                src={mapUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Route Map"
              />
            </div>
          )}
        </div>
      )}

      {/* Location Updates */}
      <div className="mt-4">
        <h3 className="font-semibold text-gray-900 mb-3">Location Updates</h3>
        {locationUpdates.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {locationUpdates.map((update, index) => (
              <div
                key={index}
                className="bg-green-50 border border-green-200 rounded-lg p-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-green-900">{update.location}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(update.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-green-600">📍</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <p className="text-gray-600 text-sm">No location updates yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Driver will update location during the journey
            </p>
          </div>
        )}
      </div>

      {/* Journey Status */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Journey Status</p>
            <p className="font-semibold text-blue-600">In Progress</p>
          </div>
          {ticket.boarding_status === "confirmed" && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
              ✅ Boarding Confirmed
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Notifications Panel Component
const NotificationsPanel = ({ notifications, onRefresh }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unread = notifications.filter(n => !n.read_status || n.read_status === false).length;
    setUnreadCount(unread);
  }, [notifications]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
        {unreadCount > 0 && (
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
            {unreadCount} New
          </span>
        )}
      </div>

      <button
        onClick={onRefresh}
        className="mb-4 text-sm text-blue-600 hover:text-blue-800"
      >
        🔄 Refresh
      </button>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {notifications.length > 0 ? (
          notifications.slice(0, 10).map((notification) => (
            <div
              key={notification.notification_id}
              className={`border rounded-lg p-3 ${
                !notification.read_status || notification.read_status === false
                  ? "bg-blue-50 border-blue-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-semibold text-gray-900 text-sm">
                  {notification.title}
                </h4>
                {!notification.read_status && (
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                )}
              </div>
              <p className="text-xs text-gray-600 mb-2">{notification.message}</p>
              <p className="text-xs text-gray-400">
                {new Date(notification.created_at).toLocaleString()}
              </p>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No notifications yet</p>
          </div>
        )}
      </div>

      {notifications.length > 10 && (
        <button className="mt-4 w-full text-sm text-blue-600 hover:text-blue-800">
          View All Notifications →
        </button>
      )}
    </div>
  );
};

export default Dashboard;
