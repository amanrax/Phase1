// src/pages/FarmerRegistration/Step5PhotoUpload.tsx — Step 5: upload farmer photo after successful registration
import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { farmerService } from "@/services/farmer.service";
import { useNotification } from "@/contexts/NotificationContext";
import { logger } from "@/utils/logger";
import { useFeedback } from "@/utils/feedback";
import { checkAndRequestPermission, openAppSettings } from "@/utils/permissions";

const COMPONENT = "Step5PhotoUpload";

interface Step5Props {
  farmerId: string;
  onNext: () => void;
  onBack: () => void;
}

export default function Step5PhotoUpload({ farmerId, onNext, onBack }: Step5Props) {
  const { success, error: showError } = useNotification();
  const { triggerVibration, triggerSound } = useFeedback();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  // TC-037: permission state
  const [permDenied, setPermDenied] = useState(false);
  const [permPermanent, setPermPermanent] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  // TC-036/TC-037/TC-038: Capacitor Camera capture on native
  const handleCameraCapture = async () => {
    // TC-037: check/request camera permission once
    const { granted, permanent } = await checkAndRequestPermission("camera");
    if (!granted) {
      // TC-038: handle permanent deny
      if (permanent) { setPermPermanent(true); setPermDenied(false); }
      else { setPermDenied(true); setPermPermanent(false); }
      triggerVibration("form_error");
      return;
    }
    setPermDenied(false);
    setPermPermanent(false);
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const img = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt, // lets user pick camera or gallery
        quality: 85,
        width: 800,
        correctOrientation: true,
      });
      if (img.dataUrl) {
        setPreview(img.dataUrl);
        const res = await fetch(img.dataUrl);
        const blob = await res.blob();
        const file = new File([blob], "farmer_photo.jpg", { type: "image/jpeg" });
        setPhoto(file);
      }
    } catch (err: unknown) {
      const msg = String(err);
      if (msg.includes("cancel") || msg.includes("Cancel")) return; // user cancelled — no error
      logger.error(COMPONENT, "camera capture failed", { err });
      showError("Camera capture failed. Try selecting from gallery instead.");
      triggerVibration("form_error");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showError("Please select an image file (JPG, PNG)");
      triggerVibration("form_error"); triggerSound("error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError("File size must be less than 5MB");
      triggerVibration("form_error"); triggerSound("error");
      return;
    }
    setPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!photo) { showError("Please select a photo first"); return; }
    setUploading(true);
    try {
      await farmerService.uploadPhoto(farmerId, photo);
      setUploaded(true);
      success("Photo uploaded successfully!");
      triggerVibration("doc_approved"); triggerSound("notification");
    } catch (err: any) {
      logger.error(COMPONENT, "photo upload failed", { err });
      showError(err.message || "Failed to upload photo");
      triggerVibration("form_error"); triggerSound("error");
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => {
    if (confirm("Skip photo upload? You can add it later.")) onNext();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl px-6 py-4 text-white">
        <h2 className="text-xl font-bold">Step 5: Upload Farmer Photo</h2>
        <p className="text-blue-100 text-sm mt-1">Add a clear, front-facing photo for the farmer&apos;s profile.</p>
      </div>

      {/* Preview Area */}
      <div className="w-full h-64 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-600">
        {preview ? (
          <img src={preview} alt="Preview" className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="text-center text-gray-400 dark:text-gray-500">
            <div className="text-6xl mb-3">&#x1F4F7;</div>
            <p className="text-sm">No photo selected</p>
          </div>
        )}
      </div>

      {/* TC-038: Permanent deny — open settings prompt */}
      {permPermanent && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl p-4 text-sm text-red-700 dark:text-red-300">
          <p className="font-semibold mb-1">Camera access permanently denied.</p>
          <p className="mb-2 text-xs">Enable camera permission in your device settings to take a photo.</p>
          <button onClick={openAppSettings} className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold">
            Open Settings
          </button>
        </div>
      )}

      {/* TC-037: One-time denial warning */}
      {permDenied && !permPermanent && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300">
          Camera permission denied. Please allow camera access and try again.
        </div>
      )}

      {/* TC-036: Native camera button OR web file picker */}
      {isNative ? (
        <button
          onClick={handleCameraCapture}
          disabled={uploading || uploaded}
          aria-label="Take or choose photo"
          className={`w-full py-4 rounded-xl border-2 border-dashed font-semibold text-sm transition-colors
            ${uploaded
              ? "border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 cursor-not-allowed"
              : "border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            }`}
        >
          {uploaded ? "✓ Photo Captured" : photo ? "📷 Retake Photo" : "📷 Take / Choose Photo"}
        </button>
      ) : (
        <label className="block cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading || uploaded}
            className="hidden"
            aria-label="Choose photo to upload"
          />
          <div className={`text-center py-4 rounded-xl border-2 border-dashed font-semibold text-sm transition-colors
            ${uploaded
              ? "border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 cursor-not-allowed"
              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10"
            }`}>
            {uploaded ? "✓ Photo Uploaded" : photo ? "📷 Change Photo" : "📁 Choose Photo"}
          </div>
        </label>
      )}

      {/* Upload Button */}
      {photo && !uploaded && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          aria-label="Upload photo"
          className={`w-full py-3 rounded-xl font-semibold text-sm text-white transition-all
            ${uploading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg"}`}
        >
          {uploading ? "Uploading..." : "Upload Photo"}
        </button>
      )}

      {/* Requirements */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Requirements:</p>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>File type: JPG, PNG</li>
          <li>Maximum size: 5MB</li>
          <li>Clear, front-facing photo recommended</li>
        </ul>
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
        {uploaded ? (
          <button
            onClick={onNext}
            aria-label="Proceed to documents upload"
            className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm bg-green-600 hover:bg-green-700 text-white shadow-md transition-all"
          >
            Next: Documents &#x2192;
          </button>
        ) : (
          <button
            onClick={handleSkip}
            aria-label="Skip photo upload"
            className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm bg-amber-400 hover:bg-amber-500 text-amber-900 shadow-md transition-all"
          >
            Skip for Now &#x2192;
          </button>
        )}
      </div>
    </div>
  );
}
