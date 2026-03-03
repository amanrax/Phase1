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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [farmerName, setFarmerName] = useState<string>("");
  void setFarmerName; // Used by Step4 completion (TODO: wire up)

  const update = <K extends keyof WizardState>(
    section: K,
    values: Partial<WizardState[K]>
  ) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...values },
    }));
  };

  // TODO: Re-enable when Step4 submission is wired up
  // const handleStep4Complete = async (formValues: any) => {
  //   try {
  //     const response = await farmerService.create(formValues);
  //     setNewFarmerId(response.farmer_id);
  //     setFarmerName(`${formValues.personal_info.first_name} ${formValues.personal_info.last_name}`);
  //     setCurrentStep(5);
  //   } catch (err: any) {
  //     // ...existing error handling...
  //   }
  // };

  const handleStep6Complete = () => {
    setCurrentStep(7);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-700 via-green-800 to-emerald-900">
      {/* Header */}
      <div className="text-center text-white pt-8 pb-6 px-4">
        <h1 className="text-4xl font-extrabold mb-2 drop-shadow-lg">🌾 Chiefdom Management Model</h1>
        <p className="text-lg opacity-90">Farmer Registration</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-10">

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex gap-1.5 mb-3">
              {[1, 2, 3, 4, 5, 6, 7].map((step) => (
                <div
                  key={step}
                  className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                    currentStep > step  ? "bg-green-500" :
                    currentStep === step ? "bg-indigo-500" :
                    "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              ))}
            </div>
            <p className="text-center text-sm font-semibold text-gray-500 dark:text-gray-400">
              Step <span className="text-gray-800 dark:text-gray-100 font-bold">{currentStep}</span> of 7
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
        <div style={{ marginTop: "20px", color: "var(--text-muted-hex)", fontSize: "13px", textAlign: "center" }}>
          💡 Tip: Fields marked with * are required. Use the back button to edit previous steps.
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl text-center font-semibold text-sm">
            ⏳ Submitting farmer registration…
          </div>
        )}
        </div>{/* /card */}
      </div>{/* /content-wrapper */}
    </div>
  );
}
