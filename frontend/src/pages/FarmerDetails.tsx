// src/pages/FarmerDetails.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { farmerService } from "@/services/farmer.service";
import useAuthStore from "@/store/authStore";

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
}

export default function FarmerDetails() {
  const { farmerId } = useParams<{ farmerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const getBackPath = () => {
    if (user?.roles?.includes("FARMER")) {
      return "/farmer-dashboard";
    }
    return "/farmers";
  };

  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (farmerId) {
      loadFarmerData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId]);

  const loadFarmerData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await farmerService.getFarmer(farmerId!);
      setFarmer(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load farmer details");
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
      alert("✅ Photo uploaded successfully!");
      e.target.value = "";
      await loadFarmerData();
    } catch (err: unknown) {
      alert(getErrorMessage(err) || "Failed to upload photo");
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
      alert(`❌ File too large! Maximum size is 10MB.\nYour file: ${(file.size / (1024*1024)).toFixed(2)}MB`);
      e.target.value = "";
      return;
    }
    
    try {
      setUploading(docType);
      await farmerService.uploadDocument(farmerId!, docType, file);
      alert(`✅ ${docType.replace("_", " ")} uploaded successfully!`);
      e.target.value = "";
      await loadFarmerData();
    } catch (err: unknown) {
      alert(`❌ Upload failed: ${getErrorMessage(err)}`);
      e.target.value = "";
    } finally {
      setUploading(null);
    }
  };

  const handleGenerateIDCard = async () => {
    try {
      const response = await farmerService.generateIDCard(farmerId!);
      alert(response.message || "🎉 ID card generation started!");
      setTimeout(() => handleDownloadIDCard(), 5000);
    } catch (err: unknown) {
      alert(getErrorMessage(err) || "Failed to generate ID card");
    }
  };

  const handleDownloadIDCard = async () => {
    try {
      await farmerService.downloadIDCard(farmerId!);
      alert("✅ ID card downloaded!");
    } catch (err: unknown) {
      alert(getErrorMessage(err) || "ID card not ready yet.");
    }
  };

  const handleDeletePhoto = async () => {
    if (!confirm("Delete this photo?")) return;
    try {
      await farmerService.deletePhoto(farmerId!);
      alert("✅ Photo deleted");
      await loadFarmerData();
    } catch (err: unknown) {
      alert(getErrorMessage(err) || "Failed to delete photo");
    }
  };

  const handleDeleteDocument = async (docType: string) => {
    if (!confirm(`Delete ${docType}?`)) return;
    try {
      await farmerService.deleteDocument(farmerId!, docType);
      alert("✅ Document deleted");
      await loadFarmerData();
    } catch (err: unknown) {
      alert(getErrorMessage(err) || "Failed to delete document");
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "white" }}>
          <div style={{
            width: "60px",
            height: "60px",
            border: "5px solid rgba(255,255,255,0.3)",
            borderTop: "5px solid white",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px"
          }}></div>
          <p style={{ fontSize: "18px" }}>Loading farmer details...</p>
        </div>
      </div>
    );
  }

  if (error || !farmer) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "white" }}>
          <div style={{ fontSize: "80px", marginBottom: "20px" }}>❌</div>
          <p style={{ fontSize: "24px", marginBottom: "20px" }}>{error || "Farmer not found"}</p>
          <button
            onClick={() => navigate(getBackPath())}
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
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      {/* Header */}
      <div style={{ textAlign: "center", color: "white", paddingTop: "30px", paddingBottom: "30px" }}>
        <h1 style={{ fontSize: "2.8rem", marginBottom: "10px", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}>
          🌾 AgriManage Pro
        </h1>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 20px 20px 20px" }}>
        {/* Top Actions */}
        <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <button
            onClick={() => navigate(getBackPath())}
            style={{
              padding: "10px 20px",
              background: "white",
              color: "#667eea",
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

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={handleGenerateIDCard}
              style={{
                padding: "10px 20px",
                background: "#9333ea",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#7e22ce";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#9333ea";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              🎴 Generate ID Card
            </button>

            <button
              onClick={handleDownloadIDCard}
              style={{
                padding: "10px 20px",
                background: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#218838";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#28a745";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              ⬇️ Download ID
            </button>

            <button
              onClick={() => navigate(`/farmers/edit/${farmerId}`)}
              style={{
                padding: "10px 20px",
                background: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
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
              ✏️ Edit Farmer
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "20px" }}>
          {/* Photo Card */}
          <div style={{ background: "white", padding: "30px", borderRadius: "15px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "20px", color: "#333" }}>📸 Farmer Photo</h2>

            <div style={{ marginBottom: "20px" }}>
              {farmer.photo_path || farmer.documents?.photo ? (
                <div style={{ position: "relative" }}>
                  <img
                    src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${farmer.documents?.photo || farmer.photo_path}`}
                    alt="Farmer"
                    style={{ width: "100%", height: "350px", objectFit: "cover", borderRadius: "12px" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Ctext x="50%25" y="50%25" font-size="100" text-anchor="middle" dy=".3em"%3E👤%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <button
                    onClick={handleDeletePhoto}
                    title="Delete photo"
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
                <div style={{ width: "100%", height: "350px", background: "#f0f0f0", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "120px" }}>👤</span>
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
              style={{
                display: "block",
                textAlign: "center",
                padding: "14px",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: uploading === "photo" ? "not-allowed" : "pointer",
                background: uploading === "photo" ? "#6c757d" : "#007bff",
                color: "white",
                transition: "all 0.3s"
              }}
              onMouseOver={(e) => {
                if (uploading !== "photo") e.currentTarget.style.background = "#0056b3";
              }}
              onMouseOut={(e) => {
                if (uploading !== "photo") e.currentTarget.style.background = "#007bff";
              }}
            >
              {uploading === "photo" ? "⏳ Uploading..." : "📸 Upload / Replace Photo"}
            </label>
          </div>

          {/* Personal Info Card */}
          <div style={{ background: "white", padding: "30px", borderRadius: "15px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "20px", color: "#333" }}>👤 Personal Information</h2>

            <div style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: "1px solid #e0e0e0" }}>
              <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#667eea", marginBottom: "10px" }}>
                {farmer.personal_info?.first_name} {farmer.personal_info?.last_name}
              </h3>
              <p style={{ color: "#666", fontSize: "14px", fontFamily: "monospace", marginBottom: "10px" }}>
                🆔 {farmer.farmer_id}
              </p>
              <div>{getStatusBadge(farmer.registration_status || "registered")}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", fontSize: "14px" }}>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>📱 Primary Phone</p>
                <p style={{ color: "#333" }}>{farmer.personal_info?.phone_primary || "N/A"}</p>
              </div>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>📱 Secondary Phone</p>
                <p style={{ color: "#333" }}>{farmer.personal_info?.phone_secondary || "N/A"}</p>
              </div>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>📧 Email</p>
                <p style={{ color: "#333" }}>{farmer.personal_info?.email || "N/A"}</p>
              </div>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>🆔 NRC Number</p>
                <p style={{ color: "#333" }}>{farmer.personal_info?.nrc || farmer.nrc_number || "N/A"}</p>
              </div>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>🎂 Date of Birth</p>
                <p style={{ color: "#333" }}>{farmer.personal_info?.date_of_birth || "N/A"}</p>
              </div>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>⚧️ Gender</p>
                <p style={{ color: "#333", textTransform: "capitalize" }}>{farmer.personal_info?.gender || "N/A"}</p>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>🌍 Ethnic Group</p>
                <p style={{ color: "#333" }}>{farmer.personal_info?.ethnic_group || "N/A"}</p>
              </div>
            </div>

            {farmer.review_notes && (
              <div style={{ marginTop: "20px", padding: "15px", background: "#f8f9fa", borderRadius: "8px", borderLeft: "4px solid #667eea" }}>
                <p style={{ fontWeight: "600", color: "#333", marginBottom: "8px" }}>📝 Review Notes</p>
                <p style={{ color: "#666", fontSize: "14px", lineHeight: "1.6" }}>{farmer.review_notes}</p>
                {farmer.reviewed_by && (
                  <p style={{ color: "#999", fontSize: "12px", marginTop: "8px" }}>
                    Reviewed by: {farmer.reviewed_by}
                    {farmer.reviewed_at && ` on ${new Date(farmer.reviewed_at).toLocaleString()}`}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Address Card */}
          <div style={{ background: "white", padding: "30px", borderRadius: "15px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "20px", color: "#333" }}>📍 Address</h2>
            <div style={{ display: "grid", gap: "15px", fontSize: "14px" }}>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Province</p>
                <p style={{ color: "#333" }}>{farmer.address?.province_name || farmer.address?.province || "N/A"}</p>
              </div>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>District</p>
                <p style={{ color: "#333" }}>{farmer.address?.district_name || farmer.address?.district || "N/A"}</p>
              </div>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Chiefdom</p>
                <p style={{ color: "#333" }}>{farmer.address?.chiefdom_name || farmer.address?.chiefdom || "N/A"}</p>
              </div>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Village</p>
                <p style={{ color: "#333" }}>{farmer.address?.village || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Farm Info Card */}
          <div style={{ background: "white", padding: "30px", borderRadius: "15px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "20px", color: "#333" }}>🚜 Farm Information</h2>
            <div style={{ display: "grid", gap: "15px", fontSize: "14px" }}>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Farm Size</p>
                <p style={{ color: "#333" }}>{farmer.farm_info?.farm_size_hectares || 0} hectares</p>
              </div>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Crops Grown</p>
                <p style={{ color: "#333" }}>
                  {farmer.farm_info?.crops_grown && farmer.farm_info.crops_grown.length > 0
                    ? farmer.farm_info.crops_grown.join(", ")
                    : "N/A"}
                </p>
              </div>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Livestock</p>
                <p style={{ color: "#333" }}>
                  {(farmer.farm_info?.livestock || farmer.farm_info?.livestock_types) && 
                   (farmer.farm_info?.livestock || farmer.farm_info?.livestock_types)!.length > 0
                    ? (farmer.farm_info?.livestock || farmer.farm_info?.livestock_types)!.join(", ")
                    : "None"}
                </p>
              </div>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Irrigation</p>
                <p style={{ color: "#333" }}>{farmer.farm_info?.has_irrigation ? "Yes ✓" : "No ✗"}</p>
              </div>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Farming Experience</p>
                <p style={{ color: "#333" }}>
                  {farmer.farm_info?.farming_experience_years || farmer.farm_info?.years_farming || 0} years
                </p>
              </div>
            </div>
          </div>

          {/* Household Info Card */}
          <div style={{ background: "white", padding: "30px", borderRadius: "15px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "20px", color: "#333" }}>🏠 Household Information</h2>
            <div style={{ display: "grid", gap: "15px", fontSize: "14px" }}>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Household Size</p>
                <p style={{ color: "#333" }}>{farmer.household_info?.household_size || 0} members</p>
              </div>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Number of Dependents</p>
                <p style={{ color: "#333" }}>{farmer.household_info?.number_of_dependents || 0}</p>
              </div>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>Primary Income Source</p>
                <p style={{ color: "#333", textTransform: "capitalize" }}>
                  {farmer.household_info?.primary_income_source || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Documents Card */}
          <div style={{ background: "white", padding: "30px", borderRadius: "15px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", gridColumn: "1 / -1" }}>
            <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "20px", color: "#333" }}>📄 Documents</h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
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
    <div style={{ border: "1px solid #e0e0e0", borderRadius: "10px", padding: "20px", background: "#fafafa" }}>
      <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "15px", color: "#333" }}>{title}</h3>
      
      {docPath ? (
        <div>
          <div style={{ color: "#28a745", fontSize: "14px", fontWeight: "600", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
            ✓ Uploaded
          </div>
          <a
            href={
              docPath.startsWith('http') 
                ? docPath 
                : docPath.startsWith('/uploads')
                ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${docPath}`
                : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/${docPath}`
            }
            target="_blank"
            rel="noopener noreferrer"
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
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#0056b3";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#007bff";
            }}
          >
            👁️ View
          </a>
          
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
          <p style={{ color: "#999", fontSize: "14px", marginBottom: "15px", textAlign: "center" }}>
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
