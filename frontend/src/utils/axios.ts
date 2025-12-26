// src/utils/axios.ts
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import useAuthStore from "@/store/authStore";

// Use Vite environment variables for the API base URL.
// VITE_API_BASE_URL should be defined in your .env files (e.g., .env.development, .env.production).
// Fallback to a default for local development if not set.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║              AXIOS INSTANCE - API URL DEBUG               ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('[Axios] API_BASE_URL:', API_BASE_URL);
console.log('[Axios] Full endpoint will be:', `${API_BASE_URL}/api`);
console.log('[Axios] Is mobile?', !!(window as any).Capacitor);

// ----------------------------------------
// Create axios instance
// Updated: 2025-11-17 12:50 - Fixed baseURL to include /api
// ----------------------------------------
const axiosClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000, // 30 seconds for mobile
  headers: { "Content-Type": "application/json" },
});

// Log every request
axiosClient.interceptors.request.use(
  (config) => {
    console.log('🌐 [Axios Request]', config.method?.toUpperCase(), config.url);
    console.log('   Base URL:', config.baseURL);
    console.log('   Full URL:', `${config.baseURL}${config.url}`);
    
    const token = localStorage.getItem("token") || useAuthStore.getState().token;

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
      
      // Update activity timestamp on each request
      useAuthStore.getState().updateActivity();
    }

    return config;
  },
  (error) => {
    console.error('❌ [Axios Request Error]', error);
    return Promise.reject(error);
  }
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
