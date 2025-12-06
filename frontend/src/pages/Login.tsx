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
  const [hoveredButton, setHoveredButton] = useState(false);

  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();
  const { showSuccess, showError } = useNotification();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Form submitted with:", { email, password, userType, isPasswordEmpty: !password, isEmailEmpty: !email });
    
    if (!email || !password) {
      showError("Please fill in all fields");
      return;
    }
    
    try {
      // Convert date format for farmers: YYYY-MM-DD (from date input) -> DD-MM-YYYY (backend expects)
      let passwordToSend = password;
      if (userType === "farmer" && password.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = password.split('-');
        passwordToSend = `${day}-${month}-${year}`;
      }
      
      console.log("Calling login with:", { email, password: passwordToSend, userType });
      await login(email, passwordToSend, userType);
      const user = useAuthStore.getState().user;
      console.log("Login successful, user:", user);
      
      showSuccess(`Welcome back, ${user?.email || 'User'}!`);
      
      // Wait a moment then navigate
      setTimeout(() => {
        if (user?.roles.includes("ADMIN")) {
          navigate('/admin-dashboard');
        } else if (user?.roles.includes("OPERATOR")) {
          navigate('/operator-dashboard');
        } else if (user?.roles.includes("FARMER")) {
          navigate('/farmer-dashboard');
        } else {
          navigate('/dashboard');
        }
      }, 1500);
    } catch (err: any) {
      console.error("Login failed", err);
      const errorMsg = err.response?.data?.detail || err.message || 'Invalid credentials. Please try again.';
      console.error("Error message:", errorMsg);
      showError(errorMsg);
    }
  };
  
  const isFarmer = userType === "farmer";
  const usernameLabel = isFarmer ? "🆔 NRC Number" : userType === "admin" ? "🔐 Admin Email" : "📧 Email Address";
  const usernamePlaceholder = isFarmer ? "e.g., 123456/12/1" : userType === "admin" ? "admin@example.com" : "operator@example.com";
  const passwordLabel = isFarmer ? "🎂 Date of Birth" : "🔑 Password";
  const passwordPlaceholder = isFarmer ? "DD-MM-YYYY (or YYYY-MM-DD)" : "Enter your password";
  const usernameInputType = isFarmer ? "text" : "email";
  const passwordInputType = isFarmer ? "date" : "password";

  return (
    <div
      className="min-h-screen bg-[linear-gradient(135deg,_#667eea_0%,_#764ba2_100%)] flex items-center justify-center p-4 font-sans"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
      }}
    >
      <div className="w-full max-w-[420px]" style={{ width: "100%", maxWidth: "420px" }}>
        {/* Header */}
        <div className="text-center text-white mb-8">
          <h1
            className="text-[2.8rem] font-bold mb-[10px] drop-shadow animate-fade-in"
            style={{ 
              textShadow: "2px 2px 4px rgba(0,0,0,0.3)", 
              fontSize: "2.8rem", 
              marginBottom: "10px",
              animation: "fadeIn 0.6s ease-out"
            }}
          >
            🌾 CEM
          </h1>
          <p className="text-base opacity-90 tracking-wide" style={{ fontSize: "16px", opacity: 0.9 }}>
            Chiefdom Empowerment Model
          </p>
        </div>

        {/* Login Card */}
        <div
          className="bg-white rounded-[15px] p-[30px] shadow-[0_15px_35px_rgba(0,0,0,0.1)] border border-[rgba(255,255,255,0.2)] overflow-hidden"
          style={{
            background: "white",
            borderRadius: "15px",
            padding: "30px",
            boxShadow: "0 15px 35px rgba(0,0,0,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          {/* Role Tabs with Labels */}
          <div className="flex flex-col items-center mb-[30px]">
            <div className="flex w-full mb-[20px] bg-[#f8f9fa] rounded-[10px] overflow-hidden">
              {roles.map((role, idx) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setUserType(role)}
                  className={`flex-1 py-[15px] border-none bg-transparent cursor-pointer text-[14px] font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
                    userType === role
                      ? "bg-[#007bff] text-white"
                      : "text-gray-700 hover:bg-[rgba(0,123,255,0.1)]"
                  } ${idx < roles.length - 1 ? 'border-r border-[#e0e0e0]' : ''}`}
                  style={{
                    flex: 1,
                    padding: "15px",
                    border: "none",
                    background: userType === role ? "#007bff" : "transparent",
                    color: userType === role ? "white" : "#555",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.3s",
                    borderRight: idx < roles.length - 1 ? "1px solid #e0e0e0" : "none",
                  }}
                >
                  <span className="text-lg">{role === "admin" ? "👨‍💼" : role === "operator" ? "📋" : "👨‍🌾"}</span>
                  <span className="hidden sm:inline">{role.charAt(0).toUpperCase() + role.slice(1)}</span>
                </button>
              ))}
            </div>
            {/* Labels under buttons */}
            <div className="flex w-full justify-between text-xs text-gray-600 px-2">
              <span className="flex-1 text-center">Admin</span>
              <span className="flex-1 text-center">Operator</span>
              <span className="flex-1 text-center">Farmer</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-[20px] mt-2">
            {/* Username Field */}
            <div>
              <label className="block mb-2 font-semibold text-gray-800 text-sm tracking-wide">{usernameLabel}</label>
              <input
                type={usernameInputType}
                placeholder={usernamePlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete={isFarmer ? "off" : "email"}
                className="w-full px-[15px] py-[12px] border-2 border-[#e0e0e0] rounded-[8px] text-base font-sans transition-all duration-300 bg-white focus:outline-none focus:border-[#007bff] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
                style={{
                  width: "100%",
                  padding: "12px 15px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "16px",
                  transition: "all 0.3s",
                  background: "white",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block mb-2 font-semibold text-gray-800 text-sm tracking-wide">{passwordLabel}</label>
              <input
                type={passwordInputType}
                placeholder={passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isFarmer ? "off" : "current-password"}
                className="w-full px-[15px] py-[12px] border-2 border-[#e0e0e0] rounded-[8px] text-base font-sans transition-all duration-300 bg-white focus:outline-none focus:border-[#007bff] focus:shadow-[0_0_0_3px_rgba(0,123,255,0.1)]"
                style={{
                  width: "100%",
                  padding: "12px 15px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "16px",
                  transition: "all 0.3s",
                  background: "white",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-[8px] text-sm border-l-4 border-red-500">{error}</div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              onMouseEnter={() => setHoveredButton(true)}
              onMouseLeave={() => setHoveredButton(false)}
              className={`w-full py-[12px] px-[20px] border-none rounded-[8px] font-bold font-sans transition-all duration-300 flex items-center justify-center gap-2 text-base shadow hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] tracking-wide ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed text-white animate-pulse"
                  : hoveredButton
                  ? "bg-[#0056b3] text-white"
                  : "bg-[#007bff] text-white"
              }`}
              style={{
                width: "100%",
                padding: "12px 20px",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: isLoading ? "not-allowed" : "pointer",
                background: isLoading ? "#9ca3af" : hoveredButton ? "#0056b3" : "#007bff",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxSizing: "border-box",
                transition: "all 0.3s",
                transform: hoveredButton && !isLoading ? "translateY(-2px)" : "translateY(0)",
                boxShadow: hoveredButton && !isLoading ? "0 4px 12px rgba(0,0,0,0.15)" : "none"
              }}
            >
              <span className="text-xl">{userType === "admin" ? "🚀" : userType === "operator" ? "📋" : "👨‍🌾"}</span>
              <span>{isLoading ? "Logging in..." : `Login as ${userType.charAt(0).toUpperCase() + userType.slice(1)}`}</span>
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

