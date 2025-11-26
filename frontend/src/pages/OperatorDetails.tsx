import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { operatorService } from "@/services/operator.service";

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

interface OperatorData {
  operator_id: string;
  email: string;
  full_name: string;
  phone?: string;
  is_active: boolean;
  assigned_regions?: string[];
  assigned_districts?: string[];
  assigned_district?: string;
  farmer_count?: number;
  recent_registrations_30d?: number;
  total_land_hectares?: number;
  avg_land_hectares?: number;
  created_at?: string;
  updated_at?: string;
}

export default function OperatorDetails() {
  const { operatorId } = useParams<{ operatorId: string }>();
  const navigate = useNavigate();
  const [operator, setOperator] = useState<OperatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (operatorId) {
      loadOperatorData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatorId]);

  const loadOperatorData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await operatorService.getOperator(operatorId!);
      setOperator(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to load operator details");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!operator) return;
    const action = operator.is_active ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} this operator?`)) return;

    try {
      setUpdating(true);
      await operatorService.update(operator.operator_id, {
        is_active: !operator.is_active,
      });
      alert(`✅ Operator ${action}d successfully`);
      await loadOperatorData();
    } catch (err: unknown) {
      alert(getErrorMessage(err) || `Failed to ${action} operator`);
    } finally {
      setUpdating(false);
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
          <p style={{ fontSize: "18px" }}>Loading operator details...</p>
        </div>
      </div>
    );
  }

  if (error || !operator) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "white" }}>
          <div style={{ fontSize: "80px", marginBottom: "20px" }}>❌</div>
          <p style={{ fontSize: "24px", marginBottom: "20px" }}>{error || "Operator not found"}</p>
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
              cursor: "pointer",
              transition: "all 0.3s"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.2)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            ← Back to Operators
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
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px 20px 20px" }}>
        {/* Top Actions */}
        <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
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
              transition: "all 0.3s"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            ← Back
          </button>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate(`/operators/${operatorId}/edit`)}
              style={{
                padding: "10px 20px",
                background: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#0056b3";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#007bff";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              ✏️ Edit Operator
            </button>

            <button
              onClick={handleToggleStatus}
              disabled={updating}
              style={{
                padding: "10px 20px",
                background: operator.is_active ? "#dc3545" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: updating ? "not-allowed" : "pointer",
                opacity: updating ? 0.6 : 1,
                transition: "all 0.3s"
              }}
              onMouseOver={(e) => {
                if (!updating) {
                  e.currentTarget.style.opacity = "0.9";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseOut={(e) => {
                if (!updating) {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              {updating ? "⏳ Updating..." : operator.is_active ? "🔴 Deactivate" : "🟢 Activate"}
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "20px" }}>
          {/* Personal Info Card */}
          <div style={{ background: "white", padding: "30px", borderRadius: "15px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "20px", color: "#333" }}>👨‍💼 Operator Information</h2>

            <div style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: "1px solid #e0e0e0" }}>
              <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#667eea", marginBottom: "10px" }}>
                {operator.full_name}
              </h3>
              <p style={{ color: "#666", fontSize: "14px", fontFamily: "monospace", marginBottom: "10px" }}>
                🆔 {operator.operator_id}
              </p>
              <span style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: "600",
                background: operator.is_active ? "#d4edda" : "#f8d7da",
                color: operator.is_active ? "#155724" : "#721c24",
                display: "inline-block"
              }}>
                {operator.is_active ? "✓ Active" : "✗ Inactive"}
              </span>
            </div>

            <div style={{ display: "grid", gap: "15px", fontSize: "14px" }}>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>📧 Email</p>
                <p style={{ color: "#333" }}>{operator.email}</p>
              </div>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>📱 Phone</p>
                <p style={{ color: "#333" }}>{operator.phone || "N/A"}</p>
              </div>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>📍 Assigned District</p>
                <p style={{ color: "#333" }}>{operator.assigned_district || operator.assigned_districts?.join(", ") || "All Districts"}</p>
              </div>
              <div>
                <p style={{ color: "#666", fontWeight: "600", marginBottom: "5px" }}>📅 Created</p>
                <p style={{ color: "#333" }}>
                  {operator.created_at ? new Date(operator.created_at).toLocaleDateString() : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Statistics Card */}
          <div style={{ background: "white", padding: "30px", borderRadius: "15px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "20px", color: "#333" }}>📊 Statistics</h2>
            
            <div style={{ display: "grid", gap: "20px" }}>
              <div style={{ padding: "20px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", borderRadius: "12px", color: "white" }}>
                <p style={{ fontSize: "14px", marginBottom: "8px", opacity: 0.9 }}>Total Farmers</p>
                <p style={{ fontSize: "32px", fontWeight: "700" }}>{operator.farmer_count || 0}</p>
              </div>

              <div style={{ padding: "20px", background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)", borderRadius: "12px", color: "white" }}>
                <p style={{ fontSize: "14px", marginBottom: "8px", opacity: 0.9 }}>Recent Registrations (30d)</p>
                <p style={{ fontSize: "32px", fontWeight: "700" }}>{operator.recent_registrations_30d || 0}</p>
              </div>

              <div style={{ padding: "20px", background: "linear-gradient(135deg, #ffc107 0%, #ff9800 100%)", borderRadius: "12px", color: "white" }}>
                <p style={{ fontSize: "14px", marginBottom: "8px", opacity: 0.9 }}>Total Land Managed</p>
                <p style={{ fontSize: "32px", fontWeight: "700" }}>{operator.total_land_hectares?.toFixed(1) || 0} ha</p>
              </div>

              <div style={{ padding: "20px", background: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)", borderRadius: "12px", color: "white" }}>
                <p style={{ fontSize: "14px", marginBottom: "8px", opacity: 0.9 }}>Avg Land per Farmer</p>
                <p style={{ fontSize: "32px", fontWeight: "700" }}>{operator.avg_land_hectares?.toFixed(2) || 0} ha</p>
              </div>
            </div>
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
