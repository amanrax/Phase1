// src/pages/FarmerRegistration/Step3Farm.tsx — Farm details with Tailwind
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

const inputClass = "w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition placeholder:text-gray-400";
const labelClass = "block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5";

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
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-gray-800 dark:text-white border-b-2 border-green-500 pb-2.5">
        🌾 Farm Details <span className="text-sm font-normal text-gray-400">(optional)</span>
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="farmSize" className={labelClass}>Farm Size (hectares)</label>
          <input id="farmSize" value={size} onChange={(e) => setSize(e.target.value)} className={inputClass} placeholder="e.g. 1.5" type="number" min="0" step="0.01" />
          <p className="text-[11px] text-gray-400 mt-1">Enter farm size in hectares</p>
        </div>
        <div>
          <label htmlFor="yearsFarming" className={labelClass}>Years of Farming Experience</label>
          <input id="yearsFarming" value={yearsFarming} onChange={(e) => setYearsFarming(e.target.value)} className={inputClass} placeholder="e.g. 5" type="number" min="0" max="100" />
          <p className="text-[11px] text-gray-400 mt-1">Maximum: 100 years</p>
        </div>
      </div>

      <div>
        <label htmlFor="mainCrops" className={labelClass}>Main Crops (comma separated)</label>
        <input id="mainCrops" value={crops} onChange={(e) => setCrops(e.target.value)} className={inputClass} placeholder="maize, groundnuts, cassava" />
      </div>

      <div>
        <label htmlFor="livestock" className={labelClass}>Livestock (comma separated)</label>
        <input id="livestock" value={livestock} onChange={(e) => setLivestock(e.target.value)} className={inputClass} placeholder="cattle, goats, chickens" />
      </div>

      <label className="flex items-center gap-2.5 mt-2 cursor-pointer">
        <input type="checkbox" checked={hasIrrigation} onChange={(e) => setHasIrrigation(e.target.checked)} className="w-4 h-4 text-green-600 rounded border-gray-300 dark:border-gray-600 focus:ring-green-500" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Has Irrigation System</span>
      </label>

      <h4 className="text-base font-bold text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 mt-4">
        🏠 Household Information <span className="text-sm font-normal text-gray-400">(optional)</span>
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="householdSize" className={labelClass}>Household Size</label>
          <input id="householdSize" value={householdSize} onChange={(e) => setHouseholdSize(e.target.value)} className={inputClass} placeholder="Number of people" type="number" min="1" />
        </div>
        <div>
          <label htmlFor="dependents" className={labelClass}>Number of Dependents</label>
          <input id="dependents" value={dependents} onChange={(e) => setDependents(e.target.value)} className={inputClass} placeholder="Number of dependents" type="number" min="0" />
        </div>
        <div>
          <label htmlFor="primaryIncome" className={labelClass}>Primary Income Source</label>
          <input id="primaryIncome" value={primaryIncome} onChange={(e) => setPrimaryIncome(e.target.value)} className={inputClass} placeholder="e.g. farming, business" />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button onClick={onBack} className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold text-sm rounded-lg transition active:scale-95" aria-label="Go back to previous step">
          ← Back
        </button>
        <div className="flex-1" />
        <button
          onClick={() => onNext({ size_hectares: size, crops, livestock, has_irrigation: hasIrrigation, years_farming: yearsFarming, household_size: householdSize, dependents, primary_income: primaryIncome })}
          className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-lg transition active:scale-95 shadow-sm"
          aria-label="Go to next step"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
