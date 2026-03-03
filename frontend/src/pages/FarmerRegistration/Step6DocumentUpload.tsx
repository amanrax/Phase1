// src/pages/FarmerRegistration/Step6DocumentUpload.tsx — Step 6: upload supporting documents (NRC, land title, license, certificate)
import { useState } from "react";
import { farmerService } from "@/services/farmer.service";
import { useNotification } from "@/contexts/NotificationContext";
import { logger } from "@/utils/logger";

const COMPONENT = "Step6DocumentUpload";

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
  const { success, error: showError } = useNotification();
  const [documents, setDocuments] = useState<DocumentState[]>([
    { type: "nrc", label: "NRC (National Registration Card)", file: null, uploaded: false, uploading: false },
    { type: "land_title", label: "Land Title Document", file: null, uploaded: false, uploading: false },
    { type: "license", label: "Farming License", file: null, uploaded: false, uploading: false },
    { type: "certificate", label: "Certificate", file: null, uploaded: false, uploading: false },
  ]);

  const uploadedCount = documents.filter((d) => d.uploaded).length;
  const canComplete = uploadedCount > 0;

  const handleFileSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showError("File size must be less than 10MB"); return; }
    const updated = [...documents];
    updated[index] = { ...updated[index], file };
    setDocuments(updated);
  };

  const handleUpload = async (index: number) => {
    const doc = documents[index];
    if (!doc.file) return;
    const updated = [...documents];
    updated[index] = { ...updated[index], uploading: true };
    setDocuments(updated);
    try {
      await farmerService.uploadDocument(farmerId, doc.type, doc.file);
      const done = [...documents];
      done[index] = { ...done[index], uploaded: true, uploading: false, file: null };
      setDocuments(done);
      success(`${doc.label} uploaded successfully!`);
    } catch (err: any) {
      logger.error(COMPONENT, "document upload failed", { err, docType: doc.type });
      showError(err.message || `Failed to upload ${doc.label}`);
      const reset = [...documents];
      reset[index] = { ...reset[index], uploading: false };
      setDocuments(reset);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-2xl px-6 py-4 text-white">
        <h2 className="text-xl font-bold">Step 6: Upload Documents</h2>
        <p className="text-violet-100 text-sm mt-1">Upload supporting documents. At least one is required.</p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm font-semibold">
          <span className="text-gray-500 dark:text-gray-400">Documents Uploaded</span>
          <span className="text-blue-600 dark:text-blue-400">{uploadedCount} / {documents.length}</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-2 bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${(uploadedCount / documents.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Document List */}
      <div className="space-y-3">
        {documents.map((doc, index) => (
          <div
            key={doc.type}
            className={`border rounded-2xl p-4 transition-all ${doc.uploaded
              ? "border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{doc.uploaded ? "✅" : "📄"}</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{doc.label}</h3>
                {doc.file && !doc.uploaded && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {doc.file.name} ({(doc.file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              {doc.uploaded && (
                <span className="text-xs font-semibold text-green-600 dark:text-green-400 shrink-0">Uploaded &#x2713;</span>
              )}
            </div>

            {!doc.uploaded && (
              <div className="space-y-2">
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileSelect(index, e)}
                    disabled={doc.uploading}
                    className="hidden"
                    aria-label={`Upload ${doc.label}`}
                  />
                  <div className="text-center py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors">
                    {doc.file ? "📎 Change File" : "📁 Choose File"}
                  </div>
                </label>
                {doc.file && (
                  <button
                    onClick={() => handleUpload(index)}
                    disabled={doc.uploading}
                    aria-label={`Upload ${doc.label}`}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all
                      ${doc.uploading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md"}`}
                  >
                    {doc.uploading ? "Uploading..." : "Upload"}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Note */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
        <p className="text-xs text-amber-800 dark:text-amber-300">
          <strong>Note:</strong> At least one document is required to complete registration.
          Additional documents can be uploaded later from the farmer&apos;s profile page.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          aria-label="Back to previous step"
          className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          &#x2190; Back
        </button>
        <button
          onClick={onComplete}
          disabled={!canComplete}
          aria-label="Complete registration"
          className={`flex-1 py-3 px-6 rounded-xl font-semibold text-sm text-white transition-all
            ${canComplete ? "bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg" : "bg-gray-300 dark:bg-gray-600 cursor-not-allowed"}`}
        >
          {canComplete ? "✓ Complete Registration" : "Upload at least 1 document"}
        </button>
      </div>
    </div>
  );
}
