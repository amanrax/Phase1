// src/pages/OperatorsList.tsx — Enhanced operator list (styled like AdminDashboard)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "@/components/BackButton";
import { operatorService } from "@/services/operator.service";
import { useNotification } from "@/contexts/NotificationContext";
import { logger } from "@/utils/logger";

const COMPONENT = "OperatorsList";

interface Operator {
  _id: string;
  operator_id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  phone: string;
  email?: string;
  role: string;
  status: string;
  is_active?: boolean;
  assigned_district?: string;
  assigned_province?: string;
  farmer_count?: number;
  created_at?: string;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className}`} />;
}

export default function OperatorsList() {
  const navigate = useNavigate();
  const notify = useNotification();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    setLoading(true);
    setError("");
    logger.info(COMPONENT, "Fetching operators list");
    try {
      const data = await operatorService.getOperators(100, 0);
      const operatorList = data.results || data.operators || data || [];
      setOperators(operatorList);
      logger.info(COMPONENT, "Operators loaded", { count: operatorList.length });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string }; status?: number }; message?: string };
      const msg = e?.response?.data?.detail || e?.message || "Failed to load operators";
      logger.error(COMPONENT, "Fetch operators failed", { error: msg });
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (operatorId: string, operatorName: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${operatorName}? This cannot be undone.`)) return;
    setActionLoadingId(`delete-${operatorId}`);
    logger.info(COMPONENT, "Deleting operator", { operatorId, operatorName });
    try {
      await operatorService.delete(operatorId);
      notify.success(`${operatorName} deleted successfully.`);
      logger.info(COMPONENT, "Operator deleted", { operatorId });
      await fetchOperators();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      const msg = e?.response?.data?.detail || e?.message || "Failed to delete operator";
      logger.error(COMPONENT, "Delete operator failed", { operatorId, error: msg });
      notify.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = async (operatorId: string, currentStatus: string) => {
    const action = currentStatus === "active" ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} this operator?`)) return;
    setActionLoadingId(`toggle-${operatorId}`);
    logger.info(COMPONENT, `${action} operator`, { operatorId });
    try {
      await operatorService.update(operatorId, { is_active: currentStatus !== "active" });
      notify.success(`Operator ${action}d successfully.`);
      logger.info(COMPONENT, `Operator ${action}d`, { operatorId });
      await fetchOperators();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      const msg = e?.response?.data?.detail || e?.message || `Failed to ${action} operator`;
      logger.error(COMPONENT, `${action} operator failed`, { operatorId, error: msg });
      notify.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredOperators = operators.filter((op) => {
    const name = (op.full_name || `${op.first_name || ""} ${op.last_name || ""}`).toLowerCase();
    const email = (op.email || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || email.includes(q) || op.operator_id.includes(q) || (op.phone || "").includes(q);
  });

  const getStatusColor = (status: string) => {
    if (status === "active") return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  };

  const activeCount = operators.filter((o) => o.status === "active" || o.is_active).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton to="/admin-dashboard" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">👨‍💼 Field Operators</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{operators.length} total · {activeCount} active</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchOperators}
              disabled={loading}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              {loading ? "⏳" : "🔄"} Refresh
            </button>
            <button
              onClick={() => navigate("/operators/manage", { state: { openCreate: true } })}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm transition active:scale-95 flex items-center gap-1.5"
            >
              ➕ Add Operator
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Total</p>
            <p className="text-2xl font-extrabold text-gray-800 dark:text-gray-100 mt-1">{operators.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Active</p>
            <p className="text-2xl font-extrabold text-green-600 dark:text-green-400 mt-1">{activeCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Inactive</p>
            <p className="text-2xl font-extrabold text-red-500 dark:text-red-400 mt-1">{operators.length - activeCount}</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search by name, email, phone, or ID..."
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition placeholder:text-gray-400"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm border-l-4 border-red-500 flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => { setError(""); fetchOperators(); }} className="text-sm font-bold hover:underline">Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : filteredOperators.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-4xl mb-3">👨‍💼</p>
            <p className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-2">
              {searchQuery ? "No operators match your search" : "No operators found"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery ? "Try a different search term" : "Get started by adding your first operator"}
            </p>
            {!searchQuery && (
              <button onClick={() => navigate("/operators/manage", { state: { openCreate: true } })}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm transition">
                ➕ Add Operator
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/60">
                  <tr>
                    <th className="px-5 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">#</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Operator</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">District</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider text-center">Status</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {filteredOperators.map((op, i) => {
                    const name = op.full_name || `${op.first_name || ""} ${op.last_name || ""}`.trim() || "Unknown";
                    const status = op.status || (op.is_active !== false ? "active" : "inactive");
                    return (
                      <tr key={op.operator_id || i} className="hover:bg-green-50/50 dark:hover:bg-gray-700/40 transition-colors">
                        <td className="px-5 py-4 text-sm font-bold text-gray-500 dark:text-gray-400">{i + 1}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {name[0]?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{name}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{op.operator_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{op.phone || "N/A"}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[180px]">{op.email || "—"}</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{op.assigned_district || "—"}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full uppercase ${getStatusColor(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => navigate(`/operators/${op.operator_id}`)} title="View"
                              className="px-2.5 py-1.5 text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 text-blue-700 dark:text-blue-400 rounded-lg transition">
                              👁️ View
                            </button>
                            <button onClick={() => navigate(`/operators/${op.operator_id}/edit`)} title="Edit"
                              className="px-2.5 py-1.5 text-xs font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-800/40 text-amber-700 dark:text-amber-400 rounded-lg transition">
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleToggleStatus(op.operator_id, status)}
                              disabled={actionLoadingId !== null}
                              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition disabled:opacity-50 ${
                                status === "active"
                                  ? "bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-800/40 text-red-700 dark:text-red-400"
                                  : "bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-800/40 text-green-700 dark:text-green-400"
                              }`}>
                              {actionLoadingId === `toggle-${op.operator_id}` ? "⏳" : status === "active" ? "🔴" : "🟢"}
                            </button>
                            <button
                              onClick={() => handleDelete(op.operator_id, name)}
                              disabled={actionLoadingId !== null}
                              className="px-2.5 py-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-800/40 text-red-700 dark:text-red-400 rounded-lg transition disabled:opacity-50">
                              {actionLoadingId === `delete-${op.operator_id}` ? "⏳" : "🗑️"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="bg-gray-50 dark:bg-gray-700/40 px-5 py-3 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
                Showing {filteredOperators.length} of {operators.length} operators
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700/60">
              {filteredOperators.map((op, i) => {
                const name = op.full_name || `${op.first_name || ""} ${op.last_name || ""}`.trim() || "Unknown";
                const status = op.status || (op.is_active !== false ? "active" : "inactive");
                return (
                  <div key={op.operator_id || i} className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                        {name[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{op.email || op.operator_id}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase whitespace-nowrap ${getStatusColor(status)}`}>
                        {status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 mb-3 pl-13">
                      <p>📱 {op.phone || "N/A"} · 📍 {op.assigned_district || "—"}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/operators/${op.operator_id}`)}
                        className="flex-1 py-2 text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg transition text-center">
                        👁️ View
                      </button>
                      <button onClick={() => navigate(`/operators/${op.operator_id}/edit`)}
                        className="flex-1 py-2 text-xs font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg transition text-center">
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleToggleStatus(op.operator_id, status)}
                        disabled={actionLoadingId !== null}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition text-center disabled:opacity-50 ${
                          status === "active"
                            ? "bg-red-50 hover:bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                            : "bg-green-50 hover:bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        }`}>
                        {status === "active" ? "🔴 Off" : "🟢 On"}
                      </button>
                      <button
                        onClick={() => handleDelete(op.operator_id, name)}
                        disabled={actionLoadingId !== null}
                        className="py-2 px-3 text-xs font-bold bg-red-50 hover:bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg transition disabled:opacity-50">
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="bg-gray-50 dark:bg-gray-700/40 px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                Showing {filteredOperators.length} of {operators.length} operators
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
