// src/pages/FarmerRegistrationWizard/Step2Address.tsx
import { useState } from "react";
import GeoSelectWithOther from "@/components/GeoSelectWithOther";

type AddressData = {
  province_code?: string;
  province_name?: string;
  district_code?: string;
  district_name?: string;
  chiefdom_code?: string;
  chiefdom_name?: string;
  village?: string;
};

type Props = {
  data: AddressData;
  onBack: () => void;
  onNext: (values: AddressData) => void;
};

export default function Step2Address({ data, onBack, onNext }: Props) {
  const [geo, setGeo] = useState({
    province_code: data?.province_code || "",
    province_name: data?.province_name || "",
    district_code: data?.district_code || "",
    district_name: data?.district_name || "",
    chiefdom_code: data?.chiefdom_code || "",
    chiefdom_name: data?.chiefdom_name || "",
  });
  const [village, setVillage] = useState(data?.village || "");
  const [err, setErr] = useState("");

  const handleNext = () => {
    if (!geo.province_code) {
      setErr("Please select a province");
      return;
    }
    if (!geo.district_code) {
      setErr("Please select a district");
      return;
    }
    setErr("");
    onNext({ ...geo, village });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-gray-800 dark:text-white border-b-2 border-green-500 pb-2.5">
        📍 Address &amp; Location
      </h3>
      {err && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm font-semibold border-l-4 border-red-500">
          ❌ {err}
        </div>
      )}

      <GeoSelectWithOther
        value={geo}
        onChange={setGeo}
        showChiefdom={true}
        showVillage={true}
        village={village}
        onVillageChange={setVillage}
      />

      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold text-sm rounded-lg transition active:scale-95"
          aria-label="Back to previous step"
        >
          ← Back
        </button>
        <div className="flex-1" />
        <button
          onClick={handleNext}
          className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-lg transition active:scale-95 shadow-sm"
          aria-label="Proceed to next step"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
