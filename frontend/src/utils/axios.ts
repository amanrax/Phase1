// src/utils/axios.ts
import axios from 'axios';

// Use Vite environment variables for the API base URL.
// VITE_API_BASE_URL should be defined in your .env files (e.g., .env.development, .env.production).
// Fallback to a default for local development if not set.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://13.204.83.198:8000';

const axiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,  // Important: /api suffix
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);

export default axiosInstance;
