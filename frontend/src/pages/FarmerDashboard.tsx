// src/pages/FarmerDashboard.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { safeNavigate } from '@/config/navigation';
import useAuthStore from "@/store/authStore";
import { farmerService } from "@/services/farmer.service";
import { useNotification } from "@/contexts/NotificationContext";
import FarmerIDCardPreview from "@/components/FarmerIDCardPreview";
import { logger } from "@/utils/logger";
import { useTheme } from "@/contexts/ThemeContext";

const COMPONENT = "FarmerDashboard";

export default function FarmerDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { success: showSuccess, error: showError, info: showInfo, dismiss } = useNotification();
  const { toggleTheme, isDark } = useTheme();

  const [farmerData, setFarmerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [qrError, setQrError] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [photoError, setPhotoError] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Use ref to track if we've already loaded data
  const hasLoadedRef = useRef(false);

  // Stable callback that doesn't depend on showError
  const loadFarmerData = useCallback(async () => {
    try {
      setLoading(true);

      if (!user?.farmer_id) {
        logger.error(COMPONENT, "No farmer_id in JWT token - authentication issue");
        showError("Authentication error. Please login again.", 5000);
        setFarmerData(null);
        return;
      }

      logger.info(COMPONENT, "loadFarmerData start", { farmer_id: user.farmer_id });
      const fullData = await farmerService.getFarmer(user.farmer_id);
      logger.info(COMPONENT, "loadFarmerData success");
      setFarmerData(fullData);
      hasLoadedRef.current = true;
    } catch (error: any) {
      logger.error(COMPONENT, "loadFarmerData failed", { error });
      showError("Failed to load profile. Please retry.", 5000);
      setFarmerData(null);
    } finally {
      setLoading(false);
    }
  }, [user?.farmer_id, showError]);

  // Load data once on mount
  useEffect(() => {
    if (!hasLoadedRef.current) {
      loadFarmerData();
    }
  }, [loadFarmerData]);

  // Load farmer photo as blob with authentication
  useEffect(() => {
    const loadPhoto = async () => {
      if (!farmerData) return;

      const photoPath = farmerData?.documents?.photo || farmerData?.photo_path;
      if (!photoPath) {
        logger.info(COMPONENT, 'loadPhoto - no path');
        return;
      }

      try {
        logger.info(COMPONENT, 'loadPhoto start', { photoPath });
        setPhotoError(false);
        
        const baseURL = import.meta.env.VITE_API_BASE_URL || "https://automatic-doodle-wqp6gjqwxvqhggvw-8000.app.github.dev";
        const fullUrl = photoPath.startsWith('http') ? photoPath : `${baseURL}${photoPath}`;
        
        const response = await fetch(fullUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Photo fetch failed: ${response.status}`);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        logger.info(COMPONENT, 'loadPhoto success');
        setPhotoUrl(blobUrl);

        // Cleanup on unmount
        return () => {
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
          }
        };
      } catch (error) {
        logger.error(COMPONENT, 'loadPhoto failed', { error });
        setPhotoError(true);
      }
    };

    loadPhoto();
  }, [farmerData]);

  // Load QR code - Use blob with authentication for better mobile support
  useEffect(() => {
    const loadQRCode = async () => {
      if (!farmerData) return;

      try {
        logger.info(COMPONENT, 'loadQRCode start', { farmer_id: farmerData.farmer_id });
        setQrError(false);
        
        // Fetch QR code with authentication
        const baseURL = import.meta.env.VITE_API_BASE_URL || "https://automatic-doodle-wqp6gjqwxvqhggvw-8000.app.github.dev";
        const response = await fetch(`${baseURL}/api/farmers/${farmerData.farmer_id}/qr`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        });

        if (!response.ok) {
          throw new Error(`QR fetch failed: ${response.status}`);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        logger.info(COMPONENT, 'loadQRCode success');
        setQrCodeUrl(blobUrl);

        // Cleanup function
        return () => {
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
          }
        };
      } catch (error) {
        logger.error(COMPONENT, 'loadQRCode failed', { error });
        setQrError(true);
      }
    };

    loadQRCode();
  }, [farmerData]);

  const handleDownloadIDCard = async () => {
    let downloadNotifId: string | undefined;
    try {
      const farmerId = farmerData?.farmer_id;
      if (!farmerId) {
        showError("Farmer ID not available", 4000);
        return;
      }

      downloadNotifId = showInfo("📥 Preparing download...", 8000);
      logger.info(COMPONENT, "handleDownloadIDCard start", { farmerId });
      
      const result = await farmerService.downloadIDCard(farmerId);
      
      if (downloadNotifId) dismiss(downloadNotifId);
      
      if (result?.savedPath) {
        // Mobile - file was saved to device
        showSuccess(`✅ ID card saved to:\n${result.savedPath}`, 8000);
      } else if (result?.downloaded) {
        // Web - browser download
        showSuccess("Downloaded to Downloads folder", 3000);
      } else {
        showError("Download failed. Please try again.", 4000);
      }
    } catch (error: any) {
      logger.error(COMPONENT, "handleDownloadIDCard failed", { error });
      if (downloadNotifId) dismiss(downloadNotifId);
      const errorMsg = error.response?.data?.detail || "ID card not available yet. Generate it first.";
      showError(errorMsg, 5000);
    }
  };

  const handleViewIDCard = () => {
    if (!farmerData?.farmer_id) {
      showError("Farmer ID not available", 4000);
      return;
    }
    
    logger.info(COMPONENT, "handleViewIDCard open preview");
    setShowPreview(true);
  };

  const handleRetry = () => {
    logger.info(COMPONENT, "handleRetry triggered");
    hasLoadedRef.current = false;
    loadFarmerData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-gray-900 dark:via-indigo-950 dark:to-gray-900 flex items-center justify-center p-4 transition-all duration-300">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-lg sm:text-xl">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-gray-900 dark:via-indigo-950 dark:to-gray-900 pb-8 transition-all duration-300">
        {/* Header */}
        <div className="relative text-center text-white pt-6 sm:pt-8 pb-6 sm:pb-8 px-4">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-90"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
          </button>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 drop-shadow-lg">
            🌾 Chiefdom Empowerment Model
          </h1>
          <p className="text-sm sm:text-base opacity-90">Farmer Dashboard</p>
        </div>

        {/* Main Content Container */}
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
          {!farmerData ? (
            // Error State
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 sm:p-8 shadow-xl text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Unable to load farmer profile
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Your farmer profile could not be found. Please contact your operator or administrator.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleRetry}
                  className="px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-sm font-semibold transition-all"
                >
                  🔄 Retry
                </button>
                <button
                  onClick={logout}
                  className="px-4 sm:px-6 py-2 bg-gray-600 hover:bg-gray-700 active:scale-95 text-white rounded-lg text-sm font-semibold transition-all"
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
                {/* Registration Status Card */}
                <div className="bg-gradient-to-br from-green-600 to-emerald-600 text-white p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                  <div className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">
                    {farmerData?.registration_status === "verified" ? "✅ Verified" : "⏳ Pending"}
                  </div>
                  <div className="opacity-90 text-xs sm:text-sm">Registration Status</div>
                </div>

                {/* Farm Size Card */}
                <div className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                  <div className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">
                    🌾 {farmerData?.farm_info?.farm_size_hectares || 0} ha
                  </div>
                  <div className="opacity-90 text-xs sm:text-sm">Farm Size</div>
                </div>

                {/* Crops Count Card */}
                <div className="bg-gradient-to-br from-yellow-600 to-orange-600 text-white p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                  <div className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">
                    🌱 {(farmerData?.farm_info?.crops_grown?.length || 0)}
                  </div>
                  <div className="opacity-90 text-xs sm:text-sm">Crops Grown</div>
                </div>
              </div>

              {/* Main Content Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 sm:p-6 md:p-8">
                {/* Header with Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">👨‍🌾 My Profile</h2>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <button
                      onClick={() => safeNavigate(navigate, `/farmers/edit/${farmerData?.farmer_id}`)}
                      className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => safeNavigate(navigate, "/farmer-idcard")}
                      className="px-3 sm:px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
                    >
                      🆔 Manage ID
                    </button>
                    <button
                      onClick={handleViewIDCard}
                      className="px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
                    >
                      👁️ Preview ID
                    </button>
                    <button
                      onClick={handleDownloadIDCard}
                      className="px-3 sm:px-4 py-2 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
                    >
                      📥 Download
                    </button>
                    <button
                      onClick={logout}
                      className="px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
                    >
                      🚪 Logout
                    </button>
                    <button
                      onClick={toggleTheme}
                      className="px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
                      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                      {isDark ? '☀️ Light' : '🌙 Dark'}
                    </button>
                  </div>
                </div>

                {/* Profile Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Photo and Basic Info - Left Column */}
                  <div className="lg:col-span-1">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                      <div style={{
                        width: "150px",
                        height: "150px",
                        margin: "0 auto 15px",
                        background: "var(--bg-surface-subtle)",
                        borderRadius: "50%",
                        overflow: "hidden",
                        boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        {photoError || !photoUrl ? (
                          <div style={{ fontSize: "4rem" }}>👨‍🌾</div>
                        ) : (
                          <img
                            src={photoUrl}
                            alt="Farmer"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onLoad={() => logger.info(COMPONENT, 'photo image displayed')}
                            onError={() => {
                              logger.error(COMPONENT, 'photo image display failed');
                              setPhotoError(true);
                            }}
                          />
                        )}
                      </div>
                      <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary-hex)", marginBottom: "5px" }}>
                        {farmerData?.personal_info?.first_name} {farmerData?.personal_info?.last_name}
                      </h3>
                      <p style={{ fontSize: "13px", color: "var(--text-secondary-hex)", marginBottom: "15px" }}>
                        ID: {farmerData?.farmer_id}
                      </p>
                      <button
                        onClick={() => safeNavigate(navigate, `/farmers/${farmerData?.farmer_id}`)}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
                      >
                        📄 Full Profile
                      </button>
                    </div>
                  </div>

                  {/* Info Columns */}
                  <div className="lg:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div style={{
                        padding: "15px",
                        background: "var(--bg-surface)",
                        borderRadius: "8px",
                        borderLeft: "4px solid #2563eb"
                      }}>
                        <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary-hex)", textTransform: "uppercase", marginBottom: "8px" }}>Phone</p>
                        <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary-hex)" }}>{farmerData?.personal_info?.phone_primary || "N/A"}</p>
                      </div>
                      <div style={{
                        padding: "15px",
                        background: "var(--bg-surface)",
                        borderRadius: "8px",
                        borderLeft: "4px solid #059669"
                      }}>
                        <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary-hex)", textTransform: "uppercase", marginBottom: "8px" }}>NRC Number</p>
                        <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary-hex)" }}>{farmerData?.personal_info?.nrc || "N/A"}</p>
                      </div>
                      <div style={{
                        padding: "15px",
                        background: "var(--bg-surface)",
                        borderRadius: "8px",
                        borderLeft: "4px solid #9333ea"
                      }}>
                        <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary-hex)", textTransform: "uppercase", marginBottom: "8px" }}>Gender</p>
                        <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary-hex)" }}>{farmerData?.personal_info?.gender || "N/A"}</p>
                      </div>
                      <div style={{
                        padding: "15px",
                        background: "var(--bg-surface)",
                        borderRadius: "8px",
                        borderLeft: "4px solid #dc2626"
                      }}>
                        <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary-hex)", textTransform: "uppercase", marginBottom: "8px" }}>DOB</p>
                        <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary-hex)" }}>{farmerData?.personal_info?.date_of_birth || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 sm:p-6 md:p-8 mt-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-6 border-b-2 border-blue-600 pb-3">
                  📍 Address Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div style={{
                    padding: "15px",
                    background: "var(--bg-surface)",
                    borderRadius: "8px",
                    borderLeft: "4px solid #2563eb"
                  }}>
                    <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary-hex)", textTransform: "uppercase", marginBottom: "8px" }}>Province</p>
                    <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary-hex)" }}>{farmerData?.address?.province_name || "N/A"}</p>
                  </div>
                  <div style={{
                    padding: "15px",
                    background: "var(--bg-surface)",
                    borderRadius: "8px",
                    borderLeft: "4px solid #059669"
                  }}>
                    <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary-hex)", textTransform: "uppercase", marginBottom: "8px" }}>District</p>
                    <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary-hex)" }}>{farmerData?.address?.district_name || "N/A"}</p>
                  </div>
                  <div style={{
                    padding: "15px",
                    background: "var(--bg-surface)",
                    borderRadius: "8px",
                    borderLeft: "4px solid #9333ea"
                  }}>
                    <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary-hex)", textTransform: "uppercase", marginBottom: "8px" }}>Chiefdom</p>
                    <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary-hex)" }}>{farmerData?.address?.chiefdom_name || "N/A"}</p>
                  </div>
                  <div style={{
                    padding: "15px",
                    background: "var(--bg-surface)",
                    borderRadius: "8px",
                    borderLeft: "4px solid #dc2626"
                  }}>
                    <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary-hex)", textTransform: "uppercase", marginBottom: "8px" }}>Village</p>
                    <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary-hex)" }}>{farmerData?.address?.village || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Farm Information */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 sm:p-6 md:p-8 mt-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-6 border-b-2 border-green-600 pb-3">
                  🌾 Farm Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div style={{
                    padding: "15px",
                    background: "var(--bg-surface)",
                    borderRadius: "8px",
                    borderLeft: "4px solid #16a34a"
                  }}>
                    <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary-hex)", textTransform: "uppercase", marginBottom: "8px" }}>Farm Size (ha)</p>
                    <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary-hex)" }}>{farmerData?.farm_info?.farm_size_hectares || 0}</p>
                  </div>
                  <div style={{
                    padding: "15px",
                    background: "var(--bg-surface)",
                    borderRadius: "8px",
                    borderLeft: "4px solid #0891b2"
                  }}>
                    <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary-hex)", textTransform: "uppercase", marginBottom: "8px" }}>Crops</p>
                    <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary-hex)" }}>{(farmerData?.farm_info?.crops_grown?.length || 0)} types</p>
                  </div>
                  <div style={{
                    padding: "15px",
                    background: "var(--bg-surface)",
                    borderRadius: "8px",
                    borderLeft: "4px solid #ca8a04"
                  }}>
                    <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary-hex)", textTransform: "uppercase", marginBottom: "8px" }}>Livestock</p>
                    <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary-hex)" }}>{(farmerData?.farm_info?.livestock_types?.length || farmerData?.farm_info?.livestock?.length || 0) > 0 ? "Yes" : "None"}</p>
                  </div>
                  <div style={{
                    padding: "15px",
                    background: "var(--bg-surface)",
                    borderRadius: "8px",
                    borderLeft: "4px solid #7c3aed"
                  }}>
                    <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary-hex)", textTransform: "uppercase", marginBottom: "8px" }}>Experience</p>
                    <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary-hex)" }}>{farmerData?.farm_info?.years_farming || farmerData?.farm_info?.farming_experience_years || "N/A"} years</p>
                  </div>
                  <div style={{
                    padding: "15px",
                    background: "var(--bg-surface)",
                    borderRadius: "8px",
                    borderLeft: "4px solid #ea580c"
                  }}>
                    <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary-hex)", textTransform: "uppercase", marginBottom: "8px" }}>Irrigation</p>
                    <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary-hex)" }}>{farmerData?.farm_info?.has_irrigation ? "Yes" : "No"}</p>
                  </div>
                  <div style={{
                    padding: "15px",
                    background: "var(--bg-surface)",
                    borderRadius: "8px",
                    borderLeft: "4px solid #06b6d4"
                  }}>
                    <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary-hex)", textTransform: "uppercase", marginBottom: "8px" }}>Status</p>
                    <p style={{ fontSize: "14px", fontWeight: "600", color: farmerData?.registration_status === "verified" ? "#16a34a" : "#ca8a04" }}>
                      {farmerData?.registration_status === "verified" ? "✅ Verified" : "⏳ Pending"}
                    </p>
                  </div>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 sm:p-8 text-center mt-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-6">🔐 Your QR Code</h3>
                <div style={{ 
                  width: "220px", 
                  height: "220px", 
                  margin: "0 auto 15px", 
                  border: "3px solid #16a34a", 
                  borderRadius: "12px", 
                  padding: "15px",
                  backgroundColor: "var(--bg-card)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                }}>
                  {qrError ? (
                    <div style={{ textAlign: "center", color: "var(--text-muted-hex)" }}>
                      <div style={{ fontSize: "3rem", marginBottom: "10px" }}>📱</div>
                      <p style={{ fontSize: "12px" }}>QR code unavailable</p>
                    </div>
                  ) : qrCodeUrl ? (
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code" 
                      style={{ 
                        maxWidth: "100%", 
                        maxHeight: "100%",
                        objectFit: "contain"
                      }}
                      onLoad={() => logger.info(COMPONENT, 'QR image loaded')}
                      onError={() => {
                        logger.error(COMPONENT, 'QR image display failed');
                        setQrError(true);
                      }}
                    />
                  ) : (
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 dark:border-gray-600 border-t-green-600"></div>
                  )}
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-secondary-hex)" }}>
                  {qrError ? "Contact operator to generate QR code" : "Present this QR code for quick identification"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ID Card Preview Modal */}
      {showPreview && farmerData && (
        <FarmerIDCardPreview 
          farmer={farmerData}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
