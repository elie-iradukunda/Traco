import axios from "axios";

// ---------------- Axios Instance ----------------
const api = axios.create({
  baseURL: "http://localhost:5000", // backend root URL
  headers: { "Content-Type": "application/json" },
});

// Automatically attach token if exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---------------- Auth ----------------
export const login = (payload) => api.post("/api/auth/login", payload);

// ---------------- Admin GETs ----------------
export const getAllDrivers = () => api.get("/admin/drivers");
export const getAllVehicles = () => api.get("/admin/vehicles");
export const getAllRoutes = () => api.get("/admin/routes");
export const getAllUsers = () => api.get("/admin/users");
export const getAllCompanies = () => api.get("/admin/companies");
export const getAllTickets = () => api.get("/admin/tickets");
export const getStats = () => api.get("/admin/stats");
export const getAllNotifications = () => api.get("/admin/notifications");
export const getAllPassengersWithTickets = () => api.get("/admin/passengers");
export const getDriverAssignmentsAdmin = () => api.get("/admin/driver-assignments");

// ---------------- Admin CRUD ----------------
export const addDriver = (payload) => api.post("/admin/drivers", payload);
export const updateDriver = (driverId, payload) => api.put(`/admin/drivers/${driverId}`, payload);
export const deleteDriver = (driverId) => api.delete(`/admin/drivers/${driverId}`);

export const addVehicle = (payload) => api.post("/admin/vehicles", payload);
export const updateVehicle = (vehicleId, payload) => api.put(`/admin/vehicles/${vehicleId}`, payload);
export const deleteVehicle = (vehicleId) => api.delete(`/admin/vehicles/${vehicleId}`);

export const addRoute = (payload) => api.post("/admin/routes", payload);
export const updateRoute = (routeId, payload) => api.put(`/admin/routes/${routeId}`, payload);
export const deleteRoute = (routeId) => api.delete(`/admin/routes/${routeId}`);

// ---------------- Assignments ----------------
// Assign driver to vehicle (auto updates vehicle → route)
export const assignDriverToVehicle = (vehicleId, driverId) =>
  api.post(`/admin/vehicles/${vehicleId}/assign-driver`, { driver_id: driverId });

// Assign driver to route (auto updates driver.assigned_line_id & vehicle.assigned_route)
export const assignDriverToRoute = (routeId, driverId) =>
  api.post(`/admin/routes/${routeId}/assign-driver`, { driver_id: driverId });

// Assign vehicle to route directly
export const assignVehicleToRoute = (routeId, payload) =>
  api.put(`/admin/routes/${routeId}/assign-vehicle`, payload);

// ---------------- Tickets ----------------
export const createTicket = (payload) => api.post("/admin/tickets", payload);
export const updateTicket = (ticketId, payload) => api.put(`/admin/tickets/${ticketId}`, payload);
export const deleteTicket = (ticketId) => api.delete(`/admin/tickets/${ticketId}`);

export const getAllTicketTemplates = (companyId) => api.get(`/admin/ticket-templates/${companyId}`);
export const createTicketTemplate = (payload) => api.post("/admin/ticket-templates", payload);
export const updateTicketTemplate = (templateId, payload) => api.put(`/admin/ticket-templates/${templateId}`, payload);
export const deleteTicketTemplate = (templateId) => api.delete(`/admin/ticket-templates/${templateId}`);

// ---------------- Driver ----------------
export const getDriverIdByUserId = (userId) => api.get(`/driver/driver-id/${userId}`);
export const getDriverAssignments = (driverId) => api.get(`/driver/assignments/${driverId}`);
export const getMyDriverAssignments = () => api.get(`/driver/assignments`);
export const getVehiclePassengers = (driverId) => {
  if (driverId) {
    return api.get(`/driver/passengers/${driverId}`);
  }
  return api.get(`/driver/passengers`);
};
export const scanTicket = (payload) => api.post("/driver/scan-ticket", payload);
export const confirmBoarding = (payload) => api.post("/driver/confirm-boarding", payload);
export const updateLocation = (payload) => api.post("/driver/update-location", payload);
export const startJourney = (payload) => api.post("/driver/start-journey", payload);
export const stopJourney = (payload) => api.post("/driver/stop-journey", payload);

// ---------------- Route Stops ----------------
export const getRouteStops = (routeId) => api.get(`/api/routes/${routeId}/stops`);
export const calculateFareBetweenStops = (routeId, startStopId, endStopId) => 
  api.get(`/api/routes/${routeId}/stops/${startStopId}/${endStopId}/fare`);
export const addRouteStop = (payload) => api.post("/api/routes/stops", payload);
export const updateRouteStop = (stopId, payload) => api.put(`/api/routes/stops/${stopId}`, payload);
export const deleteRouteStop = (stopId) => api.delete(`/api/routes/stops/${stopId}`);

// ---------------- Passenger ----------------
export const getPassengerTickets = (passengerId) => api.get(`/passenger/tickets/${passengerId}`);
export const downloadTicketPdf = (ticketId) =>
  api.get(`/passenger/tickets/${ticketId}/pdf`, { responseType: "blob" });
export const getAllPassengerRoutes = () => api.get("/passenger/routes");
export const getAllAvailableVehicles = () => api.get("/passenger/vehicles");
export const getVehiclesForRoute = (routeId) => api.get(`/passenger/vehicles/route/${routeId}`);
export const getPassengerPayments = (passengerId) => api.get(`/passenger/payments/${passengerId}`);
export const createPassengerPayment = (payload) => api.post("/passenger/payments", payload);
export const bookTicket = (payload) => api.post("/passenger/tickets/book", payload);
export const processPayment = (payload) => api.post("/passenger/tickets/pay", payload);

// ---------------- Notifications ----------------
export const getUserNotifications = (userId) => api.get(`/notifications/${userId}`);
export const sendNotification = (payload) => api.post("/notifications", payload);

// ---------------- GPS Tracking ----------------
export const updateVehicleLocation = (payload) => api.post("/api/tracking/update", payload);
export const getVehicleLocation = (vehicleId) => api.get(`/api/tracking/vehicle/${vehicleId}`);
export const getAllVehicleLocations = () => api.get("/api/tracking/all");
export const getVehicleLocationHistory = (vehicleId, limit = 50, offset = 0) => 
  api.get(`/api/tracking/history/${vehicleId}?limit=${limit}&offset=${offset}`);
export const getMyVehicleLocation = (ticketId) => api.get(`/api/tracking/my-vehicle/${ticketId}`);

// ---------------- Analytics ----------------
export const getRevenueAnalytics = (period = 30) => api.get(`/admin/analytics/revenue?period=${period}`);
export const getRoutePerformance = () => api.get("/admin/analytics/route-performance");

// ---------------- Reviews ----------------
export const submitReview = (payload) => api.post("/api/reviews", payload);
export const getReviews = (params) => api.get("/api/reviews", { params });
export const getAverageRating = (params) => api.get("/api/reviews/average", { params });

// ---------------- Loyalty Points ----------------
export const getLoyaltyPoints = (passengerId) => api.get(`/api/loyalty/${passengerId}`);
export const addLoyaltyPoints = (payload) => api.post("/api/loyalty/add", payload);
export const redeemLoyaltyPoints = (payload) => api.post("/api/loyalty/redeem", payload);
export const getLoyaltyHistory = (passengerId, limit = 50) => api.get(`/api/loyalty/${passengerId}/history?limit=${limit}`);

// ---------------- Chatbot ----------------
export const chatWithBot = (payload) => api.post("/api/chatbot/chat", payload);
export const getChatHistory = (userId) => api.get(`/api/chatbot/history/${userId}`);

export default api;
