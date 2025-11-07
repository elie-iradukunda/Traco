import React from "react";
import { Link, useLocation } from "react-router-dom";
import LogoutButton from "../LogoutButton";
import DarkModeToggle from "../Common/DarkModeToggle";

const AdminLayout = ({ children }) => {
  const location = useLocation();

  const navLinks = [
    { path: "/admin/dashboard", label: "Dashboard" },
    { path: "/admin/revenue-analytics", label: "Analytics" },
    { path: "/admin/live-tracking", label: "Live Tracking" },
    { path: "/admin/manage-drivers", label: "Drivers" },
    { path: "/admin/register-driver", label: "Register Driver" },
    { path: "/admin/manage-routes", label: "Routes" },
    { path: "/admin/vehicles", label: "Vehicles" },
    { path: "/admin/passengers", label: "Passengers" },
    { path: "/admin/driver-assignments", label: "Assignments" },
    { path: "/admin/all-tickets", label: "All Tickets" },
    { path: "/admin/notifications", label: "Notifications" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <header className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/admin/dashboard" className="flex items-center">
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Camny Admin
              </h1>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    location.pathname === link.path
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <DarkModeToggle />
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
