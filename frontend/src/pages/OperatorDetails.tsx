import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { operatorService } from "@/services/operator.service";

interface OperatorData {
  operator_id: string;
  email: string;
  full_name: string;
  phone?: string;
  is_active: boolean;
  assigned_regions?: string[];
  assigned_districts?: string[];
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
  }, [operatorId]);

  const loadOperatorData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await operatorService.getOperator(operatorId!);
      if (import.meta.env.DEV) {
        console.log("Operator data:", data);
      }
      setOperator(data);
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error("Failed to load operator:", err);
      }
      setError(err.response?.data?.detail || "Failed to load operator details");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!operator) return;
    const action = operator.is_active ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} this operator?`)) {
      return;
    }

    try {
      setUpdating(true);
      await operatorService.update(operator.operator_id, {
        is_active: !operator.is_active,
      });
      alert(`✅ Operator ${action}d successfully`);
      await loadOperatorData();
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error(`${action} operator error:`, err);
      }
      alert(err.response?.data?.detail || `Failed to ${action} operator`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading operator details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">❌ {error}</p>
          <button
            onClick={() => navigate("/operators/manage")}
            className="text-green-600 hover:underline font-semibold"
          >
            ← Back to operators list
          </button>
        </div>
      </div>
    );
  }

  if (!operator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">Operator not found</p>
          <button
            onClick={() => navigate("/operators/manage")}
            className="text-green-600 hover:underline font-semibold"
          >
            ← Back to operators list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/operators/manage")}
            className="text-green-600 hover:underline mb-3 flex items-center gap-2 font-semibold"
          >
            ← Back to Operators
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                👥 {operator.full_name}
              </h1>
              <p className="text-gray-600 text-sm mt-1">ID: {operator.operator_id}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleToggleStatus}
                disabled={updating}
                className={`px-4 py-2 rounded-lg text-white transition font-semibold ${
                  operator.is_active
                    ? "bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                    : "bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                }`}
              >
                {operator.is_active ? "🔴 Deactivate" : "🟢 Activate"}
              </button>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <span
            className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
              operator.is_active
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {operator.is_active ? "✓ Active" : "✗ Inactive"}
          </span>
        </div>

        {/* Details Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Contact Info */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
            <h2 className="text-lg font-bold mb-4 text-gray-800">📧 Contact Information</h2>
            <div className="space-y-4">
              <InfoField label="Email" value={operator.email} />
              <InfoField label="Phone" value={operator.phone || "Not provided"} />
            </div>
          </div>

          {/* Assignment Info */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <h2 className="text-lg font-bold mb-4 text-gray-800">📍 Assignment</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Assigned Regions</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {operator.assigned_regions && operator.assigned_regions.length > 0 ? (
                    operator.assigned_regions.map((region) => (
                      <span key={region} className="badge badge-info">
                        {region}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">None assigned</span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Assigned Districts</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {operator.assigned_districts && operator.assigned_districts.length > 0 ? (
                    operator.assigned_districts.map((district) => (
                      <span key={district} className="badge badge-info">
                        {district}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">None assigned</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="md:col-span-2 grid md:grid-cols-4 gap-4">
            <StatCard
              label="Farmers Registered"
              value={operator.farmer_count || 0}
              icon="🌾"
              color="green"
            />
            <StatCard
              label="Recent (30 days)"
              value={operator.recent_registrations_30d || 0}
              icon="📅"
              color="blue"
            />
            <StatCard
              label="Total Land (hectares)"
              value={(operator.total_land_hectares || 0).toFixed(2)}
              icon="📏"
              color="orange"
            />
            <StatCard
              label="Avg Land (hectares)"
              value={(operator.avg_land_hectares || 0).toFixed(2)}
              icon="📊"
              color="purple"
            />
          </div>

          {/* Metadata */}
          <div className="md:col-span-2 bg-gray-100 rounded-lg p-4 space-y-2">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Created</p>
              <p className="text-sm text-gray-900">
                {operator.created_at
                  ? new Date(operator.created_at).toLocaleString()
                  : "Unknown"}
              </p>
            </div>
            {operator.updated_at && (
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Last Updated</p>
                <p className="text-sm text-gray-900">
                  {new Date(operator.updated_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function InfoField({ label, value }: { label: string; value?: string | number }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-gray-900 mt-1">{value || "—"}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: "green" | "blue" | "orange" | "purple";
}) {
  const borderColors = {
    green: "border-green-600",
    blue: "border-blue-600",
    orange: "border-orange-500",
    purple: "border-purple-600",
  };

  const bgColors = {
    green: "bg-green-50",
    blue: "bg-blue-50",
    orange: "bg-orange-50",
    purple: "bg-purple-50",
  };

  const textColors = {
    green: "text-green-600",
    blue: "text-blue-600",
    orange: "text-orange-600",
    purple: "text-purple-600",
  };

  return (
    <div
      className={`bg-white rounded-lg shadow p-6 border-l-4 ${borderColors[color]}`}
    >
      <div className={`text-3xl mb-3 ${bgColors[color]} ${textColors[color]} inline-block p-3 rounded-lg`}>
        {icon}
      </div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
