import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/Admin/AdminLayout";
import { getAllRoutes, addRoute, updateRoute, deleteRoute } from "../../services/api";
import RouteForm from "../../components/Admin/RouteForm";

const RoutesPage = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    getAllRoutes().then(res => setRoutes(res.data || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = (data) => addRoute(data).then(load).catch(console.error).finally(() => setShowForm(false));
  const handleUpdate = (id, data) => updateRoute(id, data).then(load).catch(console.error).finally(() => { setEditing(null); setShowForm(false); });
  const handleDelete = (id) => { if (!confirm("Delete route?")) return; deleteRoute(id).then(load).catch(console.error); };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Routes</h2>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-sky-600 text-white px-3 py-1 rounded">New Route</button>
      </div>

      {showForm && <RouteForm initial={editing} onCreate={handleCreate} onUpdate={handleUpdate} onCancel={() => { setShowForm(false); setEditing(null); }} />}

      <div className="bg-white rounded shadow divide-y">
        {routes.map(r => (
          <div key={r.route_id} className="p-4 flex justify-between items-center">
            <div>
              <div className="font-medium">{r.route_name}</div>
              <div className="text-sm text-gray-500">{r.start_location} → {r.end_location}</div>
            </div>
            <div className="flex gap-2">
              <button className="text-sky-600" onClick={() => { setEditing(r); setShowForm(true); }}>Edit</button>
              <button className="text-red-600" onClick={() => handleDelete(r.route_id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default RoutesPage;
