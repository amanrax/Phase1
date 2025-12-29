// src/services/auth.service.ts
import axiosClient from "@/utils/axios";
import { ensureApiBase } from "@/utils/networkProbe";
import { getApiBaseUrl } from "@/config/mobile";

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  user: {
    roles: string[];
    [key: string]: any;
  };
}

export const authService = {
  async login(email: string, password: string, role?: string): Promise<LoginResponse> {
    // Set axios base synchronously from config so login doesn't block the UI.
    // Run the network probe in background to correct protocol if needed.
    try {
      const candidate = getApiBaseUrl().replace(/\/$/, "");
      if (!axiosClient.defaults.baseURL || !axiosClient.defaults.baseURL.includes(candidate)) {
        axiosClient.defaults.baseURL = `${candidate}/api`;
        console.log('[auth.service] axios baseURL set to', axiosClient.defaults.baseURL);
      }
      // Fire-and-forget: probe and update base if probe finds a different reachable protocol
      ensureApiBase()
        .then((base) => {
          if (base && !axiosClient.defaults.baseURL.includes(base)) {
            axiosClient.defaults.baseURL = `${base}/api`;
            console.log('[auth.service] axios baseURL updated after probe to', axiosClient.defaults.baseURL);
          }
        })
        .catch(() => {
          // ignore probe errors - will surface on request failure
        });
    } catch (err) {
      console.error('[auth.service] Failed to set baseURL from config:', err);
    }

    const { data } = await axiosClient.post<LoginResponse>("/auth/login", {
      email,
      password,
      role,
    });
    return data;
  },

  async getCurrentUser(): Promise<any> {
    const { data } = await axiosClient.get("/auth/me");
    return data;
  },

  async refresh(refresh_token: string): Promise<string | null> {
    try {
      const { data } = await axiosClient.post<{ access_token: string }>(
        "/auth/refresh",
        { refresh_token }
      );
      return data.access_token;
    } catch (error) {
      return null;
    }
  },

  logout(): void {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
  },
};
