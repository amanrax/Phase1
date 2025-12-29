// src/store/authStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authService } from "@/services/auth.service";

export interface AuthState {
  user: any | null;
  token: string | null;
  refreshToken: string | null;
  roles: string[];
  role: string | null;
  isLoading: boolean;
  error: string | null;
  lastActivity: number;
  showTimeoutWarning: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  setToken: (token: string) => void;
  updateActivity: () => void;
  setShowTimeoutWarning: (show: boolean) => void;
  extendSession: () => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      roles: [],
      role: null,
      isLoading: false,
      error: null,
      lastActivity: Date.now(),
      showTimeoutWarning: false,

      // ---------- FIXED LOGIN ----------
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(email, password);

          const userRoles = response.user?.roles || [];
          // Normalize role strings to uppercase to match backend role checks
          const normalizedRoles = userRoles.map((r: any) =>
            typeof r === "string" ? r.toUpperCase() : r
          );
          const primaryRole = normalizedRoles.length > 0 ? normalizedRoles[0] : null;

          localStorage.setItem("token", response.access_token);
          if (response.refresh_token) {
            localStorage.setItem("refresh_token", response.refresh_token);
          }

          set({
            user: response.user,
            token: response.access_token,
            refreshToken: response.refresh_token || null,
            roles: normalizedRoles,
            role: primaryRole,
            isLoading: false,
            error: null,
            lastActivity: Date.now(),
          });
        } catch (error: any) {
          let message = "Login failed. Please try again.";

          const detail = error?.response?.data?.detail;
          if (Array.isArray(detail)) {
            message = detail[0]?.msg || message;
          } else if (typeof detail === "string") {
            message = detail;
          }

          alert(`Login Error: ${message}`);

          set({
            error: message,
            isLoading: false,
          });

          throw error;
        }
      },

      logout: () => {
        authService.logout();
        set({
          user: null,
          token: null,
          refreshToken: null,
          roles: [],
          role: null,
          error: null,
        });
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        sessionStorage.clear();
      },

      loadUser: async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        set({ isLoading: true });
        try {
          const user = await authService.getCurrentUser();
          const userRoles = user?.roles || [];
          const normalizedRoles = userRoles.map((r: any) =>
            typeof r === "string" ? r.toUpperCase() : r
          );

          set({
            user,
            roles: normalizedRoles,
            role: normalizedRoles[0] || null,
            token,
            isLoading: false,
            error: null,
          });
        } catch {
          set({ isLoading: false, error: "Failed to load user." });
          localStorage.removeItem("token");
        }
      },

      refreshAccessToken: async () => {
        const refreshToken =
          localStorage.getItem("refresh_token") || get().refreshToken;
        if (!refreshToken) return null;

        try {
          const newToken = await authService.refresh(refreshToken);
          if (newToken) {
            set({ token: newToken });
            localStorage.setItem("token", newToken);
            return newToken;
          }
        } catch {
          get().logout();
        }
        return null;
      },

      setToken: (token: string) => set({ token }),
      
      updateActivity: () => set({ lastActivity: Date.now(), showTimeoutWarning: false }),
      
      setShowTimeoutWarning: (show: boolean) => set({ showTimeoutWarning: show }),
      
      extendSession: () => set({ lastActivity: Date.now(), showTimeoutWarning: false }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        roles: state.roles,
        role: state.role,
      }),
      // Normalize roles to uppercase when loading from localStorage
      onRehydrateStorage: () => (state) => {
        if (state?.roles && Array.isArray(state.roles)) {
          state.roles = state.roles.map((r: any) =>
            typeof r === "string" ? r.toUpperCase() : r
          );
          if (state.roles.length > 0) {
            state.role = state.roles[0];
          }
        }
      },
    }
  )
);

export default useAuthStore;
