// frontend/src/services/changeRequests.service.ts — Change request API calls (v4.0)
import axiosClient from "@/utils/axios";
import { logger } from "@/utils/logger";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChangeRequest {
  request_id: string;
  farmer_id?: string;
  farmer_name?: string;
  field_name: string;
  old_value: string;
  new_value: string;
  reason: string;
  status: string;
  decision_note?: string;
  created_at: string;
  decided_at?: string;
}

export interface ChangeRequestCreatePayload {
  field_name: string;
  old_value: string;
  new_value: string;
  reason: string;
}

export interface ChangeRequestListResponse {
  requests: ChangeRequest[];
  total: number;
}

export interface ChangeRequestDecisionPayload {
  decision: "approved" | "rejected";
  note: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const changeRequestsService = {
  /** Farmer submits a profile change request */
  async create(payload: ChangeRequestCreatePayload): Promise<{ message: string; request_id: string; status: string }> {
    try {
      const { data } = await axiosClient.post("/change-requests", payload);
      logger.info("changeRequestsService", "Change request created");
      return data;
    } catch (err: unknown) {
      logger.error("changeRequestsService", "Failed to create change request", { err });
      throw err;
    }
  },

  /** Farmer lists own change requests */
  async listMine(statusFilter?: string): Promise<ChangeRequestListResponse> {
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await axiosClient.get<ChangeRequestListResponse>("/change-requests/my", { params });
      return data;
    } catch (err: unknown) {
      logger.error("changeRequestsService", "Failed to list my change requests", { err });
      throw err;
    }
  },

  /** Operator/admin lists pending change requests */
  async listPending(skip = 0, limit = 20): Promise<ChangeRequestListResponse> {
    try {
      const { data } = await axiosClient.get<ChangeRequestListResponse>("/change-requests/pending", {
        params: { skip, limit },
      });
      return data;
    } catch (err: unknown) {
      logger.error("changeRequestsService", "Failed to list pending requests", { err });
      throw err;
    }
  },

  /** Operator/admin approves or rejects a change request */
  async decide(
    requestId: string,
    payload: ChangeRequestDecisionPayload
  ): Promise<{ message: string; request_id: string; status: string }> {
    try {
      const { data } = await axiosClient.patch(`/change-requests/${requestId}/decide`, payload);
      logger.info("changeRequestsService", `Change request ${payload.decision}`);
      return data;
    } catch (err: unknown) {
      logger.error("changeRequestsService", "Failed to decide on change request", { err });
      throw err;
    }
  },
};
