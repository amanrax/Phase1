// src/pages/FarmerRegistration/Step5PhotoUpload.tsx
import { useState } from "react";
import { farmerService } from "@/services/farmer.service";

interface Step5Props {
  farmerId: string;
  onNext: () => void;
  onBack: () => void;
}

export default function Step5PhotoUpload({ farmerId, onNext, onBack }: Step5Props) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      const { error } = useNotification();
      error("Please select an image file (JPG, PNG)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      const { error } = useNotification();
      error("File size must be less than 5MB");
      return;
    }

    setPhoto(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!photo) {
      const { error } = useNotification();
      error("Please select a photo first");
      return;
    }

    setUploading(true);
    try {
      await farmerService.uploadPhoto(farmerId, photo);
      setUploaded(true);
      const { success } = useNotification();
      success("Photo uploaded successfully!");
    } catch (error: any) {
      console.error("Upload failed:", error);
      const { error: showError } = useNotification();
      showError(error.message || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => {
    if (confirm("Skip photo upload? You can add it later.")) {
      onNext();
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "20px", color: "#333", borderBottom: "2px solid #667eea", paddingBottom: "10px" }}>
        📸 Step 5: Upload Farmer Photo
      </h2>

      <div style={{ background: "#fafafa", borderRadius: "10px", padding: "25px", border: "1px solid #e0e0e0" }}>
        {/* Preview Area */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ width: "100%", height: "320px", background: "#f0f0f0", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
            ) : (
              <div style={{ textAlign: "center", color: "#999" }}>
                <div style={{ fontSize: "60px", marginBottom: "15px" }}>📸</div>
                <p>No photo selected</p>
              </div>
            )}
          </div>
        </div>

        {/* File Input */}
        <div style={{ marginBottom: "20px" }}>
          <label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading || uploaded}
              style={{ display: "none" }}
              aria-label="Choose photo to upload"
            />
            <div
              style={{
                textAlign: "center",
                padding: "16px",
                border: "2px dashed " + (uploaded ? "#28a745" : "#ddd"),
                borderRadius: "10px",
                cursor: uploaded ? "not-allowed" : "pointer",
                background: uploaded ? "#d4edda" : "white",
                color: uploaded ? "#155724" : "#333",
                fontWeight: "600",
                transition: "all 0.3s"
              }}
            >
              {uploaded ? (
                <span>✓ Photo Uploaded</span>
              ) : (
                <span>{photo ? "📷 Change Photo" : "📁 Choose Photo"}</span>
              )}
            </div>
          </label>
        </div>

        {/* Upload Button */}
        {photo && !uploaded && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{
              width: "100%",
              padding: "14px",
              background: uploading ? "#6c757d" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: "600",
              cursor: uploading ? "not-allowed" : "pointer",
              marginBottom: "15px",
              transition: "all 0.3s"
            }}
            onMouseOver={(e) => !uploading && (e.currentTarget.style.background = "#0056b3")}
            onMouseOut={(e) => !uploading && (e.currentTarget.style.background = "#007bff")}
            aria-label="Upload photo"
          >
            {uploading ? "⏳ Uploading..." : "⬆️ Upload Photo"}
          </button>
        )}

        {/* Info */}
        <div style={{ background: "#e7f3ff", border: "1px solid #b3d9ff", borderRadius: "8px", padding: "15px", marginBottom: "20px" }}>
          <p style={{ fontSize: "13px", color: "#004085", fontWeight: "600", marginBottom: "8px" }}>
            <strong>Requirements:</strong>
          </p>
          <ul style={{ fontSize: "13px", color: "#004085", marginTop: "8px", paddingLeft: "20px", lineHeight: "1.8" }}>
            <li>File type: JPG, PNG</li>
            <li>Maximum size: 5MB</li>
            <li>Clear, front-facing photo recommended</li>
          </ul>
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

          {uploaded ? (
            <button
              onClick={onNext}
              style={{
                flex: 1,
                padding: "14px",
                background: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#218838"}
              onMouseOut={(e) => e.currentTarget.style.background = "#28a745"}
              aria-label="Proceed to documents upload"
            >
              Next: Documents →
            </button>
          ) : (
            <button
              onClick={handleSkip}
              style={{
                flex: 1,
                padding: "14px",
                background: "#ffc107",
                color: "#333",
                border: "none",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#e0a800"}
              onMouseOut={(e) => e.currentTarget.style.background = "#ffc107"}
              aria-label="Skip photo upload"
            >
              Skip for Now →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
