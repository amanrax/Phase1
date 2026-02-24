import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { operatorService } from "@/services/operator.service";
import GeoSelectWithOther from "@/components/GeoSelectWithOther";

export default function CreateOperator() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
    assigned_chiefdom: "",
    assigned_chiefdom_name: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
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
      const provinceName = formData.assigned_province_name;
      const districtName = formData.assigned_district_name;
      const chiefdomName = formData.assigned_chiefdom_name || undefined;

      const payload = {
        email: formData.email,
        full_name: `${formData.first_name} ${formData.last_name}`,
        phone: cleanPhone,
        password: formData.password,
        assigned_regions: provinceName ? [provinceName] : [],
        assigned_districts: districtName ? [districtName] : [],
        assigned_chiefdoms: chiefdomName ? [chiefdomName] : [],
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
          <fieldset style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "clamp(15px, 4vw, 20px)", marginBottom: "20px" }}>
            <legend style={{ fontWeight: "bold", fontSize: "clamp(14px, 3vw, 16px)", padding: "0 10px" }}>
              👤 Personal Information
            </legend>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                  First Name <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleChange("first_name", e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "clamp(13px, 2vw, 14px)" }}
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
            <GeoSelectWithOther
              value={{
                province_code: formData.assigned_province,
                province_name: formData.assigned_province_name,
                district_code: formData.assigned_district,
                district_name: formData.assigned_district_name,
                chiefdom_code: formData.assigned_chiefdom,
                chiefdom_name: formData.assigned_chiefdom_name,
              }}
              onChange={(v) => setFormData((prev: any) => ({
                ...prev,
                assigned_province: v.province_code,
                assigned_province_name: v.province_name,
                assigned_district: v.district_code,
                assigned_district_name: v.district_name,
                assigned_chiefdom: v.chiefdom_code,
                assigned_chiefdom_name: v.chiefdom_name,
              }))}
              showChiefdom={true}
            />
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
