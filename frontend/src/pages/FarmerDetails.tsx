// src/pages/FarmerDetails.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { farmerService } from "@/services/farmer.service"; // Consistent import style

interface Farmer {
  farmer_id: string;
  personal_info?: {
    first_name?: string;
    last_name?: string;
    phone_primary?: string;
    email?: string;
    date_of_birth?: string;
    gender?: string;
    nrc?: string;
  };
  address?: {
    province?: string;
    district?: string;
    village?: string;
    chiefdom?: string;
  };
  farm_info?: {
    farm_size_hectares?: number;
    crops_grown?: string[];
    livestock?: string[];
    has_irrigation?: boolean;
    farming_experience_years?: number;
  };
  photo_path?: string;
  registration_status?: string;
  identification_documents?: Array<{
    doc_type: string;
    uploaded_at: string;
    file_path: string;
  }>;
  nrc_number?: string;
}

export default function FarmerDetails() {
  const { farmerId } = useParams<{ farmerId: string }>();
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    try {
      setUploading(docType);
      await farmerService.uploadDocument(farmerId!, docType, file);
      alert(`✅ ${docType.replace("_", " ")} uploaded successfully!`);
      await loadFarmerData();
    } catch (err: any) {
      console.error("Document upload failed:", err);
      alert(err.message || "Failed to upload document");
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
            onClick={() => navigate("/farmers")}
            className="text-blue-600 hover:underline"
          >
            ← Back to farmers list
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
            onClick={() => navigate("/farmers")}
            className="text-blue-600 hover:underline"
          >
            ← Back to farmers list
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
            onClick={() => navigate("/farmers")}
            className="text-blue-600 hover:underline mb-3 flex items-center gap-2"
          >
            ← Back to Farmers
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
              {farmer.photo_path ? (
                <div className="relative">
                  <img
                    src={farmer.photo_path}
                    alt="Farmer"
                    className="w-full h-80 object-cover rounded-lg"
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

            <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploading !== null}
                className="hidden"
                aria-label="Upload photo"
              />
              <div
                className={`text-center px-4 py-3 rounded-lg font-semibold cursor-pointer transition ${
                  uploading === "photo"
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {uploading === "photo" ? "⏳ Uploading..." : "📸 Upload New Photo"}
              </div>
            </label>
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
                  label="Phone"
                  value={farmer.personal_info?.phone_primary}
                />
                <InfoField label="Email" value={farmer.personal_info?.email} />
                <InfoField
                  label="Date of Birth"
                  value={farmer.personal_info?.date_of_birth}
                />
                <InfoField label="Gender" value={farmer.personal_info?.gender} capitalize />
                <InfoField label="NRC" value={farmer.personal_info?.nrc || farmer.nrc_number} />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      farmer.registration_status === "active"
                        ? "bg-green-100 text-green-700"
                        : farmer.registration_status === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {farmer.registration_status || "Active"}
                  </span>
                </div>
              </div>
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
                  value={farmer.farm_info?.farm_size_hectares ? `${farmer.farm_info.farm_size_hectares} hectares` : "N/A"}
                />
                <InfoField
                  label="Crops"
                  value={farmer.farm_info?.crops_grown?.join(", ")}
                />
                <InfoField label="Livestock" value={farmer.farm_info?.livestock_types?.join(", ") || farmer.farm_info?.livestock?.join(", ")} />
                <InfoField
                  label="Irrigation"
                  value={farmer.farm_info?.has_irrigation ? "Yes" : "No"}
                />
                <InfoField
                  label="Experience"
                  value={farmer.farm_info?.farming_experience_years ? `${farmer.farm_info.farming_experience_years} years` : farmer.farm_info?.years_farming ? `${farmer.farm_info.years_farming} years` : "N/A"}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">📄 Documents</h2>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              { type: "nrc", label: "NRC" },
              { type: "land_title", label: "Land Title" },
              { type: "license", label: "License" },
              { type: "certificate", label: "Certificate" },
            ].map(({ type, label }) => {
              const existingDoc = farmer.identification_documents?.find(
                (doc: any) => doc.doc_type === type
              );

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
                      <div className="text-xs text-gray-500">
                        {new Date(existingDoc.uploaded_at).toLocaleDateString()}
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={existingDoc.file_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center bg-blue-100 text-blue-700 py-2 rounded text-sm hover:bg-blue-200"
                        >
                          View
                        </a>
                        <button
                          onClick={() => handleDeleteDocument(type)}
                          className="px-3 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                          aria-label={`Delete ${label}`}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleDocumentUpload(e, type as any)}
                        disabled={uploading !== null}
                        className="hidden"
                        aria-label={`Upload ${label}`}
                      />
                      <div
                        className={`text-center py-3 rounded-lg text-sm font-medium cursor-pointer transition ${
                          uploading === type
                            ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {uploading === type ? "⏳ Uploading..." : "📎 Upload"}
                      </div>
                    </label>
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
