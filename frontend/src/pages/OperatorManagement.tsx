import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { operatorService } from "@/services/operator.service";
import geoService from "@/services/geo.service";

const getErrorMessage = (err: unknown): string => {
  if (typeof err === "object" && err !== null) {
    const error = err as Record<string, unknown>;
    if (error.response && typeof error.response === "object") {
      const response = error.response as Record<string, unknown>;
      if (response.data && typeof response.data === "object") {
        const data = response.data as Record<string, unknown>;
        if (data.detail) {
          if (Array.isArray(data.detail)) {
            return data.detail.map((e: {loc: string[]; msg: string}) => 
              `${e.loc.join('.')}: ${e.msg}`
            ).join(', ');
          }
          if (typeof data.detail === "string") return data.detail;
        }
      }
    }
    if (error.message && typeof error.message === "string") {
      return error.message;
    }
  }
  return "An error occurred";
};

interface Operator {
  _id: string;
  operator_id: string;
  full_name: string;
  email: string;
  phone?: string;
  is_active?: boolean;
  assigned_district?: string;
}

interface Province { code: string; name: string }
interface District { code: string; name: string }

export default function OperatorManagement() {
  const navigate = useNavigate();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    assigned_district: "",
  });
  const [error, setError] = useState("");
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedProvince, setSelectedProvince] = useState("");

  useEffect(() => {
    loadOperators();
    loadProvinces();
  }, []);

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

  const handleProvinceChange = async (provinceCode: string) => {
    setSelectedProvince(provinceCode);
    setFormData(prev => ({ ...prev, assigned_district: "" }));
    if (provinceCode) {
      await loadDistricts(provinceCode);
    } else {
      setDistricts([]);
    }
  };

  const loadOperators = async () => {
    setLoading(true);
    try {
      const data = await operatorService.getOperators(100, 0);
      const operatorList = (data.results || data.operators || data || []).map(
        (op: Operator) => ({
          ...op,
          status: op.is_active ? "active" : "inactive",
        })
      );
      setOperators(operatorList);
    } catch (err) {
      console.error("Failed to load operators:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone.replace(/[\s\-()]/g, ""),
        password: formData.password,
        role: "OPERATOR",
        assigned_district: formData.assigned_district || undefined,
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
        assigned_district: "",
      });
      setSelectedProvince("");
      loadOperators();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      <div style={{ textAlign: "center", color: "white", paddingTop: "30px", paddingBottom: "30px" }}>
        <h1 style={{ fontSize: "2.8rem", marginBottom: "10px", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}>
          🌾 AgriManage Pro
        </h1>
        <p style={{ fontSize: "18px", opacity: 0.9 }}>Operator Management</p>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px 40px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
          <button
            onClick={() => navigate("/admin-dashboard")}
            style={{
              padding: "10px 20px",
              background: "white",
              color: "#667eea",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s"
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            ← Back
          </button>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{
              padding: "10px 25px",
              background: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#218838";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#28a745";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {showCreateForm ? "❌ Cancel" : "➕ Add Operator"}
          </button>
        </div>

        {showCreateForm && (
          <div style={{ background: "white", padding: "30px", borderRadius: "15px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "20px", color: "#333" }}>➕ Create New Operator</h2>
            
            {error && (
              <div style={{ background: "#f8d7da", color: "#721c24", padding: "12px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #f5c6cb" }}>
                ❌ {error}
              </div>
            )}

            <form onSubmit={handleCreate} style={{ display: "grid", gap: "15px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
                    First Name <span style={{ color: "#dc3545" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
                    Last Name <span style={{ color: "#dc3545" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
                    Email <span style={{ color: "#dc3545" }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
                    Password <span style={{ color: "#dc3545" }}>*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
                    Confirm Password <span style={{ color: "#dc3545" }}>*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
                    Province
                  </label>
                  <select
                    value={selectedProvince}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                    style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px" }}
                  >
                    <option value="">Select Province</option>
                    {provinces.map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#666", marginBottom: "6px" }}>
                    Assigned District
                  </label>
                  <select
                    value={formData.assigned_district}
                    onChange={(e) => setFormData(prev => ({ ...prev, assigned_district: e.target.value }))}
                    disabled={!selectedProvince}
                    style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px", opacity: selectedProvince ? 1 : 0.5 }}
                  >
                    <option value="">All Districts</option>
                    {districts.map(d => (
                      <option key={d.code} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                style={{
                  padding: "12px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: "pointer",
                  marginTop: "10px",
                  transition: "all 0.3s"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "#0056b3"}
                onMouseOut={(e) => e.currentTarget.style.background = "#007bff"}
              >
                ✅ Create Operator
              </button>
            </form>
          </div>
        )}

        <div style={{ background: "white", borderRadius: "15px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", overflow: "hidden" }}>
          <div style={{ padding: "20px", borderBottom: "1px solid #e0e0e0", background: "#f8f9fa" }}>
            <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#333", margin: 0 }}>👨‍💼 Operators List</h3>
          </div>

          {loading ? (
            <div style={{ padding: "60px", textAlign: "center" }}>
              <div style={{
                width: "50px",
                height: "50px",
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #667eea",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 15px"
              }}></div>
              <p style={{ color: "#666" }}>Loading operators...</p>
            </div>
          ) : operators.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#666" }}>
              <div style={{ fontSize: "60px", marginBottom: "15px" }}>👨‍💼</div>
              <p style={{ fontSize: "16px" }}>No operators found</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                  <th style={{ padding: "15px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Name</th>
                  <th style={{ padding: "15px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Email</th>
                  <th style={{ padding: "15px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Phone</th>
                  <th style={{ padding: "15px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>District</th>
                  <th style={{ padding: "15px", textAlign: "center", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Status</th>
                  <th style={{ padding: "15px", textAlign: "center", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {operators.map((op) => (
                  <tr
                    key={op._id}
                    style={{ borderBottom: "1px solid #dee2e6", background: "white", transition: "all 0.2s", cursor: "pointer" }}
                    onMouseOver={(e) => e.currentTarget.style.background = "#f8f9ff"}
                    onMouseOut={(e) => e.currentTarget.style.background = "white"}
                  >
                    <td style={{ padding: "15px", fontWeight: "600", color: "#333" }}>{op.full_name}</td>
                    <td style={{ padding: "15px", color: "#666", fontSize: "14px" }}>{op.email}</td>
                    <td style={{ padding: "15px", color: "#666", fontSize: "14px" }}>{op.phone || "-"}</td>
                    <td style={{ padding: "15px", color: "#666", fontSize: "14px" }}>{op.assigned_district || "All Districts"}</td>
                    <td style={{ padding: "15px", textAlign: "center" }}>
                      <span style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background: op.is_active !== false ? "#d4edda" : "#f8d7da",
                        color: op.is_active !== false ? "#155724" : "#721c24"
                      }}>
                        {op.is_active !== false ? "✓ Active" : "✗ Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "15px" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        <button
                          onClick={() => navigate(`/operators/${op.operator_id}`)}
                          style={{
                            padding: "6px 12px",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            background: "#17a2b8",
                            color: "white",
                            transition: "all 0.2s"
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = "#138496";
                            e.currentTarget.style.transform = "translateY(-2px)";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = "#17a2b8";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => navigate(`/operators/${op.operator_id}/edit`)}
                          style={{
                            padding: "6px 12px",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            background: "#ffc107",
                            color: "#333",
                            transition: "all 0.2s"
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = "#e0a800";
                            e.currentTarget.style.transform = "translateY(-2px)";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = "#ffc107";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          ✏️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ padding: "15px", borderTop: "1px solid #e0e0e0", background: "#f8f9fa", fontSize: "13px", color: "#666", textAlign: "center" }}>
            Showing {operators.length} operator{operators.length !== 1 ? 's' : ''}
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
