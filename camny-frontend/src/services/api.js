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
export const getDriverAssignments = (driverId) => api.get(`/driver/assignments/${driverId}`);

// ---------------- Passenger ----------------
export const getPassengerTickets = (passengerId) => api.get(`/passenger/tickets/${passengerId}`);
export const getAllPassengerRoutes = () => api.get("/passenger/routes");
export const getPassengerPayments = (passengerId) => api.get(`/passenger/payments/${passengerId}`);
export const createPassengerPayment = (payload) => api.post("/passenger/payments", payload);

// ---------------- Notifications ----------------
export const getUserNotifications = (userId) => api.get(`/notifications/${userId}`);
export const sendNotification = (payload) => api.post("/notifications", payload);

export default api;
