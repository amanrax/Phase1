// src/pages/FarmerDetails.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { farmerService } from "@/services/farmer.service";
import useAuthStore from "@/store/authStore";
import { useNotification } from "@/contexts/NotificationContext";

const getErrorMessage = (err: unknown): string => {
  if (typeof err === "object" && err !== null) {
    const error = err as Record<string, unknown>;
    if (error.response && typeof error.response === "object") {
      const response = error.response as Record<string, unknown>;
      if (response.data && typeof response.data === "object") {
        const data = response.data as Record<string, string>;
        return data.detail || "An error occurred";
      }
    }
    if (error.message && typeof error.message === "string") {
      return error.message;
    }
  }
  return "An error occurred";
};

interface Farmer {
  farmer_id: string;
  personal_info?: {
    first_name?: string;
    last_name?: string;
    phone_primary?: string;
    phone_secondary?: string;
    email?: string;
    date_of_birth?: string;
    gender?: string;
    nrc?: string;
    ethnic_group?: string;
  };
  address?: {
    province?: string;
    province_name?: string;
    district?: string;
    district_name?: string;
    village?: string;
    ward_name?: string;
    camp_name?: string;
    chiefdom?: string;
    chiefdom_name?: string;
  };
  farm_info?: {
    farm_size_hectares?: number;
    crops_grown?: string[];
    livestock?: string[];
    livestock_types?: string[];
    has_irrigation?: boolean;
    farming_experience_years?: number;
    years_farming?: number;
  };
  household_info?: {
    household_size?: number;
    number_of_dependents?: number;
    primary_income_source?: string;
  };
  photo_path?: string;
  registration_status?: string;
  identification_documents?: Array<{
    doc_type: string;
    uploaded_at: string;
    file_path: string;
  }>;
  nrc_number?: string;
  documents?: {
    photo?: string;
    nrc_card?: string;
    land_title?: string;
    license?: string;
    certificate?: string;
  };
  review_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export default function FarmerDetails() {
  const { farmerId } = useParams<{ farmerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { success: showSuccess, error: showError } = useNotification();

  const getBackPath = () => {
    if (user?.roles?.includes("FARMER")) {
      return "/farmer-dashboard";
    }
    return "/farmers";
  };

  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (farmerId) {
      loadFarmerData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId]);

  const loadFarmerData = async () => {
    try {
      setLoading(true);
      const data = await farmerService.getFarmer(farmerId!);
      setFarmer(data);
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err) || "Failed to load farmer details";
      showError(errorMsg, 5000);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading("photo");
      await farmerService.uploadPhoto(farmerId!, file);
      showSuccess("✓ Photo uploaded successfully!", 4000);
      e.target.value = "";
      await loadFarmerData();
    } catch (err: unknown) {
      showError(getErrorMessage(err) || "Failed to upload photo", 5000);
    } finally {
      setUploading(null);
    }
  };

  const handleDocumentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: "nrc" | "land_title" | "license" | "certificate"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      showError(`File too large! Maximum size is 10MB. Your file: ${(file.size / (1024*1024)).toFixed(2)}MB`, 5000);
      e.target.value = "";
      return;
    }
    
    try {
      setUploading(docType);
      await farmerService.uploadDocument(farmerId!, docType, file);
      showSuccess(`✓ ${docType.replace("_", " ")} uploaded successfully!`, 4000);
      e.target.value = "";
      await loadFarmerData();
    } catch (err: unknown) {
      showError(`Upload failed: ${getErrorMessage(err)}`, 5000);
      e.target.value = "";
    } finally {
      setUploading(null);
    }
  };

  const handleGenerateIDCard = async () => {
    try {
      const response = await farmerService.generateIDCard(farmerId!);
      showSuccess(response.message || "✓ ID card generation started!", 4000);
      setTimeout(() => handleDownloadIDCard(), 5000);
    } catch (err: unknown) {
      showError(getErrorMessage(err) || "Failed to generate ID card", 5000);
    }
  };

  const handleDownloadIDCard = async () => {
    try {
      await farmerService.downloadIDCard(farmerId!);
      showSuccess("✓ ID card downloaded!", 4000);
    } catch (err: unknown) {
      showError(getErrorMessage(err) || "ID card not ready yet.", 5000);
    }
  };

  const handleDeletePhoto = async () => {
    if (!confirm("Delete this photo?")) return;
    try {
      await farmerService.deletePhoto(farmerId!);
      showSuccess("✓ Photo deleted", 4000);
      await loadFarmerData();
    } catch (err: unknown) {
      showError(getErrorMessage(err) || "Failed to delete photo", 5000);
    }
  };

  const handleDeleteDocument = async (docType: string) => {
    if (!confirm(`Delete ${docType}?`)) return;
    try {
      await farmerService.deleteDocument(farmerId!, docType);
      showSuccess("✓ Document deleted", 4000);
      await loadFarmerData();
    } catch (err: unknown) {
      showError(getErrorMessage(err) || "Failed to delete document", 5000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 flex items-center justify-center" style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="text-center text-white" style={{ textAlign: "center", color: "white" }}>
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-5" style={{
            width: "60px",
            height: "60px",
            border: "5px solid rgba(255,255,255,0.3)",
            borderTop: "5px solid white",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px"
          }}></div>
          <p className="text-lg sm:text-xl" style={{ fontSize: "18px" }}>Loading farmer details...</p>
        </div>
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="text-center text-white" style={{ textAlign: "center", color: "white" }}>
          <div className="text-6xl sm:text-8xl mb-5" style={{ fontSize: "80px", marginBottom: "20px" }}>❌</div>
          <p className="text-xl sm:text-3xl mb-5" style={{ fontSize: "24px", marginBottom: "20px" }}>Farmer not found</p>
          <button
            onClick={() => navigate(getBackPath())}
            className="px-6 sm:px-8 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:shadow-lg transition-all text-base sm:text-lg"
            style={{
              padding: "12px 30px",
              background: "white",
              color: "#667eea",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.2)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; color: string; label: string }> = {
      registered: { bg: "#fff3cd", color: "#856404", label: "Registered" },
      under_review: { bg: "#d1ecf1", color: "#0c5460", label: "Under Review" },
      verified: { bg: "#d4edda", color: "#155724", label: "Verified ✓" },
      rejected: { bg: "#f8d7da", color: "#721c24", label: "Rejected ✗" },
      pending_documents: { bg: "#e7e3fc", color: "#5b21b6", label: "Pending Docs" },
    };
    const c = config[status] || config.registered;
    return (
      <span style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", background: c.bg, color: c.color, display: "inline-block" }}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div className="text-center text-white py-6 sm:py-8 px-4" style={{ textAlign: "center", color: "white", paddingTop: "30px", paddingBottom: "30px" }}>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold drop-shadow-lg mb-2" style={{ fontSize: "2.8rem", marginBottom: "10px", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}>
          🌾 Chiefdom Management Model
        </h1>
        <p className="text-sm sm:text-base opacity-90" style={{ fontSize: "16px", opacity: 0.9 }}>Farmer Profile & Documents</p>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 pb-6" style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "30px" }}>
        {/* Top Actions */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3" style={{ marginBottom: "20px" }}>
          <button
            onClick={() => navigate(getBackPath())}
            className="px-4 py-2 bg-white hover:bg-gray-50 active:scale-95 text-indigo-600 rounded-lg font-semibold text-sm transition-all shadow-md"
            style={{
              padding: "10px 20px",
              background: "white",
              color: "#5b21b6",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            ← Back
          </button>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={handleGenerateIDCard}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold text-sm sm:text-base transition-all hover:shadow-md"
              style={{
                padding: "10px 20px",
                background: "#047857",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#065f46";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#047857";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              🎴 Generate ID Card
            </button>

            <button
              onClick={handleDownloadIDCard}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm sm:text-base transition-all hover:shadow-md"
              style={{
                padding: "10px 20px",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#1d4ed8";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#2563eb";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              ⬇️ Download ID
            </button>

            <button
              onClick={() => navigate(`/farmers/edit/${farmerId}`)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm sm:text-base transition-all hover:shadow-md"
              style={{
                padding: "10px 20px",
                background: "#4f46e5",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#4338ca";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#4f46e5";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              ✏️ Edit Farmer
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "20px" }}>
          {/* Photo Card */}
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md hover:shadow-lg transition-all border-l-4 border-purple-500" style={{ background: "white", padding: "30px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", borderLeft: "4px solid #a855f7" }}>
            <h2 className="text-lg sm:text-2xl font-bold mb-6 text-gray-800" style={{ fontSize: "20px", fontWeight: "700", marginBottom: "20px", color: "#1f2937" }}>📸 Farmer Photo</h2>

            <div className="mb-6" style={{ marginBottom: "20px" }}>
              {farmer.photo_path || farmer.documents?.photo ? (
                <div className="relative" style={{ position: "relative" }}>
                  <img
                    src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${farmer.documents?.photo || farmer.photo_path}`}
                    alt="Farmer"
                    className="w-full h-64 sm:h-80 object-cover rounded-lg"
                    style={{ width: "100%", height: "350px", objectFit: "cover", borderRadius: "12px" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Ctext x="50%25" y="50%25" font-size="100" text-anchor="middle" dy=".3em"%3E👤%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <button
                    onClick={handleDeletePhoto}
                    title="Delete photo"
                    className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg transition-all"
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: "40px",
                      height: "40px",
                      fontSize: "18px",
                      cursor: "pointer",
                      transition: "all 0.3s"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "#c82333";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "#dc3545";
                    }}
                  >
                    🗑️
                  </button>
                </div>
              ) : (
                <div className="w-full h-64 sm:h-80 bg-gray-200 rounded-lg flex items-center justify-center" style={{ width: "100%", height: "350px", background: "#f0f0f0", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="text-6xl sm:text-8xl" style={{ fontSize: "120px" }}>👤</span>
                </div>
              )}
            </div>

            <input
              type="file"
              id="photo-upload"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading !== null}
              style={{ display: 'none' }}
            />
            <label
              htmlFor="photo-upload"
              className="block text-center p-3 sm:p-4 rounded-lg text-sm sm:text-base font-semibold transition-all"
              style={{
                display: "block",
                textAlign: "center",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: uploading === "photo" ? "not-allowed" : "pointer",
                background: uploading === "photo" ? "#6b7280" : "#2563eb",
                color: "white",
                transition: "all 0.3s"
              }}
              onMouseOver={(e) => {
                if (uploading !== "photo") e.currentTarget.style.background = "#1d4ed8";
              }}
              onMouseOut={(e) => {
                if (uploading !== "photo") e.currentTarget.style.background = "#2563eb";
              }}
            >
              {uploading === "photo" ? "⏳ Uploading..." : "📸 Upload / Replace Photo"}
            </label>
          </div>

          {/* Personal Info Card */}
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md hover:shadow-lg transition-all sm:col-span-2 lg:col-span-1 border-l-4 border-blue-500" style={{ background: "white", padding: "30px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", borderLeft: "4px solid #3b82f6" }}>
            <h2 className="text-lg sm:text-2xl font-bold mb-6 text-gray-800" style={{ fontSize: "20px", fontWeight: "700", marginBottom: "20px", color: "#1f2937" }}>👤 Personal Information</h2>

            <div className="mb-6 pb-6 border-b border-gray-200" style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: "1px solid #e5e7eb" }}>
              <h3 className="text-xl sm:text-2xl font-bold text-indigo-600 mb-3" style={{ fontSize: "18px", fontWeight: "700", color: "#4f46e5", marginBottom: "10px" }}>
                {farmer.personal_info?.first_name} {farmer.personal_info?.last_name}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 font-mono mb-3" style={{ color: "#666", fontSize: "14px", fontFamily: "monospace", marginBottom: "10px" }}>
                🆔 {farmer.farmer_id}
              </p>
              <div>{getStatusBadge(farmer.registration_status || "registered")}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", fontSize: "14px" }}>
              <div>
                <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>📱 Primary Phone</p>
                <p className="text-gray-800" style={{ color: "#333" }}>{farmer.personal_info?.phone_primary || "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>📱 Secondary Phone</p>
                <p className="text-gray-800" style={{ color: "#333" }}>{farmer.personal_info?.phone_secondary || "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>📧 Email</p>
                <p className="text-gray-800" style={{ color: "#333" }}>{farmer.personal_info?.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>🆔 NRC Number</p>
                <p className="text-gray-800" style={{ color: "#333" }}>{farmer.personal_info?.nrc || farmer.nrc_number || "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>🎂 Date of Birth</p>
                <p className="text-gray-800" style={{ color: "#333" }}>{farmer.personal_info?.date_of_birth || "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>⚧️ Gender</p>
                <p className="text-gray-800 capitalize" style={{ color: "#333", textTransform: "capitalize" }}>{farmer.personal_info?.gender || "N/A"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>🌍 Ethnic Group</p>
                <p className="text-gray-800" style={{ color: "#333" }}>{farmer.personal_info?.ethnic_group || "N/A"}</p>
              </div>
            </div>

            {farmer.review_notes && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border-l-4 border-indigo-500" style={{ marginTop: "20px", padding: "15px", background: "#f9fafb", borderRadius: "8px", borderLeft: "4px solid #6366f1" }}>
                <p className="font-semibold text-gray-800 mb-2" style={{ fontWeight: "600", color: "#333", marginBottom: "8px" }}>📝 Review Notes</p>
                <p className="text-gray-600 text-sm leading-relaxed" style={{ color: "#666", fontSize: "14px", lineHeight: "1.6" }}>{farmer.review_notes}</p>
                {farmer.reviewed_by && (
                  <p className="text-gray-500 text-xs mt-2" style={{ color: "#999", fontSize: "12px", marginTop: "8px" }}>
                    Reviewed by: {farmer.reviewed_by}
                    {farmer.reviewed_at && ` on ${new Date(farmer.reviewed_at).toLocaleString()}`}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Address Card */}
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md hover:shadow-lg transition-all border-l-4 border-green-500" style={{ background: "white", padding: "30px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", borderLeft: "4px solid #22c55e" }}>
            <h2 className="text-lg sm:text-2xl font-bold mb-6 text-gray-800" style={{ fontSize: "20px", fontWeight: "700", marginBottom: "20px", color: "#1f2937" }}>📍 Address</h2>
            <div className="grid gap-4 text-sm" style={{ display: "grid", gap: "15px", fontSize: "14px" }}>
              <div>
                <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Province</p>
                <p className="text-gray-800" style={{ color: "#333" }}>{farmer.address?.province_name || farmer.address?.province || "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>District</p>
                <p className="text-gray-800" style={{ color: "#333" }}>{farmer.address?.district_name || farmer.address?.district || "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Chiefdom</p>
                <p className="text-gray-800" style={{ color: "#333" }}>{farmer.address?.chiefdom_name || farmer.address?.chiefdom || "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Village</p>
                <p className="text-gray-800" style={{ color: "#333" }}>{farmer.address?.village || "N/A"}</p>
              </div>
              {farmer.address?.ward_name && (
                <div>
                  <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Ward</p>
                  <p className="text-gray-800" style={{ color: "#333" }}>{farmer.address.ward_name}</p>
                </div>
              )}
              {farmer.address?.camp_name && (
                <div>
                  <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Camp</p>
                  <p className="text-gray-800" style={{ color: "#333" }}>{farmer.address.camp_name}</p>
                </div>
              )}
            </div>

            {/* Metadata Section */}
            {(farmer.created_at || farmer.created_by) && (
              <div className="mt-6 pt-6 border-t border-gray-200" style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #e0e0e0" }}>
                <h3 className="text-sm font-bold text-gray-700 uppercase mb-3" style={{ fontSize: "12px", fontWeight: "700", color: "#666", marginBottom: "10px" }}>📋 Registration Info</h3>
                <div className="grid grid-cols-1 gap-3 text-xs" style={{ display: "grid", gap: "10px", fontSize: "12px" }}>
                  {farmer.created_at && (
                    <div>
                      <p className="text-gray-600 font-semibold" style={{ color: "#666", fontWeight: "600" }}>Registered On</p>
                      <p className="text-gray-800" style={{ color: "#333" }}>
                        {new Date(farmer.created_at).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  {farmer.created_by && (
                    <div>
                      <p className="text-gray-600 font-semibold" style={{ color: "#666", fontWeight: "600" }}>Registered By</p>
                      <p className="text-gray-800" style={{ color: "#333" }}>{farmer.created_by}</p>
                    </div>
                  )}
                  {farmer.updated_at && (
                    <div>
                      <p className="text-gray-600 font-semibold" style={{ color: "#666", fontWeight: "600" }}>Last Updated</p>
                      <p className="text-gray-800" style={{ color: "#333" }}>
                        {new Date(farmer.updated_at).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Farm Info Card */}
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md hover:shadow-lg transition-all border-l-4 border-emerald-500" style={{ background: "white", padding: "30px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", borderLeft: "4px solid #10b981" }}>
            <h2 className="text-lg sm:text-2xl font-bold mb-6 text-gray-800" style={{ fontSize: "20px", fontWeight: "700", marginBottom: "20px", color: "#1f2937" }}>🚜 Farm Information</h2>
            <div className="grid gap-4 text-sm" style={{ display: "grid", gap: "15px", fontSize: "14px" }}>
              <div>
                <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Farm Size</p>
                <p className="text-gray-800" style={{ color: "#333" }}>{farmer.farm_info?.farm_size_hectares || 0} hectares</p>
              </div>
              <div>
                <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Crops Grown</p>
                <p className="text-gray-800" style={{ color: "#333" }}>
                  {farmer.farm_info?.crops_grown && farmer.farm_info.crops_grown.length > 0
                    ? farmer.farm_info.crops_grown.join(", ")
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Livestock</p>
                <p className="text-gray-800" style={{ color: "#333" }}>
                  {(farmer.farm_info?.livestock || farmer.farm_info?.livestock_types) && 
                   (farmer.farm_info?.livestock || farmer.farm_info?.livestock_types)!.length > 0
                    ? (farmer.farm_info?.livestock || farmer.farm_info?.livestock_types)!.join(", ")
                    : "None"}
                </p>
              </div>
              <div>
                <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Irrigation</p>
                <p className="text-gray-800" style={{ color: "#333" }}>{farmer.farm_info?.has_irrigation ? "Yes ✓" : "No ✗"}</p>
              </div>
              <div>
                <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Farming Experience</p>
                <p className="text-gray-800" style={{ color: "#333" }}>
                  {farmer.farm_info?.farming_experience_years || farmer.farm_info?.years_farming || 0} years
                </p>
              </div>
            </div>
          </div>

          {/* Household Info Card */}
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md hover:shadow-lg transition-all border-l-4 border-orange-500" style={{ background: "white", padding: "30px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", borderLeft: "4px solid #f97316" }}>
            <h2 className="text-lg sm:text-2xl font-bold mb-6 text-gray-800" style={{ fontSize: "20px", fontWeight: "700", marginBottom: "20px", color: "#1f2937" }}>🏠 Household Information</h2>
            <div className="grid gap-4 text-sm" style={{ display: "grid", gap: "15px", fontSize: "14px" }}>
              <div>
                <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Household Size</p>
                <p className="text-gray-800" style={{ color: "#333" }}>{farmer.household_info?.household_size || 0} members</p>
              </div>
              <div>
                <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Number of Dependents</p>
                <p className="text-gray-800" style={{ color: "#333" }}>{farmer.household_info?.number_of_dependents || 0}</p>
              </div>
              <div>
                <p className="text-gray-600 font-semibold mb-2" style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Primary Income Source</p>
                <p className="text-gray-800 capitalize" style={{ color: "#333", textTransform: "capitalize" }}>
                  {farmer.household_info?.primary_income_source || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Documents Card */}
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md hover:shadow-lg transition-all lg:col-span-3 border-l-4 border-red-500" style={{ background: "white", padding: "30px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", gridColumn: "1 / -1", borderLeft: "4px solid #ef4444" }}>
            <h2 className="text-lg sm:text-2xl font-bold mb-6 text-gray-800" style={{ fontSize: "20px", fontWeight: "700", marginBottom: "20px", color: "#1f2937" }}>📄 Documents</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
              {/* NRC Card */}
              <DocumentSection
                title="NRC Card"
                docType="nrc"
                docPath={
                  farmer.documents?.nrc_card || 
                  farmer.identification_documents?.find((doc: {doc_type: string}) => doc.doc_type === "nrc")?.file_path
                }
                uploading={uploading}
                onUpload={handleDocumentUpload}
                onDelete={handleDeleteDocument}
              />

              {/* Land Title */}
              <DocumentSection
                title="Land Title"
                docType="land_title"
                docPath={
                  farmer.documents?.land_title || 
                  farmer.identification_documents?.find((doc: {doc_type: string}) => doc.doc_type === "land_title")?.file_path
                }
                uploading={uploading}
                onUpload={handleDocumentUpload}
                onDelete={handleDeleteDocument}
              />

              {/* Farming License */}
              <DocumentSection
                title="Farming License"
                docType="license"
                docPath={
                  farmer.documents?.license || 
                  farmer.identification_documents?.find((doc: {doc_type: string}) => doc.doc_type === "license")?.file_path
                }
                uploading={uploading}
                onUpload={handleDocumentUpload}
                onDelete={handleDeleteDocument}
              />

              {/* Certificate */}
              <DocumentSection
                title="Certificate"
                docType="certificate"
                docPath={
                  farmer.documents?.certificate || 
                  farmer.identification_documents?.find((doc: {doc_type: string}) => doc.doc_type === "certificate")?.file_path
                }
                uploading={uploading}
                onUpload={handleDocumentUpload}
                onDelete={handleDeleteDocument}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

interface DocumentSectionProps {
  title: string;
  docType: "nrc" | "land_title" | "license" | "certificate";
  docPath?: string;
  uploading: string | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, docType: "nrc" | "land_title" | "license" | "certificate") => void;
  onDelete: (docType: string) => void;
}

function DocumentSection({ title, docType, docPath, uploading, onUpload, onDelete }: DocumentSectionProps) {
  const uploadInputId = `doc-upload-${docType}`;
  const replaceInputId = `doc-replace-${docType}`;
  const isUploading = uploading === docType;

  return (
    <div className="border border-gray-300 rounded-lg p-4 sm:p-6 bg-gray-50 hover:shadow-md transition-shadow" style={{ border: "1px solid #e0e0e0", borderRadius: "10px", padding: "20px", background: "#fafafa" }}>
      <h3 className="text-base sm:text-lg font-bold mb-4 text-gray-800" style={{ fontSize: "16px", fontWeight: "700", marginBottom: "15px", color: "#333" }}>{title}</h3>
      
      {docPath ? (
        <div>
          <div className="text-green-600 text-sm sm:text-base font-semibold mb-3 flex items-center gap-2" style={{ color: "#28a745", fontSize: "14px", fontWeight: "600", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
            ✓ Uploaded
          </div>
          <button
            onClick={() => {
              // Store the document path and navigate into the in-app document viewer
              try {
                sessionStorage.setItem('doc_view_path', docPath);
              } catch (e) {
                console.warn('Failed to store doc path', e);
              }
              window.location.hash = '#/document-view';
            }}
            className="w-full block p-2 sm:p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg mb-3 text-sm text-center font-semibold transition-all"
            style={{
              display: "block",
              padding: "10px",
              background: "#007bff",
              color: "white",
              textDecoration: "none",
              borderRadius: "6px",
              marginBottom: "10px",
              fontSize: "14px",
              textAlign: "center",
              fontWeight: "600",
              transition: "all 0.3s"
            }}
          >
            👁️ View
          </button>
          
          {/* Replace button */}
          <input
            type="file"
            id={replaceInputId}
            accept="image/*,.pdf"
            onChange={(e) => onUpload(e, docType)}
            disabled={uploading !== null}
            style={{ display: 'none' }}
          />
          <label
            htmlFor={replaceInputId}
            className="block p-2 sm:p-3 rounded-lg text-sm text-center font-semibold transition-all mb-3"
            style={{
              display: "block",
              padding: "10px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "600",
              textAlign: "center",
              cursor: uploading !== null ? "not-allowed" : "pointer",
              background: isUploading ? "#6c757d" : "#fd7e14",
              color: "white",
              transition: "all 0.3s",
              marginBottom: "10px"
            }}
            onMouseOver={(e) => {
              if (uploading === null) e.currentTarget.style.background = "#e8590c";
            }}
            onMouseOut={(e) => {
              if (!isUploading && uploading === null) e.currentTarget.style.background = "#fd7e14";
            }}
          >
            {isUploading ? "⏳ Replacing..." : "🔄 Replace"}
          </label>
          
          <button
            onClick={() => onDelete(docType)}
            className="w-full p-2 sm:p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-all"
            style={{
              width: "100%",
              padding: "10px",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#c82333";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#dc3545";
            }}
          >
            🗑️ Delete
          </button>
        </div>
      ) : (
        <div>
          <p className="text-gray-500 text-xs sm:text-sm mb-4 text-center" style={{ color: "#999", fontSize: "14px", marginBottom: "15px", textAlign: "center" }}>
            No document uploaded
          </p>
          <input
            type="file"
            id={uploadInputId}
            accept="image/*,.pdf"
            onChange={(e) => onUpload(e, docType)}
            disabled={uploading !== null}
            style={{ display: 'none' }}
          />
          <label
            htmlFor={uploadInputId}
            className="block p-3 sm:p-4 rounded-lg text-sm text-center font-semibold transition-all"
            style={{
              display: "block",
              padding: "12px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              textAlign: "center",
              cursor: uploading !== null ? "not-allowed" : "pointer",
              background: isUploading ? "#6c757d" : "#007bff",
              color: "white",
              transition: "all 0.3s"
            }}
            onMouseOver={(e) => {
              if (uploading === null) e.currentTarget.style.background = "#0056b3";
            }}
            onMouseOut={(e) => {
              if (!isUploading && uploading === null) e.currentTarget.style.background = "#007bff";
            }}
          >
            {isUploading ? "⏳ Uploading..." : "📎 Choose File"}
          </label>
        </div>
      )}
    </div>
  );
}
