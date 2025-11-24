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
        backgroundColor: "rgba(0,0,0,0.5)",
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
          borderRadius: "8px",
          maxWidth: "500px",
          width: "90%",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, color: "#1F2937" }}>Review Farmer</h2>
        <p style={{ color: "#6B7280", marginBottom: "20px" }}>
          <strong>{farmer.personal_info?.first_name} {farmer.personal_info?.last_name}</strong>
          <br />
          Farmer ID: {farmer.farmer_id}
        </p>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#374151" }}>
            Registration Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #D1D5DB",
              borderRadius: "6px",
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
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#374151" }}>
            Review Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add review notes or reason for status change..."
            rows={4}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #D1D5DB",
              borderRadius: "6px",
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
              backgroundColor: "#E5E7EB",
              color: "#374151",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(status, notes)}
            style={{
              padding: "10px 20px",
              backgroundColor: "#2563EB",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
      registered: { color: "#9CA3AF", bg: "#F3F4F6", label: "Registered" },
      under_review: { color: "#F59E0B", bg: "#FEF3C7", label: "Under Review" },
      verified: { color: "#10B981", bg: "#D1FAE5", label: "Verified ✓" },
      rejected: { color: "#EF4444", bg: "#FEE2E2", label: "Rejected ✗" },
      pending_documents: { color: "#8B5CF6", bg: "#EDE9FE", label: "Pending Docs" },
    };

    const config = statusConfig[status] || statusConfig.registered;

    return (
      <span
        style={{
          padding: "5px 10px",
          borderRadius: "5px",
          color: config.color,
          backgroundColor: config.bg,
          fontWeight: "bold",
          fontSize: "12px",
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
    } catch (err: any) {
      console.error("Review error:", err);
      setError(err.response?.data?.detail || "Failed to update farmer review");
    }
  };

  const handleToggleStatus = async (farmerId: string, currentStatus: boolean) => {
    try {
      await farmerService.update(farmerId, { is_active: !currentStatus });
      await fetchFarmers();
    } catch (err: any) {
      console.error("Toggle status error:", err);
      setError(err.response?.data?.detail || "Failed to update farmer status");
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
        is_active: f.is_active !== undefined ? f.is_active : true, // Default to true if not present
      }));
      
      setFarmers(mappedFarmers);
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error("Fetch error:", err);
      }
      setError(err.response?.data?.detail || "Failed to load farmers");
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
      // Refresh the list after successful deletion
      await fetchFarmers();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to delete farmer");
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, []);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
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
        <h1 style={{ margin: 0 }}>All Farmers</h1>
      </div>

      <div style={{ maxWidth: "1200px", margin: "20px auto", padding: "0 20px" }}>
        <button
          onClick={() => navigate("/farmers/create")}
          aria-label="Add New Farmer"
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
          ➕ Add New
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
        ) : farmers.length === 0 ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#666",
            }}
          >
            No farmers
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }} aria-label="Farmers list">
            <thead style={{ backgroundColor: "#F3F4F6" }}>
              <tr>
                <th style={{ padding: "15px", textAlign: "left" }}>#</th>
                <th style={{ padding: "15px", textAlign: "left" }}>First Name</th>
                <th style={{ padding: "15px", textAlign: "left" }}>Last Name</th>
                <th style={{ padding: "15px", textAlign: "left" }}>Phone</th>
                <th style={{ padding: "15px", textAlign: "left" }}>Registration</th>
                <th style={{ padding: "15px", textAlign: "left" }}>Active</th>
                <th style={{ padding: "15px", textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {farmers.map((f, i) => (
                <tr
                  key={f.farmer_id || i}
                  style={{ borderBottom: "1px solid #E5E7EB" }}
                >
                  <td style={{ padding: "15px" }}>{i + 1}</td>
                  <td style={{ padding: "15px", fontWeight: "bold" }}>
                    {f.personal_info?.first_name || "-"}
                  </td>
                  <td style={{ padding: "15px" }}>
                    {f.personal_info?.last_name || "-"}
                  </td>
                  <td style={{ padding: "15px" }}>
                    {f.personal_info?.phone_primary || "-"}
                  </td>
                  <td style={{ padding: "15px" }}>
                    {getStatusBadge(f.registration_status || "registered")}
                  </td>
                  <td style={{ padding: "15px" }}>
                    <span
                      style={{
                        padding: "5px 10px",
                        borderRadius: "5px",
                        color: f.is_active ? "#16A34A" : "#DC2626",
                        backgroundColor: f.is_active ? "#D1FAE5" : "#FEE2E2",
                        fontWeight: "bold",
                      }}
                    >
                      {f.is_active ? "Active" : "Inactive"}
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
                      onClick={() => setReviewModalFarmer(f)}
                      aria-label="Review farmer"
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#3B82F6",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "12px",
                      }}
                      title="Review Registration"
                    >
                      📋 Review
                    </button>
                    <button
                      onClick={() => handleToggleStatus(f.farmer_id, f.is_active)}
                      aria-label={f.is_active ? "Deactivate farmer" : "Activate farmer"}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: f.is_active ? "#EF4444" : "#22C55E",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "12px",
                      }}
                      title={f.is_active ? "Deactivate" : "Activate"}
                    >
                      {f.is_active ? "🔴 Deactivate" : "🟢 Activate"}
                    </button>
                    <button
                      onClick={() => navigate(`/farmers/${f.farmer_id}`)}
                      aria-label={`View farmer ${f.personal_info?.first_name}`}
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
                      onClick={() => navigate(`/farmers/edit/${f.farmer_id}`)}
                      aria-label={`Edit farmer ${f.personal_info?.first_name}`}
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
                      onClick={() => handleDelete(
                        f.farmer_id, 
                        `${f.personal_info?.first_name || ""} ${f.personal_info?.last_name || ""}`.trim() || "Unknown"
                      )}
                      aria-label={`Delete farmer ${f.personal_info?.first_name}`}
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

      {reviewModalFarmer && (
        <ReviewModal
          farmer={reviewModalFarmer}
          onClose={() => setReviewModalFarmer(null)}
          onSubmit={(status, notes) => handleReviewSubmit(reviewModalFarmer.farmer_id, status, notes)}
        />
      )}
    </div>
  );
}
