import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";

// Auth context
import { AuthProvider, useAuth } from "./context/AuthContext";

// Public Pages
import LandingPage from "./pages/Public/LandingPage";
import Login from "./pages/Public/Login";

// Admin Pages
import Dashboard from "./pages/Admin/Dashboard";
import ManageDrivers from "./pages/Admin/ManageDrivers";
import ManageRoutes from "./pages/Admin/ManageRoutes";
import VehiclesPage from "./pages/Admin/Vehicles";
import NotificationsAdmin from "./pages/Admin/Notifications";
import RegisterDriver from "./pages/Admin/RegisterDriver";

// Driver Pages
import DriverDashboard from "./pages/Driver/DriverDashboard";

// Passenger Pages
import BrowseRoutes from "./pages/Passenger/BrowseRoutes";
import MyTickets from "./pages/Passenger/MyTickets";

// PrivateRoute component
const PrivateRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" />;
  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="p-4">
          {/* Navigation */}
          <nav className="mb-4 border-b pb-2 flex gap-2 flex-wrap">
            <Link className="text-blue-600 hover:underline" to="/">Landing</Link>
            <Link className="text-blue-600 hover:underline" to="/login">Login</Link>

            {/* Admin Links */}
            <Link className="text-blue-600 hover:underline" to="/admin/dashboard">Admin Dashboard</Link>
            <Link className="text-blue-600 hover:underline" to="/admin/manage-drivers">Manage Drivers</Link>
            <Link className="text-blue-600 hover:underline" to="/admin/manage-routes">Manage Routes</Link>
            <Link className="text-blue-600 hover:underline" to="/admin/vehicles">Vehicles</Link>
            <Link className="text-blue-600 hover:underline" to="/admin/notifications">Notifications</Link>


           

            {/* Driver Links */}
            <Link className="text-blue-600 hover:underline" to="/driver/dashboard">Driver Dashboard</Link>

            {/* Passenger Links */}
            <Link className="text-blue-600 hover:underline" to="/passenger/browse">Browse Routes</Link>
            <Link className="text-blue-600 hover:underline" to="/passenger/tickets">My Tickets</Link>
          </nav>

          {/* Routes */}
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />

            {/* Admin */}
            <Route
              path="/admin/dashboard"
              element={
                <PrivateRoute roles={["admin"]}>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/manage-drivers"
              element={
                <PrivateRoute roles={["admin"]}>
                  <ManageDrivers />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/manage-routes"
              element={
                <PrivateRoute roles={["admin"]}>
                  <ManageRoutes />
                </PrivateRoute>
              }
            />

             <Route path="/admin/register-driver" element={<RegisterDriver />} />
            <Route
              path="/admin/vehicles"
              element={
                <PrivateRoute roles={["admin"]}>
                  <VehiclesPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/notifications"
              element={
                <PrivateRoute roles={["admin"]}>
                  <NotificationsAdmin />
                </PrivateRoute>
              }
            />

            {/* Driver */}
            <Route
              path="/driver/dashboard"
              element={
                <PrivateRoute roles={["driver"]}>
                  <DriverDashboard />
                </PrivateRoute>
              }
            />

            {/* Passenger */}
            <Route
              path="/passenger/browse"
              element={
                <PrivateRoute roles={["passenger"]}>
                  <BrowseRoutes />
                </PrivateRoute>
              }
            />
            <Route
              path="/passenger/tickets"
              element={
                <PrivateRoute roles={["passenger"]}>
                  <MyTickets />
                </PrivateRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<div className="p-4">Page not found</div>} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
