// src/services/farmer.service.ts
import api from "@/utils/axios";

// Type definitions for better type safety
export interface DownloadResult {
  downloaded: boolean;
  savedPath?: string;
  filename?: string;
  method: 'native' | 'web';
}

/**
 * Helper: Fetch GridFS file as blob with authentication
 * Use this for photos, documents, and QR codes stored in GridFS
 */
async function fetchGridFSFile(fileIdOrPath: string): Promise<string | null> {
  try {
    console.log('[GridFS] Fetching file:', fileIdOrPath);
    
    const baseURL = import.meta.env.VITE_API_BASE_URL || "http://13.204.83.198:8000";
    
    // If it's a file ID (MongoDB ObjectId format)
    let url: string;
    if (fileIdOrPath.match(/^[a-f0-9]{24}$/i)) {
      url = `${baseURL}/api/files/${fileIdOrPath}`;
    } else if (fileIdOrPath.startsWith('http')) {
      url = fileIdOrPath;
    } else {
      url = fileIdOrPath.startsWith('/') ? `${baseURL}${fileIdOrPath}` : `${baseURL}/${fileIdOrPath}`;
    }
    
    console.log('[GridFS] Fetching from:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });

    if (!response.ok) {
      console.error('[GridFS] Fetch failed:', response.status);
      return null;
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    console.log('[GridFS] ✅ File loaded, blob URL created');
    return blobUrl;
  } catch (error) {
    console.error('[GridFS] Error fetching file:', error);
    return null;
  }
}

export const farmerService = {
  /**
   * Fetch a paginated list of farmers.
   * Backend: GET /api/farmers?limit=10&skip=0
   */
  async getFarmers(limit = 10, skip = 0, filters?: Record<string, any>) {
    const { data } = await api.get("/farmers/", { params: { limit, skip, ...filters } });
    return data;
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
    const { data } = await api.get(`/farmers/${farmerId}`);
    return data;
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
    console.log(`[farmer.service] Uploading photo for ${farmerId}`);
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(
      `/farmers/${farmerId}/upload-photo`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    console.log(`[farmer.service] ✅ Photo uploaded successfully`);
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
    console.log(`[farmer.service] Uploading ${docType} document for ${farmerId}`);
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(
      `/farmers/${farmerId}/documents/${docType}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    console.log(`[farmer.service] ✅ Document uploaded successfully`);
    return response.data;
  },

  /**
   * Delete a farmer's photo.
   * Backend: DELETE /api/farmers/{farmer_id}/photo
   */
  async deletePhoto(farmerId: string): Promise<any> {
    console.log(`[farmer.service] Deleting photo for ${farmerId}`);
    const response = await api.delete(`/farmers/${farmerId}/photo`);
    console.log(`[farmer.service] ✅ Photo deleted`);
    return response.data;
  },

  /**
   * Delete a farmer's document.
   * Backend: DELETE /api/farmers/{farmer_id}/documents/{doc_type}
   */
  async deleteDocument(farmerId: string, docType: string): Promise<any> {
    console.log(`[farmer.service] Deleting ${docType} document for ${farmerId}`);
    const response = await api.delete(
      `/farmers/${farmerId}/documents/${docType}`
    );
    console.log(`[farmer.service] ✅ Document deleted`);
    return response.data;
  },

  /**
   * Trigger background ID-card generation.
   * Backend: POST /api/farmers/{farmer_id}/generate-idcard
   */
  async generateIDCard(farmerId: string): Promise<any> {
    console.log(`[farmer.service] Generating ID card for ${farmerId}`);
    const response = await api.post(`/farmers/${farmerId}/generate-idcard`);
    console.log(`[farmer.service] ✅ ID card generation queued:`, response.data);
    return response.data;
  },

  /**
   * Download an existing farmer ID card (PDF blob).
   * Backend: GET /api/farmers/{farmer_id}/download-idcard
   * Returns: DownloadResult with download details
   */
  async downloadIDCard(farmerId: string): Promise<DownloadResult> {
    console.log(`[farmer.service] Downloading ID card for ${farmerId}`);
    
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
        console.log(`[farmer.service] Running on native platform, attempting native save`);
        
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
          console.log(`[farmer.service] ✅ File saved to Documents/CEM:`, savedPath);
          
          return {
            downloaded: true,
            savedPath,
            filename,
            method: 'native'
          };
        } catch (docsErr) {
          console.warn(`[farmer.service] Documents/CEM failed, trying External:`, docsErr);

          // Fallback: External directory (Android Downloads)
          try {
            const result = await Filesystem.writeFile({
              path: `Download/CEM/${filename}`,
              data: base64,
              directory: Directory.External,
              recursive: true,
            });

            const savedPath = (result as any).uri || `Download/CEM/${filename}`;
            console.log(`[farmer.service] ✅ File saved to Download/CEM:`, savedPath);
            
            return {
              downloaded: true,
              savedPath,
              filename,
              method: 'native'
            };
          } catch (extErr) {
            console.error(`[farmer.service] ❌ Both native methods failed:`, extErr);
            throw new Error('Failed to save file. Please check storage permissions.');
          }
        }
      }
    } catch (capacitorErr) {
      console.log(`[farmer.service] Not on native platform or Capacitor unavailable, using web download`);
    }

    // Web fallback: browser download
    console.log(`[farmer.service] Using web browser download`);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    console.log(`[farmer.service] ✅ Browser download triggered`);
    
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
    console.log(`[farmer.service] Fetching ID card for viewing: ${farmerId}`);
    
    try {
      const response = await api.get(`/farmers/${farmerId}/download-idcard`, {
        responseType: "blob",
      });
      
      if (!response.data) {
        throw new Error('No data received from server');
      }
      
      const blob = new Blob([response.data], { type: "application/pdf" });
      console.log(`[farmer.service] PDF blob received, size: ${blob.size} bytes`);

      // For native mobile, use base64 data URL (more reliable in WebView)
      try {
        const { Capacitor } = await import("@capacitor/core");
        
        if (Capacitor?.isNativePlatform?.()) {
          console.log(`[farmer.service] Native platform detected, converting to base64`);
          
          const toBase64 = (b: Blob) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(b);
            });

          const dataUrl = await toBase64(blob);
          console.log(`[farmer.service] ✅ Base64 data URL created (${dataUrl.length} chars)`);
          return dataUrl;
        }
      } catch (capacitorErr) {
        console.log(`[farmer.service] Capacitor check failed, using blob URL`);
      }

      // Web: use blob URL
      const url = window.URL.createObjectURL(blob);
      console.log(`[farmer.service] ✅ Blob URL created:`, url.substring(0, 50));
      return url;
      
    } catch (error: any) {
      console.error(`[farmer.service] ❌ Failed to fetch ID card:`, error);
      
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
      console.log('[Photo] Loading from GridFS file_id:', photoFileId);
      return await fetchGridFSFile(photoFileId);
    }

    if (photoPath) {
      console.log('[Photo] Loading from path:', photoPath);
      return await fetchGridFSFile(photoPath);
    }

    console.log('[Photo] No photo available');
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
      console.log('[QR] Loading from GridFS file_id:', qrFileId);
      return await fetchGridFSFile(qrFileId);
    }

    if (qrPath) {
      console.log('[QR] Loading from path:', qrPath);
      return await fetchGridFSFile(qrPath);
    }

    // Fallback: try direct API endpoint
    if (farmer.farmer_id) {
      console.log('[QR] Using API endpoint for:', farmer.farmer_id);
      const baseURL = import.meta.env.VITE_API_BASE_URL || "http://13.204.83.198:8000";
      return await fetchGridFSFile(`${baseURL}/api/farmers/${farmer.farmer_id}/qr`);
    }

    console.log('[QR] No QR code available');
    return null;
  },

  /**
   * Get document URL (handles GridFS files)
   */
  async getDocumentUrl(farmer: any, docType: 'nrc' | 'land_title' | 'license' | 'certificate'): Promise<string | null> {
    if (!farmer?.documents) return null;

    const docFileId = farmer.documents[`${docType}_file_id`];
    const docPath = farmer.documents[docType];

    if (docFileId) {
      console.log(`[Document] Loading ${docType} from GridFS:`, docFileId);
      return await fetchGridFSFile(docFileId);
    }

    if (docPath) {
      console.log(`[Document] Loading ${docType} from path:`, docPath);
      return await fetchGridFSFile(docPath);
    }

    console.log(`[Document] No ${docType} document available`);
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
   * Get a farmer's QR code URL.
   * Backend: GET /api/farmers/{farmer_id}/qr
   */
  getQRCode(farmerId: string): string {
    const baseURL = api.defaults.baseURL || import.meta.env.VITE_API_BASE_URL || "http://13.204.83.198:8000";
    return `${baseURL}/farmers/${farmerId}/qr`;
  },

  /**
   * Get a QR image URL for a farmer. If the QR is stored in GridFS (file id),
   * fetch it via authenticated API and return an object URL suitable for
   * assigning to an <img> src. Caller is responsible for revoking the URL.
   */
  async getQRCodeUrl(farmer: any): Promise<string | null> {
    if (!farmer) return null;

    // If backend stored a public path, use it
    if (farmer.qr_code_path) return farmer.qr_code_path;

    // If GridFS file id is present, fetch the file with auth and return object URL
    const fileId = farmer.qr_code_file_id;
    if (fileId) {
      try {
        const resp = await api.get(`/files/${fileId}`, { responseType: 'blob' });
        const blob = new Blob([resp.data], { type: resp.headers['content-type'] || 'image/png' });
        const url = window.URL.createObjectURL(blob);
        return url;
      } catch (e) {
        console.warn('Failed to fetch QR from GridFS', e);
        return null;
      }
    }

    return null;
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
