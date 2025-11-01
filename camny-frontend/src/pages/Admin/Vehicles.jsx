import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/Admin/AdminLayout";
import {
  getAllVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  getAllDrivers,
  assignDriverToVehicle,
} from "../../services/api";

const VehiclesPage = () => {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    plate_number: "",
    model: "",
    capacity: 20,
    status: "active",
  });

  // Load vehicles and drivers
  const loadData = () => {
    setLoading(true);
    Promise.all([getAllVehicles(), getAllDrivers()])
      .then(([vRes, dRes]) => {
        setVehicles(vRes.data || []);
        setDrivers(dRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  // Form handlers
  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) {
      updateVehicle(editing.vehicle_id, formData)
        .then(loadData)
        .catch(console.error)
        .finally(() => closeForm());
    } else {
      addVehicle(formData)
        .then(loadData)
        .catch(console.error)
        .finally(() => closeForm());
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setFormData({ plate_number: "", model: "", capacity: 20, status: "active" });
  };

  const handleEdit = (vehicle) => {
    setEditing(vehicle);
    setFormData({
      plate_number: vehicle.plate_number,
      model: vehicle.model,
      capacity: vehicle.capacity,
      status: vehicle.status,
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    deleteVehicle(id).then(loadData).catch(console.error);
  };

  const handleAssign = (vehicleId, driverId) => {
    assignDriverToVehicle(vehicleId, { driver_id: driverId })
      .then(loadData)
      .catch(console.error);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Vehicles</h2>
          <button
            onClick={() => setShowForm(true)}
            className="bg-sky-600 text-white px-4 py-2 rounded hover:bg-sky-700 transition"
          >
            + New Vehicle
          </button>
        </div>

        {/* Vehicle Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
            <form
              onSubmit={handleSubmit}
              className="bg-white p-6 rounded shadow-lg w-96 flex flex-col gap-3"
            >
              <h3 className="text-lg font-semibold">
                {editing ? "Edit Vehicle" : "Add Vehicle"}
              </h3>
              
              <input
                type="text"
                placeholder="Plate Number"
                value={formData.plate_number}
                onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                required
                className="border p-2 rounded w-full"
              />
              <input
                type="text"
                placeholder="Model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                required
                className="border p-2 rounded w-full"
              />
              <input
                type="number"
                placeholder="Capacity"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                min={1}
                className="border p-2 rounded w-full"
              />
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="border p-2 rounded w-full"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-sky-600 text-white hover:bg-sky-700"
                >
                  {editing ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Vehicles List */}
        <div className="bg-white rounded shadow divide-y">
          {loading ? (
            <p className="p-4">Loading vehicles...</p>
          ) : vehicles.length === 0 ? (
            <p className="p-4 text-gray-500">No vehicles found.</p>
          ) : (
            vehicles.map((v) => (
              <div key={v.vehicle_id} className="p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">{v.plate_number} — {v.model}</div>
                  <div className="text-sm text-gray-500">
                    Capacity: {v.capacity} • Status: {v.status}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <select
                    value={v.assigned_driver || ""}
                    onChange={(e) => handleAssign(v.vehicle_id, Number(e.target.value))}
                    className="border p-1 rounded"
                  >
                    <option value="">Assign driver</option>
                    {drivers.map((d) => (
                      <option key={d.driver_id} value={d.driver_id}>
                        {d.full_name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="text-sky-600 hover:underline"
                    onClick={() => handleEdit(v)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => handleDelete(v.vehicle_id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default VehiclesPage;
