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
      const { error } = useNotification();
      error("File size must be less than 10MB");
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

      const { success } = useNotification();
      success(`${doc.label} uploaded successfully!`);
    } catch (error: any) {
      console.error("Upload failed:", error);
      const { error: showError } = useNotification();
      showError(error.message || `Failed to upload ${doc.label}`);

      newDocuments[index] = { ...newDocuments[index], uploading: false };
      setDocuments(newDocuments);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "20px", color: "#333", borderBottom: "2px solid #667eea", paddingBottom: "10px" }}>
        📄 Step 6: Upload Documents
      </h2>

      {/* Progress */}
      <div style={{ marginBottom: "25px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#666" }}>Documents Uploaded</span>
          <span style={{ fontSize: "14px", fontWeight: "700", color: "#007bff" }}>
            {documents.filter((d) => d.uploaded).length} / {documents.length}
          </span>
        </div>
        <div style={{ width: "100%", background: "#e0e0e0", borderRadius: "20px", height: "8px", overflow: "hidden" }}>
          <div
            style={{
              background: "#007bff",
              height: "8px",
              borderRadius: "20px",
              transition: "width 0.3s",
              width: `${(documents.filter((d) => d.uploaded).length / documents.length) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Document List */}
      <div style={{ display: "grid", gap: "15px", marginBottom: "25px" }}>
        {documents.map((doc, index) => (
          <div
            key={doc.type}
            style={{
              border: "2px solid #e0e0e0",
              borderRadius: "10px",
              padding: "16px",
              background: "#fafafa",
              transition: "all 0.3s"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: doc.file && !doc.uploaded ? "10px" : "0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "28px" }}>{doc.uploaded ? "✅" : "📄"}</span>
                <div>
                  <h3 style={{ fontWeight: "600", color: "#333", fontSize: "15px" }}>{doc.label}</h3>
                  {doc.file && !doc.uploaded && (
                    <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                      {doc.file.name} ({(doc.file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              </div>

              {doc.uploaded ? (
                <span style={{ color: "#28a745", fontWeight: "600", fontSize: "14px" }}>Uploaded ✓</span>
              ) : (
                <div style={{ display: "flex", gap: "10px" }}>
                  <label style={{ flex: 1 }}>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileSelect(index, e)}
                      disabled={doc.uploading}
                      style={{ display: "none" }}
                      aria-label={`Upload ${doc.label}`}
                    />
                    <div style={{
                      textAlign: "center",
                      padding: "8px 16px",
                      border: "2px dashed #ddd",
                      borderRadius: "6px",
                      cursor: doc.uploading ? "not-allowed" : "pointer",
                      background: "white",
                      transition: "all 0.3s",
                      fontSize: "14px",
                      color: "#666"
                    }}>
                      <span>{doc.file ? "📎 Change File" : "📁 Choose File"}</span>
                    </div>
                  </label>

                  {doc.file && (
                    <button
                      onClick={() => handleUpload(index)}
                      disabled={doc.uploading}
                      style={{
                        padding: "8px 20px",
                        background: doc.uploading ? "#6c757d" : "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: doc.uploading ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                        transition: "all 0.3s"
                      }}
                      onMouseOver={(e) => !doc.uploading && (e.currentTarget.style.background = "#0056b3")}
                      onMouseOut={(e) => !doc.uploading && (e.currentTarget.style.background = "#007bff")}
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
      <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: "8px", padding: "15px", marginBottom: "25px" }}>
        <p style={{ fontSize: "13px", color: "#856404" }}>
          <strong>Note:</strong> At least one document is required to complete registration.
          You can upload additional documents later from the farmer's profile page.
        </p>
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", gap: "15px" }}>
        <button
          onClick={onBack}
          style={{
            flex: 1,
            padding: "14px",
            background: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s"
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "#5a6268"}
          onMouseOut={(e) => e.currentTarget.style.background = "#6c757d"}
          aria-label="Back to previous step"
        >
          ← Back
        </button>

        <button
          onClick={onComplete}
          disabled={!canComplete}
          style={{
            flex: 1,
            padding: "14px",
            background: canComplete ? "#28a745" : "#ccc",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: canComplete ? "pointer" : "not-allowed",
            transition: "all 0.3s"
          }}
          onMouseOver={(e) => canComplete && (e.currentTarget.style.background = "#218838")}
          onMouseOut={(e) => canComplete && (e.currentTarget.style.background = "#28a745")}
          aria-label="Complete registration"
        >
          {canComplete ? "✓ Complete Registration" : `Upload at least 1 document`}
        </button>
      </div>
    </div>
  );
}
