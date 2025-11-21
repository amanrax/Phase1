// src/pages/Login.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";

const roles = ["admin", "operator", "farmer"];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("admin");

  const navigate = useNavigate();

  const { login, isLoading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await login(email, password);
      // Determine dashboard based on actual user roles from the login response
      const user = useAuthStore.getState().user;
      if (user?.roles.includes("ADMIN")) {
        navigate('/admin-dashboard');
      } else if (user?.roles.includes("OPERATOR")) {
        navigate('/operator-dashboard');
      } else if (user?.roles.includes("FARMER")) {
        navigate('/farmer-dashboard');
      } else {
        navigate('/dashboard'); // Fallback
      }
    } catch {
      console.error("Login failed");
    }
  };
  
  const isFarmer = userType === "farmer";
  const usernameLabel = isFarmer ? "NRC Number" : "Email";
  const usernamePlaceholder = isFarmer ? "e.g., 123456/12/1" : "e.g., user@example.com";
  const passwordLabel = isFarmer ? "Date of Birth" : "Password";
  const passwordPlaceholder = isFarmer ? "YYYY-MM-DD" : "Enter your password";
  const usernameInputType = isFarmer ? "text" : "email";


  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-xl w-96"
        aria-label="Login Form"
      >
        <h1 className="text-3xl font-bold mb-6 text-center">🌾 Farmer System</h1>

        {/* Role Tabs */}
        <div className="flex gap-2 mb-6" role="tablist" aria-label="User Role Selection">
          {roles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setUserType(role)}
              className={`flex-1 py-2 rounded font-medium transition ${
                userType === role
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              role="tab"
              aria-selected={userType === role}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </div>

        {/* Username (Email or NRC) */}
        <label htmlFor="username-input" className="block text-sm font-medium text-gray-700 mb-1">
          {usernameLabel}
        </label>
        <input
          id="username-input"
          type={usernameInputType}
          placeholder={usernamePlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
          aria-label={usernameLabel}
        />

        {/* Password or DOB */}
        <label htmlFor="password-input" className="block text-sm font-medium text-gray-700 mb-1">
          {passwordLabel}
        </label>
        <input
          id="password-input"
          type="password"
          placeholder={passwordPlaceholder}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
          aria-label={passwordLabel}
        />

        {/* Error Message */}
        {error && (
          <div
            className="bg-red-50 text-red-600 px-4 py-2 rounded mb-4 text-sm"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>

        {/* Demo Credentials */}
        <div className="mt-6 p-3 bg-gray-50 rounded text-xs" aria-label="Demo Credentials">
          <p className="font-medium mb-2">Demo Credentials:</p>
          <p>👤 Admin: admin@agrimanage.com / admin123</p>
          <p>👨‍🌾 Operator: operator@agrimanage.com / operator123</p>
          <p>🌾 Farmer: 123456/12/1 / 1990-01-15 (NRC / YYYY-MM-DD)</p>
        </div>
      </form>
    </div>
  );
}
