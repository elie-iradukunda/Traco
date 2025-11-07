import React, { useEffect, useState } from "react";
import { getPassengerTickets, getUserNotifications } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import LogoutButton from "../../components/LogoutButton";
import { useTranslation } from "react-i18next";
import "../../i18n"; // ensure i18n is initialized

const MyTickets = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [locationUpdates, setLocationUpdates] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user || user.role !== "passenger") {
      navigate("/login");
      return;
    }
    loadTickets();
  }, [user]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const [ticketsRes, notificationsRes] = await Promise.all([
        getPassengerTickets(user.user_id),
        getUserNotifications(user.user_id)
      ]);
      setTickets(ticketsRes.data || []);
      setNotifications(notificationsRes.data || []);

      // Load location updates from notifications if ticket is selected
      if (selectedTicket) {
        loadLocationUpdatesForTicket(selectedTicket.ticket_id);
      }
    } catch (err) {
      console.error("Error loading tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadLocationUpdatesForTicket = (ticketId) => {
    // Extract location updates from notifications for this ticket
    const updates = notifications
      .filter(n =>
        n.message?.includes(ticketId.toString()) ||
        n.message?.includes("Location update") ||
        n.message?.includes("Currently at")
      )
      .map(n => ({
        location: n.message?.match(/Currently at (.+?)(?:\.|$)/)?.[1] ||
                  n.message?.match(/at (.+?)(?:\.|$)/)?.[1] ||
                  "Unknown",
        timestamp: n.created_at,
        message: n.message,
        title: n.title
      }))
      .reverse();

    setLocationUpdates(updates);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">{t("myTickets.title")}</h1>
            <p className="text-gray-600">{t("myTickets.subtitle")}</p>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => navigate("/passenger/dashboard")}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {t("common.dashboard")}
            </button>
            <button
              onClick={() => navigate("/passenger/browse")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t("common.browseRoutes")}
            </button>
            <LogoutButton />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-xl text-gray-500">{t("myTickets.loading")}</div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🎫</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{t("myTickets.noTicketsTitle")}</h3>
            <p className="text-gray-600 mb-6">
              {t("myTickets.noTicketsSubtitle")}
            </p>
            <button
              onClick={() => navigate("/passenger/browse")}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              {t("common.browseRoutes")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((ticket) => (
              <div
                key={ticket.ticket_id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 border-l-4 border-blue-600"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {ticket.route_name || t("myTickets.defaultRoute")}
                    </h3>
                    <p className="text-sm text-gray-500">{t("dashboard.ticketId")}: #{ticket.ticket_id}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      ticket.payment_status === "completed"
                        ? ticket.journey_status === "in_progress"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {ticket.journey_status === "in_progress"
                      ? t("dashboard.inJourney")
                      : ticket.payment_status || t("dashboard.pending")}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {ticket.passenger_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t("myTickets.passenger")}:</span>
                      <span className="font-semibold">{ticket.passenger_name}</span>
                    </div>
                  )}
                  {ticket.passenger_phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t("myTickets.phone")}:</span>
                      <span className="font-semibold">{ticket.passenger_phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t("myTickets.route")}:</span>
                    <span className="font-semibold">
                      {ticket.start_location} → {ticket.end_location}
                    </span>
                  </div>
                  {ticket.expected_start_time && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t("myTickets.departure")}:</span>
                      <span className="font-semibold text-blue-600">
                        {new Date(ticket.expected_start_time).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {ticket.amount_paid && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t("myTickets.amountPaid")}:</span>
                      <span className="font-semibold text-green-600">{ticket.amount_paid} RWF</span>
                    </div>
                  )}
                  {ticket.payment_status && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t("myTickets.payment")}:</span>
                      <span className={`font-semibold ${
                        ticket.payment_status === "completed"
                          ? "text-green-600"
                          : "text-yellow-600"
                      }`}>
                        {ticket.payment_status}
                      </span>
                    </div>
                  )}
                  {ticket.plate_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t("myTickets.vehicle")}:</span>
                      <span className="font-semibold">{ticket.plate_number}</span>
                    </div>
                  )}
                  {ticket.seat_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t("myTickets.seat")}:</span>
                      <span className="font-semibold">{ticket.seat_number}</span>
                    </div>
                  )}
                  {ticket.travel_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t("myTickets.travelDate")}:</span>
                      <span className="font-semibold">
                        {new Date(ticket.travel_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {ticket.created_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t("myTickets.booked")}:</span>
                      <span className="font-semibold">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200 space-y-2">
                  {ticket.qr_code && (
                    <div className="bg-gray-50 p-2 rounded text-center">
                      <p className="text-xs text-gray-600 mb-1">{t("myTickets.qrCode")}:</p>
                      <p className="font-mono text-sm font-bold break-all">{ticket.qr_code}</p>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(ticket.ticket_id);
                      alert(t("myTickets.copiedTicketId"));
                    }}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    {t("myTickets.copyTicketId")}
                  </button>
                  {ticket.qr_code && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(ticket.qr_code);
                        alert(t("myTickets.copiedQrCode"));
                      }}
                      className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                    >
                      {t("myTickets.copyQrCode")}
                    </button>
                  )}
                  {ticket.journey_status === "in_progress" && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                      <p className="text-green-800 font-semibold text-sm">{t("myTickets.journeyInProgress")}</p>
                    </div>
                  )}
                  {ticket.boarding_status === "confirmed" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                      <p className="text-blue-800 font-semibold text-sm">{t("myTickets.boardingConfirmed")}</p>
                    </div>
                  )}
                  <button
                    onClick={() => navigate(`/passenger/track/${ticket.ticket_id}`)}
                    className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg hover:from-blue-700 hover:to-green-700 transition-all duration-300 font-medium mt-2"
                  >
                    🗺️ {t("myTickets.trackVehicle")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expanded Ticket Tracking Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t("myTickets.journeyTracking")}</h2>
                    <p className="text-gray-600">{selectedTicket.route_name}</p>
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                {/* Route Map */}
                {selectedTicket.map_url && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("myTickets.routeMap")}</h3>
                    <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                      <iframe
                        src={selectedTicket.map_url}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title={t("myTickets.routeMap")}
                      />
                    </div>
                  </div>
                )}

                {/* Route Information */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
                    <p className="text-sm text-gray-600 mb-1">{t("myTickets.from")}</p>
                    <p className="font-semibold text-gray-900">
                      {selectedTicket.actual_start_location || selectedTicket.start_location}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-600">
                    <p className="text-sm text-gray-600 mb-1">{t("myTickets.to")}</p>
                    <p className="font-semibold text-gray-900">
                      {selectedTicket.actual_end_location || selectedTicket.end_location}
                    </p>
                  </div>
                </div>

                {/* Location Updates */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{t("dashboard.locationUpdates")}</h3>
                  {locationUpdates.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {locationUpdates.map((update, index) => (
                        <div
                          key={index}
                          className="bg-green-50 border border-green-200 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">📍</span>
                                <p className="font-semibold text-green-900">{update.location}</p>
                              </div>
                              {update.message && (
                                <p className="text-sm text-gray-600 mt-1">{update.message}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-2">
                                {new Date(update.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-6 rounded-lg text-center">
                      <p className="text-gray-600">{t("myTickets.noLocationUpdates")}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {t("myTickets.driverUpdateNote")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Journey Status */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">{t("myTickets.journeyStatus")}</h3>
                  <div className="flex gap-4">
                    <div>
                      <span className="text-sm text-gray-600">{t("myTickets.status")}: </span>
                      <span className="font-semibold text-blue-600">
                        {selectedTicket.journey_status === "in_progress" ? t("dashboard.inProgress") :
                         selectedTicket.payment_status === "completed" ? t("myTickets.ready") : t("dashboard.pending")}
                      </span>
                    </div>
                    {selectedTicket.boarding_status === "confirmed" && (
                      <div>
                        <span className="text-sm text-gray-600">{t("myTickets.boarding")}: </span>
                        <span className="font-semibold text-green-600">{t("myTickets.confirmed")} ✅</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;