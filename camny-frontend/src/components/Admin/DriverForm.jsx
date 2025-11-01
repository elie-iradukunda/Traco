import React, { useEffect, useState } from "react";

const DriverForm = ({ initial = null, onCreate, onUpdate, onCancel }) => {
  const [full_name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [license_number, setLicense] = useState("");

  useEffect(() => {
    if (initial) {
      setFullName(initial.full_name || initial.full_name); // some backends return full_name in joined result
      setEmail(initial.email || "");
      setPhone(initial.phone || "");
      setLicense(initial.license_number || "");
    } else {
      setFullName(""); setEmail(""); setPhone(""); setLicense("");
    }
  }, [initial]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { full_name, email, phone, license_number };
    if (initial && initial.driver_id) onUpdate(initial.driver_id, payload);
    else onCreate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input value={full_name} onChange={e => setFullName(e.target.value)} placeholder="Full name" className="border p-2 rounded" required />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="border p-2 rounded" />
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className="border p-2 rounded" />
        <input value={license_number} onChange={e => setLicense(e.target.value)} placeholder="License number" className="border p-2 rounded" />
      </div>

      <div className="mt-3 flex gap-2">
        <button type="submit" className="bg-sky-600 text-white px-3 py-1 rounded">Save</button>
        <button type="button" onClick={onCancel} className="px-3 py-1 border rounded">Cancel</button>
      </div>
    </form>
  );
};

export default DriverForm;
