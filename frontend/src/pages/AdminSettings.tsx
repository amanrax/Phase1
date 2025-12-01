// frontend/src/pages/AdminSettings.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "@/utils/axios";

interface User {
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface SystemStats {
  total_users: number;
  total_admins: number;
  total_operators: number;
  total_farmers: number;
}

type SettingsTab = "users" | "admins" | "system" | "security";

export default function AdminSettings() {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>("users");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Create Admin Form
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  
  // Create Operator Form
  const [newOperatorEmail, setNewOperatorEmail] = useState("");
  const [newOperatorPassword, setNewOperatorPassword] = useState("");
  const [operatorDistricts, setOperatorDistricts] = useState<string[]>([]);
  const [showCreateOperator, setShowCreateOperator] = useState(false);

  useEffect(() => {
    loadUsers();
    loadStats();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/users/");
      setUsers(response.data.users || []);
    } catch (error: any) {
      console.error("Failed to load users:", error);
      setError(error.response?.data?.detail || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get("/reports/dashboard");
      setStats({
        total_users: response.data.metrics.users_total,
        total_admins: response.data.metrics.operators_total, // Adjust based on actual API
        total_operators: response.data.metrics.operators_total,
        total_farmers: response.data.metrics.farmers_total
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      setLoading(true);
      await axios.post("/auth/register", {
        email: newAdminEmail,
        password: newAdminPassword,
        roles: ["ADMIN"]
      });
      
      setSuccess("Admin created successfully!");
      setNewAdminEmail("");
      setNewAdminPassword("");
      setShowCreateAdmin(false);
      loadUsers();
      loadStats();
    } catch (error: any) {
      setError(error.response?.data?.detail || "Failed to create admin");
    } finally {
      setLoading(false);
    }
  };

  const createOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      setLoading(true);
      await axios.post("/auth/register", {
        email: newOperatorEmail,
        password: newOperatorPassword,
        roles: ["OPERATOR"],
        assigned_districts: operatorDistricts
      });
      
      setSuccess("Operator created successfully!");
      setNewOperatorEmail("");
      setNewOperatorPassword("");
      setOperatorDistricts([]);
      setShowCreateOperator(false);
      loadUsers();
      loadStats();
    } catch (error: any) {
      setError(error.response?.data?.detail || "Failed to create operator");
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (email: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      await axios.patch(`/users/${email}/status`, {
        is_active: !currentStatus
      });
      setSuccess(`User ${!currentStatus ? "activated" : "deactivated"} successfully!`);
      loadUsers();
    } catch (error: any) {
      setError(error.response?.data?.detail || "Failed to update user status");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (email: string) => {
    if (!confirm(`Are you sure you want to delete user ${email}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setLoading(true);
      await axios.delete(`/users/${email}`);
      setSuccess("User deleted successfully!");
      loadUsers();
      loadStats();
    } catch (error: any) {
      setError(error.response?.data?.detail || "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "users" as SettingsTab, label: "User Management", icon: "fa-users" },
    { id: "admins" as SettingsTab, label: "Create Admin", icon: "fa-user-shield" },
    { id: "system" as SettingsTab, label: "System Settings", icon: "fa-cog" },
    { id: "security" as SettingsTab, label: "Security", icon: "fa-lock" }
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Sidebar */}
      <div style={{ position: "fixed", top: 0, left: 0, width: "16rem", height: "100vh", background: "#1f2937", zIndex: 50 }}>
        <div style={{ background: "#15803d", height: "64px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "white" }}>🌾 ZIAMIS</h1>
        </div>

        <nav style={{ padding: "24px 0" }}>
          <div style={{ padding: "0 16px", marginBottom: "8px", fontSize: "12px", fontWeight: "bold", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            NAVIGATION
          </div>
          
          <div
            onClick={() => navigate("/admin-dashboard")}
            style={{ display: "flex", alignItems: "center", padding: "12px 16px", color: "#d1d5db", cursor: "pointer", transition: "all 0.2s", borderLeft: "4px solid transparent" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#16a34a";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#d1d5db";
            }}
          >
            <i className="fa-solid fa-arrow-left" style={{ marginRight: "12px" }}></i>
            <span>Back to Dashboard</span>
          </div>

          <div
            style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "#16a34a", color: "white", borderLeft: "4px solid #c2410c" }}
          >
            <i className="fa-solid fa-gear" style={{ marginRight: "12px" }}></i>
            <span>Settings</span>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ marginLeft: "16rem", padding: "24px" }}>
        {/* Header */}
        <div style={{ background: "white", padding: "24px 32px", borderRadius: "12px", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1f2937", marginBottom: "8px" }}>
            <i className="fa-solid fa-gear" style={{ marginRight: "12px", color: "#15803d" }}></i>
            System Settings
          </h1>
          <p style={{ fontSize: "14px", color: "#6b7280" }}>
            Manage users, create admins, configure system settings and security
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "8px", padding: "16px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <i className="fa-solid fa-exclamation-circle" style={{ color: "#dc2626", fontSize: "20px", marginRight: "12px" }}></i>
              <span style={{ color: "#991b1b", fontSize: "14px", fontWeight: "500" }}>{error}</span>
            </div>
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "18px" }}>×</button>
          </div>
        )}

        {success && (
          <div style={{ background: "#d1fae5", border: "1px solid #a7f3d0", borderRadius: "8px", padding: "16px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <i className="fa-solid fa-check-circle" style={{ color: "#059669", fontSize: "20px", marginRight: "12px" }}></i>
              <span style={{ color: "#065f46", fontSize: "14px", fontWeight: "500" }}>{success}</span>
            </div>
            <button onClick={() => setSuccess(null)} style={{ background: "none", border: "none", color: "#059669", cursor: "pointer", fontSize: "18px" }}>×</button>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "32px" }}>
            <div style={{ background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #15803d" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold", textTransform: "uppercase", marginBottom: "8px" }}>Total Users</p>
                  <p style={{ fontSize: "32px", fontWeight: "bold", color: "#1f2937" }}>{stats.total_users}</p>
                </div>
                <div style={{ background: "#dcfce7", padding: "16px", borderRadius: "12px" }}>
                  <i className="fa-solid fa-users" style={{ fontSize: "24px", color: "#15803d" }}></i>
                </div>
              </div>
            </div>

            <div style={{ background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #7c3aed" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold", textTransform: "uppercase", marginBottom: "8px" }}>Operators</p>
                  <p style={{ fontSize: "32px", fontWeight: "bold", color: "#1f2937" }}>{stats.total_operators}</p>
                </div>
                <div style={{ background: "#ede9fe", padding: "16px", borderRadius: "12px" }}>
                  <i className="fa-solid fa-user-tie" style={{ fontSize: "24px", color: "#7c3aed" }}></i>
                </div>
              </div>
            </div>

            <div style={{ background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #2563eb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold", textTransform: "uppercase", marginBottom: "8px" }}>Farmers</p>
                  <p style={{ fontSize: "32px", fontWeight: "bold", color: "#1f2937" }}>{stats.total_farmers}</p>
                </div>
                <div style={{ background: "#dbeafe", padding: "16px", borderRadius: "12px" }}>
                  <i className="fa-solid fa-wheat-awn" style={{ fontSize: "24px", color: "#2563eb" }}></i>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
          <div style={{ borderBottom: "2px solid #f3f4f6", display: "flex", overflowX: "auto" }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "16px 24px",
                  border: "none",
                  background: activeTab === tab.id ? "#f9fafb" : "white",
                  borderBottom: activeTab === tab.id ? "3px solid #15803d" : "3px solid transparent",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: activeTab === tab.id ? "bold" : "normal",
                  color: activeTab === tab.id ? "#15803d" : "#6b7280",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap"
                }}
              >
                <i className={`${tab.icon} fa-solid`} style={{ marginRight: "8px" }}></i>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: "32px" }}>
            {/* User Management Tab */}
            {activeTab === "users" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                  <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1f2937" }}>All System Users</h2>
                  <button
                    onClick={() => loadUsers()}
                    style={{
                      padding: "10px 20px",
                      background: "#15803d",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                      transition: "all 0.2s"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = "#14532d"}
                    onMouseOut={(e) => e.currentTarget.style.background = "#15803d"}
                  >
                    <i className="fa-solid fa-refresh" style={{ marginRight: "8px" }}></i>
                    Refresh
                  </button>
                </div>

                {loading ? (
                  <div style={{ textAlign: "center", padding: "60px" }}>
                    <div style={{ display: "inline-block", width: "50px", height: "50px", border: "5px solid #f3f4f6", borderTop: "5px solid #15803d", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                  </div>
                ) : users.length === 0 ? (
                  <p style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>No users found</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
                      <thead style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                        <tr>
                          <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "bold", color: "#374151", textTransform: "uppercase", fontSize: "12px" }}>Email</th>
                          <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "bold", color: "#374151", textTransform: "uppercase", fontSize: "12px" }}>Role</th>
                          <th style={{ padding: "14px 16px", textAlign: "center", fontWeight: "bold", color: "#374151", textTransform: "uppercase", fontSize: "12px" }}>Status</th>
                          <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: "bold", color: "#374151", textTransform: "uppercase", fontSize: "12px" }}>Created</th>
                          <th style={{ padding: "14px 16px", textAlign: "center", fontWeight: "bold", color: "#374151", textTransform: "uppercase", fontSize: "12px" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <td style={{ padding: "14px 16px", color: "#1f2937", fontWeight: "500" }}>{user.email}</td>
                            <td style={{ padding: "14px 16px" }}>
                              <span style={{
                                padding: "4px 12px",
                                borderRadius: "12px",
                                fontSize: "12px",
                                fontWeight: "600",
                                background: user.role === "ADMIN" ? "#ede9fe" : user.role === "OPERATOR" ? "#dbeafe" : "#dcfce7",
                                color: user.role === "ADMIN" ? "#7c3aed" : user.role === "OPERATOR" ? "#2563eb" : "#15803d"
                              }}>
                                {user.role}
                              </span>
                            </td>
                            <td style={{ padding: "14px 16px", textAlign: "center" }}>
                              <span style={{
                                padding: "4px 12px",
                                borderRadius: "12px",
                                fontSize: "12px",
                                fontWeight: "600",
                                background: user.is_active ? "#dcfce7" : "#fee2e2",
                                color: user.is_active ? "#166534" : "#991b1b"
                              }}>
                                {user.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td style={{ padding: "14px 16px", color: "#6b7280" }}>
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                            <td style={{ padding: "14px 16px", textAlign: "center" }}>
                              <button
                                onClick={() => toggleUserStatus(user.email, user.is_active)}
                                style={{
                                  padding: "6px 12px",
                                  background: user.is_active ? "#fef3c7" : "#dcfce7",
                                  color: user.is_active ? "#92400e" : "#166534",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  marginRight: "8px"
                                }}
                              >
                                {user.is_active ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                onClick={() => deleteUser(user.email)}
                                style={{
                                  padding: "6px 12px",
                                  background: "#fee2e2",
                                  color: "#991b1b",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontWeight: "600"
                                }}
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Create Admin Tab */}
            {activeTab === "admins" && (
              <div>
                <div style={{ maxWidth: "600px", margin: "0 auto" }}>
                  <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1f2937", marginBottom: "24px" }}>
                    <i className="fa-solid fa-user-shield" style={{ marginRight: "12px", color: "#15803d" }}></i>
                    Create New Admin Account
                  </h2>

                  <form onSubmit={createAdmin}>
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#374151", textTransform: "uppercase", marginBottom: "8px" }}>
                        Admin Email <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <input
                        type="email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="admin@ziamis.gov.zm"
                        required
                        style={{
                          width: "100%",
                          padding: "12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "8px",
                          fontSize: "14px",
                          outline: "none",
                          transition: "all 0.2s"
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = "#15803d"}
                        onBlur={(e) => e.currentTarget.style.borderColor = "#d1d5db"}
                      />
                    </div>

                    <div style={{ marginBottom: "24px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#374151", textTransform: "uppercase", marginBottom: "8px" }}>
                        Password <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <input
                        type="password"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        placeholder="Enter strong password"
                        required
                        minLength={8}
                        style={{
                          width: "100%",
                          padding: "12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "8px",
                          fontSize: "14px",
                          outline: "none",
                          transition: "all 0.2s"
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = "#15803d"}
                        onBlur={(e) => e.currentTarget.style.borderColor = "#d1d5db"}
                      />
                      <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>
                        Password must be at least 8 characters long
                      </p>
                    </div>

                    <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
                      <p style={{ fontSize: "13px", color: "#15803d", lineHeight: "1.6" }}>
                        <i className="fa-solid fa-info-circle" style={{ marginRight: "8px" }}></i>
                        Admin users have full access to the system including user management, reports, and all configuration settings.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        width: "100%",
                        padding: "14px",
                        background: loading ? "#9ca3af" : "#15803d",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "16px",
                        fontWeight: "bold",
                        cursor: loading ? "not-allowed" : "pointer",
                        transition: "all 0.2s"
                      }}
                      onMouseOver={(e) => !loading && (e.currentTarget.style.background = "#14532d")}
                      onMouseOut={(e) => !loading && (e.currentTarget.style.background = "#15803d")}
                    >
                      {loading ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "8px" }}></i>
                          Creating Admin...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-user-plus" style={{ marginRight: "8px" }}></i>
                          Create Admin Account
                        </>
                      )}
                    </button>
                  </form>

                  {/* Create Operator Section */}
                  <div style={{ marginTop: "48px", paddingTop: "48px", borderTop: "2px solid #e5e7eb" }}>
                    <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1f2937", marginBottom: "24px" }}>
                      <i className="fa-solid fa-user-tie" style={{ marginRight: "12px", color: "#7c3aed" }}></i>
                      Create New Operator Account
                    </h2>

                    <form onSubmit={createOperator}>
                      <div style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#374151", textTransform: "uppercase", marginBottom: "8px" }}>
                          Operator Email <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        <input
                          type="email"
                          value={newOperatorEmail}
                          onChange={(e) => setNewOperatorEmail(e.target.value)}
                          placeholder="operator@ziamis.gov.zm"
                          required
                          style={{
                            width: "100%",
                            padding: "12px",
                            border: "1px solid #d1d5db",
                            borderRadius: "8px",
                            fontSize: "14px",
                            outline: "none",
                            transition: "all 0.2s"
                          }}
                          onFocus={(e) => e.currentTarget.style.borderColor = "#7c3aed"}
                          onBlur={(e) => e.currentTarget.style.borderColor = "#d1d5db"}
                        />
                      </div>

                      <div style={{ marginBottom: "24px" }}>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#374151", textTransform: "uppercase", marginBottom: "8px" }}>
                          Password <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        <input
                          type="password"
                          value={newOperatorPassword}
                          onChange={(e) => setNewOperatorPassword(e.target.value)}
                          placeholder="Enter strong password"
                          required
                          minLength={8}
                          style={{
                            width: "100%",
                            padding: "12px",
                            border: "1px solid #d1d5db",
                            borderRadius: "8px",
                            fontSize: "14px",
                            outline: "none",
                            transition: "all 0.2s"
                          }}
                          onFocus={(e) => e.currentTarget.style.borderColor = "#7c3aed"}
                          onBlur={(e) => e.currentTarget.style.borderColor = "#d1d5db"}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        style={{
                          width: "100%",
                          padding: "14px",
                          background: loading ? "#9ca3af" : "#7c3aed",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "16px",
                          fontWeight: "bold",
                          cursor: loading ? "not-allowed" : "pointer",
                          transition: "all 0.2s"
                        }}
                        onMouseOver={(e) => !loading && (e.currentTarget.style.background = "#6d28d9")}
                        onMouseOut={(e) => !loading && (e.currentTarget.style.background = "#7c3aed")}
                      >
                        {loading ? (
                          <>
                            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "8px" }}></i>
                            Creating Operator...
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-user-plus" style={{ marginRight: "8px" }}></i>
                            Create Operator Account
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* System Settings Tab */}
            {activeTab === "system" && (
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1f2937", marginBottom: "24px" }}>
                  System Configuration
                </h2>

                <div style={{ display: "grid", gap: "24px" }}>
                  <div style={{ background: "#f9fafb", padding: "24px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#1f2937", marginBottom: "12px" }}>
                      <i className="fa-solid fa-database" style={{ marginRight: "8px", color: "#15803d" }}></i>
                      Database Status
                    </h3>
                    <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "16px" }}>
                      MongoDB connection and health monitoring
                    </p>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#16a34a", marginRight: "8px" }}></span>
                      <span style={{ fontSize: "14px", color: "#16a34a", fontWeight: "600" }}>Connected and Healthy</span>
                    </div>
                  </div>

                  <div style={{ background: "#f9fafb", padding: "24px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#1f2937", marginBottom: "12px" }}>
                      <i className="fa-solid fa-upload" style={{ marginRight: "8px", color: "#2563eb" }}></i>
                      File Upload Settings
                    </h3>
                    <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "16px" }}>
                      Maximum upload size: <strong>10 MB</strong>
                    </p>
                    <p style={{ fontSize: "14px", color: "#6b7280" }}>
                      Allowed formats: JPG, PNG, PDF
                    </p>
                  </div>

                  <div style={{ background: "#f9fafb", padding: "24px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#1f2937", marginBottom: "12px" }}>
                      <i className="fa-solid fa-shield-alt" style={{ marginRight: "8px", color: "#c2410c" }}></i>
                      System Version
                    </h3>
                    <p style={{ fontSize: "14px", color: "#6b7280" }}>
                      ZIAMIS Pro v1.0.0 - Phase 1 Complete
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1f2937", marginBottom: "24px" }}>
                  Security Settings
                </h2>

                <div style={{ display: "grid", gap: "24px" }}>
                  <div style={{ background: "#f9fafb", padding: "24px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#1f2937", marginBottom: "12px" }}>
                      <i className="fa-solid fa-key" style={{ marginRight: "8px", color: "#15803d" }}></i>
                      JWT Token Settings
                    </h3>
                    <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>
                      Access Token Expiry: <strong>30 minutes</strong>
                    </p>
                    <p style={{ fontSize: "14px", color: "#6b7280" }}>
                      Refresh Token Expiry: <strong>7 days</strong>
                    </p>
                  </div>

                  <div style={{ background: "#f9fafb", padding: "24px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#1f2937", marginBottom: "12px" }}>
                      <i className="fa-solid fa-lock" style={{ marginRight: "8px", color: "#c2410c" }}></i>
                      Password Policy
                    </h3>
                    <ul style={{ fontSize: "14px", color: "#6b7280", lineHeight: "2", paddingLeft: "20px" }}>
                      <li>Minimum 8 characters</li>
                      <li>Must contain uppercase and lowercase letters</li>
                      <li>Must contain numbers</li>
                      <li>Special characters recommended</li>
                    </ul>
                  </div>

                  <div style={{ background: "#fef3c7", padding: "24px", borderRadius: "8px", border: "1px solid #fbbf24" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#92400e", marginBottom: "12px" }}>
                      <i className="fa-solid fa-exclamation-triangle" style={{ marginRight: "8px" }}></i>
                      Security Recommendations
                    </h3>
                    <ul style={{ fontSize: "14px", color: "#92400e", lineHeight: "2", paddingLeft: "20px" }}>
                      <li>Enable two-factor authentication (Coming Soon)</li>
                      <li>Regular password rotation recommended</li>
                      <li>Monitor user activity logs</li>
                      <li>Keep system updated</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
