// src/pages/Login.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import axiosClient from "@/utils/axios";
import { getApiBaseUrl } from "@/config/mobile";
import { useNotification } from "@/contexts/NotificationContext";

const roles = ["admin", "operator", "farmer"];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("admin");
  const [hoveredButton, setHoveredButton] = useState(false);
  // navigation/loading redirect state removed to prevent stuck "Loading..." screen
  const [diag, setDiag] = useState<string | null>(null);

  const navigate = useNavigate();
  const { login, isLoading, error, token, user } = useAuthStore();
  const { success: showSuccess, error: showError } = useNotification();

  // Check if already logged in and redirect (only once on mount)
  useEffect(() => {
    if (token && user && !isLoading) {
      console.log("[Login] Already logged in, redirecting...", { user: user.email, roles: user.roles });
      const targetRoute = user.roles?.includes("ADMIN") 
        ? '/admin-dashboard'
        : user.roles?.includes("OPERATOR")
        ? '/operator-dashboard'
        : user.roles?.includes("FARMER")
        ? '/farmer-dashboard'
        : '/dashboard';
      
      console.log("[Login] Target route:", targetRoute);
      navigate(targetRoute, { replace: true });
    }
  }, [token, user, isLoading, navigate]);

  // NOTE: removed intermediate navigating screen to allow immediate navigation

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Form submitted with:", { email, password, userType, isPasswordEmpty: !password, isEmailEmpty: !email });
    
    if (!email || !password) {
      showError("Please fill in all fields");
      return;
    }
    
    try {
      // Send password as-is (date picker already gives YYYY-MM-DD format)
      const passwordToSend = password;
      
      console.log("[Login] Starting login process...");
      console.log("Calling login with:", { email, password: passwordToSend, userType });
      await login(email, passwordToSend, userType);
      
      const user = useAuthStore.getState().user;
      const token = useAuthStore.getState().token;
      console.log("[Login] Login successful!");
      console.log("[Login] User:", JSON.stringify(user));
      console.log("[Login] Token present:", !!token);
      console.log("[Login] localStorage token:", !!localStorage.getItem("token"));
      console.log("[Login] User roles:", user?.roles);
      
      // Determine target route
      let targetRoute = '/dashboard';
      if (user?.roles.includes("ADMIN")) {
        targetRoute = '/admin-dashboard';
      } else if (user?.roles.includes("OPERATOR")) {
        targetRoute = '/operator-dashboard';
      } else if (user?.roles.includes("FARMER")) {
        targetRoute = '/farmer-dashboard';
      }
      
      console.log("[Login] Target route:", targetRoute);
      
      // Show success message
      showSuccess(`Welcome back, ${user?.email || user?.full_name || 'User'}!`);
      
      // Use React Router navigate for both web and mobile
      console.log("[Login] Executing navigation to:", targetRoute);
      navigate(targetRoute, { replace: true });
    } catch (err: any) {
      console.error("Login failed", err);
      const errorMsg = err.response?.data?.detail || err.message || 'Invalid credentials. Please try again.';
      console.error("Error message:", errorMsg);
      showError(errorMsg);

      // Simplified diagnostic info
      try {
        const axiosBase = axiosClient?.defaults?.baseURL || null;
        const configuredUrl = getApiBaseUrl();
        const diagObj = {
          message: errorMsg,
          axiosBase,
          configuredUrl,
          errorResponse: err.response?.data || null,
        };
        setDiag(JSON.stringify(diagObj, null, 2));
        console.log('[Login DIAG]', diagObj);
      } catch (dErr) {
        console.warn('Failed to gather diag info', dErr);
      }
    }
  };
  
  const isFarmer = userType === "farmer";
  const usernameLabel = isFarmer ? "🆔 NRC Number" : userType === "admin" ? "🔐 Admin Email" : "📧 Email Address";
  const usernamePlaceholder = isFarmer ? "e.g., 123456/12/1" : userType === "admin" ? "admin@example.com" : "operator@example.com";
  const passwordLabel = isFarmer ? "🎂 Date of Birth" : "🔑 Password";
  const passwordPlaceholder = isFarmer ? "Select your date of birth" : "Enter your password";
  const usernameInputType = isFarmer ? "text" : "email";
  const passwordInputType = isFarmer ? "date" : "password";

  return (
    <div className="min-h-screen relative overflow-hidden transition-all duration-500 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-40 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main Content */}
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          {/* Header with 3D Effect */}
          <div className="text-center mb-8 animate-float perspective-1000">
            <div className="inline-block p-4 rounded-3xl mb-4 transform transition-all duration-500 hover:rotate-y-12 preserve-3d bg-gradient-to-br from-white to-gray-100 shadow-[0_20px_50px_rgba(99,102,241,0.4),0_0_0_1px_rgba(255,255,255,0.5)] hover:shadow-[0_30px_60px_rgba(99,102,241,0.5)]" style={{ transform: 'translateZ(50px)' }}>
              <img src="/cem-logo.svg" alt="CEM Logo" className="w-24 h-24 mx-auto" />
            </div>
            <h1 className="text-4xl font-bold mb-2 text-white" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)' }}>
              CEM Platform
            </h1>
            <p className="text-lg text-white/90 font-medium" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              Chiefdom Empowerment Model
            </p>
          </div>

          {/* Login Card with Enhanced 3D Effect */}
          <div className="backdrop-blur-xl rounded-3xl p-8 border transition-all duration-500 transform preserve-3d bg-white/90 border-white/50 shadow-[0_25px_50px_-12px_rgba(99,102,241,0.4),0_0_0_1px_rgba(255,255,255,0.5),inset_0_1px_0_0_rgba(255,255,255,0.8)] hover:shadow-[0_30px_60px_-15px_rgba(99,102,241,0.5)]" style={{ transformStyle: 'preserve-3d', transform: 'translateZ(0)' }}>
            {/* Role Tabs */}
            <div className="mb-8">
              <div className="flex rounded-2xl p-1.5 bg-gray-100" style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                {roles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setUserType(role)}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 transform ${
                      userType === role
                        ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-[0_8px_16px_rgba(99,102,241,0.4),0_4px_6px_rgba(99,102,241,0.3)] scale-105 translate-y-[-2px]'
                        : 'text-gray-700 hover:bg-gray-200 hover:translate-y-[-1px] hover:shadow-md'
                    }`}
                    style={{ 
                      transformStyle: 'preserve-3d',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl" style={{ 
                        filter: userType === role ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' : 'none',
                        transform: 'translateZ(10px)'
                      }}>
                        {role === "admin" ? "👨‍💼" : role === "operator" ? "📋" : "👨‍🌾"}
                      </span>
                      <span className="text-xs">{role.charAt(0).toUpperCase() + role.slice(1)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Field */}
              <div>
                <label className="block mb-2 font-semibold text-sm text-gray-700">
                  {usernameLabel}
                </label>
                <div className="relative group">
                  <input
                    type={usernameInputType}
                    placeholder={usernamePlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete={isFarmer ? "off" : "email"}
                    className="w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:outline-none bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.3),0_8px_16px_rgba(99,102,241,0.2)] focus:translate-y-[-2px]"
                    style={{
                      transformStyle: 'preserve-3d',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)'
                    }}
                  />
                  <div className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100"></div>
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block mb-2 font-semibold text-sm text-gray-700">
                  {passwordLabel}
                </label>
                <div className="relative group">
                  <input
                    type={passwordInputType}
                    placeholder={passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={isFarmer ? "off" : "current-password"}
                    className="w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:outline-none bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.3),0_8px_16px_rgba(99,102,241,0.2)] focus:translate-y-[-2px]"
                    style={{
                      transformStyle: 'preserve-3d',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)'
                    }}
                  />
                  <div className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100"></div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="px-4 py-3 rounded-xl border-l-4 animate-shake bg-red-50 text-red-700 border-red-500">
                  {error}
                </div>
              )}

              {/* Diagnostic output (visible when provided) */}
              {diag && (
                <pre className="mt-4 p-3 rounded-lg bg-gray-100 text-xs text-gray-800 overflow-auto" style={{maxHeight: 200}}>
                  {diag}
                </pre>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                onMouseEnter={() => setHoveredButton(true)}
                onMouseLeave={() => setHoveredButton(false)}
                className={`w-full py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 transform flex items-center justify-center gap-3 relative overflow-hidden ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 text-white hover:scale-[1.02] hover:translate-y-[-4px] active:scale-[0.98] active:translate-y-[0px]'
                } ${isLoading ? 'animate-pulse' : ''}`}
                style={{
                  transformStyle: 'preserve-3d',
                  boxShadow: isLoading 
                    ? 'none'
                    : hoveredButton
                    ? '0 20px 30px rgba(99,102,241,0.5), 0 10px 20px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
                    : '0 10px 20px rgba(99,102,241,0.4), 0 5px 10px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.3)'
                }}
              >
                {/* Shine effect on hover */}
                <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-100%] transition-transform duration-700 ${hoveredButton && !isLoading ? 'translate-x-[100%]' : ''}`}></div>
                
                <span className="text-2xl relative z-10" style={{ 
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                  transform: 'translateZ(10px)'
                }}>
                  {userType === "admin" ? "🚀" : userType === "operator" ? "📋" : "👨‍🌾"}
                </span>
                <span className="relative z-10">{isLoading ? "Logging in..." : `Login as ${userType.charAt(0).toUpperCase() + userType.slice(1)}`}</span>
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center text-sm text-gray-600">
              <p>Secure Agricultural Management System</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Animations */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotateX(0deg); }
          50% { transform: translateY(-10px) rotateX(5deg); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-shake {
          animation: shake 0.5s;
        }

        .perspective-1000 {
          perspective: 1000px;
        }

        .preserve-3d {
          transform-style: preserve-3d;
        }

        .rotate-y-12:hover {
          transform: rotateY(12deg) rotateX(-5deg) translateZ(50px);
        }

        /* Enhanced depth with multiple shadows */
        .depth-shadow {
          box-shadow: 
            0 1px 2px rgba(0,0,0,0.1),
            0 2px 4px rgba(0,0,0,0.1),
            0 4px 8px rgba(0,0,0,0.1),
            0 8px 16px rgba(0,0,0,0.1),
            0 16px 32px rgba(0,0,0,0.1);
        }

        /* Smooth cubic-bezier for natural motion */
        * {
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}
