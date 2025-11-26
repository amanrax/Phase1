// src/pages/FarmerRegistration/Step6DocumentUpload.tsx
import { useState } from "react";
import { farmerService } from "@/services/farmer.service";

interface Step6Props {
  farmerId: string;
  onComplete: () => void;
  onBack: () => void;
}

type DocumentType = "nrc" | "land_title" | "license" | "certificate";

interface DocumentState {
  type: DocumentType;
  label: string;
  file: File | null;
  uploaded: boolean;
  uploading: boolean;
}

export default function Step6DocumentUpload({ farmerId, onComplete, onBack }: Step6Props) {
  const [documents, setDocuments] = useState<DocumentState[]>([
    { type: "nrc", label: "NRC (National Registration Card)", file: null, uploaded: false, uploading: false },
    { type: "land_title", label: "Land Title Document", file: null, uploaded: false, uploading: false },
    { type: "license", label: "Farming License", file: null, uploaded: false, uploading: false },
    { type: "certificate", label: "Certificate", file: null, uploaded: false, uploading: false },
  ]);

  const canComplete = documents.some((doc) => doc.uploaded); // At least one document uploaded

  const handleFileSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    const newDocuments = [...documents];
    newDocuments[index] = { ...newDocuments[index], file };
    setDocuments(newDocuments);
  };

  const handleUpload = async (index: number) => {
    const doc = documents[index];
    if (!doc.file) return;

    const newDocuments = [...documents];
    newDocuments[index] = { ...newDocuments[index], uploading: true };
    setDocuments(newDocuments);

    try {
      await farmerService.uploadDocument(farmerId, doc.type, doc.file);

      newDocuments[index] = { ...newDocuments[index], uploaded: true, uploading: false, file: null };
      setDocuments(newDocuments);

      alert(`✅ ${doc.label} uploaded successfully!`);
    } catch (error: any) {
      console.error("Upload failed:", error);
      alert(error.message || `Failed to upload ${doc.label}`);

      newDocuments[index] = { ...newDocuments[index], uploading: false };
      setDocuments(newDocuments);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Step 6: Upload Documents</h2>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Documents Uploaded</span>
          <span className="text-sm font-semibold text-blue-600">
            {documents.filter((d) => d.uploaded).length} / {documents.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(documents.filter((d) => d.uploaded).length / documents.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Document List */}
      <div className="space-y-4 mb-6">
        {documents.map((doc, index) => (
          <div
            key={doc.type}
            className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{doc.uploaded ? "✅" : "📄"}</span>
                <div>
                  <h3 className="font-semibold text-gray-800">{doc.label}</h3>
                  {doc.file && !doc.uploaded && (
                    <p className="text-xs text-gray-500">
                      {doc.file.name} ({(doc.file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              </div>

              {doc.uploaded ? (
                <span className="text-green-600 font-semibold text-sm">Uploaded ✓</span>
              ) : (
                <div className="flex gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileSelect(index, e)}
                      disabled={doc.uploading}
                      className="hidden"
                      aria-label={`Upload ${doc.label}`}
                    />
                    <div className="text-center py-2 border-2 border-dashed rounded cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                      <span className="text-sm text-gray-700">{doc.file ? "📎 Change File" : "📁 Choose File"}</span>
                    </div>
                  </label>

                  {doc.file && (
                    <button
                      onClick={() => handleUpload(index)}
                      disabled={doc.uploading}
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      aria-label={`Upload ${doc.label}`}
                    >
                      {doc.uploading ? "⏳" : "⬆️ Upload"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Note */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> At least one document is required to complete registration.
          You can upload additional documents later from the farmer's profile page.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600"
          aria-label="Back to previous step"
        >
          ← Back
        </button>

        <button
          onClick={onComplete}
          disabled={!canComplete}
          className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          aria-label="Complete registration"
        >
          {canComplete ? "✓ Complete Registration" : `Upload at least 1 document`}
        </button>
      </div>
    </div>
  );
}
