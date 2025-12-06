// src/pages/Dashboard.tsx (Farmer Dashboard)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { farmerService } from "@/services/farmer.service";
import FarmerIDCardPreview from "@/components/FarmerIDCardPreview";

export default function FarmerDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

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
        setLoading(false);
        return;
      }

      console.log("Loading farmer by farmer_id from token:", user.farmer_id);
      const fullData = await farmerService.getFarmer(user.farmer_id);
      console.log("Loaded farmer data:", fullData);
      setFarmerData(fullData);
      setLoading(false);
      
    } catch (error) {
      console.error("Failed to load farmer data:", error);
      setFarmerData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadIDCard = async () => {
    try {
      const farmerId = farmerData?.farmer_id;
      if (!farmerId) {
        alert("Farmer ID not available");
        return;
      }
      await farmerService.downloadIDCard(farmerId);
      alert("✅ ID Card downloaded!");
    } catch (error: unknown) {
      console.error("Download failed:", error);
      const err = error as { response?: { data?: { detail?: string } } };
      alert(
        err.response?.data?.detail ||
          "ID card not available yet. Please contact your operator."
      );
    }
  };

  const handleViewIDCard = () => {
    if (!farmerData?.farmer_id) {
      alert("Farmer ID not available");
      return;
    }
    setShowIDCardPreview(true);
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center p-4"
        style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
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
        className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 pb-8"
        style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", paddingBottom: "30px" }}
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
        <p className="text-sm sm:text-base opacity-90" style={{ fontSize: "16px", opacity: 0.9 }}>My Farmer Profile</p>
      </div>

      {/* Main Content Container */}
      <div 
        className="max-w-6xl mx-auto px-4 sm:px-6"
        style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}
      >
        {!farmerData ? (
          // Error State
          <div 
            className="bg-white rounded-2xl p-6 sm:p-10 shadow-2xl text-center"
            style={{
              background: "white",
              borderRadius: "15px",
              padding: "40px",
              boxShadow: "0 15px 35px rgba(0,0,0,0.1)",
              textAlign: "center"
            }}
          >
            <div className="text-6xl mb-5" style={{ fontSize: "4rem", marginBottom: "20px" }}>⚠️</div>
            <h2 
              className="text-xl sm:text-2xl font-bold text-gray-800 mb-4"
              style={{ fontSize: "24px", fontWeight: "700", color: "#333", marginBottom: "15px" }}
            >
              Unable to load farmer profile
            </h2>
            <p 
              className="text-sm text-gray-600 mb-8"
              style={{ fontSize: "14px", color: "#666", marginBottom: "30px" }}
            >
              Your farmer profile could not be found. Please contact your operator or administrator to link your account.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center" style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
              <button
                onClick={loadFarmerData}
                style={{
                  padding: "12px 25px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: "#007bff",
                  color: "white",
                  transition: "all 0.3s"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#0056b3";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "#007bff";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <i className="fa-solid fa-arrows-rotate"></i> Retry
              </button>
              <button
                onClick={logout}
                style={{
                  padding: "12px 25px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: "#6c757d",
                  color: "white",
                  transition: "all 0.3s"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#545b62";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "#6c757d";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <i className="fa-solid fa-right-from-bracket"></i> Logout
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Top Action Bar */}
            <div 
              className="bg-white rounded-xl p-4 sm:p-6 shadow-xl mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px 30px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                marginBottom: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <h2 
                  className="text-lg sm:text-xl font-bold text-gray-800 mb-1"
                  style={{ fontSize: "20px", fontWeight: "700", color: "#333", marginBottom: "5px" }}
                >
                  Welcome, {farmerData?.personal_info?.first_name || "Farmer"} {farmerData?.personal_info?.last_name || ""}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600" style={{ fontSize: "13px", color: "#666" }}>
                  Farmer ID: <strong>{farmerData?.farmer_id}</strong>
                </p>
              </div>
              <button
                onClick={logout}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: "#dc3545",
                  color: "white",
                  transition: "all 0.3s"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#c82333";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "#dc3545";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <i className="fa-solid fa-right-from-bracket"></i> Logout
              </button>
            </div>

            {/* Quick Actions */}
            <div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-5"
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "20px" }}
            >
              <div 
                className="bg-gradient-to-br from-green-600 to-teal-500 rounded-xl p-5 sm:p-6 shadow-lg text-white cursor-pointer transition-all hover:scale-105 hover:shadow-2xl"
                style={{
                background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                borderRadius: "12px",
                padding: "25px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                color: "white",
                cursor: "pointer",
                transition: "all 0.3s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow = "0 15px 35px rgba(0,0,0,0.15)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.1)";
              }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "15px" }}>📄</div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>ID Card</h3>
                <p style={{ fontSize: "13px", opacity: 0.9, marginBottom: "15px" }}>View or download your digital farmer ID</p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => navigate("/farmer-idcard")}
                    style={{
                      flex: "1 1 100%",
                      padding: "10px 15px",
                      border: "2px solid white",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: "pointer",
                      background: "white",
                      color: "#28a745",
                      transition: "all 0.3s",
                      marginBottom: "8px"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.9)";
                      e.currentTarget.style.transform = "scale(1.02)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "white";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    🆔 Manage My ID Card
                  </button>
                  <button
                    onClick={handleViewIDCard}
                    style={{
                      flex: "1",
                      padding: "8px 15px",
                      border: "2px solid white",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      background: "rgba(255,255,255,0.2)",
                      color: "white",
                      transition: "all 0.3s"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "white";
                      e.currentTarget.style.color = "#28a745";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.2)";
                      e.currentTarget.style.color = "white";
                    }}
                  >
                    View
                  </button>
                  <button
                    onClick={handleDownloadIDCard}
                    style={{
                      flex: "1",
                      padding: "8px 15px",
                      border: "2px solid white",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      background: "rgba(255,255,255,0.2)",
                      color: "white",
                      transition: "all 0.3s"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "white";
                      e.currentTarget.style.color = "#28a745";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.2)";
                      e.currentTarget.style.color = "white";
                    }}
                  >
                    Download
                  </button>
                </div>
              </div>

              <div 
                className="bg-gradient-to-br from-orange-700 to-orange-600 rounded-xl p-5 sm:p-6 shadow-lg text-white cursor-pointer transition-all hover:scale-105 hover:shadow-2xl"
                style={{
                background: "linear-gradient(135deg, #c2410c 0%, #ea580c 100%)",
                borderRadius: "12px",
                padding: "25px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                color: "white",
                cursor: "pointer",
                transition: "all 0.3s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow = "0 15px 35px rgba(0,0,0,0.15)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.1)";
              }}
              onClick={() => navigate("/farmer/supply-requests")}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "15px" }}>📦</div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>Supply Requests</h3>
                <p style={{ fontSize: "13px", opacity: 0.9, marginBottom: "15px" }}>Request farming supplies</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/farmer/supply-requests");
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 15px",
                    border: "2px solid white",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    background: "white",
                    color: "#c2410c",
                    transition: "all 0.3s"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.9)";
                    e.currentTarget.style.transform = "scale(1.02)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "white";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  📝 Request Supplies
                </button>
              </div>

              <div 
                onClick={() => navigate(`/farmers/edit/${farmerData.farmer_id}`)}
                className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 sm:p-6 shadow-lg text-white cursor-pointer transition-all hover:scale-105 hover:shadow-2xl"
                style={{
                  background: "linear-gradient(135deg, #007bff 0%, #0056b3 100%)",
                  borderRadius: "12px",
                  padding: "25px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.3s"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-5px)";
                  e.currentTarget.style.boxShadow = "0 15px 35px rgba(0,0,0,0.15)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.1)";
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "15px" }}>✏️</div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>Update Profile</h3>
                <p style={{ fontSize: "13px", opacity: 0.9 }}>Edit your information</p>
              </div>
            </div>

            {/* Main Profile Card */}
            <div 
              className="bg-white rounded-2xl p-5 sm:p-8 shadow-2xl mb-5"
              style={{
              background: "white",
              borderRadius: "15px",
              padding: "30px",
              boxShadow: "0 15px 35px rgba(0,0,0,0.1)",
              marginBottom: "20px"
            }}
            >
              <div 
                className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 sm:gap-10"
              >
                {/* Photo Section */}
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    width: "200px",
                    height: "200px",
                    margin: "0 auto 20px",
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
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div style={{ fontSize: "5rem" }} className={`${(farmerData?.documents?.photo || farmerData?.photo_path) ? 'hidden' : ''}`}>👨‍🌾</div>
                  </div>
                  <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#333", marginBottom: "10px" }}>
                    {farmerData?.personal_info?.first_name} {farmerData?.personal_info?.last_name}
                  </h2>
                  <button
                    onClick={() => navigate(`/farmers/${farmerData?.farmer_id}`)}
                    style={{
                      padding: "10px 20px",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      background: "#007bff",
                      color: "white",
                      transition: "all 0.3s",
                      marginTop: "10px"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "#0056b3";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "#007bff";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    View Full Profile & Documents
                  </button>
                </div>

                {/* Personal Info Grid */}
                <div>
                  <h3 
                    className="text-base sm:text-lg font-bold text-gray-800 mb-5 pb-3 border-b-4 border-green-600"
                    style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "#333",
                    marginBottom: "20px",
                    paddingBottom: "10px",
                    borderBottom: "3px solid #28a745"
                  }}
                  >
                    📋 Personal Information
                  </h3>
                  <div 
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
                  >
                    <InfoCard label="Phone" value={farmerData?.personal_info?.phone_primary} />
                    <InfoCard label="Farmer ID" value={farmerData?.farmer_id} />
                    <InfoCard label="NRC Number" value={farmerData?.personal_info?.nrc || "N/A"} />
                    <InfoCard label="Gender" value={farmerData?.personal_info?.gender || "N/A"} />
                    <InfoCard label="Date of Birth" value={farmerData?.personal_info?.date_of_birth || "N/A"} />
                    <InfoCard
                      label="Registration Date"
                      value={
                        farmerData?.created_at
                          ? new Date(farmerData.created_at).toLocaleDateString()
                          : "N/A"
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Address & Farm Info Grid */}
            <div 
              className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-5"
            >
              {/* Address Card */}
              <div 
                className="bg-white rounded-2xl p-5 sm:p-6 shadow-2xl"
                style={{
                background: "white",
                borderRadius: "15px",
                padding: "25px",
                boxShadow: "0 15px 35px rgba(0,0,0,0.1)"
              }}
              >
                <h3 
                  className="text-base sm:text-lg font-bold text-gray-800 mb-5 pb-3 border-b-4 border-blue-600"
                  style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#333",
                  marginBottom: "20px",
                  paddingBottom: "10px",
                  borderBottom: "3px solid #007bff"
                }}
                >
                  📍 Address Information
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <InfoCard label="Province" value={farmerData?.address?.province_name || "N/A"} />
                  <InfoCard label="District" value={farmerData?.address?.district_name || "N/A"} />
                  <InfoCard label="Village" value={farmerData?.address?.village || "N/A"} />
                  <InfoCard
                    label="Chiefdom"
                    value={farmerData?.address?.chiefdom_name || "Not provided"}
                  />
                </div>
              </div>

              {/* Farm Info Card */}
              <div 
                className="bg-white rounded-2xl p-5 sm:p-6 shadow-2xl"
                style={{
                background: "white",
                borderRadius: "15px",
                padding: "25px",
                boxShadow: "0 15px 35px rgba(0,0,0,0.1)"
              }}
              >
                <h3 
                  className="text-base sm:text-lg font-bold text-gray-800 mb-5 pb-3 border-b-4 border-green-600"
                  style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#333",
                  marginBottom: "20px",
                  paddingBottom: "10px",
                  borderBottom: "3px solid #28a745"
                }}
                >
                  🌾 Farm Information
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <InfoCard
                    label="Farm Size"
                    value={`${farmerData?.farm_info?.farm_size_hectares || 0} ha`}
                  />
                  <InfoCard
                    label="Crops"
                    value={farmerData?.farm_info?.crops_grown?.join(", ") || "N/A"}
                  />
                  <InfoCard
                    label="Livestock"
                    value={farmerData?.farm_info?.livestock_types?.join(", ") || farmerData?.farm_info?.livestock?.join(", ") || "None"}
                  />
                  <InfoCard
                    label="Farming Experience"
                    value={farmerData?.farm_info?.years_farming ? `${farmerData.farm_info.years_farming} years` : farmerData?.farm_info?.farming_experience_years ? `${farmerData.farm_info.farming_experience_years} years` : "N/A"}
                  />
                  <InfoCard
                    label="Irrigation"
                    value={farmerData?.farm_info?.has_irrigation ? "Yes" : "No"}
                  />
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            {qrCodeUrl && (
              <div 
                className="bg-white rounded-2xl p-5 sm:p-8 shadow-2xl text-center"
                style={{
                background: "white",
                borderRadius: "15px",
                padding: "30px",
                boxShadow: "0 15px 35px rgba(0,0,0,0.1)",
                textAlign: "center"
              }}
              >
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-5" style={{ fontSize: "18px", fontWeight: "700", color: "#333", marginBottom: "20px" }}>🔐 Your QR Code</h3>
                <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 mx-auto mb-4 border-2 border-gray-300 rounded-lg p-3" style={{ width: "200px", height: "200px", margin: "0 auto 15px", border: "2px solid #ddd", borderRadius: "10px", padding: "10px" }} />
                <p className="text-xs sm:text-sm text-gray-600" style={{ fontSize: "13px", color: "#666" }}>Present this QR code for quick identification</p>
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

// ============================================
// 🧩 REUSABLE INFO CARD COMPONENT
// ============================================
function InfoCard({
  label,
  value,
}: {
  label: string;
  value?: string | number;
}) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 15px",
      background: "#f8f9fa",
      borderRadius: "8px"
    }}>
      <p style={{ fontSize: "11px", fontWeight: "700", color: "#666", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </p>
      <p style={{ fontSize: "13px", fontWeight: "600", color: "#333" }}>
        {value || "N/A"}
      </p>
    </div>
  );
}

// Add ID Card Preview Modal at the end of FarmerDashboard component
export function FarmerDashboardWithPreview() {
  return (
    <>
      <FarmerDashboard />
    </>
  );
}
