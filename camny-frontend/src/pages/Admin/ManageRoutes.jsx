import React, { useEffect, useState, useCallback } from "react";
import { 
  Plus, Map, Trash2, Edit, X, Save, Route, MapPin, DollarSign, Ruler, Plane, AlertTriangle 
} from 'lucide-react';
import { getAllRoutes, addRoute, updateRoute, deleteRoute } from "../../services/api";

// Confirmation Dialog
const ConfirmationDialog = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full transition-all duration-300 transform scale-100">
                <div className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
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
  });
  const [editMode, setEditMode] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState(null);

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
    setNewRoute({ route_name:"", start_location:"", end_location:"", distance_km:"", fare_base:"", map_url:"" }); 
    setEditMode(false); setSelectedRoute(null);
  };

  const commonInputClasses = "w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-150 text-gray-700";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

  return (
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
          <Route className="w-8 h-8 mr-3 text-blue-600"/>
          Route Network Management
        </h1>
        <p className="text-gray-500 mt-1">Efficiently manage all operational transport routes and pricing structures.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-2xl h-fit sticky top-4 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            {editMode ? <Edit className="w-5 h-5 mr-2 text-yellow-600" /> : <Plus className="w-5 h-5 mr-2 text-blue-600" />}
            {editMode ? "Edit Route" : "Add New Route"}
          </h2>

          <form onSubmit={handleCreateOrUpdate} className="space-y-4">
            <div>
              <label className={labelClasses}>Route Name</label>
              <input type="text" placeholder="e.g., Downtown Express" value={newRoute.route_name} onChange={(e)=>setNewRoute({...newRoute, route_name:e.target.value})} className={commonInputClasses} required />
            </div>
            <div>
              <label className={labelClasses}>Start Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Terminal / City" value={newRoute.start_location} onChange={(e)=>setNewRoute({...newRoute, start_location:e.target.value})} className={`${commonInputClasses} pl-10`} required />
              </div>
            </div>
            <div>
              <label className={labelClasses}>End Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Destination / City" value={newRoute.end_location} onChange={(e)=>setNewRoute({...newRoute, end_location:e.target.value})} className={`${commonInputClasses} pl-10`} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Distance (km)</label>
                <div className="relative">
                  <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="number" step="0.1" placeholder="km" value={newRoute.distance_km} onChange={(e)=>setNewRoute({...newRoute, distance_km:e.target.value})} className={`${commonInputClasses} pl-10`} required />
                </div>
              </div>
              <div>
                <label className={labelClasses}>Base Fare</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="number" step="0.1" placeholder="Currency" value={newRoute.fare_base} onChange={(e)=>setNewRoute({...newRoute, fare_base:e.target.value})} className={`${commonInputClasses} pl-10`} required />
                </div>
              </div>
            </div>

            <div>
              <label className={labelClasses}>Map URL (Optional)</label>
              <div className="relative">
                <Map className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Link to map service" value={newRoute.map_url} onChange={(e)=>setNewRoute({...newRoute, map_url:e.target.value})} className={`${commonInputClasses} pl-10`} />
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button type="submit" disabled={isSaving} className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg text-white font-semibold transition duration-200 ${isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'}`}>
                {isSaving ? "Saving..." : editMode ? <><Save className="w-5 h-5 mr-2" /> Update Route</> : <><Plus className="w-5 h-5 mr-2" /> Add Route</>}
              </button>
              {editMode && (<button type="button" onClick={resetForm} className="w-1/3 flex items-center justify-center py-2 px-4 border border-gray-300 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition duration-200 font-medium"><X className="w-5 h-5 mr-1" /> Cancel</button>)}
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-2xl border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center border-b pb-3"><Plane className="w-5 h-5 mr-2 text-gray-600" /> Route Overview ({routes.length})</h2>

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
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-green-700">${r.fare_base}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">{r.company_name || "N/A"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-center hidden lg:table-cell">{r.map_url ? <a href={r.map_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium transition"><Map className="w-4 h-4 inline-block" /> View</a> : <span className="text-gray-400 text-xs">N/A</span>}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-center space-x-2">
                        <button onClick={()=>handleEdit(r)} className="text-yellow-600 hover:text-yellow-700 p-1 rounded-full hover:bg-yellow-100 transition" title="Edit Route"><Edit className="w-4 h-4" /></button>
                        <button onClick={()=>handleInitiateDelete(r.route_id)} className="text-red-600 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition" title="Delete Route"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-gray-500 text-sm">No active routes. Add one!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageRoutes;
