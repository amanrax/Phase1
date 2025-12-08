// frontend/src/services/ethnicGroup.service.ts
import api from "@/utils/axios";

export interface EthnicGroup {
  _id: string;
  name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateEthnicGroupDto {
  name: string;
  is_active?: boolean;
}

export interface UpdateEthnicGroupDto {
  name?: string;
  is_active?: boolean;
}

class EthnicGroupService {
  private baseUrl = "/ethnic-groups";

  /**
   * Get all ethnic groups (active by default)
   */
  async getAll(activeOnly: boolean = true): Promise<EthnicGroup[]> {
    const response = await api.get<EthnicGroup[]>(this.baseUrl, {
      params: { active_only: activeOnly },
    });
    return response.data;
  }

  /**
   * Get a specific ethnic group by ID
   */
  async getById(id: string): Promise<EthnicGroup> {
    const response = await api.get<EthnicGroup>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Create a new ethnic group
   */
  async create(data: CreateEthnicGroupDto): Promise<EthnicGroup> {
    const response = await api.post<EthnicGroup>(this.baseUrl, data);
    return response.data;
  }

  /**
   * Update an ethnic group
   */
  async update(id: string, data: UpdateEthnicGroupDto): Promise<EthnicGroup> {
    const response = await api.put<EthnicGroup>(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  /**
   * Delete (deactivate) an ethnic group
   */
  async delete(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }
}

export const ethnicGroupService = new EthnicGroupService();
