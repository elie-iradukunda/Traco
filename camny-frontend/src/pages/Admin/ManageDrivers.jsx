import React, { useEffect, useState } from "react";
import {
  getAllDrivers,
  getAllUsers,
  addDriver,
  updateDriver,
  deleteDriver,
  getAllRoutes,
  sendNotification,
  assignDriverToVehicle,
} from "../../services/api";

const ManageDrivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [users, setUsers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDriver, setNewDriver] = useState({
    user_id: "",
    license_number: "",
    status: "active",
  });
  const [editMode, setEditMode] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState({}); // per driver

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchDrivers(), fetchUsers(), fetchRoutes()]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const fetchDrivers = async () => {
    try {
      const res = await getAllDrivers();
      setDrivers(res.data || []);
    } catch (err) {
      console.error("Error fetching drivers:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await getAllUsers();
      setUsers(res.data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchRoutes = async () => {
    try {
      const res = await getAllRoutes();
      setRoutes(res.data || []);
    } catch (err) {
      console.error("Error fetching routes:", err);
    }
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    try {
      if (editMode && selectedDriver) {
        await updateDriver(selectedDriver.driver_id, newDriver);
      } else {
        await addDriver(newDriver);
      }
      setNewDriver({ user_id: "", license_number: "", status: "active" });
      setEditMode(false);
      setSelectedDriver(null);
      fetchDrivers();
    } catch (err) {
      console.error("Error saving driver:", err);
    }
  };

  const handleDelete = async (driverId) => {
    if (!window.confirm("Are you sure you want to delete this driver?")) return;
    try {
      await deleteDriver(driverId);
      fetchDrivers();
    } catch (err) {
      console.error("Error deleting driver:", err);
    }
  };

  const handleEdit = (driver) => {
    setEditMode(true);
    setSelectedDriver(driver);
    setNewDriver({
      user_id: driver.user_id,
      license_number: driver.license_number,
      status: driver.status,
    });
  };

  const assignDriverToRouteHandler = async (driverId) => {
    const routeId = selectedRoute[driverId];
    if (!routeId) return alert("Please select a route first!");
    try {
      // Adapt backend if needed
      await assignDriverToVehicle(routeId, driverId);

      // Notify driver
      const route = routes.find((r) => r.route_id === routeId);
      await sendNotification({
        user_id: driverId,
        message: `You have been assigned to route: ${route.route_name} (${route.start_location} - ${route.end_location})`,
      });

      alert("Driver assigned and notified successfully!");
      setSelectedRoute({ ...selectedRoute, [driverId]: "" });
      fetchDrivers();
    } catch (err) {
      console.error("Error assigning driver:", err);
    }
  };

  if (loading) return <p className="p-4">Loading...</p>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Manage Drivers</h1>

      {/* Driver Form */}
      <form
        onSubmit={handleCreateOrUpdate}
        className="bg-white p-6 rounded-lg shadow-md mb-6 max-w-xl flex flex-col gap-4"
      >
        {!editMode && (
          <select
            value={newDriver.user_id}
            onChange={(e) =>
              setNewDriver({ ...newDriver, user_id: e.target.value })
            }
            className="border p-2 rounded"
            required
          >
            <option value="">Select User</option>
            {users.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.full_name} ({u.email})
              </option>
            ))}
          </select>
        )}
        <input
          type="text"
          placeholder="License Number"
          value={newDriver.license_number}
          onChange={(e) =>
            setNewDriver({ ...newDriver, license_number: e.target.value })
          }
          className="border p-2 rounded"
          required
        />
        <select
          value={newDriver.status}
          onChange={(e) => setNewDriver({ ...newDriver, status: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button
          type="submit"
          className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          {editMode ? "Update Driver" : "Add Driver"}
        </button>
      </form>

      {/* Drivers Table */}
      <div className="bg-white shadow-md rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">All Drivers</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2 text-left">Name</th>
              <th className="border p-2 text-left">Email</th>
              <th className="border p-2 text-left">Phone</th>
              <th className="border p-2 text-left">License</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Assign Route</th>
              <th className="border p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.length > 0 ? (
              drivers.map((d) => (
                <tr key={d.driver_id}>
                  <td className="border p-2">{d.full_name}</td>
                  <td className="border p-2">{d.email}</td>
                  <td className="border p-2">{d.phone}</td>
                  <td className="border p-2">{d.license_number}</td>
                  <td className="border p-2">{d.status}</td>
                  <td className="border p-2">
                    <select
                      value={selectedRoute[d.driver_id] || ""}
                      onChange={(e) =>
                        setSelectedRoute({
                          ...selectedRoute,
                          [d.driver_id]: e.target.value,
                        })
                      }
                      className="border p-1 rounded"
                    >
                      <option value="">Select Route</option>
                      {routes.map((r) => (
                        <option key={r.route_id} value={r.route_id}>
                          {r.route_name} ({r.start_location} - {r.end_location})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => assignDriverToRouteHandler(d.driver_id)}
                      className="bg-green-500 text-white px-3 py-1 rounded ml-2 hover:bg-green-600"
                    >
                      Assign
                    </button>
                  </td>
                  <td className="border p-2 text-center space-x-2">
                    <button
                      onClick={() => handleEdit(d)}
                      className="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(d.driver_id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center p-3 text-gray-500">
                  No drivers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageDrivers;
