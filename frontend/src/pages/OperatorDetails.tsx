import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BackButton from "@/components/BackButton";
import { operatorService } from "@/services/operator.service";
import { useNotification } from "@/contexts/NotificationContext";
import { logger } from "@/utils/logger";

const COMPONENT = "OperatorDetails";

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

interface AssignedFarmer {
  farmer_id?: string;
  personal_info?: {
    first_name?: string;
    last_name?: string;
  };
  address?: {
    district_name?: string;
  };
  created_at?: string;
  registration_status?: string;
}

export default function OperatorDetails() {
  const { operatorId } = useParams<{ operatorId: string }>();
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useNotification();
  const [operator, setOperator] = useState<OperatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [assignedFarmers, setAssignedFarmers] = useState<AssignedFarmer[]>([]);

  useEffect(() => {
    if (operatorId) loadOperatorData();
  }, [operatorId]);

  const loadOperatorData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await operatorService.getOperator(operatorId!);
      setOperator(data);
      try {
        const farmersRes = await operatorService.getOperatorFarmers(operatorId!, 100, 0);
        setAssignedFarmers(farmersRes.results || []);
      } catch (farmersErr: unknown) {
        logger.error(COMPONENT, "Failed to load assigned farmers", { operatorId, error: farmersErr });
      }
      logger.info(COMPONENT, 'Operator data loaded', { operatorId });
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to load operator details";
      logger.error(COMPONENT, 'Load failed', { operatorId, error: msg });
      setError(msg);
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
      logger.info(COMPONENT, `Operator ${action}d`, { operatorId: operator.operator_id });
      showSuccess(`Operator ${action}d successfully`, 4000);
      await loadOperatorData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || `Failed to ${action} operator`;
      logger.error(COMPONENT, `Toggle status failed`, { error: msg });
      showError(msg, 5000);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 dark:border-gray-600 border-t-green-600"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading operator details...</p>
        </div>
      </div>
    );
  }

  if (error || !operator) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">❌</p>
          <p className="text-xl text-red-600 mb-6">{error || "Operator not found"}</p>
          <BackButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">👨‍💼 Operator Details</h1>
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
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 pb-4 border-b-4 border-green-700">
              {operator.full_name}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Operator ID</p>
                <p className="text-lg font-mono font-bold text-gray-800 dark:text-gray-100 mt-1">{operator.operator_id}</p>
              </div>
              
              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</p>
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
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Email</p>
                <p className="text-sm text-gray-800 dark:text-gray-100 mt-1">{operator.email}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Phone</p>
                <p className="text-sm text-gray-800 dark:text-gray-100 mt-1">{operator.phone || "N/A"}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Assigned District</p>
                <p className="text-sm text-gray-800 dark:text-gray-100 mt-1">{operator.assigned_district || "All Districts"}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Registered</p>
                <p className="text-sm text-gray-800 dark:text-gray-100 mt-1">
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

        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">👨‍🌾 Assigned Farmers</h3>
          {assignedFarmers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No assigned farmers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                    <th className="py-2 pr-3">Farmer ID</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">District</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedFarmers.map((farmer) => {
                    const name = `${farmer.personal_info?.first_name || ""} ${farmer.personal_info?.last_name || ""}`.trim() || "Unknown";
                    return (
                      <tr key={farmer.farmer_id || name} className="border-b border-gray-100 dark:border-gray-700/60 text-gray-800 dark:text-gray-100">
                        <td className="py-2 pr-3 font-mono">{farmer.farmer_id || "N/A"}</td>
                        <td className="py-2 pr-3">{name}</td>
                        <td className="py-2 pr-3">{farmer.address?.district_name || "N/A"}</td>
                        <td className="py-2 pr-3 capitalize">{farmer.registration_status || "registered"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
