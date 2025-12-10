// src/pages/FarmerRegistration/index.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Step1Personal from "./Step1Personal";
import Step2Address from "./Step2Address";
import Step3Farm from "./Step3Farm";
import Step4Preview from "./Step4Preview";
import Step5PhotoUpload from "./Step5PhotoUpload";
import Step6DocumentUpload from "./Step6DocumentUpload";
import Step7Completion from "./Step7Completion";

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
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<WizardState>(initialState);
  const [loading, setLoading] = useState(false);
  const [newFarmerId, setNewFarmerId] = useState<string | null>(null);
  const [farmerName, setFarmerName] = useState<string>("");

  const update = <K extends keyof WizardState>(
    section: K,
    values: Partial<WizardState[K]>
  ) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...values },
    }));
  };

  const handleStep4Complete = async (formValues: any) => {
    try {
      // const response = await farmerService.create(formValues);
      setNewFarmerId("123"); // response.farmer_id
      setFarmerName(
        `${formValues.personal_info.first_name} ${formValues.personal_info.last_name}`
      );
      setCurrentStep(5);
    } catch (err: any) {
      // ...existing error handling...
    }
  };

  const handleStep6Complete = () => {
    setCurrentStep(7);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      <div style={{ textAlign: "center", color: "white", paddingTop: "30px", paddingBottom: "30px" }}>
        <h1 style={{ fontSize: "2.8rem", marginBottom: "10px", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}>
          🌾 Chiefdom Management Model
        </h1>
        <p style={{ fontSize: "18px", opacity: 0.9 }}>Farmer Registration</p>
      </div>
      
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 20px 40px 20px" }}>
        <div style={{ background: "white", borderRadius: "15px", padding: "40px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
        {/* Progress Bar */}
        <div style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <div
                key={step}
                style={{
                  flex: 1,
                  height: "8px",
                  backgroundColor: currentStep >= step ? "#667eea" : "#e5e7eb",
                  marginRight: step < 7 ? "8px" : "0",
                  borderRadius: "4px",
                  transition: "background-color 0.3s",
                }}
              />
            ))}
          </div>
          <p style={{ textAlign: "center", color: "#666", fontSize: "15px", fontWeight: "600" }}>
            Step {currentStep} of 7
          </p>
        </div>

        {/* Step Content */}
        {currentStep === 1 && (
          <Step1Personal
            data={form.personal}
            onBack={() => navigate(-1)}
            onNext={(vals: WizardState["personal"]) => {
              update("personal", vals);
              setCurrentStep(2);
            }}
          />
        )}
        {currentStep === 2 && (
          <Step2Address
            data={form.address}
            onBack={() => setCurrentStep(1)}
            onNext={(vals: WizardState["address"]) => {
              update("address", vals);
              setCurrentStep(3);
            }}
          />
        )}
        {currentStep === 3 && (
          <Step3Farm
            data={form.farm || {}}
            onBack={() => setCurrentStep(2)}
            onNext={(vals: WizardState["farm"]) => {
              update("farm", vals);
              setCurrentStep(4);
            }}
          />
        )}
        {currentStep === 4 && (
          <Step4Preview
            data={form}
            onBack={() => setCurrentStep(3)}
            onSubmitStart={() => setLoading(true)}
            onSubmitEnd={() => setLoading(false)}
            onSuccess={(farmerId) => {
              setNewFarmerId(farmerId);
              setCurrentStep(5);
            }}
          />
        )}
        {currentStep === 5 && newFarmerId && (
          <Step5PhotoUpload
            farmerId={newFarmerId}
            onBack={() => setCurrentStep(4)}
            onNext={() => setCurrentStep(6)}
          />
        )}
        {currentStep === 6 && newFarmerId && (
          <Step6DocumentUpload
            farmerId={newFarmerId}
            onBack={() => setCurrentStep(5)}
            onComplete={handleStep6Complete}
          />
        )}
        {currentStep === 7 && newFarmerId && (
          <Step7Completion farmerId={newFarmerId} farmerName={farmerName} />
        )}

        {/* Footer Tip */}
        <div style={{ marginTop: "20px", color: "#999", fontSize: "13px", textAlign: "center" }}>
          💡 Tip: Fields marked with * are required. Use the back button to edit previous steps.
        </div>

        {/* Loading indicator */}
        {loading && (
          <div style={{ marginTop: "16px", padding: "12px", background: "#e3f2fd", color: "#1976d2", borderRadius: "8px", textAlign: "center", fontWeight: "600" }}>
            ⏳ Submitting farmer registration...
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
