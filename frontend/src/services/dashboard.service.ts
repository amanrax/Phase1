// src/services/dashboard.service.ts
import axiosClient from "@/utils/axios";

export interface DashboardStats {
  farmers: {
    total: number;
    active: number;
    pending: number;
    rejected: number;
    recent?: Array<{
      farmer_id: string;
      name: string;
      district: string;
      created_at: string;
    }>;
  };
  users_total: number;
  admins: number;
  operators_total: number;
  generated_at: string;
}

export const dashboardService = {
  /**
   * Get dashboard statistics.
   * Backend: GET /api/dashboard/stats
   */
  async getStats(): Promise<DashboardStats> {
    const { data } = await axiosClient.get<DashboardStats>("/dashboard/stats");
    return data;
  },
};

export default dashboardService;
