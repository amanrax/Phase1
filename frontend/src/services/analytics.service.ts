// src/services/analytics.service.ts
// Typed API calls for analytics/chart data endpoints (Priority 2 — Analytics Dashboard)

import axiosClient from "@/utils/axios";
import { logger } from "@/utils/logger";

// ─── Response types ──────────────────────────────────────────────────────────

export interface MonthlyRegistration {
  month: string;
  farmers: number;
}

export interface FarmersByProvince {
  province: string;
  farmers: number;
}

export interface FarmersByDistrict {
  district: string;
  farmers: number;
}

export interface CropsDistribution {
  crop: string;
  count: number;
}

export interface LivestockDistribution {
  animal: string;
  count: number;
}

export interface StatusBreakdown {
  status: string;
  count: number;
}

export interface FullAnalytics {
  monthly_registrations: MonthlyRegistration[];
  farmers_by_province: FarmersByProvince[];
  farmers_by_district: FarmersByDistrict[];
  crops_distribution: CropsDistribution[];
  livestock_distribution: LivestockDistribution[];
  status_breakdown: StatusBreakdown[];
  generated_at: string;
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

// ─── Service ─────────────────────────────────────────────────────────────────

export const analyticsService = {
  /**
   * Full chart-ready analytics with Redis caching (15-min TTL).
   * Backend: GET /api/dashboard/analytics
   */
  async getFullAnalytics(): Promise<FullAnalytics> {
    try {
      const { data } = await axiosClient.get<FullAnalytics>("/dashboard/analytics");
      logger.info("analyticsService", "Full analytics loaded");
      return data;
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { status?: number } };
      logger.error("analyticsService", "Failed to load full analytics", {
        error: e?.message,
        status: e?.response?.status,
      });
      throw err;
    }
  },

  /**
   * Farmer counts grouped by province and district.
   * Backend: GET /api/reports/farmers-by-region
   */
  async getFarmersByRegion(): Promise<{ generated_at: string; regions: FarmerByRegion[] }> {
    try {
      const { data } = await axiosClient.get("/reports/farmers-by-region");
      return data;
    } catch (err: unknown) {
      const e = err as { message?: string };
      logger.error("analyticsService", "Failed to load farmers-by-region", { error: e?.message });
      throw err;
    }
  },

  /**
   * Operator performance stats (total farmers + last-30-day registrations).
   * Backend: GET /api/reports/operator-performance
   */
  async getOperatorPerformance(): Promise<{ generated_at: string; operators: OperatorPerformance[] }> {
    try {
      const { data } = await axiosClient.get("/reports/operator-performance");
      return data;
    } catch (err: unknown) {
      const e = err as { message?: string };
      logger.error("analyticsService", "Failed to load operator performance", { error: e?.message });
      throw err;
    }
  },

  /**
   * Daily registration counts for the past 14 days.
   * Backend: GET /api/reports/activity-trends
   */
  async getActivityTrends(): Promise<{ generated_at: string; trends: ActivityTrend[] }> {
    try {
      const { data } = await axiosClient.get("/reports/activity-trends");
      return data;
    } catch (err: unknown) {
      const e = err as { message?: string };
      logger.error("analyticsService", "Failed to load activity trends", { error: e?.message });
      throw err;
    }
  },
};

export default analyticsService;
