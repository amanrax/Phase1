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
  is_active: boolean; // Added is_active field
}

export default function FarmersList() {
  const navigate = useNavigate();

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const handleToggleStatus = async (farmerId: string, currentStatus: boolean) => {
    try {
      await farmerService.update(farmerId, { is_active: !currentStatus });
      await fetchFarmers(); // Refresh the list
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
                <th style={{ padding: "15px", textAlign: "left" }}>Status</th>
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
                      }}
                      title={f.is_active ? "Deactivate" : "Activate"}
                    >
                      {f.is_active ? "Deactivate" : "Activate"}
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
    </div>
  );
}
