// frontend/src/utils/axios.ts
// Axios instance with auth interceptors and global error toasts
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import useAuthStore from "@/store/authStore";
import { logger } from "@/utils/logger";
import { globalToast } from "@/utils/globalToast";
import { getApiBaseUrl } from "@/config/mobile";
import { ensureApiBase, resetProbeCache } from "@/utils/networkProbe";

const API_BASE_URL = getApiBaseUrl();
const SLOW_REQUEST_MS = 8000;
const SLOW_TOAST_COOLDOWN_MS = 60_000;
let lastSlowToastAt = 0;

type TimedAxiosRequestConfig = AxiosRequestConfig & {
  metadata?: {
    startedAt: number;
  };
};

const extractFieldLevelMessage = (detail: unknown): string | null => {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { loc?: unknown[]; msg?: string };
    const loc = Array.isArray(first?.loc) ? first.loc.join(".") : "field";
    const msg = first?.msg || "Invalid value";
    return `${loc}: ${msg}`;
  }
  if (detail && typeof detail === "object") {
    const obj = detail as Record<string, unknown>;
    const entries = Object.entries(obj);
    if (entries.length > 0) {
      const [key, value] = entries[0];
      if (typeof value === "string") return `${key}: ${value}`;
    }
  }
  return null;
};

const maybeWarnSlowNetwork = (durationMs: number) => {
  if (durationMs < SLOW_REQUEST_MS) return;
  const now = Date.now();
  if (now - lastSlowToastAt < SLOW_TOAST_COOLDOWN_MS) return;
  lastSlowToastAt = now;
  globalToast.warning("Slow connection detected. Requests may take longer than usual.");
};

const axiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor ──────────────────────────────────────────────────────
axiosInstance.interceptors.request.use(
  async (config) => {
    const timedConfig = config as TimedAxiosRequestConfig;
    timedConfig.metadata = { startedAt: Date.now() };
    const token =
      localStorage.getItem("access_token") || useAuthStore.getState().token;
    try {
      const baseUrl = await ensureApiBase();
      config.baseURL = `${baseUrl}/api`;
    } catch (probeError) {
      logger.warn("axios", "API base probe failed during request setup", {
        error: (probeError as Error)?.message,
      });
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      useAuthStore.getState().updateActivity();
    }
    return timedConfig;
  },
  (error) => {
    logger.error("axios", "Request setup failed", { error: error?.message });
    return Promise.reject(error);
  }
);

// ── Response interceptor ─────────────────────────────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => {
    const timedConfig = response.config as TimedAxiosRequestConfig;
    const startedAt = timedConfig.metadata?.startedAt;
    if (typeof startedAt === "number") {
      maybeWarnSlowNetwork(Date.now() - startedAt);
    }
    return response;
  },
  async (error: AxiosError) => {
    // AbortController cancels produce no response — log at debug level and skip
    if (
      error.code === "ERR_CANCELED" ||
      error.name === "AbortError" ||
      error.message === "canceled"
    ) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };
    const timedRequest = originalRequest as TimedAxiosRequestConfig;
    const startedAt = timedRequest.metadata?.startedAt;
    if (typeof startedAt === "number") {
      maybeWarnSlowNetwork(Date.now() - startedAt);
    }
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

    if (!error.response) {
      resetProbeCache();
    }

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

    // 400 — bad request with field-level detail where available
    if (status === 400) {
      const detail =
        (error.response?.data as { detail?: unknown } | undefined)?.detail;
      const fieldMsg = extractFieldLevelMessage(detail);
      globalToast.error(fieldMsg || "Please correct the highlighted fields and try again.");
    }

    // 409 — conflict (duplicate/update race)
    if (status === 409) {
      const detail =
        (error.response?.data as { detail?: unknown } | undefined)?.detail;
      const detailText = typeof detail === "string" ? detail : "";
      const duplicateNrc = /nrc|already\s+registered|duplicate/i.test(detailText);
      globalToast.error(
        duplicateNrc
          ? "This NRC is already registered."
          : detailText || "Conflict detected. Please refresh and try again."
      );
    }

    // 413 — payload too large (file uploads)
    if (status === 413) {
      globalToast.error("File is too large. Maximum allowed size is 10 MB.");
    }

    // 503 — explicit service unavailable copy
    if (status === 503) {
      globalToast.error("Service unavailable. Please check your connection.");
    }

    // Other 5xx — server error
    if (status !== undefined && status >= 500 && status !== 503) {
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
  if (status === 400) {
    const detail = e?.response?.data?.detail;
    return extractFieldLevelMessage(detail) || "Please correct the highlighted fields and try again.";
  }
  if (status === 409) {
    const detail = e?.response?.data?.detail;
    if (typeof detail === "string" && /nrc|already\s+registered|duplicate/i.test(detail)) {
      return "This NRC is already registered.";
    }
    return typeof detail === "string"
      ? detail
      : "Conflict detected. Please refresh and try again.";
  }
  if (status === 413) return "File is too large. Maximum allowed size is 10 MB.";
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
