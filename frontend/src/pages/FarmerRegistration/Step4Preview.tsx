// src/pages/FarmerRegistration/Step4Preview.tsx — Step 4 of registration wizard: preview all entered data and submit to API
import { useState } from "react";
import { farmerService } from "@/services/farmer.service";
import { logger } from "@/utils/logger";
import { WizardState } from "."; // Import type
import { useFeedback } from "@/utils/feedback";

const COMPONENT = "Step4Preview";

type Props = {
  data: WizardState;
  onBack: () => void;
  onJumpToStep: (step: number) => void; // TC-031: jump to specific step
  onSubmitStart: () => void;
  onSubmitEnd: () => void;
  onSuccess: (farmerId: string) => void;
};

export default function Step4Preview({
  data,
  onBack,
  onJumpToStep,
  onSubmitStart,
  onSubmitEnd,
  onSuccess,
}: Props) {
  const [error, setError] = useState<string>("");
  const { triggerVibration, triggerSound } = useFeedback();

  const cleanOptionalField = (value: string | undefined): string | undefined => {
    return value && value.trim() ? value.trim() : undefined;
  };

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

      if (data.farm?.size_hectares || data.farm?.years_farming) {
        const cropsRaw = data.farm.crops;
        const liveRaw  = data.farm.livestock;
        payload.farm_info = {
          farm_size_hectares: parseFloat(data.farm.size_hectares || "1") || 1,
          crops_grown: Array.isArray(cropsRaw)
            ? cropsRaw
            : (typeof cropsRaw === "string" ? cropsRaw.split(",").map((c) => c.trim()).filter(Boolean) : []),
          livestock_types: Array.isArray(liveRaw)
            ? liveRaw
            : (typeof liveRaw === "string" ? liveRaw.split(",").map((l) => l.trim()).filter(Boolean) : []),
          has_irrigation: data.farm.has_irrigation || false,
          years_farming: Math.min(parseInt(data.farm.years_farming || "0") || 0, 100),
        };
      }

      if (data.farm?.household_size || data.farm?.primary_income) {
        payload.household_info = {
          household_size: parseInt(data.farm.household_size || "1") || 1,
          number_of_dependents: parseInt(data.farm.dependents || "0") || 0,
          primary_income_source: data.farm.primary_income || "Farming",
        };
      }

      logger.info(COMPONENT, "submitting payload", { payload });
      const res = await farmerService.create(payload);
      if (res.farmer_id) {
        triggerVibration("registration_complete");
        triggerSound("registration_complete");
        onSuccess(res.farmer_id);
      } else {
        setError("Failed to get farmer ID after creation.");
        triggerVibration("form_error");
        triggerSound("error");
      }
    } catch (err: any) {
      logger.error(COMPONENT, "registration submit failed", { err, detail: err.response?.data?.detail });
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          const errorMessages = detail.map((e: any) =>
            `${e.loc?.join(".") || "Field"}: ${e.msg || "Invalid"}`
          ).join("; ");
          setError(errorMessages);
        } else if (typeof detail === "string") {
          setError(detail);
        } else {
          setError(JSON.stringify(detail));
        }
      } else {
        setError(err.message || "Failed to create");
      }
      triggerVibration("form_error");
      triggerSound("error");
    } finally {
      onSubmitEnd();
    }
  };

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <div className="flex flex-col sm:flex-row sm:gap-2">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide sm:w-36 shrink-0">
          {label}
        </span>
        <span className="text-sm text-gray-800 dark:text-gray-200">{value}</span>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl px-6 py-4 text-white">
        <h2 className="text-xl font-bold">Step 4: Preview &amp; Submit</h2>
        <p className="text-green-100 text-sm mt-1">Please review all information before submitting.</p>
      </div>

      {/*div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide flex items-center gap-2">
            <span>&#x1F464;</span> Personal Information
          </h3>
          {/* TC-031: jump to step 1 */}
          <button onClick={() => onJumpToStep(1)} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline" aria-label="Edit personal information">✏️ Edit</button>
        </divclassName="text-sm font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide flex items-center gap-2">
          <span>&#x1F464;</span> Personal Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          <InfoRow label="Full Name" value={`${data.personal.first_name} ${data.personal.last_name}`} />
          <InfoRow label="Primary Phone" value={data.personal.phone_primary} />
          <InfoRow label="Secondary Phone" value={data.personal.phone_secondary} />
          <InfoRow label="Email" value={data.personal.email} />
          <InfoRow label="NRC" value={data.personal.nrc} />
          <InfoRow label="Date of Birth" value={data.personal.date_of_birth} />
          <InfoRow label="Gender" value={data.personal.gender} />
         div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-2">
            <span>&#x1F4CD;</span> Address
          </h3>
          {/* TC-031: jump to step 2 */}
          <button onClick={() => onJumpToStep(2)} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline" aria-label="Edit address">✏️ Edit</button>
        </div

      {/* Address */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-2">
          <span>&#x1F4CD;</span> Address
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide flex items-center gap-2">
              <span>&#x1F33E;</span> Farm Information
            </h3>
            {/* TC-031: jump to step 3 */}
            <button onClick={() => onJumpToStep(3)} className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline" aria-label="Edit farm information">✏️ Edit</button>
          </divoRow label="Chiefdom" value={data.address.chiefdom_name} />
          <InfoRow label="Village" value={data.address.village} />
        </div>
      </div>

      {/* Farm Information */}
      {(data.farm?.size_hectares || data.farm?.crops || data.farm?.livestock || data.farm?.years_farming) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide flex items-center gap-2">
            <span>&#x1F33E;</span> Farm Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            <InfoRow label="Farm Size" value={data.farm?.size_hectares ? `${data.farm.size_hectares} hectares` : undefined} />
            <InfoRow label="Crops"     value={Array.isArray(data.farm?.crops) ? data.farm.crops.join(", ") : data.farm?.crops} />
            <InfoRow label="Livestock" value={Array.isArray(data.farm?.livestock) ? data.farm.livestock.join(", ") : data.farm?.livestock} />
            <InfoRow label="Experience" value={data.farm?.years_farming ? `${data.farm.years_farming} years` : undefined} />
            <InfoRow label="Irrigation" value={data.farm?.has_irrigation ? "Yes" : "No"} />
          </div>
        </div>
      )}

      {/* Household Information */}
      {(data.farm?.household_size || data.farm?.dependents || data.farm?.primary_income) && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide flex items-center gap-2">
              <span>&#x1F3E0;</span> Household Information
            </h3>
            {/* TC-031: jump to step 3 (household is also in step 3) */}
            <button onClick={() => onJumpToStep(3)} className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline" aria-label="Edit household information">✏️ Edit</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            <InfoRow label="Household Size" value={data.farm?.household_size ? `${data.farm.household_size} people` : undefined} />
            <InfoRow label="Dependents" value={data.farm?.dependents} />
            <InfoRow label="Primary Income" value={data.farm?.primary_income} />
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded-xl p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          aria-label="Back to previous step"
          className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          &#x2190; Back
        </button>
        <button
          onClick={handleSubmit}
          aria-label="Submit registration"
          className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
        >
          &#x1F4BE; Create Farmer &amp; Continue
        </button>
      </div>
    </div>
  );
}
