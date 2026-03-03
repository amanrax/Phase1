// frontend/src/services/verification.service.ts
// API calls for P2 document verification and farmer status management
import axios from "@/utils/axios";

export interface VerificationDocument {
  doc_type: string;
  url: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  uploaded_at?: string;
}

export interface FarmerDocumentsResponse {
  farmer_id: string;
  registration_status: string;
  verification_status?: string;
  documents: VerificationDocument[];
}

export interface UpdateStatusPayload {
  status: string;
  notes?: string;
}

const BASE = "/api/farmers";

export const verificationService = {
  /** Get all documents for a farmer with per-document verification status */
  async getDocuments(farmerId: string): Promise<FarmerDocumentsResponse> {
    const { data } = await axios.get<FarmerDocumentsResponse>(
      `${BASE}/${farmerId}/documents`
    );
    return data;
  },

  /** Approve a single document */
  async approveDocument(
    farmerId: string,
    docType: string
  ): Promise<{ status: string }> {
    const { data } = await axios.post(
      `${BASE}/${farmerId}/documents/${docType}/verify`
    );
    return data;
  },

  /** Reject a single document with a required reason */
  async rejectDocument(
    farmerId: string,
    docType: string,
    reason: string
  ): Promise<{ status: string; reason: string }> {
    const { data } = await axios.post(
      `${BASE}/${farmerId}/documents/${docType}/reject`,
      { reason }
    );
    return data;
  },

  /** Update the farmer's overall verification status */
  async updateStatus(
    farmerId: string,
    payload: UpdateStatusPayload
  ): Promise<{ verification_status: string }> {
    const { data } = await axios.post(
      `${BASE}/${farmerId}/status`,
      payload
    );
    return data;
  },
};
