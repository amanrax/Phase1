// src/services/dashboard.service.ts
import axiosClient from "@/utils/axios";

export const dashboardService = {
  /**
   * Get dashboard statistics.
   * Backend: GET /api/dashboard/stats
   */
  async getStats() {
    const { data } = await axiosClient.get("/dashboard/stats");
    return data;
  },
};

export default dashboardService;
