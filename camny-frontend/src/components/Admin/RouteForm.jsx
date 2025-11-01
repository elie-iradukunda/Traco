import React, { useEffect, useState } from "react";

const RouteForm = ({ initial = null, onCreate, onUpdate, onCancel }) => {
  const [route_name, setRouteName] = useState("");
  const [start_location, setStart] = useState("");
  const [end_location, setEnd] = useState("");
  const [fare_base, setFare] = useState("");

  useEffect(() => {
    if (initial) {
      setRouteName(initial.route_name || "");
      setStart(initial.start_location || "");
      setEnd(initial.end_location || "");
      setFare(initial.fare_base || "");
    } else {
      setRouteName(""); setStart(""); setEnd(""); setFare("");
    }
  }, [initial]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { route_name, start_location, end_location, fare_base };
    if (initial && initial.route_id) onUpdate(initial.route_id, payload);
    else onCreate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input value={route_name} onChange={e => setRouteName(e.target.value)} placeholder="Route name" className="border p-2 rounded" required />
        <input value={start_location} onChange={e => setStart(e.target.value)} placeholder="Start location" className="border p-2 rounded" />
        <input value={end_location} onChange={e => setEnd(e.target.value)} placeholder="End location" className="border p-2 rounded" />
        <input value={fare_base} onChange={e => setFare(e.target.value)} placeholder="Fare base" type="number" className="border p-2 rounded" />
      </div>

      <div className="mt-3 flex gap-2">
        <button type="submit" className="bg-sky-600 text-white px-3 py-1 rounded">Save</button>
        <button type="button" onClick={onCancel} className="px-3 py-1 border rounded">Cancel</button>
      </div>
    </form>
  );
};

export default RouteForm;
