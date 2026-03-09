// frontend/src/services/notifications.service.ts — Notification API calls (v4.0)
import axiosClient from "@/utils/axios";
import { logger } from "@/utils/logger";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const notificationsService = {
  async list(unreadOnly = false, skip = 0, limit = 30): Promise<NotificationsResponse> {
    try {
      const { data } = await axiosClient.get<NotificationsResponse>("/notifications", {
        params: { unread_only: unreadOnly, skip, limit },
      });
      return data;
    } catch (err: unknown) {
      logger.error("notificationsService", "Failed to list notifications", { err });
      throw err;
    }
  },

  async getUnreadCount(): Promise<number> {
    try {
      const { data } = await axiosClient.get<UnreadCountResponse>("/notifications/unread-count");
      return data.unread_count;
    } catch (err: unknown) {
      logger.error("notificationsService", "Failed to get unread count", { err });
      throw err;
    }
  },

  async markAsRead(notificationId: string): Promise<void> {
    await axiosClient.patch(`/notifications/${notificationId}/read`);
  },

  async markAllRead(): Promise<void> {
    await axiosClient.patch("/notifications/mark-all-read");
  },

  async deleteNotification(notificationId: string): Promise<void> {
    await axiosClient.delete(`/notifications/${notificationId}`);
  },
};
