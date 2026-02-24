import axios, { AxiosError, AxiosRequestConfig } from "axios";
import useAuthStore from "@/store/authStore";

// Use production API URL for mobile builds
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://automatic-doodle-wqp6gjqwxvqhggvw-8000.app.github.dev';

console.log('🌐 API Base URL:', API_BASE_URL);
console.log('🌐 Full endpoint:', `${API_BASE_URL}/api`);

// Create axios instance
const axiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    console.log('📤', config.method?.toUpperCase(), config.url);
    
    const token = localStorage.getItem('access_token') || useAuthStore.getState().token;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      
      // Update activity timestamp on each request
      useAuthStore.getState().updateActivity();
    }

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with refresh token logic
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅', response.config.method?.toUpperCase(), response.config.url, response.status);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    console.error('❌ Response Error:', error.response?.status, error.config?.url);

    // Handle 401 - Unauthorized (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token') || useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        console.log('🚪 No refresh token, logging out...');
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        console.log('🔄 Attempting token refresh...');
        
        // Use raw axios to avoid interceptor loop
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const newAccessToken = refreshResponse.data?.access_token;

        if (!newAccessToken) {
          throw new Error('Invalid refresh response');
        }

        console.log('✅ Token refreshed successfully');

        // Save new token
        localStorage.setItem('access_token', newAccessToken);
        useAuthStore.getState().setToken(newAccessToken);

        // Retry original request with new token
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newAccessToken}`,
        };

        return axiosInstance(originalRequest);
      } catch (refreshErr) {
        console.error('❌ Token refresh failed:', refreshErr);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
