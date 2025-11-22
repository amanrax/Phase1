// src/types/types.ts

export interface PersonalInfo {
  first_name: string;
  last_name: string;
  phone_primary: string;
  phone_secondary?: string;
  email?: string;
  nrc?: string;
  date_of_birth?: string; // ISO Date string preferred
  gender?: "Male" | "Female" | "Other"; // can be extended with enums
}

export interface Address {
  province: string;
  province_name?: string;
  district: string;
  district_name?: string;
  chiefdom_id?: string;
  chiefdom_name?: string;
  village?: string;
  street?: string;
  gps_latitude?: number;
  gps_longitude?: number;
}

export interface FarmInfo {
  farm_size_hectares: number;
  crops_grown: string[];
  livestock_types: string[];
  has_irrigation: boolean;
  years_farming: number;
}

export interface HouseholdInfo {
  household_size?: number;
  number_of_dependents?: number;
  primary_income_source?: string;
}

export interface Farmer {
  farmer_id: string;
  temp_id?: string;
  personal_info: PersonalInfo;
  address: Address;
  farm_info?: FarmInfo;
  household_info?: HouseholdInfo;
  registration_status: "Active" | "Pending" | "Inactive"; // enum for status
  is_active: boolean;
  created_at: string; // ISO date string
}
