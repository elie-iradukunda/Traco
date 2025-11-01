// frontend/components/RegisterPassenger.jsx
import { useState } from "react";
import axios from "axios";

const RegisterPassenger = () => {
  const [form, setForm] = useState({ full_name:"", email:"", phone:"", password:"" });

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/auth/register", form);
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
      <button type="submit">Register</button>
    </form>
  );
};

export default RegisterPassenger;
