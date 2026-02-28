// src/pages/FarmerDetails.tsx
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BackButton from "@/components/BackButton";
import { farmerService } from "@/services/farmer.service";
import { useNotification } from "@/contexts/NotificationContext";
import { logger } from "@/utils/logger";

const COMPONENT = "FarmerDetails";

// ─── helpers ───────────────────────────────────────────────────────────────────
const getErrorMessage = (err: unknown): string => {
  if (typeof err === "object" && err !== null) {
    const e = err as Record<string, unknown>;
    const status = (e.response as Record<string, unknown>)?.status as number | undefined;
    if (status === 401) return "Session expired. Please log in again.";
    if (status === 403) return "You do not have permission to perform this action.";
    if (status === 404) return "Record not found.";
    if (status === 413) return "File is too large. Maximum allowed size is 10 MB.";
    if (status && status >= 500) return "Server error. Please try again later.";
    const detail = ((e.response as Record<string, unknown>)?.data as Record<string, string>)?.detail;
    if (detail) return detail;
    if (typeof e.message === "string") return e.message;
  }
  return "An unexpected error occurred.";
};

// ─── types ─────────────────────────────────────────────────────────────────────
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
  photo_file_id?: string;
  registration_status?: string;
  identification_documents?: Array<{
    doc_type: string;
    uploaded_at: string;
    file_path: string;
  }>;
  nrc_number?: string;
  documents?: {
    photo?: string;
    nrc?: string;
    nrc_card?: string;
    land_title?: string;
    license?: string;
    certificate?: string;
    nrc_file_id?: string;
    land_title_file_id?: string;
    license_file_id?: string;
    certificate_file_id?: string;
  };
  review_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

// ─── status badge ──────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; cls: string }> = {
  registered:        { label: "Registered",     cls: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300" },
  under_review:      { label: "Under Review",   cls: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300" },
  verified:          { label: "Verified \u2713",     cls: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300" },
  rejected:          { label: "Rejected \u2717",     cls: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300" },
  pending_documents: { label: "Pending Docs",   cls: "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300" },
  pending:           { label: "Pending",         cls: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" },
  submitted:         { label: "Submitted",       cls: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300" },
  inactive:          { label: "Inactive",        cls: "bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400" },
};

const StatusBadge = ({ status }: { status?: string }) => {
  if (!status) return null;
  const meta = STATUS_META[status] ?? { label: status, cls: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${meta.cls}`}>
      {meta.label}
    </span>
  );
};

// ─── info row helper ───────────────────────────────────────────────────────────
const InfoRow = ({ label, value }: { label: string; value?: string | number | boolean | null }) => {
  if (value === undefined || value === null || value === "") return null;
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return (
    <div className="py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 block">{label}</span>
      <span className="text-sm font-medium text-gray-800 dark:text-gray-100 mt-0.5 block">{display}</span>
    </div>
  );
};

// ─── document section sub-component ────────────────────────────────────────────
interface DocSectionProps {
  label: string;
  docType: "nrc" | "land_title" | "license" | "certificate";
  docUrl: string | null;
  uploading: string | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, docType: "nrc" | "land_title" | "license" | "certificate") => void;
  onDelete: (docType: string) => void;
}

const DocumentSection = ({ label, docType, docUrl, uploading, onUpload, onDelete }: DocSectionProps) => {
  const isUploading = uploading === docType;
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</span>
        {docUrl ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Uploaded
          </span>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-600">No file</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {docUrl && (
          <a
            href={docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            View
          </a>
        )}
        <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${isUploading ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed" : docUrl ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/40" : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40"}`}>
          {isUploading ? (
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          )}
          {isUploading ? "Uploading..." : docUrl ? "Replace" : "Upload"}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => onUpload(e, docType)} disabled={isUploading} className="hidden" />
        </label>
        {docUrl && (
          <button
            onClick={() => onDelete(docType)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/40 text-xs font-semibold rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

// ─── confirm dialog ────────────────────────────────────────────────────────────
const ConfirmDialog = ({ state, onCancel }: { state: ConfirmState; onCancel: () => void }) => {
  if (!state.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full z-10">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">{state.title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{state.message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            Cancel
          </button>
          <button onClick={() => { state.onConfirm(); onCancel(); }} className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── main component ─────────────────────────────────────────────────────────────
export default function FarmerDetails() {
  const { farmerId } = useParams<{ farmerId: string }>();
  const navigate = useNavigate();
  const { success: showSuccess, error: showError, info: showInfo } = useNotification();
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string | null>>({
    nrc: null, land_title: null, license: null, certificate: null,
  });
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, title: "", message: "", onConfirm: () => {} });

  // ─── load farmer ──────────────────────────────────────────────────────────────
  const loadFarmerData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await farmerService.getFarmer(farmerId!);
      setFarmer(data);
      logger.info(COMPONENT, "loadFarmerData success", { farmer_id: data.farmer_id });
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      logger.error(COMPONENT, "loadFarmerData failed", { msg, err });
      showError(msg, 5000);
    } finally {
      setLoading(false);
    }
  }, [farmerId]);

  useEffect(() => {
    if (farmerId) loadFarmerData();
  }, [farmerId, loadFarmerData]);

  // ─── load photo ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!farmer) return;
    const loadPhoto = async () => {
      logger.info(COMPONENT, "loadPhoto", { farmer_id: farmer.farmer_id });
      try {
        setPhotoError(false);
        const url = await farmerService.getPhotoUrl(farmer);
        if (url) {
          setPhotoUrl(url);
          logger.info(COMPONENT, "loadPhoto success");
        } else {
          logger.info(COMPONENT, "loadPhoto - no photo available");
          setPhotoError(true);
        }
      } catch (err: unknown) {
        logger.error(COMPONENT, "loadPhoto failed", { err });
        setPhotoError(true);
      }
    };
    loadPhoto();
    return () => {
      // blob URL is owned by blobCache in farmer.service.ts — do not revoke here
    };
  }, [farmer?.farmer_id]);

  // ─── load documents ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!farmer) return;
    const blobUrls: string[] = [];
    const loadDocuments = async () => {
      logger.info(COMPONENT, "loadDocuments", { farmer_id: farmer.farmer_id });
      const docTypes: Array<"nrc" | "land_title" | "license" | "certificate"> = ["nrc", "land_title", "license", "certificate"];
      const urls: Record<string, string | null> = {};
      for (const dt of docTypes) {
        try {
          const url = await farmerService.getDocumentUrl(farmer, dt);
          urls[dt] = url;
          if (url) {
            blobUrls.push(url);
            logger.info(COMPONENT, `loadDocuments ${dt} ready`);
          }
        } catch (err: unknown) {
          logger.error(COMPONENT, `loadDocuments ${dt} failed`, { err });
          urls[dt] = null;
        }
      }
      setDocumentUrls(urls);
    };
    loadDocuments();
    return () => {
      // blob URLs are owned by blobCache in farmer.service.ts — do not revoke here
    };
  }, [farmer?.farmer_id, farmer?.identification_documents]);

  // ─── photo upload ─────────────────────────────────────────────────────────────
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    logger.info(COMPONENT, "handlePhotoUpload", { name: file.name, size: file.size });
    try {
      setUploading("photo");
      await farmerService.uploadPhoto(farmerId!, file);
      logger.info(COMPONENT, "handlePhotoUpload success");
      showSuccess("Photo uploaded successfully!", 4000);
      e.target.value = "";
      await loadFarmerData();
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      logger.error(COMPONENT, "handlePhotoUpload failed", { msg });
      showError(msg, 5000);
    } finally {
      setUploading(null);
    }
  };

  // ─── document upload ──────────────────────────────────────────────────────────
  const handleDocumentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: "nrc" | "land_title" | "license" | "certificate"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const sizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
      logger.warn(COMPONENT, "handleDocumentUpload file too large", { docType, size: sizeStr });
      showError(`File too large (${sizeStr}). Maximum is 10 MB.`, 5000);
      e.target.value = "";
      return;
    }
    logger.info(COMPONENT, "handleDocumentUpload", { docType, name: file.name, size: file.size });
    try {
      setUploading(docType);
      await farmerService.uploadDocument(farmerId!, docType, file);
      logger.info(COMPONENT, "handleDocumentUpload success", { docType });
      showSuccess(`${docType.replace("_", " ")} uploaded successfully!`, 4000);
      e.target.value = "";
      await loadFarmerData();
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      logger.error(COMPONENT, "handleDocumentUpload failed", { docType, msg });
      showError(msg, 5000);
      e.target.value = "";
    } finally {
      setUploading(null);
    }
  };

  // ─── generate ID card ─────────────────────────────────────────────────────────
  const handleGenerateIDCard = async () => {
    logger.info(COMPONENT, "handleGenerateIDCard", { farmerId });
    try {
      const response = await farmerService.generateIDCard(farmerId!);
      logger.info(COMPONENT, "handleGenerateIDCard success");
      showInfo(response?.message ?? "ID card generation started. Download will be available shortly.", 5000);
      setTimeout(() => handleDownloadIDCard(), 5000);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      logger.error(COMPONENT, "handleGenerateIDCard failed", { msg });
      showError(msg, 5000);
    }
  };

  // ─── download ID card ─────────────────────────────────────────────────────────
  const handleDownloadIDCard = async () => {
    logger.info(COMPONENT, "handleDownloadIDCard", { farmerId });
    try {
      const result = await farmerService.downloadIDCard(farmerId!);
      const fileName = result?.savedPath?.split("/").pop() ?? "ID card";
      logger.info(COMPONENT, "handleDownloadIDCard success", { file: fileName });
      showSuccess(`Downloaded: ${fileName}`, 4000);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      logger.error(COMPONENT, "handleDownloadIDCard failed", { msg });
      showError(msg, 5000);
    }
  };

  // ─── delete photo ─────────────────────────────────────────────────────────────
  const handleDeletePhoto = () => {
    setConfirm({
      open: true,
      title: "Delete Photo",
      message: "Are you sure you want to delete this farmer's photo? This action cannot be undone.",
      onConfirm: async () => {
        logger.info(COMPONENT, "handleDeletePhoto confirmed", { farmerId });
        try {
          await farmerService.deletePhoto(farmerId!);
          logger.info(COMPONENT, "handleDeletePhoto success");
          showSuccess("Photo deleted.", 4000);
          setPhotoUrl(null);
          setPhotoError(true);
          await loadFarmerData();
        } catch (err: unknown) {
          const msg = getErrorMessage(err);
          logger.error(COMPONENT, "handleDeletePhoto failed", { msg });
          showError(msg, 5000);
        }
      },
    });
  };

  // ─── delete document ──────────────────────────────────────────────────────────
  const handleDeleteDocument = (docType: string) => {
    setConfirm({
      open: true,
      title: "Delete Document",
      message: `Are you sure you want to delete the ${docType.replace("_", " ")} document? This cannot be undone.`,
      onConfirm: async () => {
        logger.info(COMPONENT, "handleDeleteDocument confirmed", { farmerId, docType });
        try {
          await farmerService.deleteDocument(farmerId!, docType);
          logger.info(COMPONENT, "handleDeleteDocument success", { docType });
          showSuccess("Document deleted.", 4000);
          setDocumentUrls((prev) => ({ ...prev, [docType]: null }));
          await loadFarmerData();
        } catch (err: unknown) {
          const msg = getErrorMessage(err);
          logger.error(COMPONENT, "handleDeleteDocument failed", { docType, msg });
          showError(msg, 5000);
        }
      },
    });
  };

  const dismissConfirm = () => setConfirm({ open: false, title: "", message: "", onConfirm: () => {} });

  // ─── loading / not-found states ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-300 dark:border-gray-600 border-t-green-600 rounded-full animate-spin mx-auto mb-5" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading farmer details...</p>
        </div>
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-6">❌</div>
          <p className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Farmer not found</p>
          <BackButton />
        </div>
      </div>
    );
  }

  const fullName = [farmer.personal_info?.first_name, farmer.personal_info?.last_name].filter(Boolean).join(" ") || "Unknown Farmer";

  // ─── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <ConfirmDialog state={confirm} onCancel={dismissConfirm} />

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-center py-6 px-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white mb-1">🌾 Chiefdom Management Model</h1>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Farmer Profile &amp; Documents</p>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 pb-10">

        {/* Top Actions */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <BackButton />
          <div className="flex flex-wrap gap-2">
            <button onClick={handleGenerateIDCard} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow transition-all active:scale-95">
              🎴 Gener
            </button>
            <button onClick={handleDownloadIDCard} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow transition-all active:scale-95">
              ⬇️ Download ID
            </button>
            <button onClick={() => navigate(`/farmers/edit/${farmerId}`)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow transition-all active:scale-95">
              ✏️ Edit Farmer
            </button>
          </div>
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

          {/* Photo */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-purple-500">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">📸 Farmer Photo</h2>
            <div className="mb-4">
              {photoError || !photoUrl ? (
                <div className="w-full h-64 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                  <span className="text-7xl">👤</span>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={photoUrl}
                    alt={`Photo of ${fullName}`}
                    className="w-full h-64 object-cover rounded-xl"
                    onError={() => { logger.error(COMPONENT, "img onError"); setPhotoError(true); }}
                  />
                  <button
                    onClick={handleDeletePhoto}
                    title="Delete photo"
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-9 h-9 flex items-center justify-center shadow-lg transition-all active:scale-90"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
            <label
              htmlFor="photo-upload"
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm cursor-pointer transition-all ${uploading === "photo" ? "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 text-white active:scale-95"}`}
            >
              {uploading === "photo" ? (
                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Uploading...</>
              ) : (
                <>📤 {photoUrl ? "Replace Photo" : "Upload Photo"}</>
              )}
            </label>
            <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading === "photo"} className="hidden" />
            <p className="text-xs text-center text-gray-400 mt-1.5">JPG · PNG · WebP</p>
          </div>

          {/* Personal Info */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-blue-500">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">👤 Personal Info</h2>
              <StatusBadge status={farmer.registration_status} />
            </div>
            <InfoRow label="Full Name"          value={fullName} />
            <InfoRow label="Farmer ID"          value={farmer.farmer_id} />
            <InfoRow label="NRC"                value={farmer.personal_info?.nrc ?? farmer.nrc_number} />
            <InfoRow label="Date of Birth"      value={farmer.personal_info?.date_of_birth} />
            <InfoRow label="Gender"             value={farmer.personal_info?.gender} />
            <InfoRow label="Ethnic Group"       value={farmer.personal_info?.ethnic_group} />
            <InfoRow label="Phone (Primary)"    value={farmer.personal_info?.phone_primary} />
            <InfoRow label="Phone (Secondary)"  value={farmer.personal_info?.phone_secondary} />
            <InfoRow label="Email"              value={farmer.personal_info?.email} />
          </div>

          {/* Address */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-teal-500">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">📍 Address</h2>
            <InfoRow label="Province"   value={farmer.address?.province_name ?? farmer.address?.province} />
            <InfoRow label="District"   value={farmer.address?.district_name ?? farmer.address?.district} />
            <InfoRow label="Chiefdom"   value={farmer.address?.chiefdom_name ?? farmer.address?.chiefdom} />
            <InfoRow label="Village"    value={farmer.address?.village} />
            <InfoRow label="Ward"       value={farmer.address?.ward_name} />
            <InfoRow label="Camp"       value={farmer.address?.camp_name} />
          </div>

          {/* Farm Info */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-green-500">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">🌱 Farm Info</h2>
            {farmer.farm_info ? (
              <>
                <InfoRow label="Farm Size (ha)"   value={farmer.farm_info.farm_size_hectares} />
                <InfoRow label="Years Farming"    value={farmer.farm_info.years_farming ?? farmer.farm_info.farming_experience_years} />
                <InfoRow label="Has Irrigation"   value={farmer.farm_info.has_irrigation} />
                <InfoRow label="Crops"            value={(farmer.farm_info.crops_grown ?? []).join(", ") || undefined} />
                <InfoRow label="Livestock"        value={([...(farmer.farm_info.livestock ?? []), ...(farmer.farm_info.livestock_types ?? [])]).join(", ") || undefined} />
              </>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-600 italic">No farm information recorded.</p>
            )}
          </div>

          {/* Household */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-amber-500">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">🏠 Household Info</h2>
            {farmer.household_info ? (
              <>
                <InfoRow label="Household Size"       value={farmer.household_info.household_size} />
                <InfoRow label="Number of Dependents" value={farmer.household_info.number_of_dependents} />
                <InfoRow label="Primary Income"       value={farmer.household_info.primary_income_source} />
              </>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-600 italic">No household information recorded.</p>
            )}
          </div>

          {/* Record Info */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-gray-400">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">🗂️ Record Info</h2>
            <InfoRow label="Status"      value={farmer.registration_status} />
            <InfoRow label="Active"      value={farmer.is_active} />
            <InfoRow label="Created At"  value={farmer.created_at ? new Date(farmer.created_at).toLocaleString() : undefined} />
            <InfoRow label="Updated At"  value={farmer.updated_at ? new Date(farmer.updated_at).toLocaleString() : undefined} />
            <InfoRow label="Created By"  value={farmer.created_by} />
            <InfoRow label="Reviewed By" value={farmer.reviewed_by} />
            <InfoRow label="Reviewed At" value={farmer.reviewed_at ? new Date(farmer.reviewed_at).toLocaleString() : undefined} />
            {farmer.review_notes && (
              <div className="py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 block">Review Notes</span>
                <p className="text-sm text-gray-800 dark:text-gray-100 mt-0.5 whitespace-pre-wrap">{farmer.review_notes}</p>
              </div>
            )}
          </div>

          {/* Documents (full-width) */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-indigo-500 sm:col-span-2 lg:col-span-3">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-5">📄 Documents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <DocumentSection label="NRC / National ID" docType="nrc"         docUrl={documentUrls.nrc}         uploading={uploading} onUpload={handleDocumentUpload} onDelete={handleDeleteDocument} />
              <DocumentSection label="Land Title"        docType="land_title"  docUrl={documentUrls.land_title}  uploading={uploading} onUpload={handleDocumentUpload} onDelete={handleDeleteDocument} />
              <DocumentSection label="License"           docType="license"     docUrl={documentUrls.license}     uploading={uploading} onUpload={handleDocumentUpload} onDelete={handleDeleteDocument} />
              <DocumentSection label="Certificate"       docType="certificate" docUrl={documentUrls.certificate} uploading={uploading} onUpload={handleDocumentUpload} onDelete={handleDeleteDocument} />
            </div>
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-600">Accepted formats: PDF · JPG · PNG | Max size: 10 MB per file</p>
          </div>

        </div>
      </div>
    </div>
  );
}
