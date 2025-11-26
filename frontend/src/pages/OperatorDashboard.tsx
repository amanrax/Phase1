// src/pages/OperatorDashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { farmerService } from "@/services/farmer.service";

interface Farmer {
  _id: string;
  farmer_id: string;
  first_name?: string;
  last_name?: string;
  phone_primary?: string;
  village?: string;
  district_name?: string;
  registration_status?: string;
  is_active?: boolean;
  personal_info?: {
    first_name?: string;
    last_name?: string;
    phone_primary?: string;
    email?: string;
  };
  primary_phone?: string;
  phone?: string;
  email?: string;
}

export default function OperatorDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");

  useEffect(() => {
    loadFarmers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFarmers = async () => {
    setLoading(true);
    try {
      const data = await farmerService.getFarmers(100, 0);
      const farmersList = Array.isArray(data) ? data : (data.results || data.farmers || []);
      setFarmers(farmersList);
    } catch (error) {
      console.error("Failed to load farmers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFarmers = farmers.filter(farmer => {
    const firstName = farmer.first_name || farmer.personal_info?.first_name || "";
    const lastName = farmer.last_name || farmer.personal_info?.last_name || "";
    const phone = farmer.phone_primary || farmer.personal_info?.phone_primary || farmer.primary_phone || farmer.phone || "";
    
    return (
      firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery) ||
      farmer.farmer_id.includes(searchQuery)
    );
  });

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      {/* Header */}
      <div style={{ textAlign: "center", color: "white", paddingTop: "30px", paddingBottom: "30px" }}>
        <h1 style={{ fontSize: "2.8rem", marginBottom: "10px", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}>
          🌾 AgriManage Pro
        </h1>
        <p style={{ fontSize: "16px", opacity: 0.9 }}>Advanced Agricultural Management System</p>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px 20px 20px" }}>
        {/* Stats Grid */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "20px", 
          marginBottom: "20px" 
        }}>
          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            padding: "25px",
            borderRadius: "12px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "5px" }}>{farmers.length}</div>
            <div style={{ opacity: 0.9, fontSize: "14px" }}>👨‍🌾 My Farmers</div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            padding: "25px",
            borderRadius: "12px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "5px" }}>3</div>
            <div style={{ opacity: 0.9, fontSize: "14px" }}>📅 This Month</div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            padding: "25px",
            borderRadius: "12px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "5px" }}>8</div>
            <div style={{ opacity: 0.9, fontSize: "14px" }}>📄 Pending Docs</div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            padding: "25px",
            borderRadius: "12px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "5px" }}>45.2</div>
            <div style={{ opacity: 0.9, fontSize: "14px" }}>🌾 Total Land (ha)</div>
          </div>
        </div>

        {/* Main Content Card */}
        <div style={{
          background: "white",
          borderRadius: "15px",
          padding: "30px",
          boxShadow: "0 15px 35px rgba(0,0,0,0.1)",
          border: "1px solid rgba(255,255,255,0.2)"
        }}>
          {/* Dashboard Nav */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
            flexWrap: "wrap",
            gap: "15px"
          }}>
            <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#333", margin: 0 }}>📋 Operator Dashboard</h2>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              {/* View Toggle */}
              <div style={{ display: "flex", gap: "5px", background: "#f8f9fa", borderRadius: "8px", padding: "4px" }}>
                <button
                  onClick={() => setViewMode("table")}
                  style={{
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    background: viewMode === "table" ? "#007bff" : "transparent",
                    color: viewMode === "table" ? "white" : "#666",
                    transition: "all 0.2s"
                  }}
                >
                  📋 Table
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  style={{
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    background: viewMode === "grid" ? "#007bff" : "transparent",
                    color: viewMode === "grid" ? "white" : "#666",
                    transition: "all 0.2s"
                  }}
                >
                  📱 Grid
                </button>
              </div>

              <button
                onClick={() => navigate("/farmers")}
                style={{
                  padding: "12px 25px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: "#007bff",
                  color: "white",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
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
                <span>👨‍🌾</span> Farmer List
              </button>

              <button
                onClick={() => navigate("/farmers/create")}
                style={{
                  padding: "12px 25px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: "#28a745",
                  color: "white",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
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
                <span>➕</span> Add Farmer
              </button>
              
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Search farmers..."
                style={{
                  padding: "12px 15px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "16px",
                  width: "300px",
                  maxWidth: "100%",
                  transition: "all 0.3s",
                  background: "white"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = "none";
                  e.currentTarget.style.borderColor = "#007bff";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e0e0e0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />

              <button
                onClick={logout}
                style={{
                  padding: "12px 25px",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: "#6c757d",
                  color: "white",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.3s"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#5a6268";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "#6c757d";
                }}
              >
                <span>🚪</span> Logout
              </button>
            </div>
          </div>

          {/* Farmers Grid */}
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
              <p style={{ marginTop: "15px", color: "#666" }}>Loading farmers...</p>
            </div>
          ) : filteredFarmers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#666" }}>
              <div style={{ fontSize: "60px", marginBottom: "15px" }}>🌾</div>
              <p style={{ fontSize: "18px", marginBottom: "8px", fontWeight: "600" }}>
                {searchQuery ? "No farmers found matching your search" : "No farmers registered yet"}
              </p>
              <p style={{ fontSize: "14px", marginBottom: "20px" }}>
                {searchQuery ? "Try a different search term" : "Start by registering your first farmer"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => navigate("/farmers/create")}
                  style={{
                    padding: "12px 25px",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    background: "#28a745",
                    color: "white"
                  }}
                >
                  Register First Farmer
                </button>
              )}
            </div>
          ) : viewMode === "table" ? (
            /* Table View */
            <div style={{ overflowX: "auto", background: "#f8f9fa", borderRadius: "12px", border: "1px solid #e0e0e0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #dee2e6" }}>
                    <th style={{ padding: "12px 15px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>#</th>
                    <th style={{ padding: "12px 15px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Name</th>
                    <th style={{ padding: "12px 15px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Farmer ID</th>
                    <th style={{ padding: "12px 15px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Phone</th>
                    <th style={{ padding: "12px 15px", textAlign: "center", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Status</th>
                    <th style={{ padding: "12px 15px", textAlign: "center", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFarmers.map((farmer, index) => {
                    const firstName = farmer.first_name || farmer.personal_info?.first_name || "Unknown";
                    const lastName = farmer.last_name || farmer.personal_info?.last_name || "";
                    const phone = farmer.phone_primary || farmer.personal_info?.phone_primary || farmer.primary_phone || farmer.phone || "N/A";
                    const status = farmer.registration_status || "active";

                    return (
                      <tr
                        key={farmer._id}
                        style={{ borderBottom: "1px solid #dee2e6", background: "white", transition: "all 0.2s" }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = "#f8f9ff";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = "white";
                        }}
                      >
                        <td style={{ padding: "15px", color: "#666", fontSize: "14px" }}>{index + 1}</td>
                        <td style={{ padding: "15px", fontWeight: "600", color: "#333" }}>
                          {firstName} {lastName}
                        </td>
                        <td style={{ padding: "15px", color: "#666", fontSize: "13px", fontFamily: "monospace" }}>
                          {farmer.farmer_id}
                        </td>
                        <td style={{ padding: "15px", color: "#666", fontSize: "14px" }}>{phone}</td>
                        <td style={{ padding: "15px", textAlign: "center" }}>
                          <span style={{
                            padding: "4px 12px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "600",
                            background: status === "verified" ? "#d4edda" : status === "registered" ? "#fff3cd" : "#f8d7da",
                            color: status === "verified" ? "#155724" : status === "registered" ? "#856404" : "#721c24"
                          }}>
                            {status}
                          </span>
                        </td>
                        <td style={{ padding: "15px" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            <button
                              onClick={() => navigate(`/farmers/${farmer.farmer_id}`)}
                              title="View Details"
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
                              onClick={() => navigate(`/farmers/edit/${farmer.farmer_id}`)}
                              title="Edit"
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
                    );
                  })}
                </tbody>
              </table>
              <div style={{ textAlign: "center", padding: "15px", background: "white", borderTop: "1px solid #dee2e6", color: "#666", fontSize: "14px" }}>
                Showing {filteredFarmers.length} of {farmers.length} farmers
              </div>
            </div>
          ) : (
            /* Grid View */
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "20px"
            }}>
              {filteredFarmers.map((farmer) => {
                const firstName = farmer.first_name || farmer.personal_info?.first_name || "Unknown";
                const lastName = farmer.last_name || farmer.personal_info?.last_name || "";
                const phone = farmer.phone_primary || farmer.personal_info?.phone_primary || farmer.primary_phone || farmer.phone || "N/A";
                const email = farmer.email || farmer.personal_info?.email || "";
                const status = farmer.registration_status || "active";

                return (
                  <div
                    key={farmer._id}
                    style={{
                      border: "1px solid #e0e0e0",
                      borderRadius: "12px",
                      padding: "20px",
                      background: "white",
                      transition: "all 0.3s",
                      cursor: "pointer"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.1)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "15px"
                    }}>
                      <div>
                        <div style={{ fontSize: "18px", fontWeight: "700", color: "#333", marginBottom: "4px" }}>
                          {firstName} {lastName}
                        </div>
                        <div style={{ color: "#666", fontSize: "14px" }}>{farmer.farmer_id}</div>
                      </div>
                      <div style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background: status === "active" ? "#d4edda" : "#fff3cd",
                        color: status === "active" ? "#155724" : "#856404"
                      }}>
                        {status}
                      </div>
                    </div>

                    <div style={{ color: "#666", marginBottom: "15px", lineHeight: "1.6", fontSize: "14px" }}>
                      📱 {phone}{email ? ` • 📧 ${email}` : ""}<br />
                      🆔 {farmer.farmer_id}
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        onClick={() => navigate(`/farmers/${farmer.farmer_id}`)}
                        style={{
                          padding: "8px 16px",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          background: "#17a2b8",
                          color: "white",
                          transition: "all 0.3s"
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = "#138496";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = "#17a2b8";
                        }}
                      >
                        👁️ View
                      </button>
                      <button
                        onClick={() => navigate(`/farmers/edit/${farmer.farmer_id}`)}
                        style={{
                          padding: "8px 16px",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "12px",
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
                        ✏️ Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
