import React, { useEffect, useState } from "react";

const VehicleForm = ({ initial = null, onCreate, onUpdate, onCancel }) => {
  const [plate_number, setPlate] = useState("");
  const [model, setModel] = useState("");
  const [capacity, setCapacity] = useState(20);

  useEffect(() => {
    if (initial) {
      setPlate(initial.plate_number || "");
      setModel(initial.model || "");
      setCapacity(initial.capacity || 20);
    } else {
      setPlate(""); setModel(""); setCapacity(20);
    }
  }, [initial]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { plate_number, model, capacity };
    if (initial && initial.vehicle_id) onUpdate(initial.vehicle_id, payload);
    else onCreate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input value={plate_number} onChange={e => setPlate(e.target.value)} placeholder="Plate number" className="border p-2 rounded" required />
        <input value={model} onChange={e => setModel(e.target.value)} placeholder="Model" className="border p-2 rounded" />
        <input value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="Capacity" type="number" className="border p-2 rounded" />
      </div>

      <div className="mt-3 flex gap-2">
        <button type="submit" className="bg-sky-600 text-white px-3 py-1 rounded">Save</button>
        <button type="button" onClick={onCancel} className="px-3 py-1 border rounded">Cancel</button>
      </div>
    </form>
  );
};

export default VehicleForm;
