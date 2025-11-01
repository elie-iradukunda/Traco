import React from "react";
import { Link, Outlet } from "react-router-dom";

const AdminLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Camny — Admin</h1>
          <nav className="flex items-center gap-3">
            <Link className="text-sm text-sky-600 hover:underline" to="/admin/dashboard">Dashboard</Link>
            <Link className="text-sm text-sky-600 hover:underline" to="/admin/drivers">Drivers</Link>
            <Link className="text-sm text-sky-600 hover:underline" to="/admin/routes">Routes</Link>
            <Link className="text-sm text-sky-600 hover:underline" to="/admin/vehicles">Vehicles</Link>
            <Link className="text-sm text-sky-600 hover:underline" to="/admin/notifications">Notifications</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
