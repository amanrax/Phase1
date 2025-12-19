// src/services/auth.service.ts
import axiosClient from "@/utils/axios";
import { ensureApiBase } from "@/utils/networkProbe";

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
    // Ensure we are using a reachable API base (tries http then https)
    try {
      const base = await ensureApiBase();
      // Set axiosClient baseURL if not already set (axios instance exports defaults)
      if (!axiosClient.defaults.baseURL || !axiosClient.defaults.baseURL.includes(base)) {
        axiosClient.defaults.baseURL = `${base}/api`;
        console.log('[auth.service] axios baseURL set to', axiosClient.defaults.baseURL);
      }
    } catch (err) {
      console.error('[auth.service] Backend unreachable:', err);
      // let the request proceed so UI shows network error; we could throw to stop
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
