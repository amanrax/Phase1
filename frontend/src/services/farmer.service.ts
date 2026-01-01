// src/services/farmer.service.ts
import api from "@/utils/axios";

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
   * Get a single farmer’s details.
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
   * Upload a farmer’s photo.
   * Backend: POST /api/farmers/{farmer_id}/upload-photo
   */
  async uploadPhoto(farmerId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(
      `/farmers/${farmerId}/upload-photo`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  },

  /**
   * Upload a farmer’s document.
   * Backend: POST /api/farmers/{farmer_id}/upload-document
   */
  async uploadDocument(
    farmerId: string,
    docType: "nrc" | "land_title" | "license" | "certificate",
    file: File
  ): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(
      `/farmers/${farmerId}/documents/${docType}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  },

  /**
   * Delete a farmer’s photo.
   * Backend: DELETE /api/farmers/{farmer_id}/photo
   */
  async deletePhoto(farmerId: string): Promise<any> {
    const response = await api.delete(`/farmers/${farmerId}/photo`);
    return response.data;
  },

  /**
   * Delete a farmer’s document.
   * Backend: DELETE /api/farmers/{farmer_id}/documents/{doc_type}
   */
  async deleteDocument(farmerId: string, docType: string): Promise<any> {
    const response = await api.delete(
      `/farmers/${farmerId}/documents/${docType}`
    );
    return response.data;
  },

  /**
   * Trigger background ID-card generation.
   * Backend: POST /api/farmers/{farmer_id}/generate-idcard
   */
  async generateIDCard(farmerId: string): Promise<any> {
    const response = await api.post(`/farmers/${farmerId}/generate-idcard`);
    return response.data;
  },

  /**
   * Download an existing farmer ID card (PDF blob).
   * Backend: GET /api/farmers/{farmer_id}/download-idcard
   */
  async downloadIDCard(farmerId: string): Promise<string | void> {
    const response = await api.get(`/farmers/${farmerId}/download-idcard`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });

    // Try native save on Capacitor
    try {
      const { Capacitor } = await import("@capacitor/core");

      if (Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
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
        const timestamp = new Date().getTime();
        const filename = `Farmer_${farmerId}_ID_Card_${timestamp}.pdf`;

        // Try to save directly to Downloads/CEM directory (visible in file manager)
        try {
          const result = await Filesystem.writeFile({
            path: `CEM/${filename}`,
            data: base64,
            directory: Directory.External,
          });

          console.log('✅ File saved to Documents:', (result as any).uri || filename);
          return filename;
        } catch (err) {
          console.error('Failed to save to External/CEM, trying without subfolder:', err);

          // Fallback: try External directory without subfolder
          try {
            const result = await Filesystem.writeFile({
              path: filename,
              data: base64,
              directory: Directory.External,
            });

            console.log('✅ File saved to External/Download:', (result as any).uri || filename);
            return filename;
          } catch (extErr) {
            console.error('External storage also failed:', extErr);
            throw new Error('Failed to save file. Please check storage permissions.');
          }
        }
      }
    } catch (e) {
      console.error('❌ Native save failed:', e);
      // Fall through to web download
    }

    // Web fallback: browser download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Farmer_${farmerId}_ID_Card.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async viewIDCard(farmerId: string): Promise<string> {
    const response = await api.get(`/farmers/${farmerId}/download-idcard`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: "application/pdf" });

    // For native mobile WebViews blob URLs may be unreliable in iframes.
    // Return a base64 data URL when running on Capacitor to improve compatibility.
    try {
      const capCoreModule = "@capacitor/core";
      const { Capacitor } = await import(capCoreModule as any);
      if (Capacitor && (Capacitor.isNativePlatform && Capacitor.isNativePlatform())) {
        const toBase64 = (b: Blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(b);
          });

        const dataUrl = await toBase64(blob); // already includes the data:...prefix
        return dataUrl;
      }
    } catch (e) {
      // ignore and fallback to blob URL
    }

    const url = window.URL.createObjectURL(blob);
    return url;
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
   * Get a farmer’s QR code URL.
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

