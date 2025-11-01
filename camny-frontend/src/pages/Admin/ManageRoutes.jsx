import React, { useEffect, useState } from "react";
import {
  getAllRoutes,
  addRoute,
  updateRoute,
  deleteRoute,
} from "../../services/api";

const ManageRoutes = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRoute, setNewRoute] = useState({
    route_name: "",
    start_location: "",
    end_location: "",
    distance_km: "",
    fare_base: "",
    map_url: "",
  });
  const [editMode, setEditMode] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await getAllRoutes();
      setRoutes(res.data || []);
    } catch (err) {
      console.error("Error fetching routes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    try {
      if (editMode && selectedRoute) {
        await updateRoute(selectedRoute.route_id, newRoute);
      } else {
        await addRoute(newRoute);
      }
      resetForm();
      fetchRoutes();
    } catch (err) {
      console.error("Error saving route:", err);
    }
  };

  const handleDelete = async (routeId) => {
    if (!window.confirm("Are you sure you want to delete this route?")) return;
    try {
      await deleteRoute(routeId);
      fetchRoutes();
    } catch (err) {
      console.error("Error deleting route:", err);
    }
  };

  const handleEdit = (route) => {
    setEditMode(true);
    setSelectedRoute(route);
    setNewRoute({
      route_name: route.route_name,
      start_location: route.start_location,
      end_location: route.end_location,
      distance_km: route.distance_km,
      fare_base: route.fare_base,
      map_url: route.map_url || "",
    });
  };

  const resetForm = () => {
    setNewRoute({
      route_name: "",
      start_location: "",
      end_location: "",
      distance_km: "",
      fare_base: "",
      map_url: "",
    });
    setEditMode(false);
    setSelectedRoute(null);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Manage Routes</h1>

      {/* Route Form */}
      <form
        onSubmit={handleCreateOrUpdate}
        className="bg-white p-4 rounded-lg shadow-md mb-6 flex flex-col gap-3 max-w-lg"
      >
        <input
          type="text"
          placeholder="Route Name"
          value={newRoute.route_name}
          onChange={(e) =>
            setNewRoute({ ...newRoute, route_name: e.target.value })
          }
          className="border p-2 rounded"
          required
        />
        <input
          type="text"
          placeholder="Start Location"
          value={newRoute.start_location}
          onChange={(e) =>
            setNewRoute({ ...newRoute, start_location: e.target.value })
          }
          className="border p-2 rounded"
          required
        />
        <input
          type="text"
          placeholder="End Location"
          value={newRoute.end_location}
          onChange={(e) =>
            setNewRoute({ ...newRoute, end_location: e.target.value })
          }
          className="border p-2 rounded"
          required
        />
        <input
          type="number"
          step="0.1"
          placeholder="Distance (km)"
          value={newRoute.distance_km}
          onChange={(e) =>
            setNewRoute({ ...newRoute, distance_km: e.target.value })
          }
          className="border p-2 rounded"
          required
        />
        <input
          type="number"
          step="0.1"
          placeholder="Base Fare"
          value={newRoute.fare_base}
          onChange={(e) =>
            setNewRoute({ ...newRoute, fare_base: e.target.value })
          }
          className="border p-2 rounded"
          required
        />
        <input
          type="text"
          placeholder="Map URL"
          value={newRoute.map_url}
          onChange={(e) =>
            setNewRoute({ ...newRoute, map_url: e.target.value })
          }
          className="border p-2 rounded"
        />

        <button
          type="submit"
          className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          {editMode ? "Update Route" : "Add Route"}
        </button>
      </form>

      {/* Route List */}
      {loading ? (
        <p>Loading routes...</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-4 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-3">All Routes</h2>
          <table className="w-full border-collapse min-w-max">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2 text-left">Route Name</th>
                <th className="border p-2 text-left">Start</th>
                <th className="border p-2 text-left">End</th>
                <th className="border p-2 text-left">Distance (km)</th>
                <th className="border p-2 text-left">Fare</th>
                <th className="border p-2 text-left">Company</th>
                <th className="border p-2 text-left">Map</th>
                <th className="border p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {routes.length > 0 ? (
                routes.map((r) => (
                  <tr key={r.route_id}>
                    <td className="border p-2">{r.route_name}</td>
                    <td className="border p-2">{r.start_location}</td>
                    <td className="border p-2">{r.end_location}</td>
                    <td className="border p-2">{r.distance_km}</td>
                    <td className="border p-2">{r.fare_base}</td>
                    <td className="border p-2">{r.company_name || "N/A"}</td>
                    <td className="border p-2">
                      {r.map_url ? (
                        <a
                          href={r.map_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          View Map
                        </a>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td className="border p-2 text-center space-x-2">
                      <button
                        onClick={() => handleEdit(r)}
                        className="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-500"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(r.route_id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center p-3 text-gray-500">
                    No routes found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManageRoutes;
