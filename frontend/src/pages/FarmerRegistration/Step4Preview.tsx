// src/pages/FarmerRegistrationWizard/Step4Preview.tsx
import { useState } from "react";
import { farmerService } from "@/services/farmer.service";
import { WizardState } from "."; // Import type

type Props = {
  data: WizardState;
  onBack: () => void;
  onSubmitStart: () => void;
  onSubmitEnd: () => void;
  onSuccess: (farmerId: string) => void;
};

export default function Step4Preview({
  data,
  onBack,
  onSubmitStart,
  onSubmitEnd,
  onSuccess,
}: Props) {
  const [error, setError] = useState<string>("");

  // Helper to convert empty string to undefined for optional fields
  const cleanOptionalField = (value: string | undefined): string | undefined => {
    return value && value.trim() ? value.trim() : undefined;
  };

  // Helper to clean phone numbers (remove spaces, dashes, parentheses)
  const cleanPhone = (phone: string | undefined): string => {
    if (!phone) return "";
    return phone.replace(/[\s\-\(\)]/g, "");
  };

  const handleSubmit = async () => {
    onSubmitStart();
    setError("");
    try {
      const payload: any = {
        personal_info: {
          first_name: data.personal.first_name || "",
          last_name: data.personal.last_name || "",
          phone_primary: cleanPhone(data.personal.phone_primary),
          phone_secondary: cleanOptionalField(cleanPhone(data.personal.phone_secondary)),
          email: cleanOptionalField(data.personal.email),
          nrc: data.personal.nrc || "",
          date_of_birth: data.personal.date_of_birth || "",
          gender: data.personal.gender || "",
          ethnic_group: cleanOptionalField(data.personal.ethnic_group),
        },
        address: {
          province_code: data.address.province_code || "",
          province_name: data.address.province_name || "",
          district_code: data.address.district_code || "",
          district_name: data.address.district_name || "",
          chiefdom_code: cleanOptionalField(data.address.chiefdom_code) || "",
          chiefdom_name: cleanOptionalField(data.address.chiefdom_name) || "",
          village: data.address.village || "",
        },
      };

      // Add farm_info if farm data exists
      if (data.farm?.size_hectares || data.farm?.years_farming) {
        payload.farm_info = {
          farm_size_hectares: parseFloat(data.farm.size_hectares || "1") || 1,
          crops_grown: data.farm.crops?.split(",").map((c: string) => c.trim()).filter(Boolean) || [],
          livestock_types: data.farm.livestock?.split(",").map((l: string) => l.trim()).filter(Boolean) || [],
          has_irrigation: data.farm.has_irrigation || false,
          years_farming: Math.min(parseInt(data.farm.years_farming || "0") || 0, 100), // Cap at 100
        };
      }

      // Add household_info if household data exists
      if (data.farm?.household_size || data.farm?.primary_income) {
        payload.household_info = {
          household_size: parseInt(data.farm.household_size || "1") || 1,
          number_of_dependents: parseInt(data.farm.dependents || "0") || 0,
          primary_income_source: data.farm.primary_income || "Farming",
        };
      }

      console.log("Submitting payload:", JSON.stringify(payload, null, 2));
      const res = await farmerService.create(payload);
      if (res.farmer_id) {
        onSuccess(res.farmer_id);
      } else {
        setError("Failed to get farmer ID after creation.");
      }
    } catch (err: any) {
      console.error("Full error object:", err);
      console.error("Error response:", err.response);
      console.error("Error response data:", err.response?.data);
      console.error("Validation errors:", JSON.stringify(err.response?.data?.detail, null, 2));
      // Handle validation errors (422) which come as array of error objects
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          // Format validation errors into readable message
          const errorMessages = detail.map((e: any) => 
            `${e.loc?.join('.') || 'Field'}: ${e.msg || 'Invalid'}`
          ).join('; ');
          setError(errorMessages);
        } else if (typeof detail === 'string') {
          setError(detail);
        } else {
          setError(JSON.stringify(detail));
        }
      } else {
        setError(err.message || "Failed to create");
      }
    } finally {
      onSubmitEnd();
    }
  };

  return (
    <div>
      <h3>Preview</h3>
      <div style={{ padding: 12, background: "#f3f4f6", borderRadius: 6 }}>
        {/* Personal Information */}
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 16, fontWeight: "bold", color: "#374151", marginBottom: 8 }}>👤 Personal Information</h4>
          <div><strong>Name:</strong> {data.personal.first_name} {data.personal.last_name}</div>
          <div><strong>Primary Phone:</strong> {data.personal.phone_primary || "-"}</div>
          {data.personal.phone_secondary && (
            <div><strong>Secondary Phone:</strong> {data.personal.phone_secondary}</div>
          )}
          {data.personal.email && (
            <div><strong>Email:</strong> {data.personal.email}</div>
          )}
          <div><strong>NRC:</strong> {data.personal.nrc || "-"}</div>
          <div><strong>Date of Birth:</strong> {data.personal.date_of_birth || "-"}</div>
          <div><strong>Gender:</strong> {data.personal.gender || "-"}</div>
          {data.personal.ethnic_group && (
            <div><strong>Ethnic Group:</strong> {data.personal.ethnic_group}</div>
          )}
        </div>

        {/* Address */}
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 16, fontWeight: "bold", color: "#374151", marginBottom: 8 }}>📍 Address</h4>
          <div><strong>Province:</strong> {data.address.province_name || "-"}</div>
          <div><strong>District:</strong> {data.address.district_name || "-"}</div>
          {data.address.chiefdom_name && (
            <div><strong>Chiefdom:</strong> {data.address.chiefdom_name}</div>
          )}
          <div><strong>Village:</strong> {data.address.village || "-"}</div>
        </div>

        {/* Farm Information */}
        {(data.farm?.size_hectares || data.farm?.crops || data.farm?.livestock || data.farm?.years_farming) && (
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 16, fontWeight: "bold", color: "#374151", marginBottom: 8 }}>🌾 Farm Information</h4>
            {data.farm?.size_hectares && (
              <div><strong>Farm Size:</strong> {data.farm.size_hectares} hectares</div>
            )}
            {data.farm?.crops && (
              <div><strong>Crops:</strong> {data.farm.crops}</div>
            )}
            {data.farm?.livestock && (
              <div><strong>Livestock:</strong> {data.farm.livestock}</div>
            )}
            {data.farm?.years_farming && (
              <div><strong>Farming Experience:</strong> {data.farm.years_farming} years</div>
            )}
            <div><strong>Irrigation:</strong> {data.farm?.has_irrigation ? "Yes" : "No"}</div>
          </div>
        )}

        {/* Household Information */}
        {(data.farm?.household_size || data.farm?.dependents || data.farm?.primary_income) && (
          <div>
            <h4 style={{ fontSize: 16, fontWeight: "bold", color: "#374151", marginBottom: 8 }}>🏠 Household Information</h4>
            {data.farm?.household_size && (
              <div><strong>Household Size:</strong> {data.farm.household_size} people</div>
            )}
            {data.farm?.dependents && (
              <div><strong>Dependents:</strong> {data.farm.dependents}</div>
            )}
            {data.farm?.primary_income && (
              <div><strong>Primary Income:</strong> {data.farm.primary_income}</div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 12, color: "#B91C1C" }} role="alert">
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button
          onClick={onBack}
          style={{ padding: 12, background: "#6B7280", color: "white", border: "none", borderRadius: 6 }}
          aria-label="Back to previous step"
        >
          ← Back
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleSubmit}
          style={{ padding: 12, background: "#16A34A", color: "white", border: "none", borderRadius: 6 }}
          aria-label="Submit registration"
        >
          Create Farmer & Continue
        </button>
      </div>
    </div>
  );
}
