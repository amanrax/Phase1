// frontend/src/pages/AdminSupplyRequests.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "@/utils/axios";

interface SupplyRequest {
  id: string;
  farmer_id: string;
  farmer_email: string;
  farmer_name: string;
  items: string[];
  quantity: string;
  urgency: string;
  notes: string;
  status: string;
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

export default function AdminSupplyRequests() {
  const navigate = useNavigate();
  
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [selectedRequest, setSelectedRequest] = useState<SupplyRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const url = filter === "all" ? "/supplies/all" : `/supplies/all?status=${filter}`;
      const response = await axios.get(url);
      setRequests(response.data.requests || []);
    } catch (error: any) {
      console.error("Failed to load requests:", error);
      setError(error.response?.data?.detail || "Failed to load supply requests");
    } finally {
      setLoading(false);
    }
  };

  const openUpdateModal = (request: SupplyRequest) => {
    setSelectedRequest(request);
    setNewStatus(request.status);
    setAdminNotes(request.admin_notes || "");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setAdminNotes("");
    setNewStatus("");
  };

  const updateRequest = async () => {
    if (!selectedRequest) return;
    
    try {
      setLoading(true);
      await axios.patch(`/supplies/${selectedRequest.id}`, {
        status: newStatus,
        admin_notes: adminNotes
      });
      
      setSuccess("Supply request updated successfully!");
      closeModal();
      loadRequests();
    } catch (error: any) {
      setError(error.response?.data?.detail || "Failed to update supply request");
    } finally {
      setLoading(false);
    }
  };

  const deleteRequest = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supply request?")) return;
    
    try {
      setLoading(true);
      await axios.delete(`/supplies/${id}`);
      setSuccess("Supply request deleted successfully!");
      loadRequests();
    } catch (error: any) {
      setError(error.response?.data?.detail || "Failed to delete supply request");
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high": return "#dc2626";
      case "medium": return "#f59e0b";
      case "low": return "#16a34a";
      default: return "#6b7280";
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, any> = {
      pending: { bg: "#fef3c7", color: "#92400e" },
      approved: { bg: "#dbeafe", color: "#1e40af" },
      rejected: { bg: "#fee2e2", color: "#991b1b" },
      fulfilled: { bg: "#dcfce7", color: "#166534" }
    };
    
    const style = styles[status] || styles.pending;
    
    return (
      <span style={{
        padding: "4px 12px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "600",
        background: style.bg,
        color: style.color,
        textTransform: "capitalize"
      }}>
        {status}
      </span>
    );
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

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
            <i className="fa-solid fa-box" style={{ marginRight: "12px" }}></i>
            <span>Supply Requests</span>
            {pendingCount > 0 && (
              <span style={{ marginLeft: "auto", background: "#c2410c", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" }}>
                {pendingCount}
              </span>
            )}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ marginLeft: "16rem", padding: "24px" }}>
        {/* Header */}
        <div style={{ background: "white", padding: "24px 32px", borderRadius: "12px", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1f2937", marginBottom: "8px" }}>
            <i className="fa-solid fa-box" style={{ marginRight: "12px", color: "#15803d" }}></i>
            Supply Requests Management
          </h1>
          <p style={{ fontSize: "14px", color: "#6b7280" }}>
            Review and manage farmer supply requests
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

        {/* Filter Tabs */}
        <div style={{ background: "white", borderRadius: "12px", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", display: "flex", padding: "8px", gap: "8px" }}>
          {[
            { value: "all", label: "All Requests", icon: "fa-list" },
            { value: "pending", label: "Pending", icon: "fa-clock", count: requests.filter(r => r.status === "pending").length },
            { value: "approved", label: "Approved", icon: "fa-check", count: requests.filter(r => r.status === "approved").length },
            { value: "fulfilled", label: "Fulfilled", icon: "fa-check-double", count: requests.filter(r => r.status === "fulfilled").length },
            { value: "rejected", label: "Rejected", icon: "fa-times", count: requests.filter(r => r.status === "rejected").length }
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              style={{
                flex: 1,
                padding: "12px 16px",
                border: "none",
                background: filter === tab.value ? "#15803d" : "transparent",
                color: filter === tab.value ? "white" : "#6b7280",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              <i className={`fa-solid ${tab.icon}`}></i>
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span style={{ background: filter === tab.value ? "rgba(255,255,255,0.3)" : "#e5e7eb", padding: "2px 8px", borderRadius: "12px", fontSize: "11px" }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Requests List */}
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px" }}>
              <div style={{ display: "inline-block", width: "50px", height: "50px", border: "5px solid #f3f4f6", borderTop: "5px solid #15803d", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
            </div>
          ) : requests.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#6b7280" }}>
              <i className="fa-solid fa-box-open" style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}></i>
              <p style={{ fontSize: "16px" }}>No supply requests found</p>
            </div>
          ) : (
            <div style={{ padding: "24px", display: "grid", gap: "16px" }}>
              {requests.map((request) => (
                <div
                  key={request.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderLeft: `4px solid ${getUrgencyColor(request.urgency)}`,
                    borderRadius: "8px",
                    padding: "20px",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <div>
                      <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1f2937", marginBottom: "4px" }}>
                        {request.farmer_name || request.farmer_email}
                      </h3>
                      <p style={{ fontSize: "13px", color: "#6b7280" }}>
                        <i className="fa-solid fa-id-card" style={{ marginRight: "6px" }}></i>
                        {request.farmer_id}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      {getStatusBadge(request.status)}
                      <span style={{
                        padding: "4px 12px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background: request.urgency === "high" ? "#fee2e2" : request.urgency === "medium" ? "#fef3c7" : "#dcfce7",
                        color: getUrgencyColor(request.urgency)
                      }}>
                        {request.urgency} urgency
                      </span>
                    </div>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <p style={{ fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                      <i className="fa-solid fa-boxes-stacked" style={{ marginRight: "8px", color: "#15803d" }}></i>
                      Requested Items:
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                      {request.items.map((item, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: "6px 12px",
                            background: "#f9fafb",
                            border: "1px solid #e5e7eb",
                            borderRadius: "6px",
                            fontSize: "13px",
                            color: "#374151"
                          }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                    <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
                      <strong>Quantity:</strong> {request.quantity}
                    </p>
                    {request.notes && (
                      <p style={{ fontSize: "13px", color: "#6b7280", padding: "12px", background: "#f9fafb", borderRadius: "6px", marginTop: "8px" }}>
                        <strong>Notes:</strong> {request.notes}
                      </p>
                    )}
                    {request.admin_notes && (
                      <p style={{ fontSize: "13px", color: "#059669", padding: "12px", background: "#f0fdf4", borderRadius: "6px", marginTop: "8px" }}>
                        <strong>Admin Notes:</strong> {request.admin_notes}
                      </p>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid #f3f4f6" }}>
                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                      <i className="fa-solid fa-calendar" style={{ marginRight: "6px" }}></i>
                      {new Date(request.created_at).toLocaleString()}
                    </span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => openUpdateModal(request)}
                        style={{
                          padding: "8px 16px",
                          background: "#15803d",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "600",
                          transition: "all 0.2s"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = "#14532d"}
                        onMouseOut={(e) => e.currentTarget.style.background = "#15803d"}
                      >
                        <i className="fa-solid fa-edit" style={{ marginRight: "6px" }}></i>
                        Update
                      </button>
                      <button
                        onClick={() => deleteRequest(request.id)}
                        style={{
                          padding: "8px 16px",
                          background: "#dc2626",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "600",
                          transition: "all 0.2s"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = "#b91c1c"}
                        onMouseOut={(e) => e.currentTarget.style.background = "#dc2626"}
                      >
                        <i className="fa-solid fa-trash" style={{ marginRight: "6px" }}></i>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Update Modal */}
      {showModal && selectedRequest && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "12px", padding: "32px", maxWidth: "600px", width: "90%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#1f2937" }}>Update Supply Request</h2>
              <button onClick={closeModal} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#6b7280" }}>×</button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "4px" }}>
                <strong>Farmer:</strong> {selectedRequest.farmer_name}
              </p>
              <p style={{ fontSize: "14px", color: "#6b7280" }}>
                <strong>Items:</strong> {selectedRequest.items.join(", ")}
              </p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#374151", marginBottom: "8px", textTransform: "uppercase" }}>
                Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none"
                }}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="fulfilled">Fulfilled</option>
              </select>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#374151", marginBottom: "8px", textTransform: "uppercase" }}>
                Admin Notes (Optional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this request..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none",
                  resize: "vertical"
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={updateRequest}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "12px",
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
                {loading ? "Updating..." : "Update Request"}
              </button>
              <button
                onClick={closeModal}
                style={{
                  padding: "12px 24px",
                  background: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "#4b5563"}
                onMouseOut={(e) => e.currentTarget.style.background = "#6b7280"}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
