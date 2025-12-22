import api from "@/utils/axios";

export const operatorService = {
  async getOperators(limit = 50, offset = 0): Promise<any> {
    // Backend uses /operators/ endpoint
    // Add a timestamp query param to bust caches (CDN/proxy) after mutations
    const cacheBuster = `t=${Date.now()}`;
    const response = await api.get(`/operators/?limit=${limit}&skip=${offset}&${cacheBuster}`);
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
      assigned_districts: operatorData.assigned_districts || [],
      assigned_regions: operatorData.assigned_regions || [],
    };

    const response = await api.post("/operators/", payload);
    return response.data;
  },

  async update(operatorId: string, operatorData: any): Promise<any> {
    // Transform payload to match backend schema
    const payload: any = {};
    
    if (operatorData.full_name !== undefined) payload.full_name = operatorData.full_name;
    if (operatorData.phone !== undefined) payload.phone = operatorData.phone;
    if (operatorData.is_active !== undefined) payload.is_active = operatorData.is_active;
    
    // Backend expects assigned_districts (array), not assigned_district (string)
    if (operatorData.assigned_district !== undefined) {
      payload.assigned_districts = operatorData.assigned_district ? [operatorData.assigned_district] : [];
    } else if (operatorData.assigned_districts !== undefined) {
      payload.assigned_districts = operatorData.assigned_districts;
    }
    
    if (operatorData.assigned_regions !== undefined) {
      payload.assigned_regions = operatorData.assigned_regions;
    }
    
    const response = await api.put(`/operators/${operatorId}`, payload);
    return response.data;
  },

  async delete(operatorId: string): Promise<any> {
    const response = await api.delete(`/operators/${operatorId}`);
    return response.data;
  },
};
