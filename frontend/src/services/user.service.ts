// src/services/user.service.ts
import axiosClient from "@/utils/axios";

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  region?: string;
  roles: string[];
}

export const userService = {
  /**
   * Get all users (operators) - Admin only
   */
  async getUsers(params?: { skip?: number; limit?: number; role?: string }) {
    const { data } = await axiosClient.get<User[]>("/users/", { params });
    return data;
  },

  /**
   * Create new operator - Admin only
   */
  async createOperator(userData: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    region?: string;
  }) {
    const { data } = await axiosClient.post<User>("/users/", {
      ...userData,
      roles: ["OPERATOR"],
    });
    return data;
  },

  /**
   * Update operator
   */
  async updateOperator(userId: string, updates: Partial<User>) {
    const { data } = await axiosClient.put<User>(`/users/${userId}`, updates);
    return data;
  },

  /**
   * Deactivate operator (DEPRECATED - use updateUserStatus instead)
   */
  async deactivateOperator(userId: string) {
    const { data } = await axiosClient.patch(`/users/${userId}/deactivate`);
    return data;
  },

  /**
   * Update user status (activate/deactivate)
   */
  async updateUserStatus(email: string, is_active: boolean) {
    const { data } = await axiosClient.patch(`/users/${email}/status`, { is_active });
    return data;
  },

  /**
   * Delete user account
   */
  async deleteUser(email: string) {
    const { data } = await axiosClient.delete(`/users/${email}`);
    return data;
  },
};

export default userService;
