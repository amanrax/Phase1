// src/pages/Login.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { useNotification } from "@/components/Notification";

const roles = ["admin", "operator", "farmer"];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("admin");

  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();
  const { showSuccess, showError } = useNotification();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await login(email, password, userType);
      const user = useAuthStore.getState().user;
      
      showSuccess(`Welcome back, ${user?.email || 'User'}!`);
      
      if (user?.roles.includes("ADMIN")) {
        navigate('/admin-dashboard');
      } else if (user?.roles.includes("OPERATOR")) {
        navigate('/operator-dashboard');
      } else if (user?.roles.includes("FARMER")) {
        navigate('/farmer-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error("Login failed", err);
      showError(err.response?.data?.detail || 'Invalid credentials. Please try again.');
    }
  };
  
  const isFarmer = userType === "farmer";
  const usernameLabel = isFarmer ? "NRC Number" : "Email";
  const usernamePlaceholder = isFarmer ? "e.g., 123456/12/1" : "e.g., user@example.com";
  const passwordLabel = isFarmer ? "Date of Birth" : "Password";
  const passwordPlaceholder = isFarmer ? "YYYY-MM-DD" : "Enter your password";
  const usernameInputType = isFarmer ? "text" : "email";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      {/* Header */}
      <div style={{ position: "absolute", top: "30px", textAlign: "center", color: "white", width: "100%" }}>
        <h1 style={{ fontSize: "2.8rem", marginBottom: "10px", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}>
          🌾 AgriManage 
        </h1>
        <p style={{ fontSize: "16px", opacity: 0.9 }}> Farmer Management </p>
      </div>

      {/* Login Card */}
      <div style={{
        background: "white",
        borderRadius: "15px",
        padding: "30px",
        boxShadow: "0 15px 35px rgba(0,0,0,0.1)",
        border: "1px solid rgba(255,255,255,0.2)",
        width: "100%",
        maxWidth: "500px",
        marginTop: "80px"
      }}>
        {/* Role Tabs */}
        <div style={{
          display: "flex",
          marginBottom: "30px",
          background: "#f8f9fa",
          borderRadius: "10px",
          overflow: "hidden"
        }}>
          {roles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setUserType(role)}
              style={{
                flex: 1,
                padding: "15px",
                border: "none",
                background: userType === role ? "#007bff" : "transparent",
                color: userType === role ? "white" : "#666",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                transition: "all 0.3s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
              onMouseOver={(e) => {
                if (userType !== role) {
                  e.currentTarget.style.background = "rgba(0,123,255,0.1)";
                }
              }}
              onMouseOut={(e) => {
                if (userType !== role) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <span>{role === "admin" ? "👨‍💼" : role === "operator" ? "📋" : "👨‍🌾"}</span>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Username Field */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#333" }}>
              {usernameLabel}
            </label>
            <input
              type={usernameInputType}
              placeholder={usernamePlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 15px",
                border: "2px solid #e0e0e0",
                borderRadius: "8px",
                fontSize: "16px",
                transition: "all 0.3s",
                background: "white"
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = "none";
                e.currentTarget.style.borderColor = "#007bff";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e0e0e0";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#333" }}>
              {passwordLabel}
            </label>
            <input
              type={isFarmer ? "text" : "password"}
              placeholder={passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 15px",
                border: "2px solid #e0e0e0",
                borderRadius: "8px",
                fontSize: "16px",
                transition: "all 0.3s",
                background: "white"
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = "none";
                e.currentTarget.style.borderColor = "#007bff";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e0e0e0";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              background: "#fee",
              color: "#c00",
              padding: "12px 15px",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "14px"
            }}>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: "12px 25px",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: isLoading ? "not-allowed" : "pointer",
              background: isLoading ? "#ccc" : "#007bff",
              color: "white",
              width: "100%",
              transition: "all 0.3s",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
            onMouseOver={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = "#0056b3";
                e.currentTarget.style.transform = "translateY(-2px)";
              }
            }}
            onMouseOut={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = "#007bff";
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
          >
            <span>🚀</span> {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/*  Credentials Format*/}
        <div style={{
          marginTop: "20px",
          padding: "15px",
          background: "#f8f9fa",
          borderRadius: "8px",
          fontSize: "12px",
          color: "#666"
        }}>
          <p style={{ fontWeight: "600", marginBottom: "8px", color: "#333" }}>Credentials Format:</p>
          <p style={{ marginBottom: "4px" }}>👤 Admin: admin@gmail.com / Password</p>
          <p style={{ marginBottom: "4px" }}>👨‍🌾 Operator: operator@gmail.com / Password</p>
          <p>🌾 Farmer: xxxxxx/xx/x / YYYY-MM-DD</p>
        </div>
      </div>
    </div>
  );
}

