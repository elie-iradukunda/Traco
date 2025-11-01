import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/Admin/AdminLayout";
import {
  getAllDrivers, createDriver, updateDriver, deleteDriver
} from "../../services/api";
import DriverForm from "../../components/Admin/DriverForm";

const DriversPage = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    getAllDrivers().then(res => setDrivers(res.data || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = (data) => {
    createDriver(data).then(() => { load(); setShowForm(false); }).catch(console.error);
  };

  const handleUpdate = (id, data) => {
    updateDriver(id, data).then(() => { load(); setEditing(null); setShowForm(false); }).catch(console.error);
  };

  const handleDelete = (id) => {
    if (!confirm("Delete driver?")) return;
    deleteDriver(id).then(() => load()).catch(console.error);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Drivers</h2>
        <div>
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-sky-600 text-white px-3 py-1 rounded">New Driver</button>
        </div>
      </div>

      {showForm && (
        <div className="mb-4">
          <DriverForm
            initial={editing}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
          />
        </div>
      )}

      {loading ? <p>Loading drivers...</p> : (
        <div className="bg-white rounded shadow divide-y">
          {drivers.map(d => (
            <div key={d.driver_id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{d.full_name}</div>
                <div className="text-sm text-gray-500">{d.email} • {d.phone}</div>
                <div className="text-sm text-gray-500">License: {d.license_number || "-"}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="text-sm text-sky-600" onClick={() => { setEditing(d); setShowForm(true); }}>Edit</button>
                <button className="text-sm text-red-600" onClick={() => handleDelete(d.driver_id)}>Delete</button>
              </div>
            </div>
          ))}
          {drivers.length === 0 && <div className="p-4 text-gray-500">No drivers found.</div>}
        </div>
      )}
    </AdminLayout>
  );
};

export default DriversPage;
