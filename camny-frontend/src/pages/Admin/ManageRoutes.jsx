import React, { useEffect, useState, useCallback } from "react";
import AdminLayout from "../../components/Admin/AdminLayout";
import { 
  getAllRoutes, 
  addRoute, 
  updateRoute, 
  deleteRoute,
  getRouteStops,
  addRouteStop,
  updateRouteStop,
  deleteRouteStop
} from "../../services/api";

// Confirmation Dialog
const ConfirmationDialog = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full transition-all duration-300 transform scale-100">
                <div className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <span className="text-2xl">⚠️</span>
                        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                    </div>
                    <p className="text-gray-600 mb-6">{message}</p>
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-md"
                        >
                            Confirm Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ManageRoutes = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newRoute, setNewRoute] = useState({
    route_name: "",
    start_location: "",
    end_location: "",
    distance_km: "",
    fare_base: "",
    map_url: "",
    expected_start_time: "",
  });
  const [editMode, setEditMode] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState(null);
  const [selectedRouteForStops, setSelectedRouteForStops] = useState(null);
  const [routeStops, setRouteStops] = useState([]);
  const [loadingStops, setLoadingStops] = useState(false);
  const [newStop, setNewStop] = useState({
    stop_name: "",
    stop_order: "",
    distance_from_start_km: "",
    fare_from_start: "",
  });
  const [editingStop, setEditingStop] = useState(null);

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllRoutes(); 
      setRoutes(res.data || []); 
    } catch (err) {
      console.error("Error fetching routes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const routePayload = {
        ...newRoute,
        distance_km: parseFloat(newRoute.distance_km),
        fare_base: parseFloat(newRoute.fare_base),
    };

    try {
      if (editMode && selectedRoute) {
        await updateRoute(selectedRoute.route_id, routePayload);
      } else {
        await addRoute(routePayload);
      }
      resetForm();
      fetchRoutes();
    } catch (err) {
      console.error("Error saving route:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (route) => {
    setEditMode(true);
    setSelectedRoute(route);
    setNewRoute({
      route_name: route.route_name,
      start_location: route.start_location,
      end_location: route.end_location,
      distance_km: String(route.distance_km),
      fare_base: String(route.fare_base),
      map_url: route.map_url || "",
      expected_start_time: route.expected_start_time ? new Date(route.expected_start_time).toISOString().slice(0, 16) : "",
    });
  };

  const handleInitiateDelete = (routeId) => {
    setRouteToDelete(routeId);
    setShowConfirm(true);
  };

  const handleDelete = async () => {
    if (!routeToDelete) return;
    setShowConfirm(false);
    setLoading(true);
    try {
      await deleteRoute(routeToDelete);
      fetchRoutes();
    } catch (err) {
      console.error("Error deleting route:", err);
    } finally {
      setRouteToDelete(null);
    }
  };

  const handleCancelDelete = () => { setShowConfirm(false); setRouteToDelete(null); };
  const resetForm = () => { 
    setNewRoute({ route_name:"", start_location:"", end_location:"", distance_km:"", fare_base:"", map_url:"", expected_start_time:"" }); 
    setEditMode(false); setSelectedRoute(null);
  };

  const handleManageStops = async (route) => {
    setSelectedRouteForStops(route);
    setLoadingStops(true);
    try {
      const res = await getRouteStops(route.route_id);
      setRouteStops(res.data || []);
      // Set next order number
      const maxOrder = res.data.length > 0 ? Math.max(...res.data.map(s => s.stop_order)) : 0;
      setNewStop({
        stop_name: "",
        stop_order: String(maxOrder + 1),
        distance_from_start_km: "",
        fare_from_start: "",
      });
    } catch (err) {
      console.error("Error loading stops:", err);
    } finally {
      setLoadingStops(false);
    }
  };

  const handleAddStop = async (e) => {
    e.preventDefault();
    if (!selectedRouteForStops) return;
    
    try {
      await addRouteStop({
        route_id: selectedRouteForStops.route_id,
        stop_name: newStop.stop_name,
        stop_order: parseInt(newStop.stop_order),
        distance_from_start_km: parseFloat(newStop.distance_from_start_km) || 0,
        fare_from_start: parseFloat(newStop.fare_from_start) || 0,
      });
      await handleManageStops(selectedRouteForStops);
      setNewStop({
        stop_name: "",
        stop_order: String(parseInt(newStop.stop_order) + 1),
        distance_from_start_km: "",
        fare_from_start: "",
      });
    } catch (err) {
      console.error("Error adding stop:", err);
      alert("Failed to add stop: " + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateStop = async (e) => {
    e.preventDefault();
    if (!editingStop) return;
    
    try {
      await updateRouteStop(editingStop.stop_id, {
        stop_name: editingStop.stop_name,
        stop_order: parseInt(editingStop.stop_order),
        distance_from_start_km: parseFloat(editingStop.distance_from_start_km) || 0,
        fare_from_start: parseFloat(editingStop.fare_from_start) || 0,
      });
      await handleManageStops(selectedRouteForStops);
      setEditingStop(null);
    } catch (err) {
      console.error("Error updating stop:", err);
      alert("Failed to update stop: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteStop = async (stopId) => {
    if (!window.confirm("Are you sure you want to delete this stop?")) return;
    try {
      await deleteRouteStop(stopId);
      await handleManageStops(selectedRouteForStops);
    } catch (err) {
      console.error("Error deleting stop:", err);
      alert("Failed to delete stop: " + (err.response?.data?.error || err.message));
    }
  };

  const commonInputClasses = "w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-150 text-gray-700";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <AdminLayout>
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
      
      <ConfirmationDialog
        isOpen={showConfirm}
        title="Confirm Deletion"
        message="Are you sure you want to permanently delete this route? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={handleCancelDelete}
      />

      <header className="mb-8 border-b pb-4">
        <h1 className="text-4xl font-extrabold text-gray-800 flex items-center">
          <span className="text-3xl mr-3">🗺️</span>
          Route Network Management
        </h1>
        <p className="text-gray-500 mt-1">Efficiently manage all operational transport routes and pricing structures.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-2xl h-fit sticky top-4 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <span className="mr-2">{editMode ? "✏️" : "➕"}</span>
            {editMode ? "Edit Route" : "Add New Route"}
          </h2>

          <form onSubmit={handleCreateOrUpdate} className="space-y-4">
            <div>
              <label className={labelClasses}>Route Name</label>
              <input type="text" placeholder="e.g., Downtown Express" value={newRoute.route_name} onChange={(e)=>setNewRoute({...newRoute, route_name:e.target.value})} className={commonInputClasses} required />
            </div>
            <div>
              <label className={labelClasses}>Start Location</label>
              <input type="text" placeholder="Terminal / City" value={newRoute.start_location} onChange={(e)=>setNewRoute({...newRoute, start_location:e.target.value})} className={commonInputClasses} required />
            </div>
            <div>
              <label className={labelClasses}>End Location</label>
              <input type="text" placeholder="Destination / City" value={newRoute.end_location} onChange={(e)=>setNewRoute({...newRoute, end_location:e.target.value})} className={commonInputClasses} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Distance (km)</label>
                <input type="number" step="0.1" placeholder="km" value={newRoute.distance_km} onChange={(e)=>setNewRoute({...newRoute, distance_km:e.target.value})} className={commonInputClasses} required />
              </div>
              <div>
                <label className={labelClasses}>Base Fare</label>
                <input type="number" step="0.1" placeholder="Currency" value={newRoute.fare_base} onChange={(e)=>setNewRoute({...newRoute, fare_base:e.target.value})} className={commonInputClasses} required />
              </div>
            </div>

            <div>
              <label className={labelClasses}>Map URL (Optional)</label>
              <input type="text" placeholder="Link to map service" value={newRoute.map_url} onChange={(e)=>setNewRoute({...newRoute, map_url:e.target.value})} className={commonInputClasses} />
            </div>

            <div>
              <label className={labelClasses}>Expected Start Time (Optional)</label>
              <input 
                type="datetime-local" 
                value={newRoute.expected_start_time} 
                onChange={(e)=>setNewRoute({...newRoute, expected_start_time:e.target.value})} 
                className={commonInputClasses} 
              />
              <p className="text-xs text-gray-500 mt-1">Passengers will see this time when booking</p>
            </div>

            <div className="flex space-x-3 pt-2">
              <button type="submit" disabled={isSaving} className={`flex-1 py-2 px-4 rounded-lg text-white font-semibold transition duration-200 ${isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'}`}>
                {isSaving ? "Saving..." : editMode ? "Update Route" : "Add Route"}
              </button>
              {editMode && (<button type="button" onClick={resetForm} className="w-1/3 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition duration-200 font-medium">Cancel</button>)}
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-2xl border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center border-b pb-3"><span className="mr-2">✈️</span> Route Overview ({routes.length})</h2>

          {loading && !isSaving ? (
            <div className="flex justify-center items-center p-10 text-gray-500">Loading routes...</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Route Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Start</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">End</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Distance (km)</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Fare</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Company</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Map</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Departure</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {routes.length > 0 ? routes.map(r => (
                    <tr key={r.route_id} className="hover:bg-blue-50 transition duration-150">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{r.route_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{r.start_location}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{r.end_location}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono text-gray-700">{r.distance_km}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-green-700">{r.fare_base} RWF</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">{r.company_name || "N/A"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-center hidden lg:table-cell">{r.map_url ? <a href={r.map_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium transition">🗺️ View</a> : <span className="text-gray-400 text-xs">N/A</span>}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-blue-600 font-medium hidden lg:table-cell">
                        {r.expected_start_time ? new Date(r.expected_start_time).toLocaleString() : "N/A"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center space-x-2">
                        <button onClick={()=>handleManageStops(r)} className="text-blue-600 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100 transition" title="Manage Stops">📍</button>
                        <button onClick={()=>handleEdit(r)} className="text-yellow-600 hover:text-yellow-700 p-1 rounded-full hover:bg-yellow-100 transition" title="Edit Route">✏️</button>
                        <button onClick={()=>handleInitiateDelete(r.route_id)} className="text-red-600 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition" title="Delete Route">🗑️</button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="10" className="px-4 py-8 text-center text-gray-500 text-sm">No active routes. Add one!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Route Stops Management Modal */}
      {selectedRouteForStops && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Manage Stops: {selectedRouteForStops.route_name}
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">
                    {selectedRouteForStops.start_location} → {selectedRouteForStops.end_location}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedRouteForStops(null);
                    setRouteStops([]);
                    setEditingStop(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Add New Stop Form */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-gray-800 mb-3">
                  {editingStop ? "Edit Stop" : "Add New Stop"}
                </h3>
                <form onSubmit={editingStop ? handleUpdateStop : handleAddStop} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Stop Name</label>
                    <input
                      type="text"
                      value={editingStop ? editingStop.stop_name : newStop.stop_name}
                      onChange={(e) => editingStop 
                        ? setEditingStop({...editingStop, stop_name: e.target.value})
                        : setNewStop({...newStop, stop_name: e.target.value})
                      }
                      placeholder="e.g., Muhanga"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Order</label>
                    <input
                      type="number"
                      value={editingStop ? editingStop.stop_order : newStop.stop_order}
                      onChange={(e) => editingStop
                        ? setEditingStop({...editingStop, stop_order: e.target.value})
                        : setNewStop({...newStop, stop_order: e.target.value})
                      }
                      placeholder="1, 2, 3..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Distance (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingStop ? editingStop.distance_from_start_km : newStop.distance_from_start_km}
                      onChange={(e) => editingStop
                        ? setEditingStop({...editingStop, distance_from_start_km: e.target.value})
                        : setNewStop({...newStop, distance_from_start_km: e.target.value})
                      }
                      placeholder="0.0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Fare from Start (RWF)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingStop ? editingStop.fare_from_start : newStop.fare_from_start}
                      onChange={(e) => editingStop
                        ? setEditingStop({...editingStop, fare_from_start: e.target.value})
                        : setNewStop({...newStop, fare_from_start: e.target.value})
                      }
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      required
                    />
                  </div>
                  <div className="md:col-span-4 flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      {editingStop ? "Update Stop" : "Add Stop"}
                    </button>
                    {editingStop && (
                      <button
                        type="button"
                        onClick={() => setEditingStop(null)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Stops List */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Route Stops ({routeStops.length})</h3>
                {loadingStops ? (
                  <div className="text-center py-8 text-gray-500">Loading stops...</div>
                ) : routeStops.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    No stops added yet. Add stops to enable sub-route booking.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {routeStops
                      .sort((a, b) => a.stop_order - b.stop_order)
                      .map((stop, index) => (
                        <div
                          key={stop.stop_id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
                        >
                          <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Order:</span>
                              <span className="font-semibold ml-2">{stop.stop_order}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Stop:</span>
                              <span className="font-semibold ml-2">{stop.stop_name}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Distance:</span>
                              <span className="font-semibold ml-2">{stop.distance_from_start_km || 0} km</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Fare:</span>
                              <span className="font-semibold text-green-600 ml-2">{stop.fare_from_start || 0} RWF</span>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => setEditingStop({...stop})}
                              className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteStop(stop.stop_id)}
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  💡 <strong>Tip:</strong> Stops should be ordered from start to end. 
                  Passengers can book between any two stops and the fare will be calculated automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminLayout>
  );
};

export default ManageRoutes;
