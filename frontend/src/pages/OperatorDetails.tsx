import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { operatorService } from "@/services/operator.service";

interface OperatorData {
  operator_id: string;
  email: string;
  full_name: string;
  phone?: string;
  is_active: boolean;
  assigned_district?: string;
  farmer_count?: number;
  recent_registrations_30d?: number;
  total_land_hectares?: number;
  avg_land_hectares?: number;
  created_at?: string;
}

export default function OperatorDetails() {
  const { operatorId } = useParams<{ operatorId: string }>();
  const navigate = useNavigate();
  const [operator, setOperator] = useState<OperatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (operatorId) loadOperatorData();
  }, [operatorId]);

  const loadOperatorData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await operatorService.getOperator(operatorId!);
      setOperator(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load operator details");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!operator) return;
    const action = operator.is_active ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} this operator?`)) return;

    try {
      setUpdating(true);
      await operatorService.update(operator.operator_id, { is_active: !operator.is_active });
      alert(`✅ Operator ${action}d successfully`);
      await loadOperatorData();
    } catch (err: any) {
      alert(err.response?.data?.detail || `Failed to ${action} operator`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
          <p className="text-gray-600 mt-4">Loading operator details...</p>
        </div>
      </div>
    );
  }

  if (error || !operator) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">❌</p>
          <p className="text-xl text-red-600 mb-6">{error || "Operator not found"}</p>
          <button
            onClick={() => navigate("/operators/manage")}
            className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-6 rounded-lg"
          >
            ← Back to Operators
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate("/operators/manage")} 
              className="text-green-700 hover:text-green-800 font-bold text-sm"
            >
              ← BACK
            </button>
            <h1 className="text-2xl font-bold text-gray-800">👨‍💼 Operator Details</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/operators/${operatorId}/edit`)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm"
            >
              ✏️ Edit
            </button>
            <button
              onClick={handleToggleStatus}
              disabled={updating}
              className={`font-bold py-2 px-4 rounded-lg transition text-sm text-white ${
                operator.is_active 
                  ? "bg-red-600 hover:bg-red-700" 
                  : "bg-green-600 hover:bg-green-700"
              } ${updating ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {updating ? "⏳ Updating..." : operator.is_active ? "🔴 Deactivate" : "🟢 Activate"}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-4 border-b-4 border-green-700">
              {operator.full_name}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Operator ID</p>
                <p className="text-lg font-mono font-bold text-gray-800 mt-1">{operator.operator_id}</p>
              </div>
              
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Status</p>
                <div className="mt-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    operator.is_active 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  }`}>
                    {operator.is_active ? "✓ Active" : "✗ Inactive"}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Email</p>
                <p className="text-sm text-gray-800 mt-1">{operator.email}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Phone</p>
                <p className="text-sm text-gray-800 mt-1">{operator.phone || "N/A"}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Assigned District</p>
                <p className="text-sm text-gray-800 mt-1">{operator.assigned_district || "All Districts"}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Registered</p>
                <p className="text-sm text-gray-800 mt-1">
                  {operator.created_at ? new Date(operator.created_at).toLocaleDateString() : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white shadow-sm">
              <p className="text-xs font-bold uppercase opacity-90 mb-1">Total Farmers</p>
              <p className="text-4xl font-bold">{operator.farmer_count || 0}</p>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-sm">
              <p className="text-xs font-bold uppercase opacity-90 mb-1">This Month</p>
              <p className="text-4xl font-bold">{operator.recent_registrations_30d || 0}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-6 text-white shadow-sm">
              <p className="text-xs font-bold uppercase opacity-90 mb-1">Land Managed</p>
              <p className="text-3xl font-bold">{operator.total_land_hectares?.toFixed(1) || 0}</p>
              <p className="text-xs opacity-90 mt-1">hectares</p>
            </div>

            <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-white shadow-sm">
              <p className="text-xs font-bold uppercase opacity-90 mb-1">Avg per Farmer</p>
              <p className="text-3xl font-bold">{operator.avg_land_hectares?.toFixed(2) || 0}</p>
              <p className="text-xs opacity-90 mt-1">hectares</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
