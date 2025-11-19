// src/pages/EditFarmer.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { farmerService } from "@/services/farmer.service";
import geoService from "@/services/geo.service";

interface FarmerFormData {
  // Personal Info
  first_name: string;
  last_name: string;
  phone_primary: string;
  phone_secondary: string;
  email: string;
  nrc: string;
  date_of_birth: string;
  gender: string;
  ethnic_group: string;
  // Address
  province_code: string;
  province_name: string;
  district_code: string;
  district_name: string;
  chiefdom_code: string;
  chiefdom_name: string;
  village: string;
  // Farm Info
  farm_size_hectares: string;
  crops_grown: string;
  livestock_types: string;
  has_irrigation: boolean;
  years_farming: string;
  // Household Info
  household_size: string;
  number_of_dependents: string;
  primary_income_source: string;
}

export default function EditFarmer() {
  const navigate = useNavigate();
  const { farmerId } = useParams<{ farmerId: string }>();
  
  const [formData, setFormData] = useState<FarmerFormData>({
    first_name: "",
    last_name: "",
    phone_primary: "",
    phone_secondary: "",
    email: "",
    nrc: "",
    date_of_birth: "",
    gender: "",
    ethnic_group: "",
    province_code: "",
    province_name: "",
    district_code: "",
    district_name: "",
    chiefdom_code: "",
    chiefdom_name: "",
    village: "",
    farm_size_hectares: "",
    crops_grown: "",
    livestock_types: "",
    has_irrigation: false,
    years_farming: "",
    household_size: "",
    number_of_dependents: "",
    primary_income_source: "",
  });

  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [chiefdoms, setChiefdoms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Add state for "Other" fields
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
      const farmer = await farmerService.getFarmer(farmerId!);
      
      // Load districts and chiefdoms if province/district selected
      if (farmer.address?.province_code) {
        await loadDistricts(farmer.address.province_code);
      }
      if (farmer.address?.district_code) {
        await loadChiefdoms(farmer.address.district_code);
      }

      // Check if values are "Other" (custom entries)
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
        // Personal Info
        first_name: farmer.personal_info?.first_name || "",
        last_name: farmer.personal_info?.last_name || "",
        phone_primary: farmer.personal_info?.phone_primary || "",
        phone_secondary: farmer.personal_info?.phone_secondary || "",
        email: farmer.personal_info?.email || "",
        nrc: farmer.personal_info?.nrc || "",
        date_of_birth: farmer.personal_info?.date_of_birth || "",
        gender: farmer.personal_info?.gender || "",
        ethnic_group: farmer.personal_info?.ethnic_group || "",
        // Address
        province_code: isCustomProvince ? "OTHER" : (farmer.address?.province_code || ""),
        province_name: farmer.address?.province_name || "",
        district_code: isCustomDistrict ? "OTHER" : (farmer.address?.district_code || ""),
        district_name: farmer.address?.district_name || "",
        chiefdom_code: isCustomChiefdom ? "OTHER" : (farmer.address?.chiefdom_code || ""),
        chiefdom_name: farmer.address?.chiefdom_name || "",
        village: farmer.address?.village || "",
        // Farm Info
        farm_size_hectares: farmer.farm_info?.farm_size_hectares?.toString() || "",
        crops_grown: farmer.farm_info?.crops_grown?.join(", ") || "",
        livestock_types: farmer.farm_info?.livestock_types?.join(", ") || "",
        has_irrigation: farmer.farm_info?.has_irrigation || false,
        years_farming: farmer.farm_info?.years_farming?.toString() || "",
        // Household Info
        household_size: farmer.household_info?.household_size?.toString() || "",
        number_of_dependents: farmer.household_info?.number_of_dependents?.toString() || "",
        primary_income_source: farmer.household_info?.primary_income_source || "",
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to fetch farmer");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FarmerFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleProvinceChange = async (provinceCode: string) => {
    if (provinceCode === "OTHER") {
      setShowCustomProvince(true);
      setFormData(prev => ({
        ...prev,
        province_code: "OTHER",
        province_name: "",
        district_code: "",
        district_name: "",
        chiefdom_code: "",
        chiefdom_name: "",
      }));
      setDistricts([]);
      setChiefdoms([]);
      setShowCustomDistrict(false);
      setShowCustomChiefdom(false);
      setCustomDistrict("");
      setCustomChiefdom("");
    } else {
      setShowCustomProvince(false);
      setCustomProvince("");
      setShowCustomDistrict(false);
      setShowCustomChiefdom(false);
      const province = provinces.find(p => p.code === provinceCode);
      setFormData(prev => ({
        ...prev,
        province_code: provinceCode,
        province_name: province?.name || "",
        district_code: "",
        district_name: "",
        chiefdom_code: "",
        chiefdom_name: "",
      }));
      setDistricts([]);
      setChiefdoms([]);
      if (provinceCode) {
        await loadDistricts(provinceCode);
      }
    }
  };

  const handleDistrictChange = async (districtCode: string) => {
    if (districtCode === "OTHER") {
      setShowCustomDistrict(true);
      setFormData(prev => ({
        ...prev,
        district_code: "OTHER",
        district_name: "",
        chiefdom_code: "",
        chiefdom_name: "",
      }));
      setChiefdoms([]);
      setShowCustomChiefdom(false);
    } else {
      setShowCustomDistrict(false);
      setCustomDistrict("");
      const district = districts.find(d => d.code === districtCode);
      setFormData(prev => ({
        ...prev,
        district_code: districtCode,
        district_name: district?.name || "",
        chiefdom_code: "",
        chiefdom_name: "",
      }));
      setChiefdoms([]);
      if (districtCode) {
        await loadChiefdoms(districtCode);
      }
    }
  };

  const handleChiefdomChange = (chiefdomCode: string) => {
    if (chiefdomCode === "OTHER") {
      setShowCustomChiefdom(true);
      setFormData(prev => ({
        ...prev,
        chiefdom_code: "OTHER",
        chiefdom_name: "",
      }));
    } else {
      setShowCustomChiefdom(false);
      setCustomChiefdom("");
      const chiefdom = chiefdoms.find(c => c.code === chiefdomCode);
      setFormData(prev => ({
        ...prev,
        chiefdom_code: chiefdomCode,
        chiefdom_name: chiefdom?.name || "",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    
    try {
      // Clean phone numbers (remove spaces)
      const cleanPhone = (phone: string) => phone.replace(/[\s\-\(\)]/g, "");
      
      const payload: any = {
        personal_info: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone_primary: cleanPhone(formData.phone_primary),
          phone_secondary: formData.phone_secondary ? cleanPhone(formData.phone_secondary) : undefined,
          email: formData.email || undefined,
          nrc: formData.nrc,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          ethnic_group: formData.ethnic_group || undefined,
        },
        address: {
          province_code: showCustomProvince ? "OTHER" : formData.province_code,
          province_name: showCustomProvince ? customProvince.trim() : formData.province_name,
          district_code: showCustomDistrict ? "OTHER" : formData.district_code,
          district_name: showCustomDistrict ? customDistrict.trim() : formData.district_name,
          chiefdom_code: showCustomChiefdom ? "OTHER" : (formData.chiefdom_code || ""),
          chiefdom_name: showCustomChiefdom ? customChiefdom.trim() : (formData.chiefdom_name || ""),
          village: formData.village,
        },
      };

      // Add farm_info if any farm data exists
      if (formData.farm_size_hectares || formData.crops_grown) {
        payload.farm_info = {
          farm_size_hectares: parseFloat(formData.farm_size_hectares) || 1,
          crops_grown: formData.crops_grown ? formData.crops_grown.split(",").map((c: string) => c.trim()).filter(Boolean) : [],
          livestock_types: formData.livestock_types ? formData.livestock_types.split(",").map((l: string) => l.trim()).filter(Boolean) : [],
          has_irrigation: formData.has_irrigation,
          years_farming: Math.min(parseInt(formData.years_farming) || 0, 100), // Cap at 100
        };
      }

      // Add household_info if any household data exists
      if (formData.household_size || formData.primary_income_source) {
        payload.household_info = {
          household_size: parseInt(formData.household_size) || 1,
          number_of_dependents: parseInt(formData.number_of_dependents) || 0,
          primary_income_source: formData.primary_income_source || "Farming",
        };
      }

      console.log("Update payload:", JSON.stringify(payload, null, 2));
      await farmerService.update(farmerId!, payload);
      alert("✅ Farmer updated successfully!");
      navigate("/farmers");
    } catch (err: any) {
      console.error("Update error:", err);
      console.error("Error response:", err.response?.data);
      console.error("Full error details:", JSON.stringify(err.response?.data?.detail, null, 2));
      
      // Handle validation errors
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          // Pydantic validation errors
          const errors = err.response.data.detail.map((e: any) => {
            console.log("Validation error:", e);
            return `${e.loc.join('.')}: ${e.msg} (input: ${JSON.stringify(e.input)})`;
          }).join('\n');
          setError(errors);
        } else {
          setError(err.response.data.detail);
        }
      } else {
        setError(err.message || "Error updating farmer");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p>⏳ Loading farmer details...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      <h2>✏️ Edit Farmer</h2>

      {error && (
        <div style={{ 
          padding: "15px", 
          backgroundColor: "#fee", 
          border: "1px solid #fcc",
          borderRadius: "4px",
          marginBottom: "20px",
          color: "#c00"
        }}>
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
          e.preventDefault();
        }
      }}>
        {/* Personal Information */}
        <fieldset style={{ 
          border: "1px solid #ddd", 
          borderRadius: "8px", 
          padding: "20px",
          marginBottom: "30px"
        }}>
          <legend style={{ 
            fontWeight: "bold", 
            fontSize: "18px",
            padding: "0 10px"
          }}>👤 Personal Information</legend>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                First Name <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
                required
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  border: "1px solid #ccc",
                  borderRadius: "4px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Last Name <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
                required
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  border: "1px solid #ccc",
                  borderRadius: "4px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Primary Phone <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="tel"
                value={formData.phone_primary}
                onChange={(e) => handleChange("phone_primary", e.target.value)}
                placeholder="+260XXXXXXXXX or 0XXXXXXXXX"
                required
                pattern="^(\+260|0)[0-9]{9}$"
                title="Phone must be in format +260XXXXXXXXX or 0XXXXXXXXX"
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  border: "1px solid #ccc",
                  borderRadius: "4px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Secondary Phone
              </label>
              <input
                type="tel"
                value={formData.phone_secondary}
                onChange={(e) => handleChange("phone_secondary", e.target.value)}
                placeholder="+260XXXXXXXXX or 0XXXXXXXXX"
                pattern="^(\+260|0)[0-9]{9}$"
                title="Phone must be in format +260XXXXXXXXX or 0XXXXXXXXX"
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  border: "1px solid #ccc",
                  borderRadius: "4px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="farmer@example.com"
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  border: "1px solid #ccc",
                  borderRadius: "4px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                NRC <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                value={formData.nrc}
                onChange={(e) => handleChange("nrc", e.target.value)}
                placeholder="######/##/#"
                required
                pattern="^\d{6}/\d{2}/\d$"
                title="NRC must be in format ######/##/#"
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  border: "1px solid #ccc",
                  borderRadius: "4px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Date of Birth <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => handleChange("date_of_birth", e.target.value)}
                required
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  border: "1px solid #ccc",
                  borderRadius: "4px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Gender <span style={{ color: "red" }}>*</span>
              </label>
              <select
                value={formData.gender}
                onChange={(e) => handleChange("gender", e.target.value)}
                required
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  border: "1px solid #ccc",
                  borderRadius: "4px"
                }}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Ethnic Group
              </label>
              <input
                type="text"
                value={formData.ethnic_group}
                onChange={(e) => handleChange("ethnic_group", e.target.value)}
                placeholder="Enter ethnic group"
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  border: "1px solid #ccc",
                  borderRadius: "4px"
                }}
              />
            </div>
          </div>
        </fieldset>

        {/* Address */}
        <fieldset style={{ 
          border: "1px solid #ddd", 
          borderRadius: "8px", 
          padding: "20px",
          marginBottom: "30px"
        }}>
          <legend style={{ 
            fontWeight: "bold", 
            fontSize: "18px",
            padding: "0 10px"
          }}>📍 Address</legend>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Province <span style={{ color: "red" }}>*</span>
              </label>
              <select
                value={showCustomProvince ? "OTHER" : formData.province_code}
                onChange={(e) => handleProvinceChange(e.target.value)}
                required
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  border: "1px solid #ccc",
                  borderRadius: "4px"
                }}
              >
                <option value="">Select Province</option>
                {provinces.map(p => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
                <option value="OTHER">Other (specify below)</option>
              </select>
            </div>

            {showCustomProvince && (
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                  Enter Province Name <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  value={customProvince}
                  onChange={(e) => setCustomProvince(e.target.value)}
                  required
                  placeholder="Enter custom province name"
                  style={{ 
                    width: "100%", 
                    padding: "10px", 
                    border: "1px solid #ccc",
                    borderRadius: "4px"
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                District <span style={{ color: "red" }}>*</span>
              </label>
              {showCustomProvince ? (
                <input
                  type="text"
                  value={customDistrict}
                  onChange={(e) => setCustomDistrict(e.target.value)}
                  required
                  placeholder="Enter custom district name"
                  style={{ 
                    width: "100%", 
                    padding: "10px", 
                    border: "1px solid #ccc",
                    borderRadius: "4px"
                  }}
                />
              ) : (
                <select
                  value={showCustomDistrict ? "OTHER" : formData.district_code}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  required
                  disabled={!formData.province_code}
                  style={{ 
                    width: "100%", 
                    padding: "10px", 
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor: !formData.province_code ? "#f5f5f5" : "white"
                  }}
                >
                  <option value="">Select District</option>
                  {districts.map(d => (
                    <option key={d.code} value={d.code}>{d.name}</option>
                  ))}
                  <option value="OTHER">Other (specify below)</option>
                </select>
              )}
            </div>

            {showCustomDistrict && !showCustomProvince && (
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                  Enter District Name <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  value={customDistrict}
                  onChange={(e) => setCustomDistrict(e.target.value)}
                  required
                  placeholder="Enter custom district name"
                  style={{ 
                    width: "100%", 
                    padding: "10px", 
                    border: "1px solid #ccc",
                    borderRadius: "4px"
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Chiefdom
              </label>
              {showCustomProvince ? (
                <input
                  type="text"
                  value={customChiefdom}
                  onChange={(e) => setCustomChiefdom(e.target.value)}
                  placeholder="Enter custom chiefdom name"
                  style={{ 
                    width: "100%", 
                    padding: "10px", 
                    border: "1px solid #ccc",
                    borderRadius: "4px"
                  }}
                />
              ) : (
                <select
                  value={showCustomChiefdom ? "OTHER" : formData.chiefdom_code}
                  onChange={(e) => handleChiefdomChange(e.target.value)}
                  disabled={!formData.district_code}
                  style={{ 
                    width: "100%", 
                    padding: "10px", 
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor: !formData.district_code ? "#f5f5f5" : "white"
                  }}
                >
                  <option value="">Select Chiefdom</option>
                  {chiefdoms.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                  <option value="OTHER">Other (specify below)</option>
                </select>
              )}
            </div>

            {showCustomChiefdom && !showCustomProvince && (
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                  Enter Chiefdom Name
                </label>
                <input
                  type="text"
                  value={customChiefdom}
                  onChange={(e) => setCustomChiefdom(e.target.value)}
                  placeholder="Enter custom chiefdom name"
                  style={{ 
                    width: "100%", 
                    padding: "10px", 
                    border: "1px solid #ccc",
                    borderRadius: "4px"
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Village <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                value={formData.village}
                onChange={(e) => handleChange("village", e.target.value)}
                required
                placeholder="Enter village name"
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  border: "1px solid #ccc",
                  borderRadius: "4px"
                }}
              />
            </div>
          </div>
        </fieldset>

        {/* Farm Information */}
        <fieldset style={{ 
          border: "1px solid #ddd", 
          borderRadius: "8px", 
          padding: "20px",
          marginBottom: "30px"
        }}>
          <legend style={{ 
            fontWeight: "bold", 
            fontSize: "18px",
            padding: "0 10px"
          }}>🌾 Farm Information</legend>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Farm Size (hectares)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.farm_size_hectares}
                onChange={(e) => handleChange("farm_size_hectares", e.target.value)}
                placeholder="e.g., 5.5"
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  border: "1px solid #ccc",
                  borderRadius: "4px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Years Farming
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.years_farming}
                onChange={(e) => handleChange("years_farming", e.target.value)}
                placeholder="e.g., 10"
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  border: "1px solid #ccc",
                  borderRadius: "4px"
                }}
              />
              <small style={{ color: "#666", fontSize: "12px" }}>Maximum: 100 years</small>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Crops Grown (comma-separated)
              </label>
              <input
                type="text"
                value={formData.crops_grown}
                onChange={(e) => handleChange("crops_grown", e.target.value)}
                placeholder="e.g., Maize, Groundnuts, Beans"
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  border: "1px solid #ccc",
                  borderRadius: "4px"
                }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Livestock Types (comma-separated)
              </label>
              <input
                type="text"
                value={formData.livestock_types}
                onChange={(e) => handleChange("livestock_types", e.target.value)}
                placeholder="e.g., Cattle, Goats, Chickens"
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  border: "1px solid #ccc",
                  borderRadius: "4px"
                }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "flex", alignItems: "center", fontWeight: "500", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={formData.has_irrigation}
                  onChange={(e) => handleChange("has_irrigation", e.target.checked)}
                  style={{ marginRight: "8px", width: "18px", height: "18px" }}
                />
                Has Irrigation System
              </label>
            </div>
          </div>
        </fieldset>

        {/* Household Information */}
        <fieldset style={{ 
          border: "1px solid #ddd", 
          borderRadius: "8px", 
          padding: "20px",
          marginBottom: "30px"
        }}>
          <legend style={{ 
            fontWeight: "bold", 
            fontSize: "18px",
            padding: "0 10px"
          }}>🏠 Household Information</legend>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Household Size
              </label>
              <input
                type="number"
                min="1"
                value={formData.household_size}
                onChange={(e) => handleChange("household_size", e.target.value)}
                placeholder="e.g., 5"
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  border: "1px solid #ccc",
                  borderRadius: "4px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Number of Dependents
              </label>
              <input
                type="number"
                min="0"
                value={formData.number_of_dependents}
                onChange={(e) => handleChange("number_of_dependents", e.target.value)}
                placeholder="e.g., 3"
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  border: "1px solid #ccc",
                  borderRadius: "4px"
                }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Primary Income Source
              </label>
              <input
                type="text"
                value={formData.primary_income_source}
                onChange={(e) => handleChange("primary_income_source", e.target.value)}
                placeholder="e.g., Farming, Trading"
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  border: "1px solid #ccc",
                  borderRadius: "4px"
                }}
              />
            </div>
          </div>
        </fieldset>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "15px", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => navigate("/farmers")}
            disabled={saving}
            style={{
              padding: "12px 24px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "500",
              opacity: saving ? 0.6 : 1
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "12px 24px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "500",
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? "💾 Saving..." : "💾 Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
