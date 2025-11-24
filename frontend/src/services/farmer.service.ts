// src/services/farmer.service.ts
import api from "@/utils/axios";

export const farmerService = {
  /**
   * Fetch a paginated list of farmers.
   * Backend: GET /api/farmers?limit=10&skip=0
   */
  async getFarmers(limit = 10, skip = 0) {
    const { data } = await api.get("/farmers/", { params: { limit, skip } });
    return data;
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
  async downloadIDCard(farmerId: string): Promise<void> {
    const response = await api.get(`/farmers/${farmerId}/download-idcard`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${farmerId}_id_card.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async viewIDCard(farmerId: string): Promise<void> {
    const response = await api.get(`/farmers/${farmerId}/download-idcard`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    window.open(url, "_blank");
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
    const baseURL = api.defaults.baseURL || import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    return `${baseURL}/farmers/${farmerId}/qr`;
  },
};

export default farmerService;
