// src/pages/FarmerRegistrationWizard/Step2Address.tsx
import { useEffect, useState } from "react";
import geoService from "@/services/geo.service";

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
  const [provinces, setProvinces] = useState<{ code: string; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ code: string; name: string }[]>([]);
  const [chiefdoms, setChiefdoms] = useState<{ code: string; name: string }[]>([]);

  const [provinceCode, setProvinceCode] = useState(data?.province_code || "");
  const [districtCode, setDistrictCode] = useState(data?.district_code || "");
  const [chiefdomCode, setChiefdomCode] = useState(data?.chiefdom_code || "");
  const [village, setVillage] = useState(data?.village || "");
  const [customProvince, setCustomProvince] = useState("");
  const [showCustomProvince, setShowCustomProvince] = useState(false);
  const [customDistrict, setCustomDistrict] = useState("");
  const [showCustomDistrict, setShowCustomDistrict] = useState(false);
  const [customChiefdom, setCustomChiefdom] = useState("");
  const [showCustomChiefdom, setShowCustomChiefdom] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    geoService.provinces().then(setProvinces).catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    if (!provinceCode) {
      setDistricts([]);
      setDistrictCode("");
      return;
    }
    setLoading(true);
    geoService
      .districts(provinceCode)
      .then((d) => {
        setDistricts(d || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [provinceCode]);

  useEffect(() => {
    if (!districtCode) {
      setChiefdoms([]);
      setChiefdomCode("");
      return;
    }
    setLoading(true);
    geoService
      .chiefdoms(districtCode)
      .then((d) => {
        setChiefdoms(d || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [districtCode]);

  const handleNext = () => {
    if (showCustomProvince && !customProvince.trim()) {
      setErr("Please enter custom province name");
      return;
    }
    if (!showCustomProvince && !provinceCode) {
      setErr("Please select a province");
      return;
    }
    if (!showCustomProvince && !showCustomDistrict && !districtCode) {
      setErr("Please select a district");
      return;
    }
    if (showCustomDistrict && !customDistrict.trim()) {
      setErr("Please enter custom district name");
      return;
    }
    setErr("");
    
    if (showCustomProvince) {
      onNext({
        province_code: "OTHER",
        province_name: customProvince.trim(),
        district_code: "OTHER",
        district_name: "Other",
        chiefdom_code: "",
        chiefdom_name: "",
        village,
      });
    } else {
      const province = provinces.find((p) => p.code === provinceCode) || { name: "" };
      const districtName = showCustomDistrict ? customDistrict.trim() : (districts.find((d) => d.code === districtCode) || { name: "" }).name;
      const chiefdomName = showCustomChiefdom ? customChiefdom.trim() : (chiefdoms.find((c) => c.code === chiefdomCode) || { name: "" }).name;

      onNext({
        province_code: provinceCode,
        province_name: province.name,
        district_code: showCustomDistrict ? "OTHER" : districtCode,
        district_name: districtName,
        chiefdom_code: showCustomChiefdom ? "OTHER" : chiefdomCode,
        chiefdom_name: chiefdomName,
        village,
      });
    }
  };

  return (
    <div>
      <h3>Address & Location</h3>
      {err && (
        <div
          role="alert"
          style={{ background: "#fee", color: "#900", padding: 10, borderRadius: 6 }}
        >
          {err}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <label htmlFor="province" style={{ fontWeight: "bold" }}>
          Province *
        </label>
        <select
          id="province"
          value={showCustomProvince ? "OTHER" : provinceCode}
          onChange={(e) => {
            if (e.target.value === "OTHER") {
              setShowCustomProvince(true);
              setProvinceCode("");
              setDistrictCode("");
              setChiefdomCode("");
            } else {
              setShowCustomProvince(false);
              setProvinceCode(e.target.value);
            }
          }}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
          aria-required="true"
        >
          <option value="">-- choose province --</option>
          {provinces.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
          <option value="OTHER">Other (specify below)</option>
        </select>
      </div>

      {showCustomProvince && (
        <div style={{ marginTop: 12 }}>
          <label htmlFor="customProvince" style={{ fontWeight: "bold" }}>
            Enter Province Name *
          </label>
          <input
            id="customProvince"
            value={customProvince}
            onChange={(e) => setCustomProvince(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            placeholder="Enter custom province name"
            aria-required="true"
          />
        </div>
      )}

      {!showCustomProvince && (
        <>
      <div style={{ marginTop: 12 }}>
        <label htmlFor="district" style={{ fontWeight: "bold" }}>
          District *
        </label>
        <select
          id="district"
          value={showCustomDistrict ? "OTHER" : districtCode}
          onChange={(e) => {
            if (e.target.value === "OTHER") {
              setShowCustomDistrict(true);
              setDistrictCode("");
              setChiefdomCode("");
            } else {
              setShowCustomDistrict(false);
              setDistrictCode(e.target.value);
            }
          }}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
          aria-required="true"
        >
          <option value="">-- choose district --</option>
          {districts.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
            </option>
          ))}
          <option value="OTHER">Other (specify below)</option>
        </select>
      </div>

      {showCustomDistrict && (
        <div style={{ marginTop: 12 }}>
          <label htmlFor="customDistrict" style={{ fontWeight: "bold" }}>
            Enter District Name *
          </label>
          <input
            id="customDistrict"
            value={customDistrict}
            onChange={(e) => setCustomDistrict(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            placeholder="Enter custom district name"
            aria-required="true"
          />
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <label htmlFor="chiefdom" style={{ fontWeight: "bold" }}>
          Chiefdom
        </label>
        <select
          id="chiefdom"
          value={showCustomChiefdom ? "OTHER" : chiefdomCode}
          onChange={(e) => {
            if (e.target.value === "OTHER") {
              setShowCustomChiefdom(true);
              setChiefdomCode("");
            } else {
              setShowCustomChiefdom(false);
              setChiefdomCode(e.target.value);
            }
          }}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
        >
          <option value="">-- choose chiefdom (optional) --</option>
          {chiefdoms.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
          <option value="OTHER">Other (specify below)</option>
        </select>
      </div>

      {showCustomChiefdom && (
        <div style={{ marginTop: 12 }}>
          <label htmlFor="customChiefdom" style={{ fontWeight: "bold" }}>
            Enter Chiefdom Name
          </label>
          <input
            id="customChiefdom"
            value={customChiefdom}
            onChange={(e) => setCustomChiefdom(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            placeholder="Enter custom chiefdom name"
          />
        </div>
      )}
        </>
      )}

      <div style={{ marginTop: 12 }}>
        <label htmlFor="village" style={{ fontWeight: "bold" }}>
          Village / Locality
        </label>
        <input
          id="village"
          value={village}
          onChange={(e) => setVillage(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
        />
      </div>

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
          onClick={handleNext}
          style={{ padding: 12, background: "#2563EB", color: "white", border: "none", borderRadius: 6 }}
          aria-label="Next step"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
