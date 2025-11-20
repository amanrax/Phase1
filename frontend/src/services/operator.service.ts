import api from "@/utils/axios";

export const operatorService = {
  async getOperators(limit = 50, offset = 0): Promise<any> {
    // Backend uses /users/ with trailing slash and ?role=OPERATOR
    const response = await api.get(`/users/?role=OPERATOR&limit=${limit}&skip=${offset}`);
    return response.data;
  },

  async getOperator(operatorId: string): Promise<any> {
    const response = await api.get(`/users/${operatorId}`);
    return response.data;
  },

  async create(operatorData: any): Promise<any> {
    // Backend /users/ endpoint likely expects 'full_name' not 'first_name/last_name'
    // Adjust payload to match backend expectations
    const payload = {
      email: operatorData.email,
      password: operatorData.password,
      full_name: `${operatorData.first_name} ${operatorData.last_name}`.trim(),
      phone: operatorData.phone,
      role: operatorData.role || "OPERATOR",
      region: operatorData.assigned_district || operatorData.assigned_province || undefined,
      is_active: true,
    };

    const response = await api.post("/users/", payload);
    return response.data;
  },

  async update(operatorId: string, operatorData: any): Promise<any> {
    const response = await api.put(`/users/${operatorId}`, operatorData);
    return response.data;
  },

  async delete(operatorId: string): Promise<any> {
    const response = await api.delete(`/users/${operatorId}`);
    return response.data;
  },

  async activate(operatorId: string): Promise<any> {
    const response = await api.patch(`/users/${operatorId}/activate`, {});
    return response.data;
  },

  async deactivate(operatorId: string): Promise<any> {
    const response = await api.patch(`/users/${operatorId}/deactivate`, {});
    return response.data;
  },
};
