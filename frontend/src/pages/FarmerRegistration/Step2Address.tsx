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
    <div>
      <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px", color: "var(--text-primary-hex)" }}>
        📍 Address &amp; Location
      </h3>
      {err && (
        <div role="alert" style={{ background: "#fee", color: "#900", padding: 10, borderRadius: 6, marginBottom: 12 }}>
          {err}
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
          }}
          aria-label="Back to previous step"
        >
          ← Back
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleNext}
          style={{
            padding: "12px 30px",
            background: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer",
          }}
          aria-label="Proceed to next step"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
