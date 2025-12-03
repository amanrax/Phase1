// src/services/geo.service.ts
import axiosClient from "@/utils/axios";

const geoService = {
  async provinces() {
    const { data } = await axiosClient.get("/geo/provinces");
    // Transform API response to match frontend format
    return data.map((p: any) => ({
      code: p.province_code,
      name: p.province_name,
    }));
  },

  async districts(province_code?: string) {
    const { data } = await axiosClient.get("/geo/districts", {
      params: province_code ? { province_code } : {},
    });
    // Transform API response to match frontend format
    return data.map((d: any) => ({
      code: d.district_code,
      name: d.district_name,
    }));
  },

  async chiefdoms(district_code?: string) {
    const { data } = await axiosClient.get("/geo/chiefdoms", {
      params: district_code ? { district_code } : {},
    });
    // Transform API response to match frontend format
    return data.map((c: any) => ({
      code: c.chiefdom_code,
      name: c.chiefdom_name,
    }));
  },

  // Custom geo creation endpoints
  async createCustomProvince(name: string) {
    const { data } = await axiosClient.post("/geo/custom/provinces", { name });
    return {
      code: data.province_code,
      name: data.province_name,
    };
  },

  async createCustomDistrict(province_code: string, name: string) {
    const { data } = await axiosClient.post("/geo/custom/districts", {
      province_code,
      name,
    });
    return {
      code: data.district_code,
      name: data.district_name,
    };
  },

  async createCustomChiefdom(district_code: string, name: string) {
    const { data } = await axiosClient.post("/geo/custom/chiefdoms", {
      district_code,
      name,
    });
    return {
      code: data.chiefdom_code,
      name: data.chiefdom_name,
    };
  },
};

export default geoService;
