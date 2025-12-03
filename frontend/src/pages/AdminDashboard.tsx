// src/pages/AdminDashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { farmerService } from "@/services/farmer.service";
import { dashboardService } from "@/services/dashboard.service";
import { operatorService } from "@/services/operator.service";

interface Farmer {
  _id: string;
  farmer_id: string;
  first_name: string;
  last_name: string;
  primary_phone?: string;
  phone?: string;
  registration_status?: string;
}

interface Operator {
  _id: string;
  email: string;
  full_name: string;
  phone?: string;
  assigned_district?: string;
  is_active?: boolean;
}

interface Stats {
  totalFarmers: number;
  totalOperators: number;
  pendingVerifications: number;
}

export default function AdminDashboard() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalFarmers: 0,
    totalOperators: 0,
    pendingVerifications: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const statsData = await dashboardService.getStats();
      const farmersData = await farmerService.getFarmers(5, 0);
      const operatorsData = await operatorService.getOperators(10, 0);
      
      const farmersList = farmersData.results || farmersData || [];
      const operatorsList = operatorsData.results || operatorsData.operators || operatorsData || [];
      
      setFarmers(farmersList);
      setOperators(operatorsList);
      setStats({
        totalFarmers: statsData.farmers?.total || 0,
        totalOperators: statsData.operators || 0,
        pendingVerifications: statsData.farmers?.pending || 0,
      });
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      {/* Header */}
      <div style={{ textAlign: "center", color: "white", paddingTop: "30px", paddingBottom: "30px" }}>
        <h1 style={{ fontSize: "2.8rem", marginBottom: "10px", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}>
          🌾 AgriManage Pro
        </h1>
        <p style={{ fontSize: "16px", opacity: 0.9 }}>Advanced Agricultural Management System - Admin Dashboard</p>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px 20px 20px" }}>
        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "20px" }}>
          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            padding: "25px",
            borderRadius: "12px",
            textAlign: "center",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            transition: "all 0.3s"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-5px)";
            e.currentTarget.style.boxShadow = "0 15px 35px rgba(0,0,0,0.2)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.15)";
          }}>
            <div style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "5px" }}>{stats.totalOperators}</div>
            <div style={{ opacity: 0.9, fontSize: "14px" }}>👨‍💼 Total Operators</div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            padding: "25px",
            borderRadius: "12px",
            textAlign: "center",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            transition: "all 0.3s"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-5px)";
            e.currentTarget.style.boxShadow = "0 15px 35px rgba(0,0,0,0.2)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.15)";
          }}>
            <div style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "5px" }}>{stats.totalFarmers}</div>
            <div style={{ opacity: 0.9, fontSize: "14px" }}>👨‍🌾 Total Farmers</div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            padding: "25px",
            borderRadius: "12px",
            textAlign: "center",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            transition: "all 0.3s"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-5px)";
            e.currentTarget.style.boxShadow = "0 15px 35px rgba(0,0,0,0.2)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.15)";
          }}>
            <div style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "5px" }}>{stats.pendingVerifications}</div>
            <div style={{ opacity: 0.9, fontSize: "14px" }}>⏳ Pending Verifications</div>
          </div>
        </div>

        {/* Main Content Card */}
        <div style={{ background: "white", borderRadius: "15px", padding: "30px", boxShadow: "0 15px 35px rgba(0,0,0,0.1)" }}>
          {/* Header with Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", flexWrap: "wrap", gap: "15px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#333", margin: 0 }}>🔧 Admin Dashboard</h2>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/operators/manage")}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: "#007bff",
                  color: "white",
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
                👨‍💼 View All Operators
              </button>

              <button
                onClick={() => navigate("/farmers")}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: "#28a745",
                  color: "white",
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
                👨‍🌾 View All Farmers
              </button>

              <button
                onClick={() => navigate("/admin/reports")}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: "#c2410c",
                  color: "white",
                  transition: "all 0.3s"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#9a3412";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "#c2410c";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                📊 View Reports
              </button>

              <button
                onClick={() => navigate("/admin/settings")}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: "#7c3aed",
                  color: "white",
                  transition: "all 0.3s"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#6d28d9";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "#7c3aed";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                ⚙️ Settings
              </button>

              <button
                onClick={() => navigate("/admin/supply-requests")}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: "#c2410c",
                  color: "white",
                  transition: "all 0.3s"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#9a3412";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "#c2410c";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                📦 Supply Requests
              </button>

              <button
                onClick={() => navigate("/admin/logs")}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: "#0891b2",
                  color: "white",
                  transition: "all 0.3s"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#0e7490";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "#0891b2";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                📜 System Logs
              </button>
              
              <button
                onClick={logout}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: "#6c757d",
                  color: "white",
                  transition: "all 0.3s"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#5a6268";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "#6c757d";
                }}
              >
                🚪 Logout
              </button>
            </div>
          </div>

          {/* Operators Management Section */}
          <div style={{ marginBottom: "40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: "600", margin: 0, color: "#333" }}>👨‍💼 System Operators</h3>
              <button
                onClick={() => navigate("/operators/manage")}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: "#007bff",
                  color: "white",
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
                ➕ Add Operator
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <div style={{
                  display: "inline-block",
                  width: "40px",
                  height: "40px",
                  border: "4px solid #f3f3f3",
                  borderTop: "4px solid #007bff",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }}></div>
                <p style={{ marginTop: "15px", color: "#666" }}>Loading...</p>
              </div>
            ) : operators.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#666", background: "#f8f9fa", borderRadius: "12px" }}>
                <div style={{ fontSize: "48px", marginBottom: "10px" }}>👨‍💼</div>
                <p style={{ fontSize: "16px", marginBottom: "8px", fontWeight: "600" }}>No operators found</p>
                <p style={{ fontSize: "14px", marginBottom: "15px" }}>Add operators to help manage farmers</p>
                <button
                  onClick={() => navigate("/operators/manage")}
                  style={{
                    padding: "10px 20px",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    background: "#28a745",
                    color: "white"
                  }}
                >
                  Add First Operator
                </button>
              </div>
            ) : (
              <div style={{ overflowX: "auto", background: "#f8f9fa", borderRadius: "12px", border: "1px solid #e0e0e0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #dee2e6" }}>
                      <th style={{ padding: "12px 15px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Name</th>
                      <th style={{ padding: "12px 15px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Email</th>
                      <th style={{ padding: "12px 15px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Phone</th>
                      <th style={{ padding: "12px 15px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>District</th>
                      <th style={{ padding: "12px 15px", textAlign: "center", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operators.slice(0, 5).map((op) => (
                      <tr
                        key={op.operator_id || op._id}
                        style={{ borderBottom: "1px solid #dee2e6", background: "white", transition: "all 0.2s", cursor: "pointer" }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = "#f8f9ff";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = "white";
                        }}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
                {operators.length > 5 && (
                  <div style={{ textAlign: "center", padding: "15px", background: "white", borderTop: "1px solid #dee2e6" }}>
                    <button
                      onClick={() => navigate("/operators/manage")}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#007bff",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer"
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.textDecoration = "underline";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.textDecoration = "none";
                      }}
                    >
                      View All {operators.length} Operators →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Farmers Section */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: "600", margin: 0, color: "#333" }}>👨‍🌾 Recent Farmers</h3>
              <button
                onClick={() => navigate("/farmers")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#007bff",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.textDecoration = "underline";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.textDecoration = "none";
                }}
              >
                View All →
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <div style={{
                  display: "inline-block",
                  width: "40px",
                  height: "40px",
                  border: "4px solid #f3f3f3",
                  borderTop: "4px solid #007bff",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }}></div>
                <p style={{ marginTop: "15px", color: "#666" }}>Loading...</p>
              </div>
            ) : farmers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#666" }}>
                <div style={{ fontSize: "60px", marginBottom: "15px" }}>🌾</div>
                <p style={{ fontSize: "18px", marginBottom: "8px", fontWeight: "600" }}>No farmers registered yet</p>
                <p style={{ fontSize: "14px", marginBottom: "20px" }}>Operators can register farmers in the system</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                {farmers.map((farmer) => (
                  <div
                    key={farmer.farmer_id || farmer._id}
                    onClick={() => navigate(`/farmers/${farmer.farmer_id}`)}
                    style={{
                      border: "1px solid #e0e0e0",
                      borderRadius: "12px",
                      padding: "20px",
                      background: "#fafafa",
                      transition: "all 0.3s",
                      cursor: "pointer"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.1)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.background = "white";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.background = "#fafafa";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: "18px", fontWeight: "700", color: "#333", marginBottom: "4px" }}>
                          {farmer.first_name} {farmer.last_name}
                        </div>
                        <div style={{ color: "#666", fontSize: "14px", lineHeight: "1.6" }}>
                          📱 {farmer.primary_phone || farmer.phone} • 🆔 {farmer.farmer_id}
                        </div>
                      </div>
                      <div style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background: farmer.registration_status === "verified" ? "#d4edda" : "#fff3cd",
                        color: farmer.registration_status === "verified" ? "#155724" : "#856404"
                      }}>
                        {farmer.registration_status || "Registered"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
