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
    // IMPORTANT: Don't set Content-Type header - let axios auto-generate with boundary
    const response = await api.post(
      `/farmers/${farmerId}/upload-photo`,
      formData
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
    // IMPORTANT: Don't set Content-Type header - let axios auto-generate with boundary
    const response = await api.post(
      `/farmers/${farmerId}/documents/${docType}`,
      formData
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
    // Use GET to trigger generation as a fallback for clients/proxies
    // that may mishandle empty POST bodies. Backend accepts both GET and POST.
    const response = await api.get(`/farmers/${farmerId}/generate-idcard`);
    return response.data;
  },

  /**
   * Download an existing farmer ID card (PDF blob).
   * Backend: GET /api/farmers/{farmer_id}/download-idcard
   */
  async downloadIDCard(farmerId: string): Promise<void> {
    const response = await api.get(`/farmers/${farmerId}/download-idcard`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: "application/pdf" });
    const filename = `${farmerId}_id_card.pdf`;

    // Try native save on Capacitor (Android/iOS). If unavailable, fall back to web download.
    try {
      // dynamic import so web bundles without Capacitor still work
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor && (Capacitor.isNativePlatform && Capacitor.isNativePlatform())) {
        const { writeFile, Directory } = await import("@capacitor/filesystem");

        const blobToBase64 = (b: Blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(b);
          });

        const dataUrl = await blobToBase64(blob);
        // dataUrl is like 'data:application/pdf;base64,.....' so strip the prefix
        const base64 = dataUrl.split(",")[1];

        // Write to external directory (Android Downloads). Directory.External is recommended for Android.
        await writeFile({ path: filename, data: base64, directory: Directory.External, recursive: true });

        // On native, user-accessible path varies; show notification from caller.
        return;
      }
    } catch (e) {
      // Not running on Capacitor/native or Filesystem plugin missing — fall back to web
      // continue to web fallback
    }

    // Web fallback: trigger a browser download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
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
    const url = window.URL.createObjectURL(blob);
    // Return the URL to allow in-app viewing/navigation
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
    const baseURL = api.defaults.baseURL || "http://ziamis-alb-226056829.ap-south-1.elb.amazonaws.com";
    return `${baseURL}/farmers/${farmerId}/qr`;
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

