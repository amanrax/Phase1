// src/pages/FarmerDocumentWallet.tsx — Document wallet showing all uploaded files (v4.0)
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "@/components/BackButton";
import api from "@/utils/axios";
import { useNotification } from "@/contexts/NotificationContext";
import { logger } from "@/utils/logger";
import useAuthStore from "@/store/authStore";
import FarmerBottomNav from "@/components/FarmerBottomNav";
import { farmerService } from "@/services/farmer.service";

const COMPONENT = "FarmerDocumentWallet";

interface FarmerDocument {
  doc_type: string;
  file_path: string;
  file_id: string;
  uploaded_at: string;
  status?: string;
  rejection_reason?: string;
}

interface PhotoInfo {
  file_path: string;
  file_id?: string;
  uploaded_at?: string;
}

const DOC_TYPE_META: Record<string, { label: string; description: string }> = {
  nrc: { label: "NRC (National Registration Card)", description: "Official identification document" },
  land_title: { label: "Land Title / Ownership Proof", description: "Proof of land ownership or lease" },
  license: { label: "Farming License", description: "Active farming licence" },
  certificate: { label: "Certificate", description: "Agricultural training or certification" },
};

const FarmerDocumentWallet = () => {
  const navigate = useNavigate();
  const toast = useNotification();
  const { user } = useAuthStore();
  const farmerId = user?.farmer_id;

  const [documents, setDocuments] = useState<FarmerDocument[]>([]);
  const [photo, setPhoto] = useState<PhotoInfo | null>(null);
  const [photoBlobUrl, setPhotoBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<string>("registered");
  const [uploading, setUploading] = useState<string | null>(null); // doc_type currently uploading
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null); // which doc_type to upload

  const fetchDocuments = useCallback(async () => {
    if (!farmerId) return;
    try {
      setLoading(true);
      const start = performance.now();
      logger.info(COMPONENT, "Fetching farmer documents", { farmerId });
      const { data } = await api.get(`/farmers/${farmerId}`);
      const farmer = data.farmer || data;
      setDocuments(farmer.identification_documents || []);
      setVerificationStatus(farmer.registration_status || farmer.status || "registered");
      logger.info(COMPONENT, `Documents loaded (${Math.round(performance.now() - start)}ms)`, {
        docCount: (farmer.identification_documents || []).length,
        status: farmer.registration_status,
      });

      // Extract photo info
      if (farmer.photo?.file_path || farmer.photo_url) {
        setPhoto({
          file_path: farmer.photo?.file_path || farmer.photo_url || "",
          file_id: farmer.photo?.file_id,
          uploaded_at: farmer.photo?.uploaded_at,
        });
      }
    } catch (err) {
      logger.error(COMPONENT, "Failed to fetch documents", { err });
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [farmerId, toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  /** Trigger hidden file input for the given doc_type (TC-065) */
  const handleReUploadClick = (docType: string) => {
    uploadTargetRef.current = docType;
    fileInputRef.current?.click();
  };

  /** Handle file selection from the hidden input (TC-065/066) */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const docType = uploadTargetRef.current;
    if (!file || !docType || !farmerId) return;
    // Reset input so same file can be re-selected next time
    e.target.value = "";

    const MAX_MB = 10;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File is too large. Maximum allowed size is ${MAX_MB} MB.`);
      return;
    }
    const allowedMime = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedMime.includes(file.type)) {
      toast.error("Only JPG, PNG, or PDF files are allowed.");
      return;
    }

    try {
      setUploading(docType);
      logger.info(COMPONENT, "Re-uploading document", { docType, fileName: file.name, size: file.size });
      const formData = new FormData();
      formData.append("file", file);
      await api.post(`/farmers/${farmerId}/documents/${docType}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      logger.info(COMPONENT, "Document re-uploaded successfully", { docType });
      toast.success(`${DOC_TYPE_META[docType]?.label ?? docType} uploaded successfully`);
      fetchDocuments(); // refresh list
    } catch (err) {
      logger.error(COMPONENT, "Document re-upload failed", { err });
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(null);
    }
  };

  // Load photo via authenticated service for display
  useEffect(() => {
    if (!photo?.file_id && !photo?.file_path) return;
    let cancelled = false;
    const loadPhoto = async () => {
      try {
        const start = performance.now();
        const url = await farmerService.getPhotoUrl({ photo_file_id: photo.file_id, documents: { photo: photo.file_path } });
        if (!cancelled && url) {
          setPhotoBlobUrl(url);
          logger.info(COMPONENT, `Photo loaded (${Math.round(performance.now() - start)}ms)`);
        }
      } catch (err) {
        logger.error(COMPONENT, "Photo load failed", { error: (err as Error)?.message });
      }
    };
    loadPhoto();
    return () => { cancelled = true; };
  }, [photo]);

  const getStatusBadge = (status?: string) => {
    if (!status || status === "uploaded") {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">Uploaded</span>;
    }
    if (status === "approved" || status === "verified") {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">Approved</span>;
    }
    if (status === "rejected") {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">Rejected</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{status}</span>;
  };

  const formatDate = (d?: string) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return d;
    }
  };

  // TC-071/072: Type-specific document icons
  const defaultDocSvg = (
    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
  );
  const pdfIcon = (
    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
  );
  const getDocIcon = (doc?: FarmerDocument) => {
    const name = (doc?.file_path || "").toLowerCase();
    if (name.endsWith(".pdf")) return pdfIcon;
    if (/\.(jpe?g|png|gif|webp|bmp)$/i.test(name)) {
      return <img src={doc?.file_path} alt="" className="w-5 h-5 object-cover rounded" />;
    }
    return defaultDocSvg;
  };

  // Group documents by type
  const allDocTypes = ["nrc", "land_title", "license", "certificate"];
  // ── Skeleton ─────────────────────────────────────────────────────────────
  const Skeleton = () => (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 flex gap-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <BackButton to="/farmer-dashboard" label="" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Document Wallet</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Overall Verification Status */}
        <div className={`rounded-xl p-4 border ${
          verificationStatus === "verified"
            ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
            : verificationStatus === "rejected"
            ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
            : "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
        }`}>
          <div className="flex items-center gap-3">
            {verificationStatus === "verified" ? (
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : verificationStatus === "rejected" ? (
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            ) : (
              <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            <div>
              <p className={`text-sm font-semibold ${
                verificationStatus === "verified" ? "text-green-800 dark:text-green-300" :
                verificationStatus === "rejected" ? "text-red-800 dark:text-red-300" :
                "text-amber-800 dark:text-amber-300"
              }`}>
                {verificationStatus === "verified" ? "Profile Verified" :
                 verificationStatus === "rejected" ? "Verification Rejected" :
                 "Verification Pending"}
              </p>
              <p className={`text-xs mt-0.5 ${
                verificationStatus === "verified" ? "text-green-600 dark:text-green-400" :
                verificationStatus === "rejected" ? "text-red-600 dark:text-red-400" :
                "text-amber-600 dark:text-amber-400"
              }`}>
                {verificationStatus === "verified" ? "All documents have been verified" :
                 verificationStatus === "rejected" ? "Some documents need attention" :
                 "Your documents are being reviewed"}
              </p>
            </div>
          </div>
        </div>

        {/* Photo */}
        {loading ? (
          <Skeleton />
        ) : (
          <>
            {/* Photo Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center overflow-hidden">
                  {photoBlobUrl ? (
                    <img src={photoBlobUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Profile Photo</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {photo?.file_path ? `Uploaded ${formatDate(photo.uploaded_at)}` : "Not uploaded"}
                  </p>
                </div>
                {photo?.file_path ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">Uploaded</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">Missing</span>
                )}
              </div>
            </div>

            {/* TC-073: Empty state when no documents have been uploaded */}
            {documents.length === 0 && !photo?.file_path && (
              <div className="rounded-xl p-6 border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-center">
                <svg className="w-10 h-10 mx-auto mb-3 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No documents uploaded yet</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Upload your documents below to begin the verification process.</p>
              </div>
            )}

            {/* Document Cards */}
            {allDocTypes.map((docType) => {
              const doc = documents.find((d) => d.doc_type === docType);
              const meta = DOC_TYPE_META[docType] || { label: docType, description: "" };
              const isUploaded = !!doc;

              return (
                <div
                  key={docType}
                  className={`bg-white dark:bg-gray-800 rounded-xl p-4 border transition-colors ${
                    doc?.status === "rejected"
                      ? "border-red-300 dark:border-red-700"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                      {getDocIcon(doc)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{meta.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {isUploaded ? `Uploaded ${formatDate(doc?.uploaded_at)}` : meta.description}
                      </p>
                    </div>
                    {isUploaded ? getStatusBadge(doc?.status) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">Not uploaded</span>
                    )}
                  </div>

                  {/* Rejection reason */}
                  {doc?.status === "rejected" && doc?.rejection_reason && (
                    <div className="mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                      <span className="font-medium">Reason:</span> {doc.rejection_reason}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    {isUploaded && doc?.file_path && (
                      <a
                        href={doc.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        View Document
                      </a>
                    )}
                    {/* Show Upload/Re-upload only on missing or rejected docs (TC-064/067) */}
                    {(!isUploaded || doc?.status === "rejected") && (
                      <button
                        disabled={uploading === docType}
                        onClick={() => handleReUploadClick(docType)}
                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                      >
                        {uploading === docType ? "Uploading…" : isUploaded ? "Re-upload" : "Upload"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* ID Card Link */}
            <div
              onClick={() => navigate("/farmer-idcard")}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Digital ID Card</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">View your digital farmer ID card</p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </div>
          </>
        )}
      </div>
      <FarmerBottomNav />
      {/* Hidden file input for inline document re-upload (TC-065) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default FarmerDocumentWallet;
