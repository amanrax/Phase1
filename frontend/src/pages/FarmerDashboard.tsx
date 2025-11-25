// src/pages/Dashboard.tsx (Farmer Dashboard)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { farmerService } from "@/services/farmer.service";

export default function FarmerDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [farmerData, setFarmerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    loadFarmerData();
  }, []);

  useEffect(() => {
    if (farmerData?.farmer_id) {
      const url = farmerService.getQRCode(farmerData.farmer_id);
      setQrCodeUrl(url);
    }
  }, [farmerData?.farmer_id]);

  const loadFarmerData = async () => {
    try {
      setLoading(true);
      
      console.log("Loading farmer data for user:", user);

      // Check if user token contains farmer_id
      if (!user?.farmer_id) {
        console.error("No farmer_id in JWT token - authentication issue");
        console.log("User data:", { email: user?.email, roles: user?.roles, farmer_id: user?.farmer_id });
        setFarmerData(null);
        setLoading(false);
        return;
      }

      // Load farmer data using farmer_id from token
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
    } catch (error: any) {
      console.error("Download failed:", error);
      alert(
        error.response?.data?.detail ||
          "ID card not available yet. Please contact your operator."
      );
    }
  };

  const handleViewIDCard = async () => {
    try {
      const farmerId = farmerData?.farmer_id;
      if (!farmerId) {
        alert("Farmer ID not available");
        return;
      }
      await farmerService.viewIDCard(farmerId);
    } catch (error: any) {
      console.error("View ID card failed:", error);
      alert(
        error.response?.data?.detail ||
          "ID card not available yet. Please contact your operator."
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 to-blue-500">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="app-topbar">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="topbar-title">🌾 Farmer Profile</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {farmerData?.personal_info?.first_name || "Farmer"} {farmerData?.personal_info?.last_name || ""}
              </span>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-semibold transition"
                aria-label="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold">Loading your profile...</p>
          </div>
        ) : !farmerData ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <p className="text-gray-700 font-semibold mb-4">Unable to load farmer profile</p>
            <p className="text-sm text-gray-600 mb-6">Your farmer profile could not be found. Please contact your operator or administrator to link your account.</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={loadFarmerData}
                className="btn-primary"
              >
                <i className="fa-solid fa-arrows-rotate mr-2"></i> Retry
              </button>
              <button
                onClick={logout}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700"
              >
                <i className="fa-solid fa-right-from-bracket mr-2"></i> Logout
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="card p-4 border-l-4 border-green-600 hover:shadow-lg transition">
                <div className="text-3xl mb-2">📄</div>
                <h3 className="font-bold text-gray-900">ID Card</h3>
                <p className="text-sm text-gray-600 mt-1">View or download your digital farmer ID</p>
                <div className="mt-4 flex gap-2">
                    <button onClick={handleViewIDCard} className="bg-blue-500 text-white px-3 py-1 rounded text-sm">View</button>
                    <button onClick={handleDownloadIDCard} className="bg-gray-500 text-white px-3 py-1 rounded text-sm">Download</button>
                </div>
              </div>
              <button
                onClick={() => navigate(`/farmers/edit/${farmerData.farmer_id}`)}
                className="card p-4 border-l-4 border-blue-600 hover:shadow-lg transition"
              >
                <div className="text-3xl mb-2">✏️</div>
                <h3 className="font-bold text-gray-900">Update Profile</h3>
                <p className="text-sm text-gray-600 mt-1">Edit your information</p>
              </button>
            </div>

            {/* Profile Card */}
            <div className="card p-8 mb-8">
              <div className="grid md:grid-cols-3 gap-8">
                {/* Photo Section */}
                <div className="text-center">
                  <div className="w-48 h-48 mx-auto mb-4 bg-gray-200 rounded-full overflow-hidden shadow-md flex items-center justify-center">
                    {(farmerData?.documents?.photo || farmerData?.photo_path) ? (
                      <img
                        src={farmerData?.documents?.photo || farmerData?.photo_path}
                        alt="Farmer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`text-6xl ${(farmerData?.documents?.photo || farmerData?.photo_path) ? 'hidden' : ''}`}>👨‍🌾</div>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {farmerData?.personal_info?.first_name} {farmerData?.personal_info?.last_name}
                  </h2>
                  <button
                    onClick={() => navigate(`/farmers/${farmerData?.farmer_id}`)}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold"
                  >
                    View Full Profile & Documents
                  </button>
                </div>

                {/* Personal Info */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-bold mb-4 text-gray-900 border-b-2 border-green-600 pb-2">
                    📋 Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoCard
                      label="Phone"
                      value={farmerData?.personal_info?.phone_primary}
                    />
                    <InfoCard
                      label="Farmer ID"
                      value={farmerData?.farmer_id}
                    />
                    <InfoCard
                      label="NRC Number"
                      value={farmerData?.personal_info?.nrc || "N/A"}
                    />
                    <InfoCard
                      label="Gender"
                      value={farmerData?.personal_info?.gender || "N/A"}
                    />
                    <InfoCard
                      label="Date of Birth"
                      value={farmerData?.personal_info?.date_of_birth || "N/A"}
                    />
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
            <div className="grid md:grid-cols-2 gap-6">
              {/* Address Card */}
              <div className="card p-6">
                <h3 className="text-lg font-bold mb-4 text-gray-900 border-b-2 border-blue-600 pb-2">
                  📍 Address Information
                </h3>
                <div className="space-y-3">
                  <InfoCard label="Province" value={farmerData?.address?.province_name || "N/A"} />
                  <InfoCard label="District" value={farmerData?.address?.district_name || "N/A"} />
                  <InfoCard label="Village" value={farmerData?.address?.village || "N/A"} />
                  <InfoCard label="Chiefdom" value={farmerData?.address?.chiefdom_name || "N/A"} />
                </div>
              </div>

              {/* Farm Info Card */}
              <div className="card p-6">
                <h3 className="text-lg font-bold mb-4 text-gray-900 border-b-2 border-green-600 pb-2">
                  🌾 Farm Information
                </h3>
                <div className="space-y-3">
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
              <div className="card p-6 mt-6 text-center">
                <h3 className="text-lg font-bold mb-4 text-gray-900">🔐 Your QR Code</h3>
                <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 mx-auto mb-4" />
                <p className="text-sm text-gray-600">Present this QR code for quick identification</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
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
    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
      <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value || "N/A"}</p>
    </div>
  );
}
