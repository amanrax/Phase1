// src/services/dashboard.service.ts
import axiosClient from "@/utils/axios";
import { logger } from "@/utils/logger";

export interface DashboardStats {
  farmers: {
    total: number;
    active: number;
    inactive: number;
    verified: number;
    pending: number;
    rejected: number;
    needs_attention: number;
    recent: Array<{
      farmer_id: string;
      name: string;
      district: string;
      created_at: string;
      registration_status: string;
      is_active: boolean;
    }>;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    by_role: {
      admin: number;
      operator: number;
      farmer: number;
    };
  };
  operators: {
    total: number;
    active: number;
    inactive: number;
  };
  system: {
    total_entities: number;
    needs_attention: number;
  };
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
    try {
      const { data } = await axiosClient.get<DashboardStats>("/dashboard/stats");
      logger.info("dashboardService", "Stats loaded", { farmers: data?.farmers?.total });
      return data;
    } catch (err: any) {
      logger.error("dashboardService", "Failed to load stats", { error: err?.message, status: err?.response?.status });
      throw err;
    }
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
   * Get dashboard stats (alias for getDashboardReport)
   * Returns the same data but with logging
   */
  async getDashboardStats(): Promise<ReportDashboard> {
    try {
      const data = await this.getDashboardReport();
      logger.info("dashboardService", "Dashboard report loaded");
      return data;
    } catch (error: any) {
      logger.error("dashboardService", "Failed to fetch dashboard stats", { error: error?.message });
      throw error;
    }
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

  /**
   * Get rich analytics data for charts.
   * Backend: GET /api/dashboard/analytics
   */
  async getAnalytics(): Promise<{
    monthly_registrations: { month: string; farmers: number }[];
    farmers_by_province: { province: string; farmers: number }[];
    farmers_by_district: { district: string; farmers: number }[];
    crops_distribution: { crop: string; count: number }[];
    livestock_distribution: { animal: string; count: number }[];
    status_breakdown: { status: string; count: number }[];
    generated_at: string;
  }> {
    const { data } = await axiosClient.get("/dashboard/analytics");
    return data;
  },
};

export default dashboardService;
