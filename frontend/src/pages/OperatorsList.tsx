import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { operatorService } from "@/services/operator.service";

interface Operator {
  _id: string;
  operator_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  role: string;
  status: string;
  assigned_district?: string;
  assigned_province?: string;
  created_at?: string;
}

export default function OperatorsList() {
  const navigate = useNavigate();

  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await operatorService.getOperators(100, 0);
      const operatorList = data.results || data.operators || data || [];
      setOperators(operatorList);
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error("Fetch operators error:", err);
      }
      setError(err.response?.data?.detail || "Failed to load operators");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (operatorId: string, operatorName: string) => {
    if (!confirm(`Are you sure you want to delete ${operatorName}?`)) {
      return;
    }

    try {
      await operatorService.delete(operatorId);
      alert("✅ Operator deleted successfully");
      await fetchOperators();
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error("Delete operator error:", err);
      }
      alert(err.response?.data?.detail || "Failed to delete operator");
    }
  };

  const handleToggleStatus = async (operatorId: string, currentStatus: string) => {
    const action = currentStatus === "active" ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} this operator?`)) {
      return;
    }

    try {
      if (currentStatus === "active") {
        await operatorService.deactivate(operatorId);
      } else {
        await operatorService.activate(operatorId);
      }
      alert(`✅ Operator ${action}d successfully`);
      await fetchOperators();
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
      <div
        style={{
          backgroundColor: "#2563EB",
          color: "white",
          padding: "15px 20px",
          display: "flex",
          gap: "15px",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => navigate("/")}
          aria-label="Back"
          style={{
            backgroundColor: "#2563EB",
            color: "white",
            border: "2px solid white",
            padding: "8px 16px",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          ← BACK
        </button>
        <h1 style={{ margin: 0 }}>Field Operators</h1>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "1200px", margin: "20px auto", padding: "0 20px" }}>
        <button
          onClick={() => navigate("/operators/create")}
          aria-label="Add New Operator"
          style={{
            marginBottom: "20px",
            padding: "10px 20px",
            backgroundColor: "#16A34A",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          ➕ Add New Operator
        </button>

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

        {loading ? (
          <div
            style={{
              backgroundColor: "white",
              padding: "40px",
              textAlign: "center",
              borderRadius: "6px",
            }}
          >
            ⏳ Loading...
          </div>
        ) : operators.length === 0 ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#666",
            }}
          >
            No operators found
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              backgroundColor: "white",
            }}
            aria-label="Operators list"
          >
            <thead style={{ backgroundColor: "#F3F4F6" }}>
              <tr>
                <th style={{ padding: "15px", textAlign: "left" }}>#</th>
                <th style={{ padding: "15px", textAlign: "left" }}>Name</th>
                <th style={{ padding: "15px", textAlign: "left" }}>Phone</th>
                <th style={{ padding: "15px", textAlign: "left" }}>Email</th>
                <th style={{ padding: "15px", textAlign: "left" }}>Role</th>
                <th style={{ padding: "15px", textAlign: "left" }}>District</th>
                <th style={{ padding: "15px", textAlign: "left" }}>Status</th>
                <th style={{ padding: "15px", textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {operators.map((op, i) => (
                <tr
                  key={op.operator_id || i}
                  style={{ borderBottom: "1px solid #E5E7EB" }}
                >
                  <td style={{ padding: "15px" }}>{i + 1}</td>
                  <td style={{ padding: "15px", fontWeight: "bold" }}>
                    {op.first_name} {op.last_name}
                  </td>
                  <td style={{ padding: "15px" }}>{op.phone}</td>
                  <td style={{ padding: "15px" }}>{op.email || "-"}</td>
                  <td style={{ padding: "15px" }}>
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
                      {op.role}
                    </span>
                  </td>
                  <td style={{ padding: "15px" }}>{op.assigned_district || "-"}</td>
                  <td style={{ padding: "15px" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                        backgroundColor:
                          op.status === "active" ? "#D1FAE5" : "#FEE2E2",
                        color: op.status === "active" ? "#065F46" : "#991B1B",
                      }}
                    >
                      {op.status?.toUpperCase() || "UNKNOWN"}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "15px",
                      display: "flex",
                      gap: "10px",
                    }}
                  >
                    <button
                      onClick={() => navigate(`/operators/${op.operator_id}`)}
                      aria-label={`View operator ${op.first_name}`}
                      style={{
                        color: "#16A34A",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "18px",
                      }}
                      title="View Details"
                    >
                      👁️
                    </button>
                    <button
                      onClick={() => navigate(`/operators/edit/${op.operator_id}`)}
                      aria-label={`Edit operator ${op.first_name}`}
                      style={{
                        color: "#2563EB",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "18px",
                      }}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() =>
                        handleToggleStatus(op.operator_id, op.status)
                      }
                      aria-label={`Toggle status for ${op.first_name}`}
                      style={{
                        color: op.status === "active" ? "#DC2626" : "#16A34A",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: "18px",
                      }}
                      title={
                        op.status === "active" ? "Deactivate" : "Activate"
                      }
                    >
                      {op.status === "active" ? "🔴" : "🟢"}
                    </button>
                    <button
                      onClick={() =>
                        handleDelete(
                          op.operator_id,
                          `${op.first_name} ${op.last_name}`
                        )
                      }
                      aria-label={`Delete operator ${op.first_name}`}
                      style={{
                        color: "#DC2626",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: "18px",
                      }}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
