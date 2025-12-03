// src/services/auth.service.ts
import axiosClient from "@/utils/axios";

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
