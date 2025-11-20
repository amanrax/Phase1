import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { operatorService } from "@/services/operator.service";
import geoService from "@/services/geo.service";

export default function CreateOperator() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingGeo, setLoadingGeo] = useState(false);
  
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "OPERATOR",
    assigned_province: "",
    assigned_province_name: "",
    assigned_district: "",
    assigned_district_name: "",
  });

  // Load provinces on component mount
  useEffect(() => {
    loadProvinces();
  }, []);

  // Load districts when province changes
  useEffect(() => {
    if (formData.assigned_province) {
      loadDistricts(formData.assigned_province);
    } else {
      setDistricts([]);
    }
  }, [formData.assigned_province]);

  const loadProvinces = async () => {
    try {
      setLoadingGeo(true);
      const data = await geoService.provinces();
      setProvinces(data);
    } catch (err) {
      console.error("Failed to load provinces:", err);
      setError("Failed to load provinces");
    } finally {
      setLoadingGeo(false);
    }
  };

  const loadDistricts = async (provinceCode: string) => {
    try {
      setLoadingGeo(true);
      const data = await geoService.districts(provinceCode);
      setDistricts(data);
    } catch (err) {
      console.error("Failed to load districts:", err);
      setError("Failed to load districts");
    } finally {
      setLoadingGeo(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleProvinceChange = (value: string) => {
    const selectedProvince = provinces.find(p => p.code === value);
    setFormData((prev: any) => ({
      ...prev,
      assigned_province: value,
      assigned_province_name: selectedProvince?.name || "",
      assigned_district: "", // Reset district when province changes
      assigned_district_name: "",
    }));
  };

  const handleDistrictChange = (value: string) => {
    const selectedDistrict = districts.find(d => d.code === value);
    setFormData((prev: any) => ({
      ...prev,
      assigned_district: value,
      assigned_district_name: selectedDistrict?.name || "",
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setSaving(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      setSaving(false);
      return;
    }

    // Clean phone number
    const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, "");

    try {
      const payload = {
        email: formData.email,
        full_name: `${formData.first_name} ${formData.last_name}`,
        phone: cleanPhone,
        password: formData.password,
        assigned_regions: formData.assigned_province_name ? [formData.assigned_province_name] : [],
        assigned_districts: formData.assigned_district_name ? [formData.assigned_district_name] : [],
      };

      await operatorService.create(payload);
      alert("✅ Operator created successfully!");
      navigate("/operators");
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error("Create operator error:", err);
      }
      setError(err.response?.data?.detail || err.message || "Failed to create operator");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5", padding: "20px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", backgroundColor: "white", borderRadius: "8px", padding: "30px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>
          ➕ Create New Operator
        </h2>

        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: "#FEE2E2",
              color: "#DC2626",
              padding: "15px",
              marginBottom: "20px",
              borderRadius: "6px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
            e.preventDefault();
          }
        }}>
          {/* Personal Information */}
          <fieldset style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
            <legend style={{ fontWeight: "bold", fontSize: "16px", padding: "0 10px" }}>
              👤 Personal Information
            </legend>

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
                  style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "4px" }}
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
                  style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "4px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                  Email <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                  placeholder="operator@example.com"
                  style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "4px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                  Phone <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  required
                  placeholder="+260XXXXXXXXX"
                  pattern="^(\+260|0)[0-9]{9}$"
                  title="Phone must be in format +260XXXXXXXXX or 0XXXXXXXXX"
                  style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "4px" }}
                />
              </div>
            </div>
          </fieldset>

          {/* Account Credentials */}
          <fieldset style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
            <legend style={{ fontWeight: "bold", fontSize: "16px", padding: "0 10px" }}>
              🔐 Account Credentials
            </legend>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                  Password <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "4px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                  Confirm Password <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  required
                  minLength={8}
                  placeholder="Repeat password"
                  style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "4px" }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                  Role <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleChange("role", e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "4px" }}
                >
                  <option value="OPERATOR">Field Operator</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Assignment */}
          <fieldset style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
            <legend style={{ fontWeight: "bold", fontSize: "16px", padding: "0 10px" }}>
              📍 Assignment
            </legend>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                  Assigned Province
                </label>
                <select
                  value={formData.assigned_province}
                  onChange={(e: any) => handleProvinceChange(e.target.value)}
                  disabled={loadingGeo}
                  style={{ 
                    width: "100%", 
                    padding: "10px", 
                    border: "1px solid #ccc", 
                    borderRadius: "4px",
                    opacity: loadingGeo ? 0.6 : 1,
                    cursor: loadingGeo ? "not-allowed" : "pointer"
                  }}
                >
                  <option value="">{loadingGeo ? "Loading provinces..." : "Select a Province"}</option>
                  {provinces.map((p: any) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                  Assigned District
                </label>
                <select
                  value={formData.assigned_district}
                  onChange={(e: any) => handleDistrictChange(e.target.value)}
                  disabled={loadingGeo || !formData.assigned_province}
                  style={{ 
                    width: "100%", 
                    padding: "10px", 
                    border: "1px solid #ccc", 
                    borderRadius: "4px",
                    opacity: (loadingGeo || !formData.assigned_province) ? 0.6 : 1,
                    cursor: (loadingGeo || !formData.assigned_province) ? "not-allowed" : "pointer"
                  }}
                >
                  <option value="">
                    {!formData.assigned_province ? "Select Province First" : loadingGeo ? "Loading districts..." : "Select a District"}
                  </option>
                  {districts.map((d: any) => (
                    <option key={d.code} value={d.code}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "15px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => navigate("/operators")}
              disabled={saving}
              style={{
                padding: "12px 24px",
                backgroundColor: "#6B7280",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: "600",
                opacity: saving ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "12px 24px",
                backgroundColor: "#16A34A",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: "600",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "💾 Creating..." : "✅ Create Operator"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
