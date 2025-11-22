// src/pages/OperatorManagement.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { operatorService } from "@/services/operator.service";
import geoService from "@/services/geo.service";

interface Operator {
  _id: string;
  operator_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  is_active?: boolean;
  assigned_districts?: string[];
  assigned_regions?: string[];
  created_at?: string;
}

export default function OperatorManagement() {
  const navigate = useNavigate();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    role: "OPERATOR",
    assigned_district: "",
    assigned_province: "",
    assigned_province_code: "",
    assigned_district_code: "",
    assigned_chiefdom_code: "",
    assigned_province_custom: "",
    assigned_district_custom: "",
    assigned_chiefdom_custom: "",
  });
  const [error, setError] = useState("");
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [chiefdoms, setChiefdoms] = useState<any[]>([]);

  useEffect(() => {
    loadOperators();
  }, []);

  useEffect(() => {
    // Load geo data when create form opens
    if (showCreateForm) {
      loadProvinces();
    }
  }, [showCreateForm]);

  useEffect(() => {
    if (formData.assigned_province_code) {
      loadDistricts(formData.assigned_province_code);
    } else {
      setDistricts([]);
      setChiefdoms([]);
    }
  }, [formData.assigned_province_code]);

  useEffect(() => {
    if (formData.assigned_district_code) {
      loadChiefdoms(formData.assigned_district_code);
    } else {
      setChiefdoms([]);
    }
  }, [formData.assigned_district_code]);

  const loadProvinces = async () => {
    try {
      setLoadingGeo(true);
      const data = await geoService.provinces();
      setProvinces(data);
    } catch (err) {
      console.error("Failed to load provinces:", err);
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
    } finally {
      setLoadingGeo(false);
    }
  };

  const loadChiefdoms = async (districtCode: string) => {
    try {
      setLoadingGeo(true);
      const data = await geoService.chiefdoms(districtCode);
      setChiefdoms(data);
    } catch (err) {
      console.error("Failed to load chiefdoms:", err);
    } finally {
      setLoadingGeo(false);
    }
  };

  const handleProvinceSelect = (code: string) => {
    const p = provinces.find((x) => x.code === code);
    setFormData({
      ...formData,
      assigned_province_code: code,
      assigned_province: p?.name || "",
      assigned_district: "",
      assigned_district_code: "",
      assigned_chiefdom_code: "",
      assigned_chiefdom: "",
    });
  };

  const handleDistrictSelect = (code: string) => {
    const d = districts.find((x) => x.code === code);
    setFormData({
      ...formData,
      assigned_district_code: code,
      assigned_district: d?.name || "",
      assigned_chiefdom_code: "",
      assigned_chiefdom: "",
    });
  };

  const handleChiefdomSelect = (code: string) => {
    const c = chiefdoms.find((x) => x.code === code);
    setFormData({
      ...formData,
      assigned_chiefdom_code: code,
    });
  };

  const loadOperators = async () => {
    setLoading(true);
    console.log("Loading operators with updated code..."); // Add this line for debugging
    try {
      const data = await operatorService.getOperators(100, 0);
      const operatorList = (data.results || data.operators || data || []).map(
        (op: any) => ({
          ...op,
          status: op.is_active ? "active" : "inactive",
        })
      );
      setOperators(operatorList);
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error("Failed to load operators:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      const resolvedProvince = formData.assigned_province_code === "OTHER"
        ? formData.assigned_province_custom
        : formData.assigned_province || undefined;

      const resolvedDistrict = formData.assigned_district_code === "OTHER"
        ? formData.assigned_district_custom
        : formData.assigned_district || undefined;

      const resolvedChiefdom = formData.assigned_chiefdom_code === "OTHER"
        ? formData.assigned_chiefdom_custom
        : undefined;

      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone.replace(/[\s\-\(\)]/g, ""),
        password: formData.password,
        role: formData.role,
        assigned_province: resolvedProvince,
        assigned_district: resolvedDistrict,
        assigned_chiefdom: resolvedChiefdom,
      };

      await operatorService.create(payload);
      alert("✅ Operator created successfully!");
      setShowCreateForm(false);
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        role: "OPERATOR",
        assigned_district: "",
        assigned_province: "",
        assigned_province_code: "",
        assigned_district_code: "",
        assigned_chiefdom_code: "",
        assigned_province_custom: "",
        assigned_district_custom: "",
        assigned_chiefdom_custom: "",
      });
      loadOperators();
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error("Create operator error:", err);
        console.error("Error response:", err.response?.data);
      }
      
      // Handle validation errors properly
      let errorMsg = "Failed to create operator";
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          // Pydantic validation errors
          errorMsg = err.response.data.detail.map((e: any) => 
            `${e.loc.join('.')}: ${e.msg}`
          ).join(', ');
        } else if (typeof err.response.data.detail === 'string') {
          errorMsg = err.response.data.detail;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
    }
  };

  const handleToggleStatus = async (operator: Operator) => {
    console.log(
      "Toggling status for operator:",
      operator.operator_id,
      "Current status:",
      operator.status
    ); // Add this line for debugging
    const newStatus = operator.status === "active" ? false : true;
    const action = newStatus ? "activate" : "deactivate";
    if (!confirm(`Are you sure you want to ${action} this operator?`)) {
      return;
    }

    try {
      const payload: any = {
        full_name: operator.full_name,
        phone: operator.phone,
        assigned_regions: operator.assigned_regions,
        assigned_districts: operator.assigned_districts,
        is_active: newStatus,
      };

      await operatorService.update(operator.operator_id, payload);
      alert(`✅ Operator ${action}d successfully`);
      loadOperators();
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error(`${action} operator error:`, err);
      }
      alert(err.response?.data?.detail || `Failed to ${action} operator`);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      {/* Header */}
      <header className="app-page-header">
        <div style={{ display: "flex", alignItems: "center" }}>
          <button onClick={() => navigate("/")} aria-label="Back" className="btn-back">
            ← BACK
          </button>
          <h1 className="app-title" style={{ margin: 0 }}>👥 Operator Management</h1>
        </div>
      </header>

      {/* Content */}
      <div style={{ maxWidth: "1200px", margin: "20px auto", padding: "0 20px" }}>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          aria-label={showCreateForm ? "Cancel" : "Create Operator"}
          style={{
            marginBottom: "20px",
            padding: "10px 20px",
            backgroundColor: showCreateForm ? "#6B7280" : "#16A34A",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {showCreateForm ? "✕ Cancel" : "➕ Create Operator"}
        </button>

        {/* Create Form */}
        {showCreateForm && (
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              marginBottom: "20px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "15px" }}>
              Create New Operator
            </h3>

            {error && (
              <div
                role="alert"
                style={{
                  backgroundColor: "#FEE2E2",
                  color: "#DC2626",
                  padding: "12px",
                  marginBottom: "15px",
                  borderRadius: "6px",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                e.preventDefault();
              }
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                    First Name <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                    Last Name <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                    Email <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="operator@example.com"
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                    Phone <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+260XXXXXXXXX"
                    pattern="^(\+260|0)[0-9]{9}$"
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                    Password <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min. 8 characters"
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                    Confirm Password <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Repeat password"
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                    Role <span style={{ color: "red" }}>*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                  >
                    <option value="OPERATOR">Field Operator</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                    Assigned Province
                  </label>
                  <select
                    value={formData.assigned_province_code}
                    onChange={(e) => handleProvinceSelect(e.target.value)}
                    disabled={loadingGeo}
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                  >
                    <option value="">{loadingGeo ? "Loading provinces..." : "Select a Province"}</option>
                    {provinces.map((p) => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                    <option value="OTHER">Other (specify)</option>
                  </select>
                  {formData.assigned_province_code === "OTHER" && (
                    <input
                      type="text"
                      value={formData.assigned_province_custom}
                      onChange={(e) => setFormData({ ...formData, assigned_province_custom: e.target.value })}
                      placeholder="Specify province"
                      style={{ marginTop: 8, width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                    />
                  )}
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                    Assigned District
                  </label>
                  <select
                    value={formData.assigned_district_code}
                    onChange={(e) => handleDistrictSelect(e.target.value)}
                    disabled={loadingGeo || !formData.assigned_province_code}
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                  >
                    <option value="">{!formData.assigned_province_code ? "Select Province First" : loadingGeo ? "Loading districts..." : "Select a District"}</option>
                    {districts.map((d) => (
                      <option key={d.code} value={d.code}>{d.name}</option>
                    ))}
                    <option value="OTHER">Other (specify)</option>
                  </select>
                  {formData.assigned_district_code === "OTHER" && (
                    <input
                      type="text"
                      value={formData.assigned_district_custom}
                      onChange={(e) => setFormData({ ...formData, assigned_district_custom: e.target.value })}
                      placeholder="Specify district"
                      style={{ marginTop: 8, width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                    />
                  )}
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                  Assigned Chiefdom
                </label>
                <select
                  value={formData.assigned_chiefdom_code}
                  onChange={(e) => handleChiefdomSelect(e.target.value)}
                  disabled={loadingGeo || !formData.assigned_district_code}
                  style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                >
                  <option value="">{!formData.assigned_district_code ? "Select District First" : loadingGeo ? "Loading chiefdoms..." : "Select a Chiefdom"}</option>
                  {chiefdoms.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                    <option value="OTHER">Other (specify)</option>
                </select>
                  {formData.assigned_chiefdom_code === "OTHER" && (
                    <input
                      type="text"
                      value={formData.assigned_chiefdom_custom}
                      onChange={(e) => setFormData({ ...formData, assigned_chiefdom_custom: e.target.value })}
                      placeholder="Specify chiefdom"
                      style={{ marginTop: 8, width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                    />
                  )}
              </div>

              <button
                type="submit"
                style={{
                  marginTop: "15px",
                  padding: "10px 20px",
                  backgroundColor: "#16A34A",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                ✅ Create Operator
              </button>
            </form>
          </div>
        )}

        {/* Operators List */}
        {loading ? (
          <div
            style={{
              backgroundColor: "white",
              padding: "40px",
              textAlign: "center",
              borderRadius: "6px",
            }}
          >
            ⏳ Loading operators...
          </div>
        ) : operators.length === 0 ? (
          <div
            style={{
              backgroundColor: "white",
              padding: "40px",
              textAlign: "center",
              borderRadius: "6px",
              color: "#666",
            }}
          >
            No operators found
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {operators.map((operator) => (
              <div
                key={operator.operator_id || operator._id}
                style={{
                  backgroundColor: "white",
                  borderRadius: "8px",
                  padding: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "5px" }}>
                    {operator.first_name} {operator.last_name}
                  </h3>
                  <p style={{ fontSize: "14px", color: "#666", marginBottom: "3px" }}>
                    📧 {operator.email}
                  </p>
                  <p style={{ fontSize: "14px", color: "#666", marginBottom: "3px" }}>
                    📞 {operator.phone || "No phone"}
                  </p>
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                        backgroundColor: "#DBEAFE",
                        color: "#1E40AF",
                      }}
                    >
                      {operator.role}
                    </span>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                        backgroundColor:
                          operator.status === "active" ? "#D1FAE5" : "#FEE2E2",
                        color: operator.status === "active" ? "#065F46" : "#991B1B",
                      }}
                    >
                      {operator.status?.toUpperCase()}
                    </span>
                  </div>
                  {operator.assigned_districts && operator.assigned_districts.length > 0 && (
                    <p style={{ fontSize: "13px", color: "#888", marginTop: "8px" }}>
                      📍 {operator.assigned_districts[0]}
                      {operator.assigned_regions && operator.assigned_regions.length > 0 && `, ${operator.assigned_regions[0]}`}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => navigate(`/operators/${operator.operator_id}`)}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#16A34A",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    👁️ View
                  </button>
                  <button
                    onClick={() =>
                      handleToggleStatus(operator)
                    }
                    style={{
                      padding: "8px 16px",
                      backgroundColor:
                        operator.status === "active" ? "#DC2626" : "#16A34A",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    {operator.status === "active" ? "🔴 Deactivate" : "🟢 Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
