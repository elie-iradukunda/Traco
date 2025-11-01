import React, { useState } from "react";
import { login } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const { login: setUser } = useAuth();
  const navigate = useNavigate(); // for redirect

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await login({ email, password });

      if (res.data?.token) {
        // Save token in localStorage
        localStorage.setItem("token", res.data.token);

        // Save user in context
        setUser(res.data.user);

        // Redirect based on role
        switch (res.data.user.role) {
          case "admin":
            navigate("/admin/dashboard");
            break;
          case "driver":
            navigate("/driver/dashboard");
            break;
          case "passenger":
            navigate("/passenger/dashboard");
            break;
          default:
            navigate("/"); // fallback
        }
      } else {
        setMessage("Login failed: no token received");
      }
    } catch (err) {
      console.error("Login error:", err);
      setMessage(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <form onSubmit={handleLogin} className="flex flex-col gap-2">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Login
        </button>
      </form>
      {message && <p className="mt-2 text-red-600">{message}</p>}
    </div>
  );
};

export default Login;
