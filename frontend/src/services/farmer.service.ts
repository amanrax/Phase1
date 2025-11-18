// src/services/farmer.service.ts
import axiosClient from "@/utils/axios";

export const farmerService = {
  /**
   * Fetch a paginated list of farmers.
   * Backend: GET /api/farmers?limit=10&skip=0
   */
  async getFarmers(limit = 10, skip = 0) {
    const { data } = await axiosClient.get("/farmers/", { params: { limit, skip } });
    return data;
  },

  /**
   * Get a single farmer’s details.
   * Backend: GET /api/farmers/{farmer_id}
   */
  async getFarmer(farmerId: string) {
    if (!farmerId) throw new Error("Missing farmerId");
    const { data } = await axiosClient.get(`/farmers/${farmerId}`);
    return data;
  },

  /**
   * Create a new farmer record.
   * Backend: POST /api/farmers
   */
  async create(farmerData: Record<string, any>) {
    if (!farmerData) throw new Error("Missing farmer data");
    const { data } = await axiosClient.post("/farmers/", farmerData);
    return data;
  },

  /**
   * Update an existing farmer record.
   * Backend: PUT /api/farmers/{farmer_id}
   */
  async update(farmerId: string, farmerData: Record<string, any>) {
    if (!farmerId) throw new Error("Missing farmerId");
    if (!farmerData) throw new Error("Missing farmer data");
    const { data } = await axiosClient.put(`/farmers/${farmerId}`, farmerData);
    return data;
  },

  /**
   * Delete a farmer record.
   * Backend: DELETE /api/farmers/{farmer_id}
   */
  async delete(farmerId: string) {
    if (!farmerId) throw new Error("Missing farmerId");
    const { data } = await axiosClient.delete(`/farmers/${farmerId}`);
    return data;
  },

  /**
   * Upload a farmer’s photo.
   * Backend: POST /api/farmers/{farmer_id}/upload-photo
   */
  async uploadPhoto(farmerId: string, file: File) {
    if (!file) throw new Error("Missing file for upload");
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await axiosClient.post(
      `/farmers/${farmerId}/upload-photo`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  },

  /**
   * Trigger background ID-card generation.
   * Backend: POST /api/farmers/{farmer_id}/generate-idcard
   */
  async generateIDCard(farmerId: string) {
    if (!farmerId) throw new Error("Missing farmerId");
    const { data } = await axiosClient.post(`/farmers/${farmerId}/generate-idcard`);
    return data;
  },

  /**
   * Download an existing farmer ID card (PDF blob).
   * Backend: GET /api/farmers/{farmer_id}/download-idcard
   */
  async downloadIDCard(farmerId: string) {
    if (!farmerId) throw new Error("Missing farmerId");
    const response = await axiosClient.get(
      `/farmers/${farmerId}/download-idcard`,
      { responseType: "blob" }
    );
    return response.data; // The PDF blob
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
    const { data } = await axiosClient.post("/farmers/verify-qr", payload);
    return data;
  },
};

export default farmerService;
