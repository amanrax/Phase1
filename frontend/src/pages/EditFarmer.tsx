import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { farmerService } from "@/services/farmer.service";
import geoService from "@/services/geo.service";

const getErrorMessage = (err: unknown): string => {
  if (typeof err === "object" && err !== null) {
    const error = err as Record<string, unknown>;
    if (error.response && typeof error.response === "object") {
      const response = error.response as Record<string, unknown>;
      if (response.data && typeof response.data === "object") {
        const data = response.data as Record<string, unknown>;
        if (data.detail && typeof data.detail === "string") return data.detail;
      }
    }
    if (error.message && typeof error.message === "string") {
      return error.message;
    }
  }
  return "An error occurred";
};

interface FarmerFormData {
  first_name: string;
  last_name: string;
  phone_primary: string;
  phone_secondary: string;
  email: string;
  nrc: string;
  date_of_birth: string;
  gender: string;
  ethnic_group: string;
  province_code: string;
  province_name: string;
  district_code: string;
  district_name: string;
  chiefdom_code: string;
  chiefdom_name: string;
  village: string;
  farm_size_hectares: string;
  crops_grown: string;
  livestock_types: string;
  has_irrigation: boolean;
  years_farming: string;
  household_size: string;
  number_of_dependents: string;
  primary_income_source: string;
}

interface Province { code: string; name: string }
interface District { code: string; name: string }
interface Chiefdom { code: string; name: string }

export default function EditFarmer() {
  const navigate = useNavigate();
  const { farmerId } = useParams<{ farmerId: string }>();
  
  const [formData, setFormData] = useState<FarmerFormData>({
    first_name: "", last_name: "", phone_primary: "", phone_secondary: "",
    email: "", nrc: "", date_of_birth: "", gender: "", ethnic_group: "",
    province_code: "", province_name: "", district_code: "", district_name: "",
    chiefdom_code: "", chiefdom_name: "", village: "",
    farm_size_hectares: "", crops_grown: "", livestock_types: "",
    has_irrigation: false, years_farming: "",
    household_size: "", number_of_dependents: "", primary_income_source: "",
  });

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [chiefdoms, setChiefdoms] = useState<Chiefdom[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showCustomProvince, setShowCustomProvince] = useState(false);
  const [customProvince, setCustomProvince] = useState("");
  const [showCustomDistrict, setShowCustomDistrict] = useState(false);
  const [customDistrict, setCustomDistrict] = useState("");
  const [showCustomChiefdom, setShowCustomChiefdom] = useState(false);
  const [customChiefdom, setCustomChiefdom] = useState("");

  useEffect(() => {
    loadProvinces();
    if (farmerId) {
      fetchFarmer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId]);

  const loadProvinces = async () => {
    try {
      const data = await geoService.provinces();
      setProvinces(data);
    } catch (err) {
      console.error("Failed to load provinces:", err);
    }
  };

  const loadDistricts = async (provinceCode: string) => {
    try {
      const data = await geoService.districts(provinceCode);
      setDistricts(data);
    } catch (err) {
      console.error("Failed to load districts:", err);
    }
  };

  const loadChiefdoms = async (districtCode: string) => {
    try {
      const data = await geoService.chiefdoms(districtCode);
      setChiefdoms(data);
    } catch (err) {
      console.error("Failed to load chiefdoms:", err);
    }
  };

  const fetchFarmer = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const farmer: any = await farmerService.getFarmer(farmerId!);
      
      if (farmer.address?.province_code) {
        await loadDistricts(farmer.address.province_code);
      }
      if (farmer.address?.district_code) {
        await loadChiefdoms(farmer.address.district_code);
      }

      const isCustomProvince = farmer.address?.province_code === "OTHER";
      const isCustomDistrict = farmer.address?.district_code === "OTHER";
      const isCustomChiefdom = farmer.address?.chiefdom_code === "OTHER";

      if (isCustomProvince) {
        setShowCustomProvince(true);
        setCustomProvince(farmer.address?.province_name || "");
      }
      if (isCustomDistrict) {
        setShowCustomDistrict(true);
        setCustomDistrict(farmer.address?.district_name || "");
      }
      if (isCustomChiefdom) {
        setShowCustomChiefdom(true);
        setCustomChiefdom(farmer.address?.chiefdom_name || "");
      }

      setFormData({
        first_name: farmer.personal_info?.first_name || "",
        last_name: farmer.personal_info?.last_name || "",
        phone_primary: farmer.personal_info?.phone_primary || "",
        phone_secondary: farmer.personal_info?.phone_secondary || "",
        email: farmer.personal_info?.email || "",
        nrc: farmer.personal_info?.nrc || "",
        date_of_birth: farmer.personal_info?.date_of_birth || "",
        gender: farmer.personal_info?.gender || "",
        ethnic_group: farmer.personal_info?.ethnic_group || "",
        province_code: isCustomProvince ? "OTHER" : (farmer.address?.province_code || ""),
        province_name: farmer.address?.province_name || "",
        district_code: isCustomDistrict ? "OTHER" : (farmer.address?.district_code || ""),
        district_name: farmer.address?.district_name || "",
        chiefdom_code: isCustomChiefdom ? "OTHER" : (farmer.address?.chiefdom_code || ""),
        chiefdom_name: farmer.address?.chiefdom_name || "",
        village: farmer.address?.village || "",
        farm_size_hectares: farmer.farm_info?.farm_size_hectares?.toString() || "",
        crops_grown: farmer.farm_info?.crops_grown?.join(", ") || "",
        livestock_types: farmer.farm_info?.livestock_types?.join(", ") || "",
        has_irrigation: farmer.farm_info?.has_irrigation || false,
        years_farming: farmer.farm_info?.years_farming?.toString() || "",
        household_size: farmer.household_info?.household_size?.toString() || "",
        number_of_dependents: farmer.household_info?.number_of_dependents?.toString() || "",
        primary_income_source: farmer.household_info?.primary_income_source || "",
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleProvinceChange = async (provinceCode: string) => {
    if (provinceCode === "OTHER") {
      setShowCustomProvince(true);
      setFormData(prev => ({
        ...prev, province_code: "OTHER", province_name: "",
        district_code: "", district_name: "", chiefdom_code: "", chiefdom_name: "",
      }));
      setDistricts([]);
      setChiefdoms([]);
      setShowCustomDistrict(false);
      setShowCustomChiefdom(false);
    } else {
      setShowCustomProvince(false);
      setCustomProvince("");
      const province = provinces.find(p => p.code === provinceCode);
      setFormData(prev => ({
        ...prev, province_code: provinceCode, province_name: province?.name || "",
        district_code: "", district_name: "", chiefdom_code: "", chiefdom_name: "",
      }));
      setDistricts([]);
      setChiefdoms([]);
      if (provinceCode) await loadDistricts(provinceCode);
    }
  };

  const handleDistrictChange = async (districtCode: string) => {
    if (districtCode === "OTHER") {
      setShowCustomDistrict(true);
      setFormData(prev => ({ ...prev, district_code: "OTHER", district_name: "", chiefdom_code: "", chiefdom_name: "" }));
      setChiefdoms([]);
      setShowCustomChiefdom(false);
    } else {
      setShowCustomDistrict(false);
      setCustomDistrict("");
      const district = districts.find(d => d.code === districtCode);
      setFormData(prev => ({ ...prev, district_code: districtCode, district_name: district?.name || "", chiefdom_code: "", chiefdom_name: "" }));
      setChiefdoms([]);
      if (districtCode) await loadChiefdoms(districtCode);
    }
  };

  const handleChiefdomChange = (chiefdomCode: string) => {
    if (chiefdomCode === "OTHER") {
      setShowCustomChiefdom(true);
      setFormData(prev => ({ ...prev, chiefdom_code: "OTHER", chiefdom_name: "" }));
    } else {
      setShowCustomChiefdom(false);
      setCustomChiefdom("");
      const chiefdom = chiefdoms.find(c => c.code === chiefdomCode);
      setFormData(prev => ({ ...prev, chiefdom_code: chiefdomCode, chiefdom_name: chiefdom?.name || "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    
    try {
      const cleanPhone = (phone: string) => phone.replace(/[\s\-()]/g, "");
      
      const normalizeGender = (g: string) => {
        const val = g?.toLowerCase();
        if (val === "male") return "Male";
        if (val === "female") return "Female";
        if (val === "other") return "Other";
        return "";
      };

      const finalProvinceCode = showCustomProvince ? "OTHER" : formData.province_code;
      const finalProvinceName = showCustomProvince ? customProvince : formData.province_name;
      const finalDistrictCode = showCustomDistrict ? "OTHER" : formData.district_code;
      const finalDistrictName = showCustomDistrict ? customDistrict : formData.district_name;
      const finalChiefdomCode = showCustomChiefdom ? "OTHER" : formData.chiefdom_code;
      const finalChiefdomName = showCustomChiefdom ? customChiefdom : formData.chiefdom_name;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        personal_info: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone_primary: cleanPhone(formData.phone_primary),
          nrc: formData.nrc.trim(),
          date_of_birth: formData.date_of_birth,
          gender: normalizeGender(formData.gender),
        },
        address: {
          province_code: finalProvinceCode,
          province_name: finalProvinceName,
          district_code: finalDistrictCode,
          district_name: finalDistrictName,
          chiefdom_code: finalChiefdomCode || "",
          chiefdom_name: finalChiefdomName || "",
          village: formData.village,
        },
      };
      
      // Add optional personal_info fields
      if (formData.phone_secondary) payload.personal_info.phone_secondary = cleanPhone(formData.phone_secondary);
      if (formData.email) payload.personal_info.email = formData.email;
      if (formData.ethnic_group) payload.personal_info.ethnic_group = formData.ethnic_group;
      
      // Add farm_info if any field is filled
      if (formData.farm_size_hectares || formData.crops_grown || formData.livestock_types || formData.years_farming) {
        payload.farm_info = {
          farm_size_hectares: formData.farm_size_hectares ? parseFloat(formData.farm_size_hectares) : 0,
          crops_grown: formData.crops_grown ? formData.crops_grown.split(",").map((c) => c.trim()).filter(Boolean) : [],
          livestock_types: formData.livestock_types ? formData.livestock_types.split(",").map((l) => l.trim()).filter(Boolean) : [],
          has_irrigation: formData.has_irrigation,
          years_farming: formData.years_farming ? parseInt(formData.years_farming) : 0,
        };
      }
      
      // Add household_info if any field is filled
      if (formData.household_size || formData.number_of_dependents || formData.primary_income_source) {
        payload.household_info = {
          household_size: formData.household_size ? parseInt(formData.household_size) : 1,
          number_of_dependents: formData.number_of_dependents ? parseInt(formData.number_of_dependents) : 0,
          primary_income_source: formData.primary_income_source || "Farming",
        };
      }

      await farmerService.update(farmerId!, payload);
      alert("✅ Farmer updated successfully!");
      navigate(-1);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: "50px", height: "50px", border: "4px solid white", borderTop: "4px solid transparent",
          borderRadius: "50%", animation: "spin 1s linear infinite"
        }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      <div style={{ textAlign: "center", color: "white", paddingTop: "20px", paddingBottom: "20px" }}>
        <h1 style={{ fontSize: "clamp(1.5rem, 5vw, 2.8rem)", marginBottom: "10px", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}>
          🌾 Chiefdom Management Model
        </h1>
        <p style={{ fontSize: "clamp(14px, 3vw, 18px)", opacity: 0.9 }}>Edit Farmer</p>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 15px 40px 15px" }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: "10px 20px", background: "white", color: "#667eea", border: "none",
            borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer",
            marginBottom: "20px", transition: "all 0.3s"
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
          onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
        >
          ← Back
        </button>

        {error && (
          <div style={{ background: "#f8d7da", color: "#721c24", padding: "12px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #f5c6cb" }}>
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Personal Info */}
          <div style={{ background: "white", padding: "clamp(15px, 4vw, 25px)", borderRadius: "15px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: "700", marginBottom: "20px", color: "#333", borderBottom: "2px solid #667eea", paddingBottom: "10px" }}>
              👤 Personal Information
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
                  First Name <span style={{ color: "#dc3545" }}>*</span>
                </label>
                <input
                  type="text" required value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
                  Last Name <span style={{ color: "#dc3545" }}>*</span>
                </label>
                <input
                  type="text" required value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
                  Phone Primary <span style={{ color: "#dc3545" }}>*</span>
                </label>
                <input
                  type="tel" required value={formData.phone_primary}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone_primary: e.target.value }))}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
                  Phone Secondary
                </label>
                <input
                  type="tel" value={formData.phone_secondary}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone_secondary: e.target.value }))}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>Email</label>
                <input
                  type="email" value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
                  NRC <span style={{ color: "#dc3545" }}>*</span>
                </label>
                <input
                  type="text" required value={formData.nrc}
                  onChange={(e) => setFormData(prev => ({ ...prev, nrc: e.target.value }))}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
                  Date of Birth <span style={{ color: "#dc3545" }}>*</span>
                </label>
                <input
                  type="date" required value={formData.date_of_birth}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
                  Gender <span style={{ color: "#dc3545" }}>*</span>
                </label>
                <select
                  required value={formData.gender}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
                  Ethnic Group
                </label>
                <input
                  type="text" value={formData.ethnic_group}
                  onChange={(e) => setFormData(prev => ({ ...prev, ethnic_group: e.target.value }))}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div style={{ background: "white", padding: "clamp(15px, 4vw, 25px)", borderRadius: "15px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: "700", marginBottom: "20px", color: "#333", borderBottom: "2px solid #667eea", paddingBottom: "10px" }}>
              📍 Address
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>Province</label>
                <select
                  value={formData.province_code}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                >
                  <option value="">Select Province</option>
                  {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                  <option value="OTHER">Other (Custom)</option>
                </select>
              </div>
              {showCustomProvince && (
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>Custom Province</label>
                  <input
                    type="text" value={customProvince}
                    onChange={(e) => setCustomProvince(e.target.value)}
                    style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                  />
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>District</label>
                <select
                  value={formData.district_code}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  disabled={!formData.province_code}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px", opacity: formData.province_code ? 1 : 0.5 }}
                >
                  <option value="">Select District</option>
                  {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                  <option value="OTHER">Other (Custom)</option>
                </select>
              </div>
              {showCustomDistrict && (
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>Custom District</label>
                  <input
                    type="text" value={customDistrict}
                    onChange={(e) => setCustomDistrict(e.target.value)}
                    style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                  />
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>Chiefdom</label>
                <select
                  value={formData.chiefdom_code}
                  onChange={(e) => handleChiefdomChange(e.target.value)}
                  disabled={!formData.district_code}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px", opacity: formData.district_code ? 1 : 0.5 }}
                >
                  <option value="">Select Chiefdom</option>
                  {chiefdoms.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  <option value="OTHER">Other (Custom)</option>
                </select>
              </div>
              {showCustomChiefdom && (
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>Custom Chiefdom</label>
                  <input
                    type="text" value={customChiefdom}
                    onChange={(e) => setCustomChiefdom(e.target.value)}
                    style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                  />
                </div>
              )}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>Village</label>
                <input
                  type="text" value={formData.village}
                  onChange={(e) => setFormData(prev => ({ ...prev, village: e.target.value }))}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
            </div>
          </div>

          {/* Farm Info */}
          <div style={{ background: "white", padding: "clamp(15px, 4vw, 25px)", borderRadius: "15px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: "700", marginBottom: "20px", color: "#333", borderBottom: "2px solid #667eea", paddingBottom: "10px" }}>
              🌾 Farm Information
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>Farm Size (hectares)</label>
                <input
                  type="number" step="0.01" value={formData.farm_size_hectares}
                  onChange={(e) => setFormData(prev => ({ ...prev, farm_size_hectares: e.target.value }))}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>Years Farming</label>
                <input
                  type="number" value={formData.years_farming}
                  onChange={(e) => setFormData(prev => ({ ...prev, years_farming: e.target.value }))}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
                  Crops Grown (comma-separated)
                </label>
                <input
                  type="text" value={formData.crops_grown}
                  onChange={(e) => setFormData(prev => ({ ...prev, crops_grown: e.target.value }))}
                  placeholder="e.g., Maize, Beans, Cassava"
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
                  Livestock Types (comma-separated)
                </label>
                <input
                  type="text" value={formData.livestock_types}
                  onChange={(e) => setFormData(prev => ({ ...prev, livestock_types: e.target.value }))}
                  placeholder="e.g., Cattle, Goats, Chickens"
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "flex", alignItems: "center", fontSize: "14px", fontWeight: "600", color: "#666", cursor: "pointer" }}>
                  <input
                    type="checkbox" checked={formData.has_irrigation}
                    onChange={(e) => setFormData(prev => ({ ...prev, has_irrigation: e.target.checked }))}
                    style={{ marginRight: "8px", width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  Has Irrigation
                </label>
              </div>
            </div>
          </div>

          {/* Household Info */}
          <div style={{ background: "white", padding: "clamp(15px, 4vw, 25px)", borderRadius: "15px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: "700", marginBottom: "20px", color: "#333", borderBottom: "2px solid #667eea", paddingBottom: "10px" }}>
              🏠 Household Information
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>Household Size</label>
                <input
                  type="number" value={formData.household_size}
                  onChange={(e) => setFormData(prev => ({ ...prev, household_size: e.target.value }))}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>Number of Dependents</label>
                <input
                  type="number" value={formData.number_of_dependents}
                  onChange={(e) => setFormData(prev => ({ ...prev, number_of_dependents: e.target.value }))}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>Primary Income Source</label>
                <input
                  type="text" value={formData.primary_income_source}
                  onChange={(e) => setFormData(prev => ({ ...prev, primary_income_source: e.target.value }))}
                  style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "15px", justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                padding: "12px 30px", background: "#6c757d", color: "white", border: "none",
                borderRadius: "8px", fontSize: "clamp(13px, 2vw, 15px)", fontWeight: "600", cursor: "pointer", transition: "all 0.3s", flex: "1 1 120px", minWidth: "120px"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#5a6268"}
              onMouseOut={(e) => e.currentTarget.style.background = "#6c757d"}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "12px 30px", background: saving ? "#ccc" : "#28a745", color: "white",
                border: "none", borderRadius: "8px", fontSize: "clamp(13px, 2vw, 15px)", fontWeight: "600",
                cursor: saving ? "not-allowed" : "pointer", transition: "all 0.3s", flex: "1 1 120px", minWidth: "120px"
              }}
              onMouseOver={(e) => !saving && (e.currentTarget.style.background = "#218838")}
              onMouseOut={(e) => !saving && (e.currentTarget.style.background = "#28a745")}
            >
              {saving ? "Saving..." : "💾 Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
