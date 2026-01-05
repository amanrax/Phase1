import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { safeNavigate } from '@/config/navigation';
import useAuthStore from "@/store/authStore";
import { farmerService } from "@/services/farmer.service";
import { useNotification } from "@/contexts/NotificationContext";
import FarmerIDCardPreview from "@/components/FarmerIDCardPreview";

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
  documents?: {
    photo?: string;
    nrc?: string;
    land_title?: string;
    license?: string;
    certificate?: string;
    nrc_file_id?: string;
    land_title_file_id?: string;
    license_file_id?: string;
    certificate_file_id?: string;
  };
  identification_documents?: Array<{
    doc_type: string;
    file_id: string;
    file_path: string;
    uploaded_at: string;
  }>;
  photo_path?: string;
  photo_file_id?: string;
  id_card_path?: string;
  id_card_file_id?: string;
  id_card_generated_at?: string;
  qr_code_path?: string;
  qr_code_file_id?: string;
  created_at?: string;
  status?: string;
  registration_status?: string;
}

const FarmerIDCard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { success: showSuccess, error: showError, info: showInfo, dismiss } = useNotification();

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
      console.log('[IDCard] Farmer data loaded:', data);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to load farmer data";
      console.error('[IDCard] Load error:', msg);
      setError(msg);
      showError(msg, 5000);
    } finally {
      setLoading(false);
    }
  };

  // Load farmer photo
  useEffect(() => {
    if (!farmer) return;

    const loadPhoto = async () => {
      try {
        console.log('[IDCard] Loading photo for:', farmer.farmer_id);
        setPhotoError(false);
        const url = await farmerService.getPhotoUrl(farmer);
        if (url) {
          setPhotoUrl(url);
          console.log('[IDCard] ✅ Photo loaded');
        } else {
          console.log('[IDCard] No photo available');
          setPhotoError(true);
        }
      } catch (error) {
        console.error('[IDCard] Failed to load photo:', error);
        setPhotoError(true);
      }
    };

    loadPhoto();

    // Cleanup on unmount
    return () => {
      if (photoUrl && photoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(photoUrl);
        console.log('[IDCard] Photo blob URL revoked');
      }
    };
  }, [farmer?.farmer_id]); // ✅ Only depend on farmer_id

  // Load QR code
  useEffect(() => {
    if (!farmer) return;

    const loadQRCode = async () => {
      try {
        console.log('[IDCard] Loading QR code for:', farmer.farmer_id);
        setQrError(false);
        const url = await farmerService.getQRCodeBlobUrl(farmer);
        if (url) {
          setQrUrl(url);
          console.log('[IDCard] ✅ QR code loaded');
        } else {
          console.log('[IDCard] No QR code available');
          setQrError(true);
        }
      } catch (error) {
        console.error('[IDCard] Failed to load QR code:', error);
        setQrError(true);
      }
    };

    loadQRCode();

    // Cleanup on unmount
    return () => {
      if (qrUrl && qrUrl.startsWith('blob:')) {
        URL.revokeObjectURL(qrUrl);
        console.log('[IDCard] QR blob URL revoked');
      }
    };
  }, [farmer?.farmer_id]); // ✅ Only depend on farmer_id

  const handleGenerateIDCard = async () => {
    if (!farmer) return;
    
    let notifId: string | undefined;
    try {
      setGenerating(true);
      setError(null);
      
      notifId = showInfo("⏳ Generating ID card...", 10000);
      console.log('[IDCard] Starting generation for:', farmer.farmer_id);
      
      const response = await farmerService.generateIDCard(farmer.farmer_id);
      console.log('[IDCard] Generation queued:', response);

      // Poll for completion
      const maxAttempts = 12;
      let attempts = 0;
      
      const poll = setInterval(async () => {
        attempts += 1;
        console.log(`[IDCard] Polling attempt ${attempts}/${maxAttempts}`);
        
        try {
          const updated = await farmerService.getFarmer(farmer.farmer_id);
          
          if (updated?.id_card_file_id || updated?.id_card_path || updated?.id_card_generated_at) {
            clearInterval(poll);
            setFarmer(updated);
            console.log('[IDCard] ✅ Generation complete!');
            if (notifId) dismiss(notifId);
            showSuccess('✅ ID card generated successfully!', 5000);
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
    
    let downloadNotifId: string | undefined;
    try {
      setError(null);
      downloadNotifId = showInfo("📥 Downloading...", 8000);
      console.log('[IDCard] Downloading for:', farmer.farmer_id);
      
      const result = await farmerService.downloadIDCard(farmer.farmer_id);
      
      if (downloadNotifId) dismiss(downloadNotifId);
      
      if (result?.savedPath) {
        showSuccess(`Saved to Downloads folder:\n${result.savedPath.split('/').pop()}`, 5000);
      } else {
        showSuccess("Downloaded to your Downloads folder", 4000);
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
    
    if (!farmer.id_card_file_id && !farmer.id_card_path && !farmer.id_card_generated_at) {
      showError('ID card not generated yet. Please generate it first.', 4000);
      return;
    }
    
    console.log('[IDCard] Opening preview modal for:', farmer.farmer_id);
    setShowPreview(true);
  };

  const handleViewDocument = (docType: string, docUrl: string | null) => {
    if (!docUrl) {
      showError('Document not available', 3000);
      return;
    }

    const titles: Record<string, string> = {
      nrc: 'NRC Document',
      land_title: 'Land Title',
      license: 'License',
      certificate: 'Certificate',
    };

    console.log(`[IDCard] Viewing ${docType}, URL:`, docUrl.substring(0, 50));
    sessionStorage.setItem('doc_view_path', docUrl);
    sessionStorage.setItem('doc_view_title', titles[docType] || 'Document');
    safeNavigate(navigate, '/document-viewer');
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
    const s = (status || farmer?.registration_status || '').toLowerCase();
    switch (s) {
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
                className="text-green-700 hover:text-green-800 font-bold text-sm transition active:scale-95"
              >
                ← BACK
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">🆔 Farmer ID Card Management</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border-l-4 border-red-500 flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Farmer Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Farmer Info Card */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 pb-3 border-b-4 border-green-700">
                📋 Farmer Information
              </h2>

              {/* Profile Photo */}
              <div className="text-center mb-6 sm:mb-8">
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-green-700 mx-auto shadow-lg bg-gray-100 flex items-center justify-center">
                  {photoError || !photoUrl ? (
                    <div className="text-5xl sm:text-6xl">👨‍🌾</div>
                  ) : (
                    <img
                      src={photoUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onLoad={() => console.log('[IDCard] Photo displayed')}
                      onError={() => {
                        console.error('[IDCard] Photo display failed');
                        setPhotoError(true);
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Farmer ID</label>
                  <p className="text-base sm:text-lg font-bold text-gray-800 mt-1 bg-gray-50 p-2 rounded border-2 border-green-700 font-mono">
                    {farmer?.farmer_id || "N/A"}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Full Name</label>
                  <p className="text-base sm:text-lg font-bold text-gray-800 mt-1">
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

                {farmer?.farm_info?.farm_size_hectares !== undefined && (
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
                    {farmer?.status || farmer?.registration_status || "Unknown"}
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

          {/* Right Column - ID Card Actions & QR */}
          <div className="space-y-4 sm:space-y-6">
            {/* ID Card Status */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 pb-2 border-b-4 border-orange-500">🆔 ID Card</h2>

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
                      className={`w-full font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base ${
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
                      className="w-full bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <span>📥</span> Download
                    </button>

                    <button
                      onClick={handleGenerateIDCard}
                      disabled={generating}
                      className={`w-full font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 text-sm ${
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
                    className={`w-full font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base ${
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

            {/* QR Code Card - Shows QR if ID card is generated */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 pb-2 border-b-4 border-purple-600">📱 QR Code</h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
                {(farmer?.id_card_file_id || farmer?.qr_code_file_id || qrUrl) 
                  ? "Your ID card contains this QR code for quick verification."
                  : "Generate your ID card to get a QR code."
                }
              </p>
              <div className="flex justify-center mb-4">
                <div className="p-3 sm:p-4 bg-gray-100 rounded-lg border-2 border-purple-600">
                  {qrUrl ? (
                    <img 
                      src={qrUrl} 
                      alt="QR Code" 
                      className="w-40 h-40 sm:w-48 sm:h-48"
                      onLoad={() => console.log('[IDCard] QR displayed')}
                      onError={() => {
                        console.error('[IDCard] QR display failed');
                        setQrError(true);
                      }}
                    />
                  ) : qrError ? (
                    <div className="w-40 h-40 sm:w-48 sm:h-48 flex flex-col items-center justify-center text-sm text-gray-500">
                      <div className="text-4xl mb-2">📱</div>
                      <p>QR unavailable</p>
                      <p className="text-xs mt-1">Generate ID card</p>
                    </div>
                  ) : (
                    <div className="w-40 h-40 sm:w-48 sm:h-48 flex flex-col items-center justify-center text-sm text-gray-500">
                      <div className="text-4xl mb-2">📱</div>
                      <p>No QR code yet</p>
                      <p className="text-xs mt-1">Generate ID card first</p>
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

      {/* ID Card Preview Modal */}
      {showPreview && farmer && (
        <FarmerIDCardPreview 
          farmer={farmer} 
          onClose={() => setShowPreview(false)} 
        />
      )}
    </div>
  );
};

export default FarmerIDCard;
