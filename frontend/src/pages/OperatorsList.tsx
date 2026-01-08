import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { operatorService } from "@/services/operator.service";
import { dashboardCache } from "@/pages/AdminDashboard";

interface Operator {
  _id: string;
  operator_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  role: string;
  status: string;
  assigned_district?: string;
  assigned_province?: string;
  created_at?: string;
}

export default function OperatorsList() {
  const navigate = useNavigate();

  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await operatorService.getOperators(100, 0);
      const operatorList = data.results || data.operators || data || [];
      setOperators(operatorList);
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error("Fetch operators error:", err);
      }
      setError(err.response?.data?.detail || "Failed to load operators");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (operatorId: string, operatorName: string) => {
    if (!confirm(`Are you sure you want to delete ${operatorName}?`)) {
      return;
    }

    try {
      await operatorService.delete(operatorId);
      alert("✅ Operator deleted successfully");
      // Clear admin dashboard cache
      dashboardCache.clear();
      await fetchOperators();
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error("Delete operator error:", err);
      }
      alert(err.response?.data?.detail || "Failed to delete operator");
    }
  };

  const handleToggleStatus = async (operatorId: string, currentStatus: string) => {
    const action = currentStatus === "active" ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} this operator?`)) {
      return;
    }

    try {
      // Use update method to change is_active status
      await operatorService.update(operatorId, {
        is_active: currentStatus !== "active"
      });
      alert(`✅ Operator ${action}d successfully`);
      // Clear admin dashboard cache
      dashboardCache.clear();
      await fetchOperators();
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error(`${action} operator error:`, err);
      }
      alert(err.response?.data?.detail || `Failed to ${action} operator`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate("/")} 
              className="text-green-700 hover:text-green-800 font-bold text-sm"
            >
              ← BACK
            </button>
            <h1 className="text-2xl font-bold text-gray-800">📋 Field Operators</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <button
          onClick={() => navigate("/operators/create")}
          className="mb-6 bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg transition shadow-lg inline-flex items-center gap-2"
        >
          <i className="fa-solid fa-plus"></i> Add New Operator
        </button>

        {error && (
          <div
            role="alert"
            className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border-l-4 border-red-500"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white p-12 text-center rounded-xl shadow-sm">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
            </div>
            <p className="mt-4 text-gray-600">Loading operators...</p>
          </div>
        ) : operators.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl shadow-sm">
            <p className="text-gray-600 text-lg">No operators found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">#</th>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Phone</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">District</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {operators.map((op, i) => (
                    <tr key={op.operator_id || i} className="hover:bg-green-50 transition">
                      <td className="px-6 py-4 font-bold text-gray-800">{i + 1}</td>
                      <td className="px-6 py-4 font-bold text-gray-800">
                        {op.first_name} {op.last_name}
                      </td>
                      <td className="px-6 py-4">{op.phone}</td>
                      <td className="px-6 py-4">{op.email || "-"}</td>
                      <td className="px-6 py-4">{op.assigned_district || "-"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            op.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {op.status?.toUpperCase() || "UNKNOWN"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-3">
                          <button
                            onClick={() => navigate(`/operators/${op.operator_id}`)}
                            className="text-green-600 hover:text-green-800 font-bold text-lg"
                            title="View Details"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => navigate(`/operators/edit/${op.operator_id}`)}
                            className="text-blue-600 hover:text-blue-800 font-bold text-lg"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleToggleStatus(op.operator_id, op.status)}
                            className={`font-bold text-lg ${
                              op.status === "active"
                                ? "text-red-600 hover:text-red-800"
                                : "text-green-600 hover:text-green-800"
                            }`}
                            title={op.status === "active" ? "Deactivate" : "Activate"}
                          >
                            {op.status === "active" ? "🔴" : "🟢"}
                          </button>
                          <button
                            onClick={() => handleDelete(op.operator_id, `${op.first_name} ${op.last_name}`)}
                            className="text-red-600 hover:text-red-800 font-bold text-lg"
                            title="Delete"
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

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {operators.map((op, i) => (
                <div key={op.operator_id || i} className="p-4 hover:bg-green-50 transition">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Operator #{i + 1}</p>
                      <h3 className="text-lg font-bold text-gray-800 mt-1">
                        {op.first_name} {op.last_name}
                      </h3>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                        op.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {op.status?.toUpperCase() || "UNKNOWN"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1 mb-4">
                    <p><strong>Phone:</strong> {op.phone}</p>
                    <p><strong>Email:</strong> {op.email || "-"}</p>
                    <p><strong>District:</strong> {op.assigned_district || "-"}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => navigate(`/operators/${op.operator_id}`)}
                      className="flex-1 bg-green-100 text-green-800 font-bold py-2 px-3 rounded-lg text-sm hover:bg-green-200 transition"
                    >
                      👁️ View
                    </button>
                    <button
                      onClick={() => navigate(`/operators/edit/${op.operator_id}`)}
                      className="flex-1 bg-blue-100 text-blue-800 font-bold py-2 px-3 rounded-lg text-sm hover:bg-blue-200 transition"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(op.operator_id, op.status)}
                      className={`flex-1 font-bold py-2 px-3 rounded-lg text-sm transition ${
                        op.status === "active"
                          ? "bg-red-100 text-red-800 hover:bg-red-200"
                          : "bg-green-100 text-green-800 hover:bg-green-200"
                      }`}
                    >
                      {op.status === "active" ? "🔴 Deactivate" : "🟢 Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(op.operator_id, `${op.first_name} ${op.last_name}`)}
                      className="bg-red-100 text-red-800 font-bold py-2 px-3 rounded-lg text-sm hover:bg-red-200 transition"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
