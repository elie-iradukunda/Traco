import React, { useEffect, useState } from "react";
// Assuming you are using react-router-dom for navigation
import { useNavigate } from "react-router-dom"; 
import AdminLayout from "../../components/Admin/AdminLayout";
import {
  getAllDrivers,
  getAllRoutes,
  getAllVehicles,
  getStats,
  // Keeping API delete functions as they are used directly on the dashboard
  deleteDriver,
  deleteRoute,
  deleteVehicle,
  // Other unused APIs (addDriver, etc.) are removed for cleanliness
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import LogoutButton from "../../components/LogoutButton";

// 🎨 Helper component for Stat Cards (Visually appealing)
const StatCard = ({ title, count, icon, color }) => (
  <div className={`bg-white p-6 rounded-xl shadow-lg border-l-4 ${color}`}>
    <div className="flex justify-between items-center">
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
        <p className="text-4xl font-bold text-gray-800 mt-1">{count}</p>
      </div>
      <div className="text-3xl text-gray-400">
        {icon}
      </div>
    </div>
  </div>
);

// 🏷️ Helper component for Status Pill (Interactive/Visual)
const StatusPill = ({ status }) => {
  const baseStyle = "px-2 py-0.5 text-xs font-semibold rounded-full capitalize";
  let style = "bg-gray-100 text-gray-800"; // Default
  
  if (status === 'available') {
    style = "bg-green-100 text-green-800";
  } else if (status === 'on_trip') {
    style = "bg-yellow-100 text-yellow-800";
  } else if (status === 'active') { // For vehicles
    style = "bg-blue-100 text-blue-800";
  }

  return <span className={`${baseStyle} ${style}`}>{status.replace('_', ' ')}</span>;
};

// Main Dashboard Component
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate(); // For navigation
  
  // --- State Management ---
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // --- Data Loading Functionality (MAINTAINED) ---
  const loadData = async () => {
    if (!user || user.role !== "admin") return;

    setLoading(true);
    try {
      const [dRes, rRes, vRes, statsRes] = await Promise.all([
        getAllDrivers(),
        getAllRoutes(),
        getAllVehicles(),
        getStats(),
      ]);
      setDrivers(dRes.data || []);
      setRoutes(rRes.data || []);
      setVehicles(vRes.data || []);
      setStats(statsRes.data || null);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);
  
  // --- Navigation Handlers (NEW FUNCTIONALITY) ---
  
  const handleNavigateToAddDriver = () => {
    // Navigates to the page for managing/adding drivers
    navigate("/admin/manage-drivers"); 
  };
  
  const handleNavigateToAddRoute = () => {
    // Navigates to the page for managing/adding routes
    navigate("/admin/manage-routes");
  };

  const handleNavigateToAddVehicle = () => {
    // Navigates to the page for managing/adding vehicles
    navigate("/admin/vehicles");
  };

  const handleNavigateToPassengers = () => {
    navigate("/admin/passengers");
  };

  const handleNavigateToAssignments = () => {
    navigate("/admin/driver-assignments");
  };

  // --- DELETE Functionality (MAINTAINED) ---

  const handleDeleteDriver = async (id) => {
    if (!window.confirm("Are you sure you want to delete this driver?")) return;
    try {
      await deleteDriver(id);
      await loadData();
      alert("✅ Driver deleted successfully!");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to delete driver");
    }
  };

  const handleDeleteRoute = async (id) => {
    if (!window.confirm("Delete this route?")) return;
    try {
      await deleteRoute(id);
      await loadData();
      alert("✅ Route deleted successfully!");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to delete route");
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm("Delete this vehicle?")) return;
    try {
      await deleteVehicle(id);
      await loadData();
      alert("✅ Vehicle deleted successfully!");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to delete vehicle");
    }
  };


  if (!user) return <p className="p-4 text-center">Loading user data...</p>;

  return (
    <AdminLayout>
      <div className="p-6 md:p-10 bg-gray-100 min-h-screen">
        <div className="flex justify-between items-center mb-8 border-b pb-3">
          <h1 className="text-3xl font-extrabold text-gray-800">🚌 Fleet Management Dashboard</h1>
          <LogoutButton />
        </div>

        {/* --- */}

        {/* 📊 Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard
            title="Total Drivers"
            count={stats?.total_drivers || drivers.length}
            icon="🧑‍✈️"
            color="border-blue-500"
          />
          <StatCard
            title="Total Routes"
            count={stats?.total_routes || routes.length}
            icon="🗺️"
            color="border-green-500"
          />
          <StatCard
            title="Total Vehicles"
            count={stats?.total_vehicles || vehicles.length}
            icon="🚍"
            color="border-purple-500"
          />
          <StatCard
            title="Total Tickets"
            count={stats?.total_tickets || 0}
            icon="🎫"
            color="border-yellow-500"
          />
        </div>

        {/* --- */}

        {/* 🛠️ Manage Resources */}
        <section>
          <h2 className="text-2xl font-bold text-gray-700 mb-6">Resource Management Quick View</h2>
          {loading ? (
            <div className="flex justify-center items-center h-48 bg-white rounded-xl shadow-lg">
                <p className="text-xl text-gray-500">Loading resources...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-600 to-sky-500 text-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300">
                <div className="flex justify-between items-center mb-4 border-b border-white border-opacity-20 pb-2">
                  <h4 className="text-lg font-semibold">Live GPS Tracking</h4>
                  <button
                    onClick={() => navigate("/admin/live-tracking")}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-1.5 text-sm font-medium rounded-lg transition duration-200 shadow-md"
                    title="Monitor live vehicles"
                  >
                    Open Map
                  </button>
                </div>
                <p className="text-sm text-white opacity-90 mb-2">
                  Watch every vehicle in motion and track route progress in real-time.
                </p>
                <button
                  onClick={() => navigate("/admin/live-tracking")}
                  className="w-full mt-4 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                >
                  📡 View Live Fleet →
                </button>
              </div>
              
              {/* Revenue Analytics Card */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300">
                <div className="flex justify-between items-center mb-4 border-b border-white border-opacity-20 pb-2">
                  <h4 className="text-lg font-semibold">Revenue Analytics</h4>
                  <button
                    onClick={() => navigate("/admin/revenue-analytics")}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-1.5 text-sm font-medium rounded-lg transition duration-200 shadow-md"
                    title="View Revenue Analytics"
                  >
                    View Analytics
                  </button>
                </div>
                <p className="text-sm text-white opacity-90 mb-2">Track revenue, performance metrics, and insights</p>
                <button
                  onClick={() => navigate("/admin/revenue-analytics")}
                  className="w-full mt-4 px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                >
                  📊 View Analytics →
                </button>
              </div>

              {/* Passengers Card */}
              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h4 className="text-lg font-semibold text-gray-700">Passengers</h4>
                  <button
                    onClick={handleNavigateToPassengers}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-sm font-medium rounded-lg transition duration-200 shadow-md"
                    title="View All Passengers"
                  >
                    View All
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-2">View all passengers who have purchased tickets</p>
                <button
                  onClick={handleNavigateToPassengers}
                  className="w-full mt-4 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-medium"
                >
                  👥 View Passengers →
                </button>
              </div>

              {/* Driver Assignments Card */}
              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h4 className="text-lg font-semibold text-gray-700">Driver Assignments</h4>
                  <button
                    onClick={handleNavigateToAssignments}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 text-sm font-medium rounded-lg transition duration-200 shadow-md"
                    title="View All Assignments"
                  >
                    View All
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-2">See drivers assigned to vehicles and routes</p>
                <button
                  onClick={handleNavigateToAssignments}
                  className="w-full mt-4 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-medium"
                >
                  🚗 View Assignments →
                </button>
              </div>
              
              {/* Drivers Card - Uses Navigation */}
              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h4 className="text-lg font-semibold text-gray-700">Driver Quick View</h4>
                  <button
                    onClick={handleNavigateToAddDriver} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm font-medium rounded-lg transition duration-200 shadow-md"
                    title="Go to Driver Management"
                  >
                    Manage Drivers
                  </button>
                </div>
                <ul className="text-sm space-y-3">
                  {drivers.slice(0, 5).map((d) => (
                    <li key={d.driver_id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                      <span className="truncate pr-2">
                        <span className="font-medium">{d.full_name || 'Name Missing'}</span> — <StatusPill status={d.status} />
                      </span>
                      <button
                        onClick={() => handleDeleteDriver(d.driver_id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition"
                        title="Delete Driver"
                      >
                        <span className="font-bold">×</span>
                      </button>
                    </li>
                  ))}
                  {drivers.length > 5 && <li className="text-center pt-2 text-gray-500 text-xs">... and {drivers.length - 5} more</li>}
                  {drivers.length === 0 && <li className="text-center text-gray-500 py-4">No drivers found.</li>}
                </ul>
              </div>

              {/* Routes Card - Uses Navigation */}
              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h4 className="text-lg font-semibold text-gray-700">Routes Quick View</h4>
                  <button
                    onClick={handleNavigateToAddRoute}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm font-medium rounded-lg transition duration-200 shadow-md"
                    title="Go to Route Management"
                  >
                    Manage Routes
                  </button>
                </div>
                <ul className="text-sm space-y-3">
                  {routes.slice(0, 5).map((r) => (
                    <li key={r.route_id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                      <span className="font-medium truncate pr-2">{r.route_name}</span>
                      <button
                        onClick={() => handleDeleteRoute(r.route_id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition"
                        title="Delete Route"
                      >
                        <span className="font-bold">×</span>
                      </button>
                    </li>
                  ))}
                  {routes.length > 5 && <li className="text-center pt-2 text-gray-500 text-xs">... and {routes.length - 5} more</li>}
                  {routes.length === 0 && <li className="text-center text-gray-500 py-4">No routes found.</li>}
                </ul>
              </div>

              {/* Vehicles Card - Uses Navigation */}
              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h4 className="text-lg font-semibold text-gray-700">Vehicle Quick View</h4>
                  <button
                    onClick={handleNavigateToAddVehicle}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 text-sm font-medium rounded-lg transition duration-200 shadow-md"
                    title="Go to Vehicle Management"
                  >
                    Manage Vehicles
                  </button>
                </div>
                <ul className="text-sm space-y-3">
                  {vehicles.slice(0, 5).map((v) => (
                    <li key={v.vehicle_id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                      <span className="font-medium truncate pr-2">
                        {v.plate_number} — <span className="text-gray-500">{v.model}</span>
                        <StatusPill status={v.status} />
                      </span>
                      <button
                        onClick={() => handleDeleteVehicle(v.vehicle_id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition"
                        title="Delete Vehicle"
                      >
                        <span className="font-bold">×</span>
                      </button>
                    </li>
                  ))}
                  {vehicles.length > 5 && <li className="text-center pt-2 text-gray-500 text-xs">... and {vehicles.length - 5} more</li>}
                  {vehicles.length === 0 && <li className="text-center text-gray-500 py-4">No vehicles found.</li>}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;