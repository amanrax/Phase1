// Enhanced auth service with better error handling and logging
import axiosClient from "@/utils/axios";
import { ensureApiBase, resetProbeCache } from "@/utils/networkProbe";
import { getApiBaseUrl } from "@/config/mobile";

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  user: {
    roles: string[];
    email?: string;
    name?: string;
    [key: string]: any;
  };
}

export interface AuthError {
  message: string;
  code?: string;
  details?: any;
}

class AuthService {
  private initialized = false;

  // Initialize axios base URL once
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('[auth.service] Initializing...');
      
      // Get base URL from config
      const baseUrl = getApiBaseUrl().replace(/\/+$/, "");
      console.log('[auth.service] Configured base URL:', baseUrl);

      // Set axios base
      axiosClient.defaults.baseURL = `${baseUrl}/api`;
      console.log('[auth.service] ✅ Axios baseURL set to:', axiosClient.defaults.baseURL);

      this.initialized = true;
    } catch (err) {
      console.error('[auth.service] ❌ Initialization failed:', err);
      throw new Error('Failed to initialize auth service');
    }
  }

  async login(email: string, password: string, role?: string): Promise<LoginResponse> {
    try {
      // Ensure service is initialized
      await this.initialize();

      console.log('[auth.service] Attempting login for:', email);
      console.log('[auth.service] Using endpoint:', axiosClient.defaults.baseURL);

      const payload = {
        email: email.trim().toLowerCase(),
        password,
        ...(role && { role }),
      };

      const { data } = await axiosClient.post<LoginResponse>("/auth/login", payload);

      console.log('[auth.service] ✅ Login successful');
      console.log('[auth.service] User roles:', data.user?.roles);

      return data;

    } catch (error: any) {
      console.error('[auth.service] ❌ Login failed');
      
      if (error.response) {
        // Server responded with error
        console.error('[auth.service] Server error:', error.response.status, error.response.data);
        throw {
          message: error.response.data?.detail || 'Login failed',
          code: error.response.status,
          details: error.response.data,
        } as AuthError;
      } else if (error.request) {
        // Request made but no response
        console.error('[auth.service] No response from server');
        console.error('[auth.service] Request was:', error.config?.url);
        
        // Reset probe cache to force retry on next attempt
        resetProbeCache();
        
        throw {
          message: 'Cannot reach server. Please check your internet connection.',
          code: 'NETWORK_ERROR',
        } as AuthError;
      } else {
        // Something else went wrong
        console.error('[auth.service] Unexpected error:', error.message);
        throw {
          message: error.message || 'An unexpected error occurred',
          code: 'UNKNOWN_ERROR',
        } as AuthError;
      }
    }
  }

  async getCurrentUser(): Promise<any> {
    try {
      await this.initialize();
      
      console.log('[auth.service] Fetching current user...');
      const { data } = await axiosClient.get("/auth/me");
      
      console.log('[auth.service] ✅ User fetched:', data.email || data.id);
      return data;
      
    } catch (error: any) {
      console.error('[auth.service] ❌ Failed to fetch current user:', error.message);
      throw error;
    }
  }

  async refresh(refresh_token: string): Promise<string | null> {
    try {
      await this.initialize();
      
      console.log('[auth.service] Refreshing token...');
      
      const { data } = await axiosClient.post<{ access_token: string }>(
        "/auth/refresh",
        { refresh_token }
      );
      
      console.log('[auth.service] ✅ Token refreshed');
      return data.access_token;
      
    } catch (error: any) {
      console.error('[auth.service] ❌ Token refresh failed:', error.message);
      return null;
    }
  }

  logout(): void {
    console.log('[auth.service] Logging out...');
    
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    
    // Reset initialization state
    this.initialized = false;
    
    console.log('[auth.service] ✅ Logout complete');
  }

  // Helper to check if user is authenticated
  isAuthenticated(): boolean {
    return !!(localStorage.getItem("access_token"));
  }

  // Helper to get current token
  getToken(): string | null {
    return localStorage.getItem("access_token");
  }
}

// Export singleton instance
export const authService = new AuthService();
