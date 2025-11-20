// src/utils/axios.ts
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import useAuthStore from "@/store/authStore";

// Detect GitHub Codespaces environment
const isCodespaces = typeof window !== 'undefined' && window.location.hostname.endsWith('.app.github.dev');

// Build API base URL
const getApiBaseUrl = (): string => {
  // Priority 1: Environment variable
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }

  // Priority 2: Auto-detect Codespaces backend URL
  if (isCodespaces) {
    const currentUrl = window.location.hostname;
    // Replace port 5173 (frontend) with 8000 (backend)
    const backendUrl = currentUrl.replace('-5173.', '-8000.');
    return `https://${backendUrl}`;
  }

  // Priority 3: Local development fallback
  return "http://localhost:8000";
};

let API_BASE_URL = getApiBaseUrl();

if (import.meta.env.DEV) {
  console.log("[Axios] API_BASE_URL:", API_BASE_URL);
}

// ----------------------------------------
// Create axios instance
// Updated: 2025-11-17 12:50 - Fixed baseURL to include /api
// ----------------------------------------
const axiosClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// ----------------------------------------
// Add token to headers
// ----------------------------------------
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token") || useAuthStore.getState().token;

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ----------------------------------------
// Handle 401 → Refresh token flow
// ----------------------------------------
axiosClient.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken =
        localStorage.getItem("refresh_token") ||
        useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        useAuthStore.getState().logout();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        // IMPORTANT: Use raw axios to avoid infinite interceptor loop
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { "Content-Type": "application/json" } }
        );

        const newAccessToken = refreshResponse.data?.access_token;

        if (!newAccessToken) throw new Error("Invalid refresh response");

        localStorage.setItem("token", newAccessToken);
        useAuthStore.getState().setToken(newAccessToken);

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newAccessToken}`,
        };

        return axiosClient(originalRequest);
      } catch (refreshErr) {
        useAuthStore.getState().logout();
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
