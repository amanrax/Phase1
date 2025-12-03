import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { operatorService } from "@/services/operator.service";
import geoService from "@/services/geo.service";
import { useNotification } from "@/components/Notification";

const getErrorMessage = (err: unknown): string => {
  if (typeof err === "object" && err !== null) {
    const error = err as Record<string, unknown>;
    if (error.response && typeof error.response === "object") {
      const response = error.response as Record<string, unknown>;
      if (response.data && typeof response.data === "object") {
        const data = response.data as Record<string, string>;
        return data.detail || "An error occurred";
      }
    }
    if (error.message && typeof error.message === "string") {
      return error.message;
    }
  }
  return "An error occurred";
};

interface Province { code: string; name: string }
interface District { code: string; name: string }

export default function OperatorEdit() {
  const { operatorId } = useParams<{ operatorId: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    assigned_district: "",
    is_active: true,
  });

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom inputs for Others option
  const [customProvince, setCustomProvince] = useState("");
  const [customDistrict, setCustomDistrict] = useState("");
  const [showCustomProvince, setShowCustomProvince] = useState(false);
  const [showCustomDistrict, setShowCustomDistrict] = useState(false);
  
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    loadProvinces();
    if (operatorId) {
      fetchOperator();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatorId]);

  const loadProvinces = async () => {
    try {
      const data = await geoService.provinces();
      setProvinces(data);
    } catch (err) {
      console.error("Failed to load provinces", err);
    }
  };

  const loadDistricts = async (provinceCode: string) => {
    try {
      const data = await geoService.districts(provinceCode);
      setDistricts(data);
    } catch (err) {
      console.error("Failed to load districts", err);
    }
  };

  const fetchOperator = async () => {
    try {
      setLoading(true);
      const op = await operatorService.getOperator(operatorId!);
      // Backend returns assigned_districts (array), we use first element
      const district = op.assigned_districts?.[0] || op.assigned_district || "";
      setFormData({
        full_name: op.full_name || "",
        email: op.email || "",
        phone: op.phone || "",
        assigned_district: district,
        is_active: op.is_active ?? true,
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleProvinceChange = async (provinceCode: string) => {
    if (provinceCode === 'OTHER') {
      setShowCustomProvince(true);
      setShowCustomDistrict(false);
      setSelectedProvince("");
      setFormData(prev => ({ ...prev, assigned_district: "" }));
      setDistricts([]);
      return;
    }
    
    setShowCustomProvince(false);
    setCustomProvince("");
    setSelectedProvince(provinceCode);
    setFormData(prev => ({ ...prev, assigned_district: "" }));
    if (provinceCode) {
      await loadDistricts(provinceCode);
    } else {
      setDistricts([]);
    }
  };
  
  const handleDistrictChange = (districtName: string) => {
    if (districtName === 'OTHER') {
      setShowCustomDistrict(true);
      setFormData(prev => ({ ...prev, assigned_district: "" }));
      return;
    }
    
    setShowCustomDistrict(false);
    setCustomDistrict("");
    setFormData(prev => ({ ...prev, assigned_district: districtName }));
  };

  const handleSave = async () => {
    if (!operatorId) return;

    if (!formData.full_name.trim() || !formData.email.trim()) {
      showError("Please fill in all required fields");
      return;
    }

    try {
      setSaving(true);
      
      // Handle custom province creation
      if (showCustomProvince && customProvince.trim()) {
        const newProvince = await geoService.createCustomProvince(customProvince.trim());
        showSuccess(`Custom province "${newProvince.name}" created successfully!`);
        
        // Reload provinces
        const allProvinces = await geoService.provinces();
        setProvinces(allProvinces);
        setSelectedProvince(newProvince.code);
        
        // Load districts for the new province
        await loadDistricts(newProvince.code);
      }
      
      // Handle custom district creation
      if (showCustomDistrict && customDistrict.trim() && selectedProvince) {
        const newDistrict = await geoService.createCustomDistrict(
          selectedProvince,
          customDistrict.trim()
        );
        formData.assigned_district = newDistrict.name;
        showSuccess(`Custom district "${newDistrict.name}" created successfully!`);
        
        // Reload districts
        const allDistricts = await geoService.districts(selectedProvince);
        setDistricts(allDistricts);
      }
      
      await operatorService.update(operatorId, formData);
      showSuccess("✅ Operator updated successfully");
      navigate("/operators/manage");
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err) || "Failed to update operator";
      showError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "white" }}>
          <div style={{
            width: "60px",
            height: "60px",
            border: "5px solid rgba(255,255,255,0.3)",
            borderTop: "5px solid white",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px"
          }}></div>
          <p style={{ fontSize: "18px" }}>Loading operator data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "white" }}>
          <div style={{ fontSize: "80px", marginBottom: "20px" }}>❌</div>
          <p style={{ fontSize: "24px", marginBottom: "20px" }}>{error}</p>
          <button
            onClick={() => navigate("/operators/manage")}
            style={{
              padding: "12px 30px",
              background: "white",
              color: "#667eea",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      <div style={{ textAlign: "center", color: "white", paddingTop: "30px", paddingBottom: "30px" }}>
        <h1 style={{ fontSize: "2.8rem", marginBottom: "10px", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}>
          🌾 AgriManage Pro
        </h1>
        <p style={{ fontSize: "18px", opacity: 0.9 }}>Edit Operator</p>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 20px 40px 20px" }}>
        <button
          onClick={() => navigate("/operators/manage")}
          style={{
            padding: "10px 20px",
            background: "white",
            color: "#667eea",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            marginBottom: "20px",
            transition: "all 0.3s"
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
          onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
        >
          ← Back
        </button>

        <div style={{ background: "white", padding: "40px", borderRadius: "15px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "30px", color: "#333" }}>
            👨‍💼 Operator Information
          </h2>

          <div style={{ display: "grid", gap: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#666", marginBottom: "8px" }}>
                Full Name <span style={{ color: "#dc3545" }}>*</span>
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "15px",
                  transition: "border 0.3s"
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                onBlur={(e) => e.currentTarget.style.borderColor = "#e0e0e0"}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#666", marginBottom: "8px" }}>
                Email <span style={{ color: "#dc3545" }}>*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "15px",
                  transition: "border 0.3s"
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                onBlur={(e) => e.currentTarget.style.borderColor = "#e0e0e0"}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#666", marginBottom: "8px" }}>
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "15px",
                  transition: "border 0.3s"
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                onBlur={(e) => e.currentTarget.style.borderColor = "#e0e0e0"}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#666", marginBottom: "8px" }}>
                  Province
                </label>
                <select
                  value={showCustomProvince ? 'OTHER' : selectedProvince}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "8px",
                    fontSize: "15px",
                    transition: "border 0.3s"
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e0e0e0"}
                >
                  <option value="">Select Province</option>
                  {provinces.map(p => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                  <option value="OTHER">Others - Specify</option>
                </select>
                {showCustomProvince && (
                  <input
                    type="text"
                    value={customProvince}
                    onChange={(e) => setCustomProvince(e.target.value)}
                    placeholder="Enter province name"
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "2px solid #e0e0e0",
                      borderRadius: "8px",
                      fontSize: "15px",
                      marginTop: "8px"
                    }}
                  />
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#666", marginBottom: "8px" }}>
                  Assigned District
                </label>
                <select
                  value={showCustomDistrict ? 'OTHER' : formData.assigned_district}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  disabled={showCustomProvince || (!selectedProvince && !customProvince)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "8px",
                    fontSize: "15px",
                    transition: "border 0.3s",
                    opacity: (showCustomProvince || (!selectedProvince && !customProvince)) ? 0.5 : 1
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e0e0e0"}
                >
                  <option value="">All Districts</option>
                  {districts.map(d => (
                    <option key={d.code} value={d.name}>{d.name}</option>
                  ))}
                  <option value="OTHER">Others - Specify</option>
                </select>
                {showCustomDistrict && (
                  <input
                    type="text"
                    value={customDistrict}
                    onChange={(e) => setCustomDistrict(e.target.value)}
                    placeholder="Enter district name"
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "2px solid #e0e0e0",
                      borderRadius: "8px",
                      fontSize: "15px",
                      marginTop: "8px"
                    }}
                  />
                )}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                style={{ width: "20px", height: "20px", cursor: "pointer" }}
              />
              <label htmlFor="is_active" style={{ fontSize: "14px", fontWeight: "600", color: "#666", cursor: "pointer" }}>
                Active Operator
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: "15px", marginTop: "30px", justifyContent: "flex-end" }}>
            <button
              onClick={() => navigate("/operators/manage")}
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
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "12px 30px",
                background: saving ? "#999" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: saving ? "not-allowed" : "pointer",
                transition: "all 0.3s"
              }}
              onMouseOver={(e) => {
                if (!saving) e.currentTarget.style.background = "#218838";
              }}
              onMouseOut={(e) => {
                if (!saving) e.currentTarget.style.background = "#28a745";
              }}
            >
              {saving ? "⏳ Saving..." : "💾 Save Changes"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
