// frontend/src/pages/FarmerSupplyRequests.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axios";
import useAuthStore from "../store/authStore";

interface SupplyRequest {
  id: string;
  items: string[];
  quantity: string;
  urgency: string;
  notes: string;
  status: string;
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

const AVAILABLE_ITEMS = [
  "Seeds",
  "Fertilizers",
  "Pesticides",
  "Tools",
  "Irrigation Equipment",
  "Tractor Services",
  "Other"
];

export default function FarmerSupplyRequests() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // New request form state
  const [showForm, setShowForm] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [quantity, setQuantity] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/supplies/my-requests");
      setRequests(response.data.requests || []);
    } catch (error: any) {
      console.error("Failed to load requests:", error);
      setError(error.response?.data?.detail || "Failed to load your supply requests");
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (item: string) => {
    setSelectedItems(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const resetForm = () => {
    setSelectedItems([]);
    setQuantity("");
    setUrgency("medium");
    setNotes("");
    setShowForm(false);
  };

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedItems.length === 0) {
      setError("Please select at least one item");
      return;
    }
    
    if (!quantity.trim()) {
      setError("Please specify quantity/details");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await axios.post("/supplies/request", {
        items: selectedItems,
        quantity: quantity.trim(),
        urgency,
        notes: notes.trim()
      });
      
      setSuccess("Supply request submitted successfully! You will be notified once it's reviewed.");
      resetForm();
      loadRequests();
    } catch (error: any) {
      console.error("Failed to submit request:", error);
      setError(error.response?.data?.detail || "Failed to submit supply request");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, any> = {
      pending: { bg: "#fef3c7", color: "#92400e", icon: "fa-clock" },
      approved: { bg: "#dbeafe", color: "#1e40af", icon: "fa-check" },
      rejected: { bg: "#fee2e2", color: "#991b1b", icon: "fa-times" },
      fulfilled: { bg: "#dcfce7", color: "#166534", icon: "fa-check-double" }
    };
    
    const style = styles[status] || styles.pending;
    
    return (
      <span style={{
        padding: "6px 14px",
        borderRadius: "12px",
        fontSize: "13px",
        fontWeight: "600",
        background: style.bg,
        color: style.color,
        textTransform: "capitalize",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px"
      }}>
        <i className={`fa-solid ${style.icon}`}></i>
        {status}
      </span>
    );
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high": return "#dc2626";
      case "medium": return "#f59e0b";
      case "low": return "#16a34a";
      default: return "#6b7280";
    }
  };

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
            onClick={() => navigate("/farmer-dashboard")}
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
            <span>My Supply Requests</span>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ marginLeft: "16rem", padding: "24px" }}>
        {/* Header */}
        <div style={{ background: "white", padding: "24px 32px", borderRadius: "12px", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1f2937", marginBottom: "8px" }}>
              <i className="fa-solid fa-box" style={{ marginRight: "12px", color: "#15803d" }}></i>
              Supply Requests
            </h1>
            <p style={{ fontSize: "14px", color: "#6b7280" }}>
              Request farming supplies and track your submissions
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: "12px 24px",
              background: showForm ? "#6b7280" : "#15803d",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 2px 8px rgba(21,128,61,0.3)"
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            <i className={`fa-solid ${showForm ? "fa-times" : "fa-plus"}`} style={{ marginRight: "8px" }}></i>
            {showForm ? "Cancel" : "New Request"}
          </button>
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

        {/* New Request Form */}
        {showForm && (
          <div style={{ background: "white", borderRadius: "12px", padding: "32px", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1f2937", marginBottom: "24px" }}>
              <i className="fa-solid fa-file-circle-plus" style={{ marginRight: "8px", color: "#15803d" }}></i>
              Create New Supply Request
            </h2>

            <form onSubmit={submitRequest}>
              {/* Items Selection */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#374151", marginBottom: "12px", textTransform: "uppercase" }}>
                  Select Items <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
                  {AVAILABLE_ITEMS.map(item => (
                    <div
                      key={item}
                      onClick={() => toggleItem(item)}
                      style={{
                        padding: "16px",
                        border: `2px solid ${selectedItems.includes(item) ? "#15803d" : "#e5e7eb"}`,
                        background: selectedItems.includes(item) ? "#f0fdf4" : "white",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px"
                      }}
                    >
                      <div style={{
                        width: "20px",
                        height: "20px",
                        border: `2px solid ${selectedItems.includes(item) ? "#15803d" : "#d1d5db"}`,
                        borderRadius: "4px",
                        background: selectedItems.includes(item) ? "#15803d" : "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "12px",
                        fontWeight: "bold"
                      }}>
                        {selectedItems.includes(item) && "✓"}
                      </div>
                      <span style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quantity/Details */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#374151", marginBottom: "8px", textTransform: "uppercase" }}>
                  Quantity / Details <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g., 50 kg seeds, 100 liters fertilizer..."
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none"
                  }}
                />
              </div>

              {/* Urgency */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#374151", marginBottom: "8px", textTransform: "uppercase" }}>
                  Urgency Level <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                  {[
                    { value: "low", label: "Low", color: "#16a34a", desc: "Can wait 2+ weeks" },
                    { value: "medium", label: "Medium", color: "#f59e0b", desc: "Needed within 1 week" },
                    { value: "high", label: "High", color: "#dc2626", desc: "Urgent - ASAP" }
                  ].map(level => (
                    <div
                      key={level.value}
                      onClick={() => setUrgency(level.value)}
                      style={{
                        padding: "16px",
                        border: `2px solid ${urgency === level.value ? level.color : "#e5e7eb"}`,
                        background: urgency === level.value ? `${level.color}15` : "white",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        textAlign: "center"
                      }}
                    >
                      <div style={{ fontSize: "18px", fontWeight: "bold", color: level.color, marginBottom: "4px" }}>
                        {level.label}
                      </div>
                      <div style={{ fontSize: "11px", color: "#6b7280" }}>
                        {level.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#374151", marginBottom: "8px", textTransform: "uppercase" }}>
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Provide any additional information about your request..."
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

              {/* Submit Button */}
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "16px",
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
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane" style={{ marginRight: "8px" }}></i>
                      Submit Request
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    padding: "16px 32px",
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
            </form>
          </div>
        )}

        {/* Requests List */}
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1f2937" }}>
              Your Supply Requests ({requests.length})
            </h3>
          </div>

          {loading && !showForm ? (
            <div style={{ textAlign: "center", padding: "60px" }}>
              <div style={{ display: "inline-block", width: "50px", height: "50px", border: "5px solid #f3f4f6", borderTop: "5px solid #15803d", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
            </div>
          ) : requests.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#6b7280" }}>
              <i className="fa-solid fa-box-open" style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}></i>
              <p style={{ fontSize: "16px", marginBottom: "8px", fontWeight: "500" }}>No supply requests yet</p>
              <p style={{ fontSize: "14px" }}>Click "New Request" above to submit your first supply request</p>
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
                      <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#1f2937", marginBottom: "4px" }}>
                        Request #{request.id.slice(0, 8)}
                      </h3>
                      <p style={{ fontSize: "12px", color: "#9ca3af" }}>
                        <i className="fa-solid fa-calendar" style={{ marginRight: "6px" }}></i>
                        {new Date(request.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      {getStatusBadge(request.status)}
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
                    <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
                      <strong>Urgency:</strong>{" "}
                      <span style={{ color: getUrgencyColor(request.urgency), fontWeight: "600", textTransform: "capitalize" }}>
                        {request.urgency}
                      </span>
                    </p>
                    {request.notes && (
                      <p style={{ fontSize: "13px", color: "#6b7280", padding: "12px", background: "#f9fafb", borderRadius: "6px", marginTop: "8px" }}>
                        <strong>Your Notes:</strong> {request.notes}
                      </p>
                    )}
                    {request.admin_notes && (
                      <p style={{ fontSize: "13px", color: "#059669", padding: "12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", marginTop: "8px" }}>
                        <i className="fa-solid fa-comment-dots" style={{ marginRight: "6px" }}></i>
                        <strong>Admin Response:</strong> {request.admin_notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
