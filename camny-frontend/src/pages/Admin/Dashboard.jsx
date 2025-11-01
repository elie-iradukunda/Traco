import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/Admin/AdminLayout";
import {
  getAllDrivers,
  getAllRoutes,
  getAllVehicles,
  addDriver,
  deleteDriver,
  addRoute,
  deleteRoute,
  addVehicle,
  deleteVehicle,
  getAllUsers
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import LogoutButton from "../../components/LogoutButton";

const Dashboard = () => {
  const { user } = useAuth(); 
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [driverForm, setDriverForm] = useState({
    user_id: "",
    license_number: "",
    status: "available",
  });

  // Load all data only if user is admin
  const loadData = async () => {
    if (!user || user.role !== "admin") return;

    setLoading(true);
    try {
      const [dRes, rRes, vRes, uRes] = await Promise.all([
        getAllDrivers(),
        getAllRoutes(),
        getAllVehicles(),
        getAllUsers(),
      ]);
      setDrivers(dRes.data || []);
      setRoutes(rRes.data || []);
      setVehicles(vRes.data || []);
      setUsers(uRes.data || []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Add Driver
  const handleAddDriver = async (e) => {
    e.preventDefault();
    try {
      await addDriver(driverForm);
      setShowAddDriver(false);
      setDriverForm({ user_id: "", license_number: "", status: "available" });
      await loadData();
      alert("✅ Driver added successfully!");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to add driver");
    }
  };

  // Delete Driver
  const handleDeleteDriver = async (id) => {
    if (!window.confirm("Are you sure you want to delete this driver?")) return;
    try {
      await deleteDriver(id);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to delete driver");
    }
  };

  // Add Route
  const handleAddRoute = async () => {
    const route_name = prompt("Enter route name:");
    if (!route_name) return;
    try {
      await addRoute({ route_name });
      await loadData();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to add route");
    }
  };

  // Delete Route
  const handleDeleteRoute = async (id) => {
    if (!window.confirm("Delete this route?")) return;
    try {
      await deleteRoute(id);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to delete route");
    }
  };

  // Add Vehicle
  const handleAddVehicle = async () => {
    const plate_number = prompt("Enter vehicle plate number:");
    if (!plate_number) return;
    try {
      await addVehicle({ plate_number, model: "Unknown", capacity: 20, status: "active" });
      await loadData();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to add vehicle");
    }
  };

  // Delete Vehicle
  const handleDeleteVehicle = async (id) => {
    if (!window.confirm("Delete this vehicle?")) return;
    try {
      await deleteVehicle(id);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to delete vehicle");
    }
  };

  if (!user) return <p className="p-4">Loading user data...</p>; 

  return (
    <AdminLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <LogoutButton />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-sm text-gray-500">Drivers</h3>
            <p className="text-2xl font-bold">{drivers.length}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-sm text-gray-500">Routes</h3>
            <p className="text-2xl font-bold">{routes.length}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-sm text-gray-500">Vehicles</h3>
            <p className="text-2xl font-bold">{vehicles.length}</p>
          </div>
        </div>

        {/* Quick Lists */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Manage Data</h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Drivers */}
              <div className="bg-white rounded shadow p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Drivers</h4>
                  <button
                    onClick={() => setShowAddDriver(true)}
                    className="bg-blue-500 text-white px-2 py-1 text-sm rounded"
                  >
                    + Add
                  </button>
                </div>
                <ul className="text-sm space-y-1">
                  {drivers.slice(0, 5).map((d) => (
                    <li key={d.driver_id} className="flex justify-between items-center">
                      <span>{d.full_name} — {d.status}</span>
                      <button
                        onClick={() => handleDeleteDriver(d.driver_id)}
                        className="text-red-500 text-xs"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Routes */}
              <div className="bg-white rounded shadow p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Routes</h4>
                  <button
                    onClick={handleAddRoute}
                    className="bg-blue-500 text-white px-2 py-1 text-sm rounded"
                  >
                    + Add
                  </button>
                </div>
                <ul className="text-sm space-y-1">
                  {routes.slice(0, 5).map((r) => (
                    <li key={r.route_id} className="flex justify-between">
                      <span>{r.route_name}</span>
                      <button
                        onClick={() => handleDeleteRoute(r.route_id)}
                        className="text-red-500 text-xs"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Vehicles */}
              <div className="bg-white rounded shadow p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Vehicles</h4>
                  <button
                    onClick={handleAddVehicle}
                    className="bg-blue-500 text-white px-2 py-1 text-sm rounded"
                  >
                    + Add
                  </button>
                </div>
                <ul className="text-sm space-y-1">
                  {vehicles.slice(0, 5).map((v) => (
                    <li key={v.vehicle_id} className="flex justify-between">
                      <span>{v.plate_number} — {v.model}</span>
                      <button
                        onClick={() => handleDeleteVehicle(v.vehicle_id)}
                        className="text-red-500 text-xs"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* Add Driver Modal */}
        {showAddDriver && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
            <form
              onSubmit={handleAddDriver}
              className="bg-white p-6 rounded shadow w-80"
            >
              <h3 className="text-lg font-semibold mb-3">Add Driver</h3>
              
              {/* Select User instead of raw input */}
              <select
                value={driverForm.user_id}
                onChange={(e) => setDriverForm({ ...driverForm, user_id: e.target.value })}
                className="border p-2 w-full mb-2 rounded"
                required
              >
                <option value="">Select User</option>
                {users.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.full_name} ({u.email})
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="License Number"
                value={driverForm.license_number}
                onChange={(e) => setDriverForm({ ...driverForm, license_number: e.target.value })}
                className="border p-2 w-full mb-2 rounded"
                required
              />
              <select
                value={driverForm.status}
                onChange={(e) => setDriverForm({ ...driverForm, status: e.target.value })}
                className="border p-2 w-full mb-3 rounded"
              >
                <option value="available">Available</option>
                <option value="on_trip">On Trip</option>
              </select>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setShowAddDriver(false)}
                  className="px-3 py-1 bg-gray-300 rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="px-3 py-1 bg-blue-500 text-white rounded">
                  Save
                </button>
              </div>

              <div className="mt-2">
                <LogoutButton/>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
