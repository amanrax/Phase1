// src/pages/FarmerDetails.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { farmerService } from "@/services/farmer.service";
import useAuthStore from "@/store/authStore";

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

  // Determine back navigation based on user role
  const getBackPath = () => {
    if (user?.roles?.includes("FARMER")) {
      return "/farmer-dashboard";
    }
    return "/farmers"; // Admin/Operator go to farmers list
  };

  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
      registered: { color: "#9CA3AF", bg: "#F3F4F6", label: "Registered" },
      under_review: { color: "#F59E0B", bg: "#FEF3C7", label: "Under Review" },
      verified: { color: "#10B981", bg: "#D1FAE5", label: "Verified ✓" },
      rejected: { color: "#EF4444", bg: "#FEE2E2", label: "Rejected ✗" },
      pending_documents: { color: "#8B5CF6", bg: "#EDE9FE", label: "Pending Docs" },
    };

    const config = statusConfig[status] || statusConfig.registered;

    return (
      <span
        style={{
          padding: "5px 10px",
          borderRadius: "5px",
          color: config.color,
          backgroundColor: config.bg,
          fontWeight: "bold",
          fontSize: "12px",
          display: "inline-block"
        }}
      >
        {config.label}
      </span>
    );
  };

  useEffect(() => {
    if (farmerId) {
      loadFarmerData();
    }
  }, [farmerId]);

  const loadFarmerData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await farmerService.getFarmer(farmerId!);
      
      if (import.meta.env.DEV) {
        console.log("Farmer data loaded:", data);
      }
      
      setFarmer(data);
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error("Failed to load farmer:", err);
      }
      setError(err.response?.data?.detail || "Failed to load farmer details");
    } finally {
      setLoading(false);
    }
  };

  // Photo upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading("photo");
      await farmerService.uploadPhoto(farmerId!, file);
      alert("✅ Photo uploaded successfully!");
      // Reset input
      e.target.value = "";
      // Reload farmer data to show new photo
      await loadFarmerData();
    } catch (err: any) {
      console.error("Photo upload failed:", err);
      alert(err.message || "Failed to upload photo");
    } finally {
      setUploading(null);
    }
  };

  // Document upload handler
  const handleDocumentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: "nrc" | "land_title" | "license" | "certificate"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Client-side file size validation (10MB limit due to Codespaces proxy)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      alert(`❌ File too large! Maximum size is ${MAX_FILE_SIZE / (1024*1024)}MB.\nYour file: ${(file.size / (1024*1024)).toFixed(2)}MB`);
      e.target.value = ""; // Reset input
      return;
    }
    
    try {
      setUploading(docType);
      await farmerService.uploadDocument(farmerId!, docType, file);
      alert(`✅ ${docType.replace("_", " ")} uploaded successfully!`);
      // Reset input
      e.target.value = "";
      // Reload farmer data to show new document
      await loadFarmerData();
    } catch (err: any) {
      console.error("Document upload failed:", err);
      const errorMsg = err.response?.data?.detail || err.message || "Failed to upload document";
      alert(`❌ Upload failed: ${errorMsg}`);
      e.target.value = ""; // Reset input on error too
    } finally {
      setUploading(null);
    }
  };

  // ID Card generation + download handlers
  const handleGenerateIDCard = async () => {
    try {
      const response = await farmerService.generateIDCard(farmerId!);
      alert(response.message || "🎉 ID card generation started! The download will start in 5 seconds.");

      setTimeout(() => {
        handleDownloadIDCard();
      }, 5000); // 5 seconds
    } catch (err: any) {
      console.error("ID card generation failed:", err);
      alert(err.response?.data?.detail || "Failed to generate ID card");
    }
  };

  const handleDownloadIDCard = async () => {
    try {
      await farmerService.downloadIDCard(farmerId!);
      alert("✅ ID card downloaded!");
    } catch (err: any) {
      console.error("Download failed:", err);
      alert(err.response?.data?.detail || "ID card not ready yet. Please try again in a moment.");
    }
  };

  // Photo/document deletion handlers
  const handleDeletePhoto = async () => {
    if (!confirm("Delete this photo?")) return;
    try {
      await farmerService.deletePhoto(farmerId!);
      alert("✅ Photo deleted");
      await loadFarmerData();
    } catch (err: any) {
      alert(err.message || "Failed to delete photo");
    }
  };

  const handleDeleteDocument = async (docType: string) => {
    if (!confirm(`Delete ${docType}?`)) return;
    try {
      await farmerService.deleteDocument(farmerId!, docType);
      alert("✅ Document deleted");
      await loadFarmerData();
    } catch (err: any) {
      alert(err.message || "Failed to delete document");
    }
  };

  // Render states
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading farmer details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">❌ {error}</p>
          <button
            onClick={() => navigate(getBackPath())}
            className="text-blue-600 hover:underline"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">Farmer not found</p>
          <button
            onClick={() => navigate(getBackPath())}
            className="text-blue-600 hover:underline"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(getBackPath())}
            className="text-blue-600 hover:underline mb-3 flex items-center gap-2"
          >
            ← Back
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {farmer.personal_info?.first_name} {farmer.personal_info?.last_name}
              </h1>
              <p className="text-gray-600">ID: {farmer.farmer_id}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleGenerateIDCard}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
              >
                🎴 Generate ID Card
              </button>
              <button
                onClick={handleDownloadIDCard}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                ⬇️ Download ID
              </button>
              <button
                onClick={() => navigate(`/farmers/edit/${farmerId}`)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                ✏️ Edit
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Photo */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">📸 Photo</h2>

            <div className="mb-4">
              {farmer.photo_path || farmer.documents?.photo ? (
                <div className="relative">
                  <img
                    src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${farmer.documents?.photo || farmer.photo_path}`}
                    alt="Farmer"
                    className="w-full h-80 object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Ctext x="50%25" y="50%25" font-size="100" text-anchor="middle" dy=".3em"%3E👤%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <button
                    onClick={handleDeletePhoto}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                    title="Delete photo"
                    aria-label="Delete photo"
                  >
                    🗑️
                  </button>
                </div>
              ) : (
                <div className="w-full h-80 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-8xl">👤</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <input
                type="file"
                id="photo-upload"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploading !== null}
                style={{ display: 'none' }}
                aria-label="Upload photo"
              />
              <label
                htmlFor="photo-upload"
                className={`block text-center px-4 py-3 rounded-lg font-semibold cursor-pointer transition ${
                  uploading === "photo"
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {uploading === "photo" ? "⏳ Uploading..." : "📸 Upload / Replace Photo"}
              </label>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Info Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800">👤 Personal Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <InfoField
                  label="First Name"
                  value={farmer.personal_info?.first_name}
                />
                <InfoField label="Last Name" value={farmer.personal_info?.last_name} />
                <InfoField
                  label="Primary Phone"
                  value={farmer.personal_info?.phone_primary}
                />
                <InfoField
                  label="Secondary Phone"
                  value={farmer.personal_info?.phone_secondary}
                />
                <InfoField label="Email" value={farmer.personal_info?.email} />
                <InfoField label="NRC" value={farmer.personal_info?.nrc || farmer.nrc_number} />
                <InfoField
                  label="Date of Birth"
                  value={farmer.personal_info?.date_of_birth}
                />
                <InfoField label="Gender" value={farmer.personal_info?.gender} capitalize />
                <InfoField
                  label="Ethnic Group"
                  value={farmer.personal_info?.ethnic_group}
                />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Registration Status</p>
                  {getStatusBadge(farmer.registration_status || "registered")}
                </div>
              </div>
              
              {/* Review Information */}
              {farmer.review_notes && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700 mb-2">📝 Review Notes</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{farmer.review_notes}</p>
                  {farmer.reviewed_by && (
                    <p className="text-xs text-gray-500 mt-2">
                      Reviewed by: {farmer.reviewed_by}
                      {farmer.reviewed_at && ` on ${new Date(farmer.reviewed_at).toLocaleString()}`}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Address Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800">📍 Address</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <InfoField label="Province" value={farmer.address?.province_name || farmer.address?.province} />
                <InfoField label="District" value={farmer.address?.district_name || farmer.address?.district} />
                <InfoField label="Village" value={farmer.address?.village} />
                <InfoField label="Chiefdom" value={farmer.address?.chiefdom_name || farmer.address?.chiefdom} />
              </div>
            </div>

            {/* Farm Info Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800">🌾 Farm Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <InfoField
                  label="Farm Size"
                  value={farmer.farm_info?.farm_size_hectares ? `${farmer.farm_info.farm_size_hectares} hectares` : undefined}
                />
                <InfoField
                  label="Farming Experience"
                  value={farmer.farm_info?.farming_experience_years ? `${farmer.farm_info.farming_experience_years} years` : farmer.farm_info?.years_farming ? `${farmer.farm_info.years_farming} years` : undefined}
                />
                <InfoField
                  label="Crops Grown"
                  value={farmer.farm_info?.crops_grown?.join(", ")}
                />
                <InfoField label="Livestock" value={farmer.farm_info?.livestock_types?.join(", ") || farmer.farm_info?.livestock?.join(", ")} />
                <InfoField
                  label="Irrigation System"
                  value={farmer.farm_info?.has_irrigation ? "Yes" : "No"}
                />
              </div>
            </div>

            {/* Household Info Card */}
            {farmer.household_info && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-800">🏠 Household Information</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <InfoField
                    label="Household Size"
                    value={farmer.household_info?.household_size ? `${farmer.household_info.household_size} people` : undefined}
                  />
                  <InfoField
                    label="Number of Dependents"
                    value={farmer.household_info?.number_of_dependents?.toString()}
                  />
                  <InfoField
                    label="Primary Income Source"
                    value={farmer.household_info?.primary_income_source}
                    capitalize
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Documents Section */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">📄 Documents</h2>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              { type: "nrc", label: "NRC", docKey: "nrc_card" },
              { type: "land_title", label: "Land Title", docKey: "land_title" },
              { type: "license", label: "License", docKey: "license" },
              { type: "certificate", label: "Certificate", docKey: "certificate" },
            ].map(({ type, label, docKey }) => {
              // Check both identification_documents array and documents.* fields
              const existingDoc = farmer.identification_documents?.find(
                (doc: any) => doc.doc_type === type
              ) || (farmer.documents?.[docKey] ? { doc_type: type, file_path: farmer.documents[docKey] } : null);

              // Debug logging
              if (import.meta.env.DEV && type === "nrc") {
                console.log("NRC Document Detection:", {
                  identification_documents: farmer.identification_documents,
                  documents: farmer.documents,
                  existingDoc
                });
              }

              return (
                <div
                  key={type}
                  className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
                >
                  <h3 className="font-semibold mb-3 text-gray-800">{label}</h3>

                  {existingDoc ? (
                    <div className="space-y-2">
                      <div className="text-green-600 text-sm font-medium flex items-center gap-2">
                        ✓ Uploaded
                      </div>
                      {existingDoc.uploaded_at && (
                        <div className="text-xs text-gray-500">
                          {new Date(existingDoc.uploaded_at).toLocaleDateString()}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <a
                          href={
                            existingDoc.file_path.startsWith('http') 
                              ? existingDoc.file_path 
                              : existingDoc.file_path.startsWith('/uploads')
                              ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${existingDoc.file_path}`
                              : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/${existingDoc.file_path}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 font-semibold"
                        >
                          👁️ View
                        </a>
                      </div>
                      {/* Replace button */}
                      <div>
                        <input
                          type="file"
                          id={`doc-replace-${type}`}
                          accept="image/*,.pdf"
                          onChange={(e) => handleDocumentUpload(e, type as any)}
                          disabled={uploading !== null}
                          style={{ display: 'none' }}
                          aria-label={`Replace ${label}`}
                        />
                        <label
                          htmlFor={`doc-replace-${type}`}
                          className={`block text-center py-2 rounded text-sm font-semibold cursor-pointer transition ${
                            uploading === type
                              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                              : "bg-orange-600 text-white hover:bg-orange-700"
                          }`}
                        >
                          {uploading === type ? "⏳ Replacing..." : "🔄 Replace"}
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="file"
                        id={`doc-upload-${type}`}
                        accept="image/*,.pdf"
                        onChange={(e) => handleDocumentUpload(e, type as any)}
                        disabled={uploading !== null}
                        style={{ display: 'none' }}
                        aria-label={`Upload ${label}`}
                      />
                      <label
                        htmlFor={`doc-upload-${type}`}
                        className={`block text-center py-3 rounded-lg text-sm font-semibold cursor-pointer transition ${
                          uploading === type
                            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {uploading === type ? "⏳ Uploading..." : "📎 Choose File"}
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* QR Code Section */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 text-center text-gray-800">🔲 QR Code</h2>
          <div className="flex justify-center">
            <div className="p-4 bg-gray-100 rounded-lg">
              <img
                src={farmerService.getQRCode(farmerId!)}
                alt="QR Code"
                className="w-48 h-48"
              />
            </div>
          </div>
          <p className="text-center text-sm text-gray-600 mt-4">
            Scan this QR code for quick farmer identification
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 🧩 HELPER COMPONENT
// ============================================
function InfoField({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value?: string | number;
  capitalize?: boolean;
}) {
  return (
    <div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`font-semibold text-gray-900 ${capitalize ? "capitalize" : ""}`}>
        {value || "N/A"}
      </p>
    </div>
  );
}
