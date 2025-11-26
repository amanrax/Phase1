// src/pages/FarmersList.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { farmerService } from "@/services/farmer.service";

interface Farmer {
  _id: string;
  farmer_id: string;
  personal_info?: {
    first_name?: string;
    last_name?: string;
    phone_primary?: string;
  };
  address?: {
    village?: string;
    district_name?: string;
  };
  registration_status?: string;
  created_at?: string;
  is_active: boolean;
  review_notes?: string;
}

interface ReviewModalProps {
  farmer: Farmer | null;
  onClose: () => void;
  onSubmit: (status: string, notes: string) => void;
}

function ReviewModal({ farmer, onClose, onSubmit }: ReviewModalProps) {
  const [status, setStatus] = useState(farmer?.registration_status || "registered");
  const [notes, setNotes] = useState(farmer?.review_notes || "");

  if (!farmer) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "30px",
          borderRadius: "15px",
          maxWidth: "500px",
          width: "90%",
          boxShadow: "0 15px 35px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, color: "#333", fontSize: "22px", fontWeight: "700" }}>📋 Review Farmer</h2>
        <p style={{ color: "#666", marginBottom: "20px", fontSize: "14px" }}>
          <strong>{farmer.personal_info?.first_name} {farmer.personal_info?.last_name}</strong>
          <br />
          Farmer ID: {farmer.farmer_id}
        </p>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#333", fontSize: "13px" }}>
            Registration Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              border: "2px solid #e0e0e0",
              borderRadius: "8px",
              fontSize: "14px",
            }}
          >
            <option value="registered">Registered (Initial)</option>
            <option value="under_review">Under Review</option>
            <option value="verified">Verified ✓</option>
            <option value="rejected">Rejected ✗</option>
            <option value="pending_documents">Pending Documents</option>
          </select>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#333", fontSize: "13px" }}>
            Review Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add review notes or reason for status change..."
            rows={4}
            style={{
              width: "100%",
              padding: "12px",
              border: "2px solid #e0e0e0",
              borderRadius: "8px",
              fontSize: "14px",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
              transition: "all 0.3s"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#545b62";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#6c757d";
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(status, notes)}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
              transition: "all 0.3s"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#0056b3";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#007bff";
            }}
          >
            Save Review
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FarmersList() {
  const navigate = useNavigate();

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [reviewModalFarmer, setReviewModalFarmer] = useState<Farmer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
      registered: { color: "#6c757d", bg: "#f8f9fa", label: "Registered" },
      under_review: { color: "#ffc107", bg: "#fff3cd", label: "Under Review" },
      verified: { color: "#28a745", bg: "#d4edda", label: "Verified ✓" },
      rejected: { color: "#dc3545", bg: "#f8d7da", label: "Rejected ✗" },
      pending_documents: { color: "#9333ea", bg: "#f3e8ff", label: "Pending Docs" },
    };

    const config = statusConfig[status] || statusConfig.registered;

    return (
      <span
        style={{
          padding: "6px 12px",
          borderRadius: "20px",
          color: config.color,
          backgroundColor: config.bg,
          fontWeight: "600",
          fontSize: "12px",
          display: "inline-block"
        }}
      >
        {config.label}
      </span>
    );
  };

  const handleReviewSubmit = async (farmerId: string, status: string, notes: string) => {
    try {
      const params = new URLSearchParams({ new_status: status });
      if (notes) params.append("review_notes", notes);
      
      await farmerService.review(farmerId, params.toString());
      setReviewModalFarmer(null);
      await fetchFarmers();
    } catch (err: unknown) {
      console.error("Review error:", err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Failed to update farmer review");
    }
  };

  const handleToggleStatus = async (farmerId: string, currentStatus: boolean) => {
    try {
      await farmerService.update(farmerId, { is_active: !currentStatus });
      await fetchFarmers();
    } catch (err: unknown) {
      console.error("Toggle status error:", err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Failed to update farmer status");
    }
  };

  const fetchFarmers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await farmerService.getFarmers(100, 0);
      
      let farmerList = [];
      if (data.results && Array.isArray(data.results)) {
        farmerList = data.results;
      } else if (data.farmers && Array.isArray(data.farmers)) {
        farmerList = data.farmers;
      } else if (Array.isArray(data)) {
        farmerList = data;
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedFarmers = farmerList.map((f: any) => ({
        _id: f._id || f.id,
        farmer_id: f.farmer_id,
        personal_info: f.personal_info || {
          first_name: f.first_name,
          last_name: f.last_name,
          phone_primary: f.phone_primary,
        },
        address: f.address || {},
        registration_status: f.registration_status,
        created_at: f.created_at,
        is_active: f.is_active !== undefined ? f.is_active : true,
      }));
      
      setFarmers(mappedFarmers);
    } catch (err: unknown) {
      if (import.meta.env.DEV) {
        console.error("Fetch error:", err);
      }
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Failed to load farmers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (farmerId: string, farmerName: string) => {
    if (!confirm(`Are you sure you want to delete ${farmerName}?`)) {
      return;
    }

    try {
      await farmerService.delete(farmerId);
      await fetchFarmers();
    } catch (err: unknown) {
      console.error(err);
      const error = err as { response?: { data?: { detail?: string } } };
      alert(error.response?.data?.detail || "Failed to delete farmer");
    }
  };

  useEffect(() => {
    fetchFarmers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredFarmers = farmers.filter(f => {
    const query = searchQuery.toLowerCase();
    return (
      f.personal_info?.first_name?.toLowerCase().includes(query) ||
      f.personal_info?.last_name?.toLowerCase().includes(query) ||
      f.personal_info?.phone_primary?.includes(query) ||
      f.farmer_id.toLowerCase().includes(query)
    );
  });

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", paddingBottom: "30px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", color: "white", paddingTop: "30px", paddingBottom: "30px" }}>
        <h1 style={{ fontSize: "2.8rem", marginBottom: "10px", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}>
          🌾 AgriManage Pro
        </h1>
        <p style={{ fontSize: "16px", opacity: 0.9 }}>All Farmers Management</p>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 20px" }}>
        {/* Action Bar */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "20px 30px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px"
        }}>
          <button
            onClick={() => navigate("/")}
            style={{
              padding: "10px 20px",
              border: "2px solid #007bff",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              background: "white",
              color: "#007bff",
              transition: "all 0.3s"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#007bff";
              e.currentTarget.style.color = "white";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "white";
              e.currentTarget.style.color = "#007bff";
            }}
          >
            ← Back
          </button>

          {/* Search */}
          <input
            type="text"
            placeholder="🔍 Search farmers by name, phone, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: "12px 20px",
              border: "2px solid #e0e0e0",
              borderRadius: "25px",
              fontSize: "14px",
              outline: "none"
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#007bff";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#e0e0e0";
              e.currentTarget.style.boxShadow = "none";
            }}
          />

          <button
            onClick={() => navigate("/farmers/create")}
            style={{
              padding: "10px 20px",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              background: "#28a745",
              color: "white",
              transition: "all 0.3s",
              display: "flex",
              alignItems: "center",
              gap: "8px"
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
            <span>➕</span> Add New Farmer
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: "#f8d7da",
            color: "#721c24",
            padding: "15px 20px",
            marginBottom: "20px",
            borderRadius: "10px",
            border: "1px solid #f5c6cb",
            fontSize: "14px"
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Table Container */}
        <div style={{
          background: "white",
          borderRadius: "15px",
          boxShadow: "0 15px 35px rgba(0,0,0,0.1)",
          overflow: "hidden"
        }}>
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center" }}>
              <div style={{
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #007bff",
                borderRadius: "50%",
                width: "50px",
                height: "50px",
                animation: "spin 1s linear infinite",
                margin: "0 auto 20px"
              }}></div>
              <p style={{ color: "#666", fontSize: "16px" }}>Loading farmers...</p>
            </div>
          ) : filteredFarmers.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center" }}>
              <div style={{ fontSize: "4rem", marginBottom: "20px" }}>👨‍🌾</div>
              <p style={{ color: "#666", fontSize: "18px", fontWeight: "600" }}>
                {searchQuery ? `No farmers found matching "${searchQuery}"` : "No farmers registered yet"}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f8f9fa" }}>
                  <tr>
                    <th style={{ padding: "15px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>#</th>
                    <th style={{ padding: "15px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Farmer ID</th>
                    <th style={{ padding: "15px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>First Name</th>
                    <th style={{ padding: "15px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Last Name</th>
                    <th style={{ padding: "15px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Phone</th>
                    <th style={{ padding: "15px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Status</th>
                    <th style={{ padding: "15px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Active</th>
                    <th style={{ padding: "15px 20px", textAlign: "center", fontSize: "12px", fontWeight: "700", color: "#666", textTransform: "uppercase" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFarmers.map((f, i) => (
                    <tr
                      key={f.farmer_id || i}
                      style={{ borderBottom: "1px solid #f0f0f0", transition: "all 0.2s" }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = "#f8f9ff";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = "white";
                      }}
                    >
                      <td style={{ padding: "15px 20px", fontSize: "14px", color: "#666" }}>{i + 1}</td>
                      <td style={{ padding: "15px 20px", fontSize: "13px", fontWeight: "600", color: "#333", fontFamily: "monospace" }}>
                        {f.farmer_id}
                      </td>
                      <td style={{ padding: "15px 20px", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                        {f.personal_info?.first_name || "-"}
                      </td>
                      <td style={{ padding: "15px 20px", fontSize: "14px", color: "#666" }}>
                        {f.personal_info?.last_name || "-"}
                      </td>
                      <td style={{ padding: "15px 20px", fontSize: "14px", color: "#666" }}>
                        {f.personal_info?.phone_primary || "-"}
                      </td>
                      <td style={{ padding: "15px 20px" }}>
                        {getStatusBadge(f.registration_status || "registered")}
                      </td>
                      <td style={{ padding: "15px 20px" }}>
                        <span style={{
                          padding: "6px 12px",
                          borderRadius: "20px",
                          color: f.is_active ? "#28a745" : "#dc3545",
                          backgroundColor: f.is_active ? "#d4edda" : "#f8d7da",
                          fontWeight: "600",
                          fontSize: "12px",
                          display: "inline-block"
                        }}>
                          {f.is_active ? "✓ Active" : "✗ Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "15px 20px" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                          <button
                            onClick={() => setReviewModalFarmer(f)}
                            title="Review"
                            style={{
                              padding: "6px 12px",
                              background: "#007bff",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "600",
                              transition: "all 0.2s"
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
                            📋
                          </button>
                          <button
                            onClick={() => handleToggleStatus(f.farmer_id, f.is_active)}
                            title={f.is_active ? "Deactivate" : "Activate"}
                            style={{
                              padding: "6px 12px",
                              background: f.is_active ? "#dc3545" : "#28a745",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "600",
                              transition: "all 0.2s"
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.opacity = "0.8";
                              e.currentTarget.style.transform = "translateY(-2px)";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.opacity = "1";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                          >
                            {f.is_active ? "🔴" : "🟢"}
                          </button>
                          <button
                            onClick={() => navigate(`/farmers/${f.farmer_id}`)}
                            title="View Details"
                            style={{
                              padding: "6px 12px",
                              background: "#28a745",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px",
                              transition: "all 0.2s"
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
                            👁️
                          </button>
                          <button
                            onClick={() => navigate(`/farmers/edit/${f.farmer_id}`)}
                            title="Edit"
                            style={{
                              padding: "6px 12px",
                              background: "#ffc107",
                              color: "#333",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px",
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
                          <button
                            onClick={() => handleDelete(
                              f.farmer_id,
                              `${f.personal_info?.first_name || ""} ${f.personal_info?.last_name || ""}`.trim() || "Unknown"
                            )}
                            title="Delete"
                            style={{
                              padding: "6px 12px",
                              background: "#dc3545",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px",
                              transition: "all 0.2s"
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = "#c82333";
                              e.currentTarget.style.transform = "translateY(-2px)";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = "#dc3545";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Results Count */}
        {!loading && filteredFarmers.length > 0 && (
          <div style={{
            textAlign: "center",
            color: "white",
            marginTop: "20px",
            fontSize: "14px",
            opacity: 0.9
          }}>
            Showing {filteredFarmers.length} of {farmers.length} farmers
          </div>
        )}
      </div>

      {reviewModalFarmer && (
        <ReviewModal
          farmer={reviewModalFarmer}
          onClose={() => setReviewModalFarmer(null)}
          onSubmit={(status, notes) => handleReviewSubmit(reviewModalFarmer.farmer_id, status, notes)}
        />
      )}

      {/* Add spin animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
