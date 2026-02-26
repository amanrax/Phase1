// frontend/src/utils/axios.ts
// Axios instance with auth interceptors and global error toasts
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import useAuthStore from "@/store/authStore";
import { logger } from "@/utils/logger";
import { globalToast } from "@/utils/globalToast";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://automatic-doodle-wqp6gjqwxvqhggvw-8000.app.github.dev";

const axiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor ──────────────────────────────────────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("access_token") || useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      useAuthStore.getState().updateActivity();
    }
    return config;
  },
  (error) => {
    logger.error("axios", "Request setup failed", { error: error?.message });
    return Promise.reject(error);
  }
);

// ── Response interceptor ─────────────────────────────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };
    const status = error.response?.status;

    logger.error(
      "axios",
      `HTTP ${status ?? "ERR"} ${error.config?.url ?? ""}`,
      {
        status,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
      }
    );

    // 401 — try token refresh, then force logout
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken =
        localStorage.getItem("refresh_token") ||
        useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        useAuthStore.getState().logout();
        globalToast.error("Session expired. Please log in again.");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { "Content-Type": "application/json" } }
        );
        const newAccessToken = refreshResponse.data?.access_token;
        if (!newAccessToken) throw new Error("Invalid refresh response");

        localStorage.setItem("access_token", newAccessToken);
        useAuthStore.getState().setToken(newAccessToken);

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newAccessToken}`,
        };
        return axiosInstance(originalRequest);
      } catch (refreshErr) {
        logger.error("axios", "Token refresh failed, logging out", {
          error: (refreshErr as Error)?.message,
        });
        useAuthStore.getState().logout();
        globalToast.error("Session expired. Please log in again.");
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      }
    }

    // 403 — access denied
    if (status === 403) {
      globalToast.error("Access denied.");
    }

    // 404 — resource not found
    if (status === 404) {
      globalToast.warning("Resource not found.");
    }

    // 5xx — server error
    if (status !== undefined && status >= 500) {
      globalToast.error("Something went wrong. Please try again.");
    }

    return Promise.reject(error);
  }
);

// ── Friendly error message helper ────────────────────────────────────────────
export function getFriendlyError(error: unknown): string {
  const e = error as {
    response?: { status?: number; data?: { detail?: unknown } };
    code?: string;
    message?: string;
  };
  const status = e?.response?.status;
  if (status === 401) return "Session expired. Please log in again.";
  if (status === 403) return "Access denied. You don't have permission.";
  if (status === 404) return "Resource not found.";
  if (status === 422) {
    const detail = e?.response?.data?.detail;
    if (Array.isArray(detail))
      return (detail[0] as { msg?: string })?.msg ?? "Validation error.";
    return "Validation error. Please check your input.";
  }
  if (status !== undefined && status >= 500)
    return "Server error. Please try again later.";
  if (e?.code === "ECONNABORTED")
    return "Request timed out. Check your connection.";
  if (!e?.response) return "Network error. Please check your connection.";
  const detail = e?.response?.data?.detail;
  return (typeof detail === "string" ? detail : e?.message) ??
    "An unexpected error occurred.";
}

export default axiosInstance;
