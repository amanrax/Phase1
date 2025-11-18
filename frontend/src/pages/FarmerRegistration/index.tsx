// src/pages/FarmerRegistrationWizard/index.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Step1Personal from "./Step1Personal";
import Step2Address from "./Step2Address";
import Step3Farm from "./Step3Farm";
import Step4Preview from "./Step4Preview";

export type WizardState = {
  personal: {
    first_name?: string;
    last_name?: string;
    phone_primary?: string;
    phone_secondary?: string;
    email?: string;
    nrc?: string;
    date_of_birth?: string;
    gender?: string;
    ethnic_group?: string;
  };
  address: {
    province_code?: string;
    province_name?: string;
    district_code?: string;
    district_name?: string;
    chiefdom_code?: string;
    chiefdom_name?: string;
    village?: string;
  };
  farm?: {
    size_hectares?: string;
    crops?: string;
    livestock?: string;
    has_irrigation?: boolean;
    years_farming?: string;
    household_size?: string;
    dependents?: string;
    primary_income?: string;
  };
};

const initialState: WizardState = {
  personal: {},
  address: {},
  farm: {},
};

export default function FarmerRegistrationWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardState>(initialState);
  const [loading, setLoading] = useState(false);

  const update = <K extends keyof WizardState>(
    section: K,
    values: Partial<WizardState[K]>
  ) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...values },
    }));
  };

  return (
    <div
      style={{ minHeight: "100vh", padding: 20, background: "#f7f7f7" }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          background: "#fff",
          padding: 24,
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: "15px" }}>
          <button
            onClick={() => {
              if (step === 1) {
                navigate("/");
              } else {
                setStep(step - 1);
              }
            }}
            style={{
              backgroundColor: "#2563EB",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ← Back
          </button>
          <div>
            <h2 style={{ margin: 0 }}>New Farmer — Registration</h2>
            <div style={{ marginTop: 8, color: "#666" }}>Step {step} / 4</div>
          </div>
        </div>

        {/* Step 1: Personal Information */}
        {step === 1 && (
          <Step1Personal
            data={form.personal}
            onNext={(vals: WizardState["personal"]) => {
              update("personal", vals);
              setStep(2);
            }}
          />
        )}

        {/* Step 2: Address Information */}
        {step === 2 && (
          <Step2Address
            data={form.address}
            onBack={() => setStep(1)}
            onNext={(vals: WizardState["address"]) => {
              update("address", vals);
              setStep(3);
            }}
          />
        )}

        {/* Step 3: Farm Information */}
        {step === 3 && (
          <Step3Farm
            data={form.farm || {}}
            onBack={() => setStep(2)}
            onNext={(vals: WizardState["farm"]) => {
              update("farm", vals);
              setStep(4);
            }}
          />
        )}

        {/* Step 4: Preview & Submit */}
        {step === 4 && (
          <Step4Preview
            data={form}
            onBack={() => setStep(3)}
            onSubmitStart={() => setLoading(true)}
            onSubmitEnd={() => setLoading(false)}
          />
        )}

        {/* Footer Tip */}
        <div style={{ marginTop: 16, color: "#999", fontSize: 13 }}>
          Tip: Fields marked with * are required. Use the back button to edit
          previous steps.
        </div>

        {/* Loading indicator */}
        {loading && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: "#e3f2fd",
              color: "#1976d2",
              borderRadius: 6,
              textAlign: "center",
            }}
          >
            ⏳ Submitting farmer registration...
          </div>
        )}
      </div>
    </div>
  );
}
