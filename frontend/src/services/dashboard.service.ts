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

export interface ReportDashboard {
  timestamp: string;
  metrics: {
    farmers_total: number;
    operators_total: number;
    users_total: number;
    farmers_registered_this_month: number;
  };
}

export interface FarmerByRegion {
  province: string;
  district: string;
  farmer_count: number;
}

export interface OperatorPerformance {
  operator_id: string;
  operator_name: string;
  email: string;
  total_farmers: number;
  recent_farmers_30d: number;
}

export interface ActivityTrend {
  date: string;
  registrations: number;
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

  /**
   * Get admin dashboard report summary.
   * Backend: GET /api/reports/dashboard
   */
  async getDashboardReport(): Promise<ReportDashboard> {
    const { data } = await axiosClient.get<ReportDashboard>("/reports/dashboard");
    return data;
  },

  /**
   * Get farmers breakdown by region.
   * Backend: GET /api/reports/farmers-by-region
   */
  async getFarmersByRegion(): Promise<{ generated_at: string; regions: FarmerByRegion[] }> {
    const { data } = await axiosClient.get("/reports/farmers-by-region");
    return data;
  },

  /**
   * Get operator performance metrics.
   * Backend: GET /api/reports/operator-performance
   */
  async getOperatorPerformance(): Promise<{ generated_at: string; operators: OperatorPerformance[] }> {
    const { data } = await axiosClient.get("/reports/operator-performance");
    return data;
  },

  /**
   * Get activity trends (last 14 days).
   * Backend: GET /api/reports/activity-trends
   */
  async getActivityTrends(): Promise<{ generated_at: string; trends: ActivityTrend[] }> {
    const { data } = await axiosClient.get("/reports/activity-trends");
    return data;
  },
};

export default dashboardService;
