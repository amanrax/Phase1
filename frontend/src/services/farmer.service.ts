// src/services/farmer.service.ts
import api from "@/utils/axios";
import { logger } from "@/utils/logger";

// Type definitions for better type safety
export interface DownloadResult {
  downloaded: boolean;
  savedPath?: string;
  filename?: string;
  method: 'native' | 'web';
}

/**
 * In-memory cache for GridFS blobs
 * Key: fileIdOrPath, Value: { blobUrl, timestamp }
 */
const blobCache = new Map<string, { blobUrl: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Helper: Fetch GridFS file as blob with authentication
 * Use this for photos, documents, and QR codes stored in GridFS
 * Now with caching to improve performance
 */
async function fetchGridFSFile(fileIdOrPath: string, forceMime?: string): Promise<string | null> {
  try {
    // Check cache first
    const cached = blobCache.get(fileIdOrPath);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      logger.info('GridFS', 'Cache hit', { key: fileIdOrPath });
      return cached.blobUrl;
    }
    
    logger.info('GridFS', 'Fetching file', { key: fileIdOrPath });
    
    // Build a path relative to the axios baseURL (/api)
    let url: string;
    if (fileIdOrPath.match(/^[a-f0-9]{24}$/i)) {
      url = `/files/${fileIdOrPath}`;
    } else if (fileIdOrPath.startsWith('http')) {
      // Extract the path portion from an absolute URL
      try {
        const parsed = new URL(fileIdOrPath);
        url = parsed.pathname.replace(/^\/api/, '');
      } catch {
        url = fileIdOrPath;
      }
    } else if (fileIdOrPath.startsWith('/api/')) {
      url = fileIdOrPath.replace(/^\/api/, '');
    } else if (fileIdOrPath.startsWith('/')) {
      url = fileIdOrPath;
    } else {
      url = `/${fileIdOrPath}`;
    }
    
    logger.info('GridFS', 'Fetching from', { url });
    
    const start = performance.now();
    const response = await api.get(url, { responseType: 'arraybuffer' });
    const elapsed = Math.round(performance.now() - start);

    // Use forceMime if server returns generic binary type (GridFS metadata gap)
    const serverType = response.headers['content-type'] || '';
    const mimeType = (forceMime && (!serverType || serverType === 'application/octet-stream'))
      ? forceMime
      : serverType || 'application/octet-stream';

    const blob = new Blob([response.data], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    
    // Store in cache
    blobCache.set(fileIdOrPath, { blobUrl, timestamp: Date.now() });
    
    logger.info('GridFS', `File loaded and cached (${elapsed}ms)`, { mimeType });
    return blobUrl;
  } catch (error) {
    logger.error("GridFS", "Error fetching file", { path: fileIdOrPath, error: (error as any)?.message });
    return null;
  }
}

/**
 * Clear cache (useful when logging out or on memory pressure)
 */
function clearBlobCache() {
  blobCache.forEach(({ blobUrl }) => {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      logger.warn('GridFS', 'Failed to revoke blob URL', { error: String(e) });
    }
  });
  blobCache.clear();
  logger.info('GridFS', 'Cache cleared');
}

export const farmerService = {
  /** Clear blob URL cache (useful on logout or memory pressure) */
  clearBlobCache,

  /**
   * Fetch a paginated list of farmers.
   * Backend: GET /api/farmers?limit=10&skip=0
   */
  async getFarmers(limit = 10, skip = 0, filters?: Record<string, any>) {
    try {
      const start = performance.now();
      const { data } = await api.get("/farmers/", { params: { limit, skip, ...filters } });
      const elapsed = Math.round(performance.now() - start);
      logger.info("farmerService", `Loaded ${Array.isArray(data) ? data.length : "?"} farmers (${elapsed}ms)`);
      return data;
    } catch (err: any) {
      logger.error("farmerService", "Failed to load farmers", { error: err?.message, status: err?.response?.status });
      throw err;
    }
  },

  /**
   * Search farmer by exact farmer_id.
   * Backend: GET /api/farmers?farmer_id_exact=ZM12345
   */
  async searchByFarmerId(farmerId: string) {
    const { data } = await api.get("/farmers/", { params: { farmer_id_exact: farmerId, limit: 1 } });
    return data && data.length > 0 ? data[0] : null;
  },

  /**
   * Search farmer by NRC number.
   * Backend: GET /api/farmers?nrc=123456/12/1
   */
  async searchByNRC(nrc: string) {
    const { data } = await api.get("/farmers/", { params: { nrc, limit: 1 } });
    return data && data.length > 0 ? data[0] : null;
  },

  /**
   * Get a single farmer's details.
   * Backend: GET /api/farmers/{farmer_id}
   */
  async getFarmer(farmerId: string) {
    if (!farmerId) throw new Error("Missing farmerId");
    try {
      const start = performance.now();
      const { data } = await api.get(`/farmers/${farmerId}`);
      const elapsed = Math.round(performance.now() - start);
      logger.info("farmerService", `Loaded farmer ${farmerId} (${elapsed}ms)`);
      return data;
    } catch (err: any) {
      logger.error("farmerService", `Failed to load farmer ${farmerId}`, { error: err?.message, status: err?.response?.status });
      throw err;
    }
  },

  /**
   * Create a new farmer record.
   * Backend: POST /api/farmers
   */
  async create(farmerData: Record<string, any>) {
    if (!farmerData) throw new Error("Missing farmer data");
    const { data } = await api.post("/farmers/", farmerData);
    return data;
  },

  /**
   * Update an existing farmer record.
   * Backend: PUT /api/farmers/{farmer_id}
   */
  async update(farmerId: string, farmerData: Record<string, any>) {
    if (!farmerId) throw new Error("Missing farmerId");
    if (!farmerData) throw new Error("Missing farmer data");
    const { data } = await api.put(`/farmers/${farmerId}`, farmerData);
    return data;
  },

  /**
   * Review a farmer's registration (update status with notes).
   * Backend: PATCH /api/farmers/{farmer_id}/review?new_status=verified&review_notes=...
   */
  async review(farmerId: string, queryParams: string) {
    if (!farmerId) throw new Error("Missing farmerId");
    const { data } = await api.patch(`/farmers/${farmerId}/review?${queryParams}`);
    return data;
  },

  /**
   * Delete a farmer record.
   * Backend: DELETE /api/farmers/{farmer_id}
   */
  async delete(farmerId: string) {
    if (!farmerId) throw new Error("Missing farmerId");
    const { data } = await api.delete(`/farmers/${farmerId}`);
    return data;
  },

  /**
   * Upload a farmer's photo.
   * Backend: POST /api/farmers/{farmer_id}/upload-photo
   */
  async uploadPhoto(farmerId: string, file: File): Promise<any> {
    logger.info('farmerService', 'Uploading photo for');
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(
      `/farmers/${farmerId}/upload-photo`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    logger.info('farmerService', '✅ Photo uploaded successfully');
    return response.data;
  },

  /**
   * Upload a farmer's document.
   * Backend: POST /api/farmers/{farmer_id}/upload-document
   */
  async uploadDocument(
    farmerId: string,
    docType: "nrc" | "land_title" | "license" | "certificate",
    file: File
  ): Promise<any> {
    logger.info('farmerService', 'Uploading  document for');
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(
      `/farmers/${farmerId}/documents/${docType}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    logger.info('farmerService', '✅ Document uploaded successfully');
    return response.data;
  },

  /**
   * Delete a farmer's photo.
   * Backend: DELETE /api/farmers/{farmer_id}/photo
   */
  async deletePhoto(farmerId: string): Promise<any> {
    logger.info('farmerService', 'Deleting photo for');
    const response = await api.delete(`/farmers/${farmerId}/photo`);
    logger.info('farmerService', '✅ Photo deleted');
    return response.data;
  },

  /**
   * Delete a farmer's document.
   * Backend: DELETE /api/farmers/{farmer_id}/documents/{doc_type}
   */
  async deleteDocument(farmerId: string, docType: string): Promise<any> {
    logger.info('farmerService', 'Deleting  document for');
    const response = await api.delete(
      `/farmers/${farmerId}/documents/${docType}`
    );
    logger.info('farmerService', '✅ Document deleted');
    return response.data;
  },

  /**
   * Trigger background ID-card generation.
   * Backend: POST /api/farmers/{farmer_id}/generate-idcard
   */
  async generateIDCard(farmerId: string): Promise<any> {
    logger.info('farmerService', 'Generating ID card for');
    const response = await api.post(`/farmers/${farmerId}/generate-idcard`);
    logger.info('farmerService', `[farmer.service] ✅ ID card generation queued:`, response.data);
    return response.data;
  },

  /**
   * Generate (or re-generate) a QR code for a farmer.
   * Backend: POST /api/farmers/{farmer_id}/generate-qr
   */
  async generateQR(farmerId: string): Promise<{ farmer_id: string; message: string; qr_url?: string }> {
    logger.info('farmerService', `generateQR: ${farmerId}`);
    const response = await api.post<{ farmer_id: string; message: string; qr_url?: string }>(
      `/farmers/${farmerId}/generate-qr`
    );
    return response.data;
  },

  /**
   * Download an existing farmer ID card (PDF blob).
   * Backend: GET /api/farmers/{farmer_id}/download-idcard
   * Returns: DownloadResult with download details
   */
  async downloadIDCard(farmerId: string): Promise<DownloadResult> {
    logger.info('farmerService', 'Downloading ID card for');
    
    const response = await api.get(`/farmers/${farmerId}/download-idcard`, {
      responseType: "blob",
    });
    
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const timestamp = new Date().getTime();
    const filename = `Farmer_${farmerId}_ID_Card_${timestamp}.pdf`;

    // Try native save on Capacitor
    try {
      const { Capacitor } = await import("@capacitor/core");

      if (Capacitor?.isNativePlatform?.()) {
        logger.info('farmerService', 'Running on native platform, attempting native save');
        
        const { Filesystem, Directory } = await import("@capacitor/filesystem");

        const blobToBase64 = (b: Blob): Promise<string> =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(b);
          });

        const base64 = await blobToBase64(blob);

        // Try Documents directory first (most reliable for Android/iOS)
        try {
          const result = await Filesystem.writeFile({
            path: `CEM/${filename}`,
            data: base64,
            directory: Directory.Documents,
            recursive: true, // Create CEM folder if doesn't exist
          });

          const savedPath = (result as any).uri || `Documents/CEM/${filename}`;
          logger.info('farmerService', `[farmer.service] ✅ File saved to Documents/CEM:`, savedPath);
          
          return {
            downloaded: true,
            savedPath,
            filename,
            method: 'native'
          };
        } catch (docsErr) {
          logger.warn('farmerService', `[farmer.service] Documents/CEM failed, trying External:`, docsErr);

          // Fallback: External directory (Android Downloads)
          try {
            const result = await Filesystem.writeFile({
              path: `Download/CEM/${filename}`,
              data: base64,
              directory: Directory.External,
              recursive: true,
            });

            const savedPath = (result as any).uri || `Download/CEM/${filename}`;
            logger.info('farmerService', `[farmer.service] ✅ File saved to Download/CEM:`, savedPath);
            
            return {
              downloaded: true,
              savedPath,
              filename,
              method: 'native'
            };
          } catch (extErr) {
            logger.error('farmerService', `[farmer.service] ❌ Both native methods failed:`, extErr);
            throw new Error('Failed to save file. Please check storage permissions.');
          }
        }
      }
    } catch (capacitorErr) {
      logger.info('farmerService', 'Not on native platform or Capacitor unavailable, using web download');
    }

    // Web fallback: browser download
    logger.info('farmerService', 'Using web browser download');
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    logger.info('farmerService', '✅ Browser download triggered');
    
    return {
      downloaded: true,
      filename,
      method: 'web'
    };
  },

  /**
   * View ID card in browser/viewer.
   * Returns a blob URL or base64 data URL for displaying PDF.
   */
  async viewIDCard(farmerId: string): Promise<string> {
    logger.info('farmerService', 'Fetching ID card for viewing:');
    
    try {
      const response = await api.get(`/farmers/${farmerId}/download-idcard`, {
        responseType: "blob",
      });
      
      if (!response.data) {
        throw new Error('No data received from server');
      }
      
      const blob = new Blob([response.data], { type: "application/pdf" });
      logger.info('farmerService', 'PDF blob received, size: ${blob.size} bytes');

      // For native mobile, use base64 data URL (more reliable in WebView)
      try {
        const { Capacitor } = await import("@capacitor/core");
        
        if (Capacitor?.isNativePlatform?.()) {
          logger.info('farmerService', 'Native platform detected, converting to base64');
          
          const toBase64 = (b: Blob) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(b);
            });

          const dataUrl = await toBase64(blob);
          logger.info('farmerService', '✅ Base64 data URL created (${dataUrl.length} chars)');
          return dataUrl;
        }
      } catch (capacitorErr) {
        logger.info('farmerService', 'Capacitor check failed, using blob URL');
      }

      // Web: use blob URL
      const url = window.URL.createObjectURL(blob);
      logger.info('farmerService', `[farmer.service] ✅ Blob URL created:`, url.substring(0, 50));
      return url;
      
    } catch (error: any) {
      logger.error('farmerService', `[farmer.service] ❌ Failed to fetch ID card:`, error);
      
      if (error.response?.status === 404) {
        throw new Error('ID card not found. Please generate it first.');
      } else if (error.response?.status === 401) {
        throw new Error('Unauthorized. Please login again.');
      } else {
        throw new Error(error.message || 'Failed to load ID card');
      }
    }
  },

  /**
   * Get photo URL (handles GridFS files)
   */
  async getPhotoUrl(farmer: any): Promise<string | null> {
    if (!farmer) return null;

    // Try different photo field locations
    const photoPath = farmer.documents?.photo || farmer.photos?.profile || farmer.photo_path;
    const photoFileId = farmer.photo_file_id || farmer.documents?.photo_file_id;

    if (photoFileId) {
      logger.info('farmerService', '[Photo] Loading from GridFS file_id:', photoFileId);
      return await fetchGridFSFile(photoFileId, 'image/jpeg');
    }

    if (photoPath) {
      logger.info('farmerService', '[Photo] Loading from path:', photoPath);
      return await fetchGridFSFile(photoPath, 'image/jpeg');
    }

    logger.info('farmerService', '[Photo] No photo available');
    return null;
  },

  /**
   * Get QR code URL (handles GridFS files)
   */
  async getQRCodeBlobUrl(farmer: any): Promise<string | null> {
    if (!farmer) return null;

    const qrFileId = farmer.qr_code_file_id;
    const qrPath = farmer.qr_code_path || farmer.qr_code_url;

    if (qrFileId) {
      logger.info('farmerService', '[QR] Loading from GridFS file_id:', qrFileId);
      return await fetchGridFSFile(qrFileId, 'image/png');
    }

    if (qrPath) {
      logger.info('farmerService', '[QR] Loading from path:', qrPath);
      return await fetchGridFSFile(qrPath, 'image/png');
    }

    // Fallback: try direct API endpoint
    if (farmer.farmer_id) {
      logger.info('farmerService', '[QR] Using API endpoint for:', farmer.farmer_id);
      return await fetchGridFSFile(`/farmers/${farmer.farmer_id}/qr`);
    }

    logger.info('farmerService', '[QR] No QR code available');
    return null;
  },

  /**
   * Get document URL (handles GridFS files)
   */
  async getDocumentUrl(farmer: any, docType: 'nrc' | 'land_title' | 'license' | 'certificate'): Promise<string | null> {
    // NEW: Check identification_documents array first (new backend structure)
    if (farmer?.identification_documents && Array.isArray(farmer.identification_documents)) {
      const doc = farmer.identification_documents.find((d: any) => d.doc_type === docType);
      if (doc?.file_id) {
        logger.info('farmerService', `[Document] Loading ${docType} from identification_documents (GridFS):`, doc.file_id);
        return await fetchGridFSFile(doc.file_id);
      }
      if (doc?.file_path) {
        logger.info('farmerService', `[Document] Loading ${docType} from identification_documents (path):`, doc.file_path);
        // Extract file ID from path like "/api/files/123abc"
        const match = doc.file_path.match(/\/files\/([a-f0-9]+)/i);
        if (match) {
          return await fetchGridFSFile(match[1]);
        }
      }
    }

    // FALLBACK: Old structure (documents object)
    if (!farmer?.documents) {
      logger.info('farmerService', `[Document] No ${docType} document available`);
      return null;
    }

    const docFileId = farmer.documents[`${docType}_file_id`];
    const docPath = farmer.documents[docType];

    if (docFileId) {
      logger.info('farmerService', `[Document] Loading ${docType} from GridFS:`, docFileId);
      return await fetchGridFSFile(docFileId);
    }

    if (docPath) {
      logger.info('farmerService', `[Document] Loading ${docType} from path:`, docPath);
      return await fetchGridFSFile(docPath);
    }

    logger.info('farmerService', `[Document] No ${docType} document available`);
    return null;
  },

  /**
   * View document in viewer
   */
  async viewDocument(docUrl: string, docTitle: string, navigate: any) {
    sessionStorage.setItem('doc_view_path', docUrl);
    sessionStorage.setItem('doc_view_title', docTitle);
    navigate('/document-viewer');
  },

  /**
   * Verify a QR code payload.
   * Backend expects: { farmer_id, timestamp, signature }
   */
  async verifyQR(payload: {
    farmer_id: string;
    timestamp: string;
    signature: string;
  }) {
    if (!payload?.farmer_id || !payload?.timestamp || !payload?.signature) {
      throw new Error("Invalid QR payload");
    }
    const { data } = await api.post("/farmers/verify-qr", payload);
    return data;
  },

  /**
   * Deactivate a farmer (set is_active to false).
   * Backend: PUT /api/farmers/{farmer_id}
   */
  async deactivateFarmer(farmerId: string): Promise<any> {
    const { data } = await api.put(`/farmers/${farmerId}`, { is_active: false });
    return data;
  },

  /**
   * Activate a farmer (set is_active to true).
   * Backend: PUT /api/farmers/{farmer_id}
   */
  async activateFarmer(farmerId: string): Promise<any> {
    const { data } = await api.put(`/farmers/${farmerId}`, { is_active: true });
    return data;
  },
};

export default farmerService;
