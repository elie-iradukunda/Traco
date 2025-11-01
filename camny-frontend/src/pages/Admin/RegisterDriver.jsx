import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/Admin/AdminLayout";
import api from "../../services/api"; // ✅ Make sure this imports your Axios instance

// ✅ Actual backend call
const registerDriverUser = async (formData) => {
  try {
    const response = await api.post("/admin/drivers/register", formData);
    return response.data;
  } catch (error) {
    console.error("Driver registration failed:", error);
    throw new Error(
      error.response?.data?.message || "Failed to register driver"
    );
  }
};

const RegisterDriver = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    license_number: "",
    password: "",
    role: "driver",
    status: "active"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    // ✅ Basic validation
    if (!form.full_name || !form.email || !form.phone || !form.license_number || !form.password) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    try {
      const result = await registerDriverUser(form);
      setSuccess(result.message || "Driver registered successfully!");
      
      // Reset form
      setForm({
        full_name: "",
        email: "",
        phone: "",
        license_number: "",
        password: "",
        role: "driver",
        status: "active"
      });

      // Redirect after short delay
      setTimeout(() => navigate("/admin/manage-drivers"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-10 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-lg bg-white p-8 rounded-xl shadow-2xl">
          <h1 className="text-3xl font-extrabold text-gray-800 mb-2 border-b pb-2">
            Register New Driver 🧑‍✈️
          </h1>
          <p className="text-gray-500 mb-6">
            Create a new user account with the 'driver' role.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Alice Niyonsaba"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="alice.driver@camny.com"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="250782222222"
                required
              />
            </div>

            {/* License Number */}
            <div>
              <label htmlFor="license_number" className="block text-sm font-medium text-gray-700">
                License Number
              </label>
              <input
                type="text"
                id="license_number"
                name="license_number"
                value={form.license_number}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="RWA-DRV-9870"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Temporary Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter initial password"
                required
              />
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <input
                type="text"
                id="role"
                name="role"
                value={form.role}
                readOnly
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Alerts */}
            {error && <div className="p-3 text-sm bg-red-100 text-red-700 rounded-lg">{error}</div>}
            {success && <div className="p-3 text-sm bg-green-100 text-green-700 rounded-lg">{success}</div>}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
                loading
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Registering..." : "Register Driver"}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};

export default RegisterDriver;
