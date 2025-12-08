// src/Dashboard.tsx (Farmer Dashboard)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { farmerService } from "@/services/farmer.service";
import FarmerIDCardPreview from "@/components/FarmerIDCardPreview";
import { useNotification } from "@/contexts/NotificationContext";

export default function FarmerDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { success: showSuccess, error: showError, info: showInfo } = useNotification();

  const [farmerData, setFarmerData] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [showIDCardPreview, setShowIDCardPreview] = useState(false);

  useEffect(() => {
    loadFarmerData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (farmerData) {
      const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      // Use qr_code_url if available, otherwise construct from farmer_id
      const url = farmerData.qr_code_url 
        ? `${baseURL}${farmerData.qr_code_url}`
        : `${baseURL}/uploads/qr/${farmerData.farmer_id}_qr.png`;
      setQrCodeUrl(url);
    }
  }, [farmerData]);

  const loadFarmerData = async () => {
    try {
      setLoading(true);
      
      console.log("Loading farmer data for user:", user);

      if (!user?.farmer_id) {
        console.error("No farmer_id in JWT token - authentication issue");
        console.log("User data:", { email: user?.email, roles: user?.roles, farmer_id: user?.farmer_id });
        setFarmerData(null);
        showError("Unable to load farmer profile - authentication issue", 5000);
        setLoading(false);
        return;
      }

      console.log("Loading farmer by farmer_id from token:", user.farmer_id);
      const fullData = await farmerService.getFarmer(user.farmer_id);
      console.log("Loaded farmer data:", fullData);
      setFarmerData(fullData);
      setLoading(false);
      
    } catch (error: any) {
      console.error("Failed to load farmer data:", error);
      const errorMsg = error.response?.data?.detail || "Failed to load farmer profile";
      showError(errorMsg, 5000);
      setFarmerData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadIDCard = async () => {
    try {
      const farmerId = farmerData?.farmer_id;
      if (!farmerId) {
        showError("Farmer ID not available", 4000);
        return;
      }
      await farmerService.downloadIDCard(farmerId);
      showSuccess("✓ ID Card downloaded!", 4000);
    } catch (error: any) {
      console.error("Download failed:", error);
      const errorMsg = error.response?.data?.detail || "ID card not available yet. Please contact your operator.";
      showError(errorMsg, 5000);
    }
  };

  const handleViewIDCard = () => {
    if (!farmerData?.farmer_id) {
      showError("Farmer ID not available", 4000);
      return;
    }
    setShowIDCardPreview(true);
    showInfo("Displaying your ID Card", 3000);
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4"
        style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      >
        <div className="text-center text-white" style={{ textAlign: "center", color: "white" }}>
          <div 
            className="border-4 border-white/30 border-t-white rounded-full w-16 h-16 animate-spin mx-auto mb-5"
            style={{
              border: "4px solid rgba(255,255,255,0.3)",
              borderTop: "4px solid white",
              borderRadius: "50%",
              width: "64px",
              height: "64px",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px"
            }}
          ></div>
          <p className="text-lg sm:text-xl" style={{ fontSize: "20px" }}>Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ID Card Preview Modal */}
      {showIDCardPreview && farmerData && (
        <FarmerIDCardPreview
          farmer={farmerData}
          onClose={() => setShowIDCardPreview(false)}
        />
      )}

      <div 
        className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 pb-8"
        style={{ paddingBottom: "30px" }}
      >
      {/* Header */}
      <div 
        className="text-center text-white pt-6 sm:pt-8 pb-6 sm:pb-8 px-4"
        style={{ textAlign: "center", color: "white", paddingTop: "30px", paddingBottom: "30px" }}
      >
        <h1 
          className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 drop-shadow-lg"
          style={{ fontSize: "2.8rem", marginBottom: "10px", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}
        >
          🌾 Chiefdom Management Model
        </h1>
        <p className="text-sm sm:text-base opacity-90" style={{ fontSize: "16px", opacity: 0.9 }}>Farmer Dashboard</p>
      </div>

      {/* Main Content Container */}
      <div 
        className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6"
        style={{ maxWidth: "1200px", margin: "0 auto" }}
      >
        {!farmerData ? (
          // Error State
          <div 
            className="bg-white rounded-xl p-6 sm:p-8 shadow-xl text-center"
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "40px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
              textAlign: "center"
            }}
          >
            <div className="text-6xl mb-4" style={{ fontSize: "4rem", marginBottom: "20px" }}>⚠️</div>
            <h2 
              className="text-xl sm:text-2xl font-bold text-gray-900 mb-3"
              style={{ fontSize: "22px", fontWeight: "700", color: "#333", marginBottom: "15px" }}
            >
              Unable to load farmer profile
            </h2>
            <p 
              className="text-sm text-gray-600 mb-6"
              style={{ fontSize: "14px", color: "#666", marginBottom: "30px" }}
            >
              Your farmer profile could not be found. Please contact your operator or administrator.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center" style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
              <button
                onClick={loadFarmerData}
                className="px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-sm font-semibold transition-all"
                style={{
                  padding: "10px 25px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: "#2563eb",
                  color: "white",
                  transition: "all 0.3s"
                }}
              >
                <i className="fa-solid fa-arrows-rotate mr-2"></i> Retry
              </button>
              <button
                onClick={logout}
                className="px-4 sm:px-6 py-2 bg-gray-600 hover:bg-gray-700 active:scale-95 text-white rounded-lg text-sm font-semibold transition-all"
                style={{
                  padding: "10px 25px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: "#4b5563",
                  color: "white",
                  transition: "all 0.3s"
                }}
              >
                <i className="fa-solid fa-right-from-bracket mr-2"></i> Logout
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
              {/* Registration Status Card */}
              <div className="bg-gradient-to-br from-green-600 to-emerald-600 text-white p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                <div className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2" style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "10px" }}>
                  <i className="fa-solid fa-check-circle mr-2"></i>
                  {farmerData?.registration_status === "verified" ? "Verified" : "Pending"}
                </div>
                <div className="opacity-90 text-xs sm:text-sm" style={{ opacity: 0.9, fontSize: "14px" }}>Registration Status</div>
              </div>

              {/* Farm Size Card */}
              <div className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                <div className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2" style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "10px" }}>
                  <i className="fa-solid fa-land-mine-on mr-2"></i>
                  {farmerData?.farm_info?.farm_size_hectares || 0}
                </div>
                <div className="opacity-90 text-xs sm:text-sm" style={{ opacity: 0.9, fontSize: "14px" }}>Farm Size (hectares)</div>
              </div>

              {/* Crops Count Card */}
              <div className="bg-gradient-to-br from-yellow-600 to-orange-600 text-white p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                <div className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2" style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "10px" }}>
                  <i className="fa-solid fa-leaf mr-2"></i>
                  {(farmerData?.farm_info?.crops_grown?.length || 0)}
                </div>
                <div className="opacity-90 text-xs sm:text-sm" style={{ opacity: 0.9, fontSize: "14px" }}>Crops Grown</div>
              </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 md:p-8" style={{ background: "white", borderRadius: "12px", padding: "30px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
              {/* Header with Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900">🌾 My Profile</h2>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    onClick={() => navigate(`/farmers/edit/${farmerData?.farmer_id}`)}
                    className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
                  >
                    ✏️ Edit Profile
                  </button>
                  <button
                    onClick={() => navigate("/farmer-idcard")}
                    className="px-3 sm:px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
                  >
                    🆔 Manage My ID Card
                  </button>
                  <button
                    onClick={handleViewIDCard}
                    className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
                  >
                    🆔 View ID Card
                  </button>
                  <button
                    onClick={handleDownloadIDCard}
                    className="px-3 sm:px-4 py-2 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
                  >
                    📥 Download ID
                  </button>
                  <button
                    onClick={logout}
                    className="px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
                  >
                    🚪 Logout
                  </button>
                </div>
              </div>

              {/* Profile Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Photo and Basic Info - Left Column */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <div style={{
                      width: "150px",
                      height: "150px",
                      margin: "0 auto 15px",
                      background: "#f0f0f0",
                      borderRadius: "50%",
                      overflow: "hidden",
                      boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      {(farmerData?.documents?.photo || farmerData?.photo_path) ? (
                        <img
                          src={farmerData?.documents?.photo || farmerData?.photo_path}
                          alt="Farmer"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : null}
                      <div style={{ fontSize: "4rem", display: (farmerData?.documents?.photo || farmerData?.photo_path) ? 'none' : 'block' }}>👨‍🌾</div>
                    </div>
                    <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#333", marginBottom: "5px" }}>
                      {farmerData?.personal_info?.first_name} {farmerData?.personal_info?.last_name}
                    </h3>
                    <p style={{ fontSize: "13px", color: "#666", marginBottom: "15px" }}>
                      ID: {farmerData?.farmer_id}
                    </p>
                    <button
                      onClick={() => navigate(`/farmers/${farmerData?.farmer_id}`)}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
                    >
                      📄 View Full Profile & Documents
                    </button>
                  </div>
                </div>

                {/* Info Columns */}
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Personal Information */}
                    <div style={{
                      padding: "15px",
                      background: "#f8f9fa",
                      borderRadius: "8px",
                      borderLeft: "4px solid #2563eb"
                    }}>
                      <p style={{ fontSize: "11px", fontWeight: "700", color: "#666", textTransform: "uppercase", marginBottom: "8px" }}>Phone</p>
                      <p style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{farmerData?.personal_info?.phone_primary || "N/A"}</p>
                    </div>
                    <div style={{
                      padding: "15px",
                      background: "#f8f9fa",
                      borderRadius: "8px",
                      borderLeft: "4px solid #059669"
                    }}>
                      <p style={{ fontSize: "11px", fontWeight: "700", color: "#666", textTransform: "uppercase", marginBottom: "8px" }}>NRC Number</p>
                      <p style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{farmerData?.personal_info?.nrc || "N/A"}</p>
                    </div>
                    <div style={{
                      padding: "15px",
                      background: "#f8f9fa",
                      borderRadius: "8px",
                      borderLeft: "4px solid #9333ea"
                    }}>
                      <p style={{ fontSize: "11px", fontWeight: "700", color: "#666", textTransform: "uppercase", marginBottom: "8px" }}>Gender</p>
                      <p style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{farmerData?.personal_info?.gender || "N/A"}</p>
                    </div>
                    <div style={{
                      padding: "15px",
                      background: "#f8f9fa",
                      borderRadius: "8px",
                      borderLeft: "4px solid #dc2626"
                    }}>
                      <p style={{ fontSize: "11px", fontWeight: "700", color: "#666", textTransform: "uppercase", marginBottom: "8px" }}>DOB</p>
                      <p style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{farmerData?.personal_info?.date_of_birth || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 md:p-8 mt-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6" style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px", borderBottom: "2px solid #2563eb", paddingBottom: "15px" }}>
                📍 Address Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div style={{
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  borderLeft: "4px solid #2563eb"
                }}>
                  <p style={{ fontSize: "11px", fontWeight: "700", color: "#666", textTransform: "uppercase", marginBottom: "8px" }}>Province</p>
                  <p style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{farmerData?.address?.province_name || "N/A"}</p>
                </div>
                <div style={{
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  borderLeft: "4px solid #059669"
                }}>
                  <p style={{ fontSize: "11px", fontWeight: "700", color: "#666", textTransform: "uppercase", marginBottom: "8px" }}>District</p>
                  <p style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{farmerData?.address?.district_name || "N/A"}</p>
                </div>
                <div style={{
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  borderLeft: "4px solid #9333ea"
                }}>
                  <p style={{ fontSize: "11px", fontWeight: "700", color: "#666", textTransform: "uppercase", marginBottom: "8px" }}>Chiefdom</p>
                  <p style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{farmerData?.address?.chiefdom_name || "N/A"}</p>
                </div>
                <div style={{
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  borderLeft: "4px solid #dc2626"
                }}>
                  <p style={{ fontSize: "11px", fontWeight: "700", color: "#666", textTransform: "uppercase", marginBottom: "8px" }}>Village</p>
                  <p style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{farmerData?.address?.village || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Farm Information */}
            <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 md:p-8 mt-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6" style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px", borderBottom: "2px solid #16a34a", paddingBottom: "15px" }}>
                🌾 Farm Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div style={{
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  borderLeft: "4px solid #16a34a"
                }}>
                  <p style={{ fontSize: "11px", fontWeight: "700", color: "#666", textTransform: "uppercase", marginBottom: "8px" }}>Farm Size (ha)</p>
                  <p style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{farmerData?.farm_info?.farm_size_hectares || 0}</p>
                </div>
                <div style={{
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  borderLeft: "4px solid #0891b2"
                }}>
                  <p style={{ fontSize: "11px", fontWeight: "700", color: "#666", textTransform: "uppercase", marginBottom: "8px" }}>Crops</p>
                  <p style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{(farmerData?.farm_info?.crops_grown?.length || 0)} types</p>
                </div>
                <div style={{
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  borderLeft: "4px solid #ca8a04"
                }}>
                  <p style={{ fontSize: "11px", fontWeight: "700", color: "#666", textTransform: "uppercase", marginBottom: "8px" }}>Livestock</p>
                  <p style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{(farmerData?.farm_info?.livestock_types?.length || farmerData?.farm_info?.livestock?.length || 0) > 0 ? "Yes" : "None"}</p>
                </div>
                <div style={{
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  borderLeft: "4px solid #7c3aed"
                }}>
                  <p style={{ fontSize: "11px", fontWeight: "700", color: "#666", textTransform: "uppercase", marginBottom: "8px" }}>Experience</p>
                  <p style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{farmerData?.farm_info?.years_farming || farmerData?.farm_info?.farming_experience_years || "N/A"} years</p>
                </div>
                <div style={{
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  borderLeft: "4px solid #ea580c"
                }}>
                  <p style={{ fontSize: "11px", fontWeight: "700", color: "#666", textTransform: "uppercase", marginBottom: "8px" }}>Irrigation</p>
                  <p style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{farmerData?.farm_info?.has_irrigation ? "Yes" : "No"}</p>
                </div>
                <div style={{
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  borderLeft: "4px solid #06b6d4"
                }}>
                  <p style={{ fontSize: "11px", fontWeight: "700", color: "#666", textTransform: "uppercase", marginBottom: "8px" }}>Status</p>
                  <p style={{ fontSize: "14px", fontWeight: "600", color: farmerData?.registration_status === "verified" ? "#16a34a" : "#ca8a04" }}>
                    {farmerData?.registration_status === "verified" ? "✅ Verified" : "⏳ Pending"}
                  </p>
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            {qrCodeUrl && (
              <div className="bg-white rounded-xl shadow-xl p-4 sm:p-8 text-center mt-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6">🔐 Your QR Code</h3>
                <img src={qrCodeUrl} alt="QR Code" style={{ width: "200px", height: "200px", margin: "0 auto 15px", border: "2px solid #ddd", borderRadius: "10px", padding: "10px" }} />
                <p style={{ fontSize: "13px", color: "#666" }}>Present this QR code for quick identification</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add spin animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      </div>
    </>
  );
}
