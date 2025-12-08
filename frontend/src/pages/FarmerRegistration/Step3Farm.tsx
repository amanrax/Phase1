// src/pages/FarmerRegistrationWizard/Step3Farm.tsx
import { useState } from "react";

type FarmData = {
  size_hectares?: string;
  crops?: string;
  livestock?: string;
  has_irrigation?: boolean;
  years_farming?: string;
  household_size?: string;
  dependents?: string;
  primary_income?: string;
};

type Props = {
  data: FarmData;
  onBack: () => void;
  onNext: (values: FarmData) => void;
};

export default function Step3Farm({ data, onBack, onNext }: Props) {
  const [size, setSize] = useState(data?.size_hectares || "");
  const [crops, setCrops] = useState(data?.crops || "");
  const [livestock, setLivestock] = useState(data?.livestock || "");
  const [hasIrrigation, setHasIrrigation] = useState(data?.has_irrigation || false);
  const [yearsFarming, setYearsFarming] = useState(data?.years_farming || "");
  const [householdSize, setHouseholdSize] = useState(data?.household_size || "");
  const [dependents, setDependents] = useState(data?.dependents || "");
  const [primaryIncome, setPrimaryIncome] = useState(data?.primary_income || "");

  return (
    <div>
      <h3 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "20px", color: "#333" }}>Farm details (optional)</h3>
      <div style={{ marginTop: 12 }}>
        <label htmlFor="farmSize" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
          Farm size (hectares)
        </label>
        <input
          id="farmSize"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          style={{ width: "100%", padding: "10px", border: "1px solid #999", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
          placeholder="e.g. 1.5"
          type="number"
          min="0"
          step="0.01"
          aria-describedby="farmSizeDesc"
        />
        <small id="farmSizeDesc" style={{ color: "#666" }}>
          Enter farm size in hectares
        </small>
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="mainCrops" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
          Main crops (comma separated)
        </label>
        <input
          id="mainCrops"
          value={crops}
          onChange={(e) => setCrops(e.target.value)}
          style={{ width: "100%", padding: "10px", border: "1px solid #999", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
          placeholder="maize, groundnuts, cassava"
          aria-describedby="mainCropsDesc"
        />
        <small id="mainCropsDesc" style={{ color: "#666" }}>
          Enter main crops separated by commas
        </small>
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="livestock" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
          Livestock (comma separated)
        </label>
        <input
          id="livestock"
          value={livestock}
          onChange={(e) => setLivestock(e.target.value)}
          style={{ width: "100%", padding: "10px", border: "1px solid #999", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
          placeholder="cattle, goats, chickens"
        />
        <small style={{ color: "#666" }}>
          Enter livestock types separated by commas
        </small>
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="yearsFarming" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
          Years of Farming Experience
        </label>
        <input
          id="yearsFarming"
          value={yearsFarming}
          onChange={(e) => setYearsFarming(e.target.value)}
          style={{ width: "100%", padding: "10px", border: "1px solid #999", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
          placeholder="e.g. 5"
          type="number"
          min="0"
          max="100"
        />
        <small style={{ color: "#666" }}>Maximum: 100 years</small>
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ fontWeight: "bold", display: "flex", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={hasIrrigation}
            onChange={(e) => setHasIrrigation(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Has Irrigation System
        </label>
      </div>

      <h4 style={{ marginTop: 20, fontSize: "16px", fontWeight: "600", color: "#333" }}>Household Information (optional)</h4>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="householdSize" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
          Household Size
        </label>
        <input
          id="householdSize"
          value={householdSize}
          onChange={(e) => setHouseholdSize(e.target.value)}
          style={{ width: "100%", padding: "10px", border: "1px solid #999", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
          placeholder="Number of people in household"
          type="number"
          min="1"
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="dependents" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
          Number of Dependents
        </label>
        <input
          id="dependents"
          value={dependents}
          onChange={(e) => setDependents(e.target.value)}
          style={{ width: "100%", padding: "10px", border: "1px solid #999", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
          placeholder="Number of dependents"
          type="number"
          min="0"
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="primaryIncome" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px" }}>
          Primary Income Source
        </label>
        <input
          id="primaryIncome"
          value={primaryIncome}
          onChange={(e) => setPrimaryIncome(e.target.value)}
          style={{ width: "100%", padding: "10px", border: "1px solid #999", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
          placeholder="e.g. farming, business"
        />
      </div>

      <div style={{ display: "flex", gap: "15px", marginTop: "25px" }}>
        <button
          onClick={onBack}
          style={{
            padding: "12px 30px",
            background: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s"
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "#5a6268"}
          onMouseOut={(e) => e.currentTarget.style.background = "#6c757d"}
          aria-label="Go back to previous step"
        >
          ← Back
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => onNext({
            size_hectares: size,
            crops,
            livestock,
            has_irrigation: hasIrrigation,
            years_farming: yearsFarming,
            household_size: householdSize,
            dependents,
            primary_income: primaryIncome,
          })}
          style={{
            padding: "12px 30px",
            background: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s"
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "#218838"}
          onMouseOut={(e) => e.currentTarget.style.background = "#28a745"}
          aria-label="Go to next step"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
