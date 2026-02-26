// frontend/src/services/reports.service.ts
// Typed API calls for all /reports/* endpoints
import axiosClient from "@/utils/axios";

export interface DashboardReport {
  total_farmers: number;
  total_operators: number;
  active_farmers: number;
  inactive_farmers: number;
  farmers_last_30_days: number;
  farmers_last_90_days: number;
  completion_rate: number;
  generated_at: string;
}

export interface RegionReport {
  region_name: string;
  total_farmers: number;
  active_farmers: number;
  registered_last_30_days: number;
  percentage_of_total: number;
}

export interface OperatorReport {
  operator_id: string;
  operator_name: string;
  total_farmers: number;
  active_farmers: number;
  monthly_registrations: number;
  performance_score: number;
}

export interface ActivityTrend {
  month: string;
  registrations: number;
  active_farmers: number;
}

export interface FarmerDetailReport {
  farmer_id: string;
  full_name: string;
  nrc_number: string;
  phone_number: string;
  province: string;
  district: string;
  operator_name: string;
  registration_date: string;
  is_active: boolean;
}

export const reportsService = {
  /** GET /reports/dashboard — summary totals */
  getDashboard: (): Promise<DashboardReport> =>
    axiosClient.get("/reports/dashboard").then((r) => r.data),

  /** GET /reports/farmers-by-region */
  getByRegion: (): Promise<RegionReport[]> =>
    axiosClient.get("/reports/farmers-by-region").then((r) => r.data),

  /** GET /reports/operator-performance */
  getOperatorPerformance: (): Promise<OperatorReport[]> =>
    axiosClient.get("/reports/operator-performance").then((r) => r.data),

  /** GET /reports/activity-trends */
  getActivityTrends: (): Promise<ActivityTrend[]> =>
    axiosClient.get("/reports/activity-trends").then((r) => r.data),

  /** GET /reports/farmers-details */
  getFarmersDetails: (): Promise<FarmerDetailReport[]> =>
    axiosClient.get("/reports/farmers-details").then((r) => r.data),
};
