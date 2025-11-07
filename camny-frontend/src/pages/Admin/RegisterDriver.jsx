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
    license_expiry_date: "",
    date_of_birth: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    password: "",
    confirm_password: "",
    role: "driver",
    status: "active"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [createdDriver, setCreatedDriver] = useState(null);

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
      setError("Please fill in all required fields (Name, Email, Phone, License Number, Password).");
      setLoading(false);
      return;
    }

    // Validate password confirmation
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    // Validate password strength
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      // Prepare form data (remove confirm_password before sending)
      const formData = { ...form };
      delete formData.confirm_password;
      
      const result = await registerDriverUser(formData);
      setSuccess(result.message || "Driver registered successfully!");
      setCreatedDriver(result.driver || result);
      
      // Reset form
      setForm({
        full_name: "",
        email: "",
        phone: "",
        license_number: "",
        license_expiry_date: "",
        date_of_birth: "",
        address: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        password: "",
        confirm_password: "",
        role: "driver",
        status: "active"
      });

      // Redirect after 5 seconds to allow viewing credentials
      setTimeout(() => {
        navigate("/admin/manage-drivers");
      }, 5000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to register driver");
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
            Create a complete driver account with login credentials, license details, and contact information.
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
                License Number <span className="text-red-500">*</span>
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

            {/* License Expiry Date */}
            <div>
              <label htmlFor="license_expiry_date" className="block text-sm font-medium text-gray-700">
                License Expiry Date
              </label>
              <input
                type="date"
                id="license_expiry_date"
                name="license_expiry_date"
                value={form.license_expiry_date}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">
                Date of Birth
              </label>
              <input
                type="date"
                id="date_of_birth"
                name="date_of_birth"
                value={form.date_of_birth}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                rows={2}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Street address, City, District"
              />
            </div>

            {/* Emergency Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="emergency_contact_name" className="block text-sm font-medium text-gray-700">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  id="emergency_contact_name"
                  name="emergency_contact_name"
                  value={form.emergency_contact_name}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label htmlFor="emergency_contact_phone" className="block text-sm font-medium text-gray-700">
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  id="emergency_contact_phone"
                  name="emergency_contact_phone"
                  value={form.emergency_contact_phone}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="250788888888"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Login Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter initial password (min 6 characters)"
                required
                minLength={6}
              />
              <p className="mt-1 text-xs text-gray-500">Driver will use this password to login to the platform</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="confirm_password"
                name="confirm_password"
                value={form.confirm_password}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm password"
                required
                minLength={6}
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
            {success && (
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="font-semibold text-green-800 mb-2">✅ {success}</div>
                {createdDriver && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-green-300">
                    <h3 className="font-bold text-gray-800 mb-3">📋 Driver Credentials Created:</h3>
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="font-semibold">Name:</span> {createdDriver.full_name}</div>
                        <div><span className="font-semibold">Email:</span> {createdDriver.email}</div>
                        <div><span className="font-semibold">Phone:</span> {createdDriver.phone}</div>
                        <div><span className="font-semibold">License:</span> {createdDriver.license_number}</div>
                        <div><span className="font-semibold">Status:</span> {createdDriver.status || 'active'}</div>
                        <div><span className="font-semibold">Role:</span> driver</div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="font-semibold text-gray-700">🔐 Login Credentials:</p>
                        <p className="text-gray-600">Email: <span className="font-mono font-bold">{createdDriver.email}</span></p>
                        <p className="text-gray-600">Password: <span className="font-mono">(as entered above)</span></p>
                        <p className="text-xs text-yellow-700 mt-2">⚠️ Please save these credentials and share them with the driver securely.</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">Redirecting to Manage Drivers in a few seconds...</p>
                  </div>
                )}
              </div>
            )}

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
