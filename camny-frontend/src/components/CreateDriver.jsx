// frontend/components/CreateDriver.jsx
import { useState } from "react";
import axios from "axios";

const CreateDriver = ({ token }) => {
  const [form, setForm] = useState({ full_name:"", email:"", phone:"", password:"", license_number:"", status:"active" });

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/admin/create-driver", form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.error || "Error");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="full_name" placeholder="Full Name" onChange={handleChange} />
      <input name="email" placeholder="Email" onChange={handleChange} />
      <input name="phone" placeholder="Phone" onChange={handleChange} />
      <input name="password" placeholder="Password" type="password" onChange={handleChange} />
      <input name="license_number" placeholder="License Number" onChange={handleChange} />
      <select name="status" onChange={handleChange}>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <button type="submit">Create Driver</button>
    </form>
  );
};

export default CreateDriver;
