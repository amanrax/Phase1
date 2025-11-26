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
      alert("Please select an image file (JPG, PNG)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
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
      alert("Please select a photo first");
      return;
    }

    setUploading(true);
    try {
      await farmerService.uploadPhoto(farmerId, photo);
      setUploaded(true);
      alert("✅ Photo uploaded successfully!");
    } catch (error: any) {
      console.error("Upload failed:", error);
      alert(error.message || "Failed to upload photo");
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
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Step 5: Upload Farmer Photo</h2>

      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Preview Area */}
        <div className="mb-6">
          <div className="w-full h-80 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-center text-gray-400">
                <div className="text-6xl mb-4">📸</div>
                <p>No photo selected</p>
              </div>
            )}
          </div>
        </div>

        {/* File Input */}
        <div className="mb-6">
          <label className="block">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading || uploaded}
              className="hidden"
              aria-label="Choose photo to upload"
            />
            <div
              className={`text-center py-4 border-2 border-dashed rounded-lg cursor-pointer transition ${
                uploaded
                  ? "bg-green-50 border-green-300 cursor-not-allowed"
                  : "hover:border-blue-500 hover:bg-blue-50"
              }`}
            >
              {uploaded ? (
                <span className="text-green-600 font-semibold">✓ Photo Uploaded</span>
              ) : (
                <span className="text-gray-700">{photo ? "📷 Change Photo" : "📁 Choose Photo"}</span>
              )}
            </div>
          </label>
        </div>

        {/* Upload Button */}
        {photo && !uploaded && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed mb-4"
            aria-label="Upload photo"
          >
            {uploading ? "⏳ Uploading..." : "⬆️ Upload Photo"}
          </button>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Requirements:</strong>
          </p>
          <ul className="text-sm text-blue-700 mt-2 space-y-1">
            <li>• File type: JPG, PNG</li>
            <li>• Maximum size: 5MB</li>
            <li>• Clear, front-facing photo recommended</li>
          </ul>
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

          {uploaded ? (
            <button
              onClick={onNext}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
              aria-label="Proceed to documents upload"
            >
              Next: Documents →
            </button>
          ) : (
            <button
              onClick={handleSkip}
              className="flex-1 bg-yellow-500 text-white py-3 rounded-lg hover:bg-yellow-600"
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
