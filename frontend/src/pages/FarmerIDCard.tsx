import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { safeNavigate } from '@/config/navigation';
import useAuthStore from "@/store/authStore";
import { farmerService } from "@/services/farmer.service";
import { useNotification } from "@/contexts/NotificationContext";
import { useBackButton } from '@/hooks/useBackButton';

interface Farmer {
  farmer_id: string;
  personal_info: {
    first_name: string;
    last_name: string;
    phone_primary: string;
    email?: string;
    nrc?: string;
    date_of_birth?: string;
    gender?: string;
  };
  address: {
    province_name?: string;
    district_name?: string;
    chiefdom_name?: string;
    village?: string;
  };
  farm_info?: {
    farm_size_hectares?: number;
    crops_grown?: string[];
    livestock?: string;
    has_irrigation?: boolean;
  };
  photos?: {
    profile?: string;
  };
  id_card_path?: string;
  id_card_file_id?: string;
  id_card_generated_at?: string;
  qr_code_path?: string;
  created_at?: string;
  status?: string;
}

const FarmerIDCard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const { success: showSuccess, error: showError, info: showInfo, dismiss } = useNotification();

  // Enable hardware back button
  useBackButton();

  useEffect(() => {
    loadFarmerData();
  }, []);

  const loadFarmerData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const farmerId = user?.farmer_id || user?.username;
      if (!farmerId) {
        const msg = "Farmer ID not found. Please contact support.";
        setError(msg);
        showError(msg, 5000);
        setLoading(false);
        return;
      }

      console.log('[IDCard] Loading farmer data for:', farmerId);
      const data = await farmerService.getFarmer(farmerId);
      setFarmer(data);
      console.log('[IDCard] Farmer data loaded');

      // Load QR code - use direct URL
      try {
        const baseURL = import.meta.env.VITE_API_BASE_URL || "http://13.204.83.198:8000";
        const directQrUrl = `${baseURL}/api/farmers/${farmerId}/qr?t=${Date.now()}`;
        console.log('[IDCard] Setting QR URL:', directQrUrl);
        setQrUrl(directQrUrl);
      } catch (e) {
        console.warn('[IDCard] Failed to set QR URL', e);
        setQrError(true);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to load farmer data";
      console.error('[IDCard] Load error:', msg);
      setError(msg);
      showError(msg, 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateIDCard = async () => {
    if (!farmer) return;
    
    try {
      setGenerating(true);
      setError(null);
      
      const notifId = showInfo("⏳ Generating ID card...", 10000);
      console.log('[IDCard] Starting generation for:', farmer.farmer_id);
      
      const response = await farmerService.generateIDCard(farmer.farmer_id);
      console.log('[IDCard] Generation started:', response);

      // Poll for completion
      const maxAttempts = 12;
      let attempts = 0;
      
      const poll = setInterval(async () => {
        attempts += 1;
        console.log(`[IDCard] Polling attempt ${attempts}/${maxAttempts}`);
        
        try {
          const updated = await farmerService.getFarmer(farmer.farmer_id);
          setFarmer(updated);
          
          if (updated?.id_card_file_id || updated?.id_card_path || updated?.id_card_generated_at) {
            clearInterval(poll);
            console.log('[IDCard] Generation complete!');
            if (notifId) dismiss(notifId);
            showSuccess('✅ ID card ready!', 5000);
            setGenerating(false);
          } else if (attempts >= maxAttempts) {
            clearInterval(poll);
            const msg = 'Generation timeout. Please try again.';
            console.error('[IDCard]', msg);
            if (notifId) dismiss(notifId);
            setError(msg);
            showError(msg, 5000);
            setGenerating(false);
          }
        } catch (e) {
          console.error('[IDCard] Polling error:', e);
          if (attempts >= maxAttempts) {
            clearInterval(poll);
            const msg = 'Generation failed. Contact support.';
            if (notifId) dismiss(notifId);
            setError(msg);
            showError(msg, 5000);
            setGenerating(false);
          }
        }
      }, 5000);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to generate ID card";
      if (notifId) dismiss(notifId);
      console.error('[IDCard] Generation error:', msg);
      setError(msg);
      showError(msg, 5000);
      setGenerating(false);
    }
  };

  const handleDownloadIDCard = async () => {
    if (!farmer) return;
    
    try {
      setError(null);
      const downloadNotifId = showInfo("📥 Downloading...", 8000);
      console.log('[IDCard] Downloading for:', farmer.farmer_id);
      
      const savedFilename = await farmerService.downloadIDCard(farmer.farmer_id);
      
      if (downloadNotifId) dismiss(downloadNotifId);
      if (savedFilename) {
        showSuccess(`✅ Saved: ${savedFilename}`, 5000);
      } else {
        showSuccess("✅ Downloaded!", 4000);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Download failed. Generate ID first.";
      console.error('[IDCard] Download error:', msg);
      if (downloadNotifId) dismiss(downloadNotifId);
      showError(msg, 5000);
      setError(msg);
    }
  };

  const handleViewIDCard = async () => {
    if (!farmer) return;
    
    try {
      setViewLoading(true);
      setError(null);
      const previewNotifId = showInfo("📄 Loading preview...", 8000);
      
      console.log('[IDCard] Fetching PDF for:', farmer.farmer_id);
      const url = await farmerService.viewIDCard(farmer.farmer_id);
      
      if (url) {
        console.log('[IDCard] PDF URL received, storing in sessionStorage');
        sessionStorage.setItem('idcard_view_url', url);
        console.log('[IDCard] Navigating to viewer');
        if (previewNotifId) dismiss(previewNotifId);
        safeNavigate(navigate, '/farmer/idcard-view');
      } else {
        console.error('[IDCard] No URL returned');
        if (previewNotifId) dismiss(previewNotifId);
        showError('ID card not available. Generate it first.', 5000);
      }
    } catch (err: any) {
      console.error('[IDCard] View error:', err);
      const msg = err.response?.data?.detail || err.message || "Failed to view. Generate ID first.";
      if (previewNotifId) dismiss(previewNotifId);
      setError(msg);
      showError(msg, 5000);
    } finally {
      setViewLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "short", 
        day: "numeric" 
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadgeClass = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "verified":
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-700 to-green-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 text-center shadow-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading farmer data...</p>
        </div>
      </div>
    );
  }

  if (error && !farmer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-700 to-green-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 text-center shadow-2xl max-w-md w-full">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 mb-3">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => safeNavigate(navigate, "/farmer-dashboard")}
            className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-6 rounded-lg transition active:scale-95"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => safeNavigate(navigate, "/farmer-dashboard")} 
                className="text-green-700 hover:text-green-800 font-bold text-sm transition"
              >
                ← BACK
              </button>
              <h1 className="text-2xl font-bold text-gray-800">🆔 Farmer ID Card</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert - Only show inline errors, not duplicates */}
        {error && (
          <div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border-l-4 border-red-500 flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Farmer Information */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-3 border-b-4 border-green-700">
                📋 Farmer Information
              </h2>

              {/* Profile Photo */}
              {farmer?.photos?.profile && (
                <div className="text-center mb-8">
                  <img
                    src={farmer.photos.profile}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-green-700 mx-auto shadow-lg"
                    onError={(e) => {
                      console.error('[IDCard] Photo failed to load');
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Farmer ID</label>
                  <p className="text-lg font-bold text-gray-800 mt-1 bg-gray-50 p-2 rounded border-2 border-green-700 font-mono">
                    {farmer?.farmer_id || "N/A"}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Full Name</label>
                  <p className="text-lg font-bold text-gray-800 mt-1">
                    {farmer?.personal_info?.first_name} {farmer?.personal_info?.last_name}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Phone</label>
                  <p className="text-gray-700 mt-1">{farmer?.personal_info?.phone_primary || "N/A"}</p>
                </div>

                {farmer?.personal_info?.nrc && (
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">NRC Number</label>
                    <p className="text-gray-700 mt-1">{farmer.personal_info.nrc}</p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">District</label>
                  <p className="text-gray-700 mt-1">{farmer?.address?.district_name || "N/A"}</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Province</label>
                  <p className="text-gray-700 mt-1">{farmer?.address?.province_name || "N/A"}</p>
                </div>

                {farmer?.farm_info?.farm_size_hectares && (
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Farm Size</label>
                    <p className="text-gray-700 mt-1">{farmer.farm_info.farm_size_hectares} hectares</p>
                  </div>
                )}

                {farmer?.farm_info?.crops_grown && farmer.farm_info.crops_grown.length > 0 && (
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Crops</label>
                    <p className="text-gray-700 mt-1 text-sm">{farmer.farm_info.crops_grown.join(", ")}</p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Status</label>
                  <span className={`inline-block mt-1 px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(farmer?.status)}`}>
                    {farmer?.status || "Unknown"}
                  </span>
                </div>

                {farmer?.created_at && (
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Registered</label>
                    <p className="text-gray-700 mt-1 text-sm">{formatDate(farmer.created_at)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - ID Card Actions */}
          <div className="space-y-6">
            {/* ID Card Status */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition">
              <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-4 border-orange-500">🆔 ID Card</h2>

              {(farmer?.id_card_file_id || farmer?.id_card_path || farmer?.id_card_generated_at) ? (
                <div>
                  <div className="bg-green-50 border-2 border-green-600 rounded-lg p-4 mb-4">
                    <p className="text-green-800 font-bold flex items-center gap-2">
                      <span>✅</span> Generated
                    </p>
                    {farmer.id_card_generated_at && (
                      <p className="text-green-700 text-xs mt-1">{formatDate(farmer.id_card_generated_at)}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={handleViewIDCard}
                      disabled={viewLoading}
                      className={`w-full font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 ${
                        viewLoading
                          ? "bg-gray-400 cursor-not-allowed text-white"
                          : "bg-blue-600 hover:bg-blue-700 active:scale-95 text-white"
                      }`}
                    >
                      {viewLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Loading...</span>
                        </>
                      ) : (
                        <>
                          <span>👁️</span> View ID Card
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownloadIDCard}
                      className="w-full bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <span>📥</span> Download
                    </button>

                    <button
                      onClick={handleGenerateIDCard}
                      disabled={generating}
                      className={`w-full font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 ${
                        generating
                          ? "bg-gray-400 cursor-not-allowed text-white"
                          : "bg-purple-600 hover:bg-purple-700 active:scale-95 text-white"
                      }`}
                    >
                      {generating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Regenerating...</span>
                        </>
                      ) : (
                        <>
                          <span>🔄</span> Regenerate
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-4 mb-4">
                    <p className="text-yellow-800 font-bold flex items-center gap-2">
                      <span>⚠️</span> Not Generated
                    </p>
                    <p className="text-yellow-700 text-xs mt-2">Click below to create your digital ID</p>
                  </div>

                  <button
                    onClick={handleGenerateIDCard}
                    disabled={generating}
                    className={`w-full font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 ${
                      generating
                        ? "bg-gray-400 cursor-not-allowed text-white"
                        : "bg-purple-700 hover:bg-purple-800 active:scale-95 text-white"
                    }`}
                  >
                    {generating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <span>🆔</span> Generate ID Card
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* QR Info */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition">
              <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-4 border-purple-600">📱 QR Code</h2>
              <p className="text-sm text-gray-600 mb-4">
                Your ID card contains a scannable QR code for quick verification.
              </p>
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gray-100 rounded-lg border-2 border-green-600">
                  {qrError ? (
                    <div className="w-48 h-48 flex flex-col items-center justify-center text-sm text-gray-500">
                      <div className="text-4xl mb-2">📱</div>
                      <p>QR unavailable</p>
                    </div>
                  ) : qrUrl ? (
                    <img 
                      src={qrUrl} 
                      alt="QR Code" 
                      className="w-48 h-48"
                      onLoad={() => console.log('[IDCard] QR loaded')}
                      onError={(e) => {
                        console.error('[IDCard] QR failed to load');
                        setQrError(true);
                      }}
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-green-600"></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3">
                <p className="text-xs text-blue-800">
                  <strong>💡 Tip:</strong> Keep your ID card safe for agricultural support services.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerIDCard;
