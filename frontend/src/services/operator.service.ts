import api from "@/utils/axios";

export const operatorService = {
  async getOperators(limit = 50, offset = 0): Promise<any> {
    // Backend uses /operators/ endpoint
    const response = await api.get(`/operators/?limit=${limit}&skip=${offset}`);
    return response.data;
  },

  async getOperator(operatorId: string): Promise<any> {
    const response = await api.get(`/operators/${operatorId}`);
    return response.data;
  },

  async create(operatorData: any): Promise<any> {
    const payload = {
      email: operatorData.email,
      password: operatorData.password,
      full_name: `${operatorData.first_name} ${operatorData.last_name}`.trim(),
      phone: operatorData.phone,
      role: operatorData.role || "OPERATOR",
      assigned_district: operatorData.assigned_district || undefined,
      assigned_province: operatorData.assigned_province || undefined,
    };

    const response = await api.post("/operators/", payload);
    return response.data;
  },

  async update(operatorId: string, operatorData: any): Promise<any> {
    const response = await api.put(`/operators/${operatorId}`, operatorData);
    return response.data;
  },

  async delete(operatorId: string): Promise<any> {
    const response = await api.delete(`/operators/${operatorId}`);
    return response.data;
  },

  async activate(operatorId: string): Promise<any> {
    const response = await api.patch(`/operators/${operatorId}/activate`, {});
    return response.data;
  },

  async deactivate(operatorId: string): Promise<any> {
    const response = await api.patch(`/operators/${operatorId}/deactivate`, {});
    return response.data;
  },
};
