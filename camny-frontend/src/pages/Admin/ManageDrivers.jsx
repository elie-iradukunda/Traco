import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/Admin/AdminLayout";
import {
  getAllDrivers,
  getAllUsers,
  getAllVehicles,
  getAllRoutes,
  addDriver,
  updateDriver,
  deleteDriver,
  assignDriverToVehicle,
  assignDriverToRoute,
  sendNotification
} from "../../services/api";

const ManageDrivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newDriver, setNewDriver] = useState({
    user_id: "",
    license_number: "",
    status: "active",
  });

  const [editMode, setEditMode] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState({});
  const [selectedRoute, setSelectedRoute] = useState({});

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchDrivers(),
        fetchUsers(),
        fetchVehicles(),
        fetchRoutes()
      ]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const fetchDrivers = async () => {
    try {
      const res = await getAllDrivers();
      const driversData = res.data || [];
      
      // Deduplicate drivers by driver_id (keep first occurrence)
      const uniqueDrivers = driversData.reduce((acc, driver) => {
        if (!acc.find(d => d.driver_id === driver.driver_id)) {
          acc.push(driver);
        }
        return acc;
      }, []);
      
      setDrivers(uniqueDrivers);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await getAllUsers();
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await getAllVehicles();
      setVehicles(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRoutes = async () => {
    try {
      const res = await getAllRoutes();
      setRoutes(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    try {
      if (editMode && selectedDriver) {
        const updateData = {
          license_number: newDriver.license_number,
          status: newDriver.status,
        };
        await updateDriver(selectedDriver.driver_id, updateData);
        alert("✅ Driver updated successfully!");
      } else {
        const driverData = {
          user_id: newDriver.user_id,
          license_number: newDriver.license_number,
          status: newDriver.status,
        };
        await addDriver(driverData);
        alert("✅ Driver created successfully!");
      }
      setNewDriver({ user_id: "", license_number: "", status: "active" });
      setEditMode(false);
      setSelectedDriver(null);
      fetchDrivers();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to create/update driver");
    }
  };

  const handleDelete = async (driverId) => {
    if (!window.confirm("Are you sure you want to delete this driver?")) return;
    try {
      await deleteDriver(driverId);
      fetchDrivers();
    } catch (err) {
      console.error(err);
      alert("Failed to delete driver");
    }
  };

  const handleEdit = (driver) => {
    setEditMode(true);
    setSelectedDriver(driver);
    setNewDriver({
      user_id: driver.user_id,
      license_number: driver.license_number || "",
      status: driver.status,
    });
  };

  const assignDriverToVehicleHandler = async (driverId) => {
    const vehicleId = selectedVehicle[driverId];
    if (!vehicleId) return alert("Select a vehicle first!");
    try {
      await assignDriverToVehicle(vehicleId, driverId);
      alert("✅ Driver assigned to vehicle successfully!");
      setSelectedVehicle({ ...selectedVehicle, [driverId]: "" });
      fetchDrivers();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to assign vehicle.");
    }
  };

  const assignDriverToRouteHandler = async (driverId) => {
    const routeId = selectedRoute[driverId];
    if (!routeId) return alert("Select a route first!");
    try {
      const driver = drivers.find((d) => d.driver_id === driverId);
      const driverUserId = driver?.user_id;
      
      await assignDriverToRoute(routeId, driverId);
      
      const route = routes.find((r) => r.route_id === parseInt(routeId));
      if (route && driverUserId) {
        try {
          await sendNotification({
            user_id: driverUserId,
            message: `You have been assigned to route: ${route.route_name}`,
            title: "New Route Assignment"
          });
        } catch (notifErr) {
          console.error("Notification error (non-critical):", notifErr);
        }
      }
      alert("✅ Driver assigned to route successfully!");
      setSelectedRoute({ ...selectedRoute, [driverId]: "" });
      fetchDrivers();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to assign route.");
    }
  };

  if (loading) return <AdminLayout><div className="flex justify-center items-center h-screen">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
    <div className="p-6 bg-gray-100 min-h-screen space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Manage Drivers</h1>

      {/* Driver Form */}
      <form onSubmit={handleCreateOrUpdate} className="bg-white p-6 rounded-xl shadow-lg max-w-xl mx-auto flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-gray-700">{editMode ? "Edit Driver" : "Add New Driver"}</h2>

        {!editMode && (
          <select
            value={newDriver.user_id}
            onChange={(e) => setNewDriver({ ...newDriver, user_id: e.target.value })}
            className="border p-2 rounded-lg"
            required
          >
            <option value="">Select User</option>
            {users.map((u) => (
              <option key={u.user_id} value={u.user_id}>{u.full_name || u.email} ({u.email})</option>
            ))}
          </select>
        )}

        <input
          type="text"
          placeholder="License Number"
          value={newDriver.license_number}
          onChange={(e) => setNewDriver({ ...newDriver, license_number: e.target.value })}
          className="border p-2 rounded-lg"
          required
        />

        <select value={newDriver.status} onChange={(e) => setNewDriver({ ...newDriver, status: e.target.value })} className="border p-2 rounded-lg">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <div className="flex gap-4">
          <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">{editMode ? "Update Driver" : "Add Driver"}</button>
          {editMode && <button type="button" onClick={() => { setEditMode(false); setSelectedDriver(null); setNewDriver({ user_id: "", license_number: "", status: "active" }); }}
            className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400">Cancel</button>}
        </div>
      </form>

      {/* Drivers Table */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">All Drivers</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left">License</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Assign Vehicle</th>
                <th className="p-3 text-left">Assign Route</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length > 0 ? drivers.map((d, index) => (
                <tr key={`driver-${d.driver_id}-${d.user_id}-${index}`} className="hover:bg-gray-50">
                  <td className="p-3">{d.full_name || "N/A"}</td>
                  <td className="p-3">{d.email || "N/A"}</td>
                  <td className="p-3">{d.phone || "N/A"}</td>
                  <td className="p-3">{d.license_number || "N/A"}</td>
                  <td className="p-3">{d.status?.toUpperCase() || "N/A"}</td>

                  {/* Vehicle */}
                  <td className="p-3 flex gap-2">
                    <select value={selectedVehicle[d.driver_id] || ""} onChange={(e) =>
                      setSelectedVehicle({ ...selectedVehicle, [d.driver_id]: e.target.value })} className="border p-1 rounded-lg">
                      <option value="">Select Vehicle</option>
                      {vehicles.map((v) => (<option key={v.vehicle_id} value={v.vehicle_id}>{v.plate_number} ({v.model})</option>))}
                    </select>
                    <button onClick={() => assignDriverToVehicleHandler(d.driver_id)} className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600">Assign</button>
                  </td>

                  {/* Route */}
                  <td className="p-3 flex gap-2">
                    <select value={selectedRoute[d.driver_id] || ""} onChange={(e) =>
                      setSelectedRoute({ ...selectedRoute, [d.driver_id]: e.target.value })} className="border p-1 rounded-lg">
                      <option value="">Select Route</option>
                      {routes.map((r) => (<option key={r.route_id} value={r.route_id}>{r.route_name} ({r.start_location}-{r.end_location})</option>))}
                    </select>
                    <button onClick={() => assignDriverToRouteHandler(d.driver_id)} className="bg-purple-500 text-white px-3 py-1 rounded-lg hover:bg-purple-600">Assign</button>
                  </td>

                  <td className="p-3 flex justify-center gap-2">
                    <button onClick={() => handleEdit(d)} className="bg-yellow-400 text-white px-3 py-1 rounded-lg hover:bg-yellow-500">Edit</button>
                    <button onClick={() => handleDelete(d.driver_id)} className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600">Delete</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="text-center p-3">No drivers found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </AdminLayout>
  );
};

export default ManageDrivers;
