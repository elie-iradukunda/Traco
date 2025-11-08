import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getPassengerTickets, getUserNotifications } from "../../services/api";
import LogoutButton from "../../components/LogoutButton";
import LoyaltyPoints from "../../components/Loyalty/LoyaltyPoints";
import DarkModeToggle from "../../components/Common/DarkModeToggle";
import { useTranslation } from "react-i18next";
import "../../i18n"; // ensure i18n is initialized

const Dashboard = () => {
  const { t, i18n } = useTranslation();
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
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ticketsRes, notificationsRes] = await Promise.all([
        getPassengerTickets(user.user_id),
        getUserNotifications(user.user_id),
      ]);

      setTickets(ticketsRes.data || []);
      setNotifications(notificationsRes.data || []);
      const active = (ticketsRes.data || []).find(
        (t) =>
          t.journey_status === "in_progress" ||
          t.boarding_status === "confirmed"
      );
      setActiveTicket(active);
      if (active) loadLocationUpdates(notificationsRes.data || []);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadLocationUpdates = (allNotifications) => {
    try {
      const updates = allNotifications
        .filter(
          (n) =>
            n.message?.includes("Location update") ||
            n.message?.includes("Currently at")
        )
        .map((n) => ({
          location:
            n.message?.match(/Currently at (.+?)(?:\.|$)/)?.[1] ||
            n.message?.match(/at (.+?)(?:\.|$)/)?.[1] ||
            "Unknown",
          timestamp: n.created_at,
          message: n.message,
        }))
        .reverse();
      setLocationUpdates(updates);
    } catch (err) {
      console.error("Error loading location updates:", err);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
          🚌 Passenger Dashboard
        </div>

        <div className="flex items-center gap-4">
          <select
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            value={i18n.language}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="en">{t("common.languages.en")}</option>
            <option value="rw">{t("common.languages.rw")}</option>
            <option value="sw">{t("common.languages.sw")}</option>
            <option value="fr">{t("common.languages.fr")}</option>
          </select>

          <button
            onClick={() => navigate("/passenger/browse")}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            {t("common.browseRoutes")}
          </button>

          <button
            onClick={() => navigate("/passenger/tickets")}
            className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
          >
            {t("common.myTickets")}
          </button>

          <DarkModeToggle />
          <LogoutButton />
        </div>
      </nav>

      {/* Welcome Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
          {t("common.dashboard")}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {t("dashboard.welcome")}, {user.full_name || t("common.passenger")}! {t("dashboard.subtitle")}
        </p>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-xl text-gray-500 dark:text-gray-400">{t("dashboard.loading")}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {activeTicket ? (
                <ActiveJourneyCard
                  ticket={activeTicket}
                  locationUpdates={locationUpdates}
                  t={t}
                />
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
                  <div className="text-6xl mb-4">🚌</div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {t("dashboard.noActiveJourney")}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {t("dashboard.noActiveSubtitle")}
                  </p>
                  <button
                    onClick={() => navigate("/passenger/browse")}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-700 dark:to-green-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-green-700 dark:hover:from-blue-600 dark:hover:to-green-600 transition-all duration-300"
                  >
                    {t("common.browseRoutes")}
                  </button>
                </div>
              )}

              {/* Recent Tickets */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {t("dashboard.recentTickets")}
                </h2>
                {tickets.length > 0 ? (
                  <div className="space-y-3">
                    {tickets.slice(0, 3).map((ticket) => (
                      <div
                        key={ticket.ticket_id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-600 dark:hover:border-blue-500 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {ticket.route_name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {ticket.start_location} → {ticket.end_location}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {t("dashboard.ticketId")}: #{ticket.ticket_id}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              ticket.journey_status === "in_progress"
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                                : ticket.payment_status === "completed"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                                : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                            }`}
                          >
                            {ticket.journey_status === "in_progress"
                              ? t("dashboard.inJourney")
                              : ticket.payment_status || t("dashboard.pending")}
                          </span>
                        </div>
                        <button
                          onClick={() => navigate("/passenger/tickets")}
                          className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          {t("dashboard.viewDetails")}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    {t("dashboard.noTickets")}
                  </p>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <LoyaltyPoints />
              <NotificationsPanel
                notifications={notifications}
                onRefresh={loadData}
                t={t}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ActiveJourneyCard */
const ActiveJourneyCard = ({ ticket, locationUpdates, t }) => {
  const [showMap, setShowMap] = useState(false);
  const mapUrl = ticket.map_url || null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-green-600 dark:border-green-500">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {t("dashboard.activeJourney")}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">{ticket.route_name}</p>
        </div>
        <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-semibold">
          🚗 {t("dashboard.inProgress")}
        </span>
      </div>
      {mapUrl && (
        <>
          <button
            onClick={() => setShowMap(!showMap)}
            className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 mb-2"
          >
            {showMap ? t("dashboard.hideMap") : t("dashboard.showMap")}
          </button>
          {showMap && (
            <iframe
              src={mapUrl}
              className="w-full h-64 border dark:border-gray-700 rounded-lg"
              allowFullScreen
              loading="lazy"
              title={t("dashboard.routeMap")}
            />
          )}
        </>
      )}
      <div className="mt-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t("dashboard.locationUpdates")}</h3>
        {locationUpdates.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {locationUpdates.map((update, index) => (
              <div
                key={index}
                className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3"
              >
                <p className="font-semibold text-green-900 dark:text-green-300">
                  {update.location}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {new Date(update.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 dark:text-gray-400 text-sm">{t("dashboard.noUpdates")}</div>
        )}
      </div>
    </div>
  );
};

/* NotificationsPanel */
const NotificationsPanel = ({ notifications, onRefresh, t }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setUnreadCount(
      notifications.filter((n) => !n.read_status || n.read_status === false)
        .length
    );
  }, [notifications]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sticky top-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t("dashboard.notifications")}</h2>
        {unreadCount > 0 && (
          <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-xs font-semibold">
            {unreadCount} {t("dashboard.new")}
          </span>
        )}
      </div>
      <button
        onClick={onRefresh}
        className="mb-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
      >
        🔄 {t("common.refresh")}
      </button>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {notifications.length > 0 ? (
          notifications.slice(0, 10).map((notification) => (
            <div
              key={notification.notification_id}
              className={`border rounded-lg p-3 ${
                !notification.read_status
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
              }`}
            >
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                {notification.title}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                {notification.message}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {new Date(notification.created_at).toLocaleString()}
              </p>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400">No notifications</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;