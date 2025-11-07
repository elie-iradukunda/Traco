import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/Admin/AdminLayout";
import {
  getAllDrivers,
  getAllVehicles,
  getAllRoutes,
  updateDriver,
  deleteDriver,
  assignDriverToVehicle,
  assignDriverToRoute,
  sendNotification
} from "../../services/api";

const ManageDrivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    license_number: "",
    status: "active",
  });
  const [selectedVehicle, setSelectedVehicle] = useState({});
  const [selectedRoute, setSelectedRoute] = useState({});

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchDrivers(),
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

  const openEditModal = (driver) => {
    setSelectedDriver(driver);
    setEditForm({
      license_number: driver.license_number || "",
      status: driver.status || "active",
    });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setSelectedDriver(null);
    setEditForm({ license_number: "", status: "active" });
  };

  const handleUpdateDriver = async (event) => {
    event.preventDefault();
    if (!selectedDriver) return;
    try {
      await updateDriver(selectedDriver.driver_id, {
        license_number: editForm.license_number,
        status: editForm.status,
      });
      alert("✅ Driver updated successfully!");
      closeEditModal();
      fetchDrivers();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to update driver");
    }
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

  const driverStats = useMemo(() => {
    const total = drivers.length;
    const active = drivers.filter((driver) => driver.status === "active").length;
    const inactive = drivers.filter((driver) => driver.status === "inactive").length;
    const vehiclesAssigned = vehicles.filter((vehicle) => !!vehicle.assigned_driver).length;
    const withoutVehicle = total - vehiclesAssigned;

    return {
      total,
      active,
      inactive,
      vehiclesAssigned,
      withoutVehicle: withoutVehicle < 0 ? 0 : withoutVehicle,
    };
  }, [drivers, vehicles]);

  const filteredDrivers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return drivers.filter((driver) => {
      const matchesStatus =
        statusFilter === "all" || driver.status?.toLowerCase() === statusFilter;
      const matchesTerm =
        !term ||
        driver.full_name?.toLowerCase().includes(term) ||
        driver.email?.toLowerCase().includes(term) ||
        driver.phone?.toLowerCase().includes(term) ||
        driver.license_number?.toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  }, [drivers, searchTerm, statusFilter]);

  if (loading)
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-screen text-xl text-gray-500">
          Loading driver data...
        </div>
      </AdminLayout>
    );

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-green-500 to-teal-500 text-white shadow-2xl mx-4 mt-6">
          <div className="px-8 py-12 sm:px-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <p className="uppercase tracking-[0.3em] text-xs text-white/70">Operations</p>
                <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold">Driver Management Hub</h1>
                <p className="mt-3 text-white/80 max-w-2xl text-sm sm:text-base">
                  Monitor your fleet workforce, assign routes and vehicles instantly, and keep licenses up to date—all in one polished workspace.
                </p>
              </div>
              <div className="bg-white/15 backdrop-blur-lg rounded-2xl px-6 py-5 text-sm shadow-lg border border-white/20">
                <p className="text-white/80 font-medium">Quick tip</p>
                <p className="text-white font-semibold">Register new drivers from the <span className="underline">Register Driver</span> page. Updates happen here.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[{
              title: "Total Drivers",
              value: driverStats.total,
              accent: "from-indigo-500 to-blue-500",
              icon: "🧑‍✈️",
            }, {
              title: "Active",
              value: driverStats.active,
              accent: "from-green-500 to-emerald-500",
              icon: "✅",
            }, {
              title: "Inactive",
              value: driverStats.inactive,
              accent: "from-amber-500 to-orange-500",
              icon: "⚠️",
            }, {
              title: "With Vehicle",
              value: driverStats.vehiclesAssigned,
              accent: "from-purple-500 to-fuchsia-500",
              icon: "🚐",
            }].map((card) => (
              <div
                key={card.title}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.accent} text-white shadow-lg`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.3),_rgba(255,255,255,0))]"></div>
                <div className="relative px-6 py-6">
                  <div className="text-3xl">{card.icon}</div>
                  <p className="mt-2 text-sm uppercase tracking-wide text-white/70">{card.title}</p>
                  <p className="mt-3 text-3xl font-extrabold">{card.value}</p>
                  {card.title === "With Vehicle" && (
                    <p className="text-xs text-white/70 mt-1">Unassigned drivers: {driverStats.withoutVehicle}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="px-6 py-6 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Driver Directory</h2>
                <p className="text-sm text-gray-500">Search, filter, and assign in seconds.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">🔍</span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search name, email, phone, license..."
                    className="w-full sm:w-72 pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Driver</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">License</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Vehicle</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Route</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredDrivers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-gray-500 text-sm">
                          No drivers match your filters.
                        </td>
                      </tr>
                    )}
                    {filteredDrivers.map((driver) => {
                      const driverId = parseInt(driver.driver_id, 10);
                      const currentVehicle = vehicles.find((vehicle) => {
                        if (!vehicle.assigned_driver) return false;
                        return parseInt(vehicle.assigned_driver, 10) === driverId;
                      });
                      const hasVehicle = Boolean(currentVehicle);
                      const availableVehicles = vehicles.filter((vehicle) => {
                        if (!vehicle.assigned_driver) return true;
                        return parseInt(vehicle.assigned_driver, 10) === driverId;
                      });
                      const currentRouteLabel = driver.route_name
                        ? `${driver.route_name}${
                            driver.start_location && driver.end_location
                              ? ` (${driver.start_location} → ${driver.end_location})`
                              : ""
                          }`
                        : null;

                      return (
                        <tr key={driver.driver_id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-green-500 text-white flex items-center justify-center font-semibold">
                                {driver.full_name ? driver.full_name.charAt(0).toUpperCase() : "D"}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{driver.full_name || "Unnamed Driver"}</p>
                                <p className="text-xs text-gray-500">ID: {driver.driver_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 space-y-1">
                            <p>{driver.email || "No email"}</p>
                            <p className="text-xs text-gray-400">{driver.phone || "No phone"}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {driver.license_number || <span className="text-gray-400">Not set</span>}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                                driver.status === "active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {driver.status ? driver.status.toUpperCase() : "UNKNOWN"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {hasVehicle ? (
                              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-semibold text-green-700">
                                Assigned to {currentVehicle.plate_number} • {currentVehicle.model}
                                <p className="mt-1 text-[11px] font-normal text-green-600">
                                  Manage unassignment from the Vehicles page before reassigning.
                                </p>
                              </div>
                            ) : availableVehicles.length > 0 ? (
                              <div className="flex flex-col gap-2">
                                <select
                                  value={selectedVehicle[driver.driver_id] || ""}
                                  onChange={(event) =>
                                    setSelectedVehicle({
                                      ...selectedVehicle,
                                      [driver.driver_id]: event.target.value,
                                    })
                                  }
                                  className="border border-gray-200 rounded-xl text-sm px-3 py-2 focus:ring-2 focus:ring-green-500"
                                >
                                  <option value="">Select vehicle</option>
                                  {availableVehicles.map((vehicle) => (
                                    <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                                      {vehicle.plate_number} • {vehicle.model}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => assignDriverToVehicleHandler(driver.driver_id)}
                                  disabled={!selectedVehicle[driver.driver_id]}
                                  className={`inline-flex items-center justify-center px-3 py-2 text-xs font-semibold rounded-xl transition ${
                                    selectedVehicle[driver.driver_id]
                                      ? "text-white bg-green-500 hover:bg-green-600"
                                      : "text-gray-400 bg-gray-100 cursor-not-allowed"
                                  }`}
                                >
                                  Assign Vehicle
                                </button>
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                                No available vehicles to assign.
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-2">
                              <select
                                value={selectedRoute[driver.driver_id] || ""}
                                onChange={(event) =>
                                  setSelectedRoute({
                                    ...selectedRoute,
                                    [driver.driver_id]: event.target.value,
                                  })
                                }
                                className="border border-gray-200 rounded-xl text-sm px-3 py-2 focus:ring-2 focus:ring-purple-500"
                              >
                                <option value="">{currentRouteLabel || "Select route"}</option>
                                {routes.map((route) => (
                                  <option key={route.route_id} value={route.route_id}>
                                    {route.route_name} ({route.start_location} → {route.end_location})
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => assignDriverToRouteHandler(driver.driver_id)}
                                className="inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-white bg-purple-500 rounded-xl hover:bg-purple-600"
                              >
                                Assign Route
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openEditModal(driver)}
                                className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => handleDelete(driver.driver_id)}
                                className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {editModalOpen && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-100 flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Update Driver Details</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Keep license information and status current. Changes apply immediately.
                  </p>
                </div>
                <button
                  onClick={closeEditModal}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleUpdateDriver} className="px-8 py-6 space-y-5">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Driver
                  </label>
                  <p className="mt-1 text-base font-semibold text-gray-900">
                    {selectedDriver?.full_name || "Unnamed Driver"}
                  </p>
                  <p className="text-xs text-gray-400">ID: {selectedDriver?.driver_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                  <input
                    type="text"
                    value={editForm.license_number}
                    onChange={(event) =>
                      setEditForm({ ...editForm, license_number: event.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. RWA-DR-12345"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <div className="flex items-center gap-3">
                    {[
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`flex-1 border rounded-xl px-4 py-3 text-sm font-semibold cursor-pointer transition ${
                          editForm.status === option.value
                            ? "border-blue-500 bg-blue-50 text-blue-600"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          value={option.value}
                          checked={editForm.status === option.value}
                          onChange={(event) =>
                            setEditForm({ ...editForm, status: event.target.value })
                          }
                          className="hidden"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManageDrivers;
