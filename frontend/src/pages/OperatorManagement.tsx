import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { operatorService } from "@/services/operator.service";
import geoService from "@/services/geo.service";

interface Operator {
  _id: string;
  operator_id: string;
  full_name: string;
  email: string;
  phone?: string;
  is_active?: boolean;
  assigned_district?: string;
  assigned_districts?: string[];
}

interface Province { code: string; name: string }
interface District { code: string; name: string }

export default function OperatorManagement() {
  const navigate = useNavigate();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [allOperators, setAllOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    assigned_district: "",
  });
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    phone: "",
    assigned_district: "",
    is_active: true,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [editDistricts, setEditDistricts] = useState<District[]>([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [editSelectedProvince, setEditSelectedProvince] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalOperators, setTotalOperators] = useState(0);

  useEffect(() => {
    loadOperators(0);
    loadProvinces();
  }, []);

  const loadProvinces = async () => {
    try {
      const data = await geoService.provinces();
      setProvinces(data);
    } catch (err) {
      console.error("Failed to load provinces:", err);
    }
  };

  const loadDistricts = async (provinceCode: string) => {
    try {
      const data = await geoService.districts(provinceCode);
      return data;
    } catch (err) {
      console.error("Failed to load districts:", err);
      return [];
    }
  };

  const handleProvinceChange = async (provinceCode: string) => {
    setSelectedProvince(provinceCode);
    setFormData(prev => ({ ...prev, assigned_district: "" }));
    if (provinceCode) {
      const districtsData = await loadDistricts(provinceCode);
      setDistricts(districtsData);
    } else {
      setDistricts([]);
    }
  };

  const handleEditProvinceChange = async (provinceCode: string) => {
    setEditSelectedProvince(provinceCode);
    setEditFormData(prev => ({ ...prev, assigned_district: "" }));
    if (provinceCode) {
      const districtsData = await loadDistricts(provinceCode);
      setEditDistricts(districtsData);
    } else {
      setEditDistricts([]);
    }
  };

  const loadOperators = async (page = 0) => {
    setLoading(true);
    try {
      const skip = page * pageSize;
      const data = await operatorService.getOperators(100, 0); // Load all for display
      
      let operatorList: Operator[] = [];
      let total = 0;
      
      if (Array.isArray(data)) {
        operatorList = data;
        total = data.length;
      } else if (Array.isArray(data.results)) {
        operatorList = data.results;
        total = data.total || data.results.length;
      } else if (Array.isArray(data.operators)) {
        operatorList = data.operators;
        total = data.total || data.operators.length;
      }
      
      setOperators(operatorList);
      setTotalOperators(total);
      setCurrentPage(page);
      
      if (operatorList.length === 0 && page === 0) {
        setError("No operators found");
      } else {
        setError("");
      }
    } catch (err) {
      console.error("Failed to load operators:", err);
      setError("Failed to load operators");
    } finally {
      setLoading(false);
    }
  };

  const openViewModal = (operator: Operator) => {
    setSelectedOperator(operator);
    setShowViewModal(true);
  };

  const openEditModal = (operator: Operator) => {
    setSelectedOperator(operator);
    setEditFormData({
      full_name: operator.full_name || "",
      phone: operator.phone || "",
      assigned_district: operator.assigned_district || operator.assigned_districts?.[0] || "",
      is_active: operator.is_active ?? true,
    });
    setEditSelectedProvince("");
    setEditDistricts([]);
    setShowEditModal(true);
    setShowViewModal(false);
  };

  const handleToggleActive = async (operatorId: string, currentStatus: boolean) => {
    setUpdatingId(operatorId);
    try {
      await operatorService.update(operatorId, { is_active: !currentStatus });
      setSuccess(`Operator ${!currentStatus ? "activated" : "deactivated"} successfully!`);
      loadOperators(currentPage);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update operator status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedOperator) return;

    try {
      const payload: any = {
        full_name: editFormData.full_name,
        phone: editFormData.phone,
        is_active: editFormData.is_active,
      };

      if (editFormData.assigned_district) {
        payload.assigned_district = editFormData.assigned_district;
      }

      await operatorService.update(selectedOperator.operator_id, payload);
      setSuccess("✅ Operator updated successfully!");
      setShowEditModal(false);
      setSelectedOperator(null);
      loadOperators(currentPage);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update operator");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone.replace(/[\s\-()]/g, ""),
        password: formData.password,
        role: "OPERATOR",
        assigned_district: formData.assigned_district || undefined,
      };

      await operatorService.create(payload);
      setSuccess("✅ Operator created successfully!");
      setShowCreateModal(false);
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        assigned_district: "",
      });
      setSelectedProvince("");
      loadOperators();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create operator");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin-dashboard")} className="text-green-700 hover:text-green-800 font-bold text-sm">
              ← BACK
            </button>
            <h1 className="text-2xl font-bold text-gray-800">👨‍💼 Operator Management</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            + Create Operator
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && !showCreateModal && (
          <div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border-l-4 border-red-500">
            {error}
            <button onClick={() => setError("")} className="ml-auto block text-xs hover:underline">Dismiss</button>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm border-l-4 border-green-600">
            ✓ {success}
          </div>
        )}

        {/* Modal Overlay - overlays operator list, does not hide it */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">➕ Create New Operator</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="mx-6 mt-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border-l-4 border-red-500">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase">First Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g., John (required)"
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase">Last Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g., Doe (required)"
                      value={formData.last_name}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase">Email <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      placeholder="e.g., john@example.com (required)"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase">Phone</label>
                    <input
                      type="tel"
                      placeholder="e.g., +260 971 234567"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase">Province</label>
                    <select
                      value={selectedProvince}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                    >
                      <option value="">-- Select Province --</option>
                      {provinces.map(p => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase">District</label>
                    <select
                      value={formData.assigned_district}
                      onChange={(e) => setFormData({...formData, assigned_district: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                      disabled={!selectedProvince}
                    >
                      <option value="">-- Select District --</option>
                      {districts.map(d => (
                        <option key={d.code} value={d.code}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase">Password <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      placeholder="Min 8 characters (required)"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase">Confirm Password <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      placeholder="Re-enter password (required)"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    Create Operator
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Operators List and loading states always visible */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
            <p className="text-gray-600 mt-4">Loading operators...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-red-600 text-lg">{error}</p>
            <p className="text-gray-500 text-sm">Try refreshing or check your network/API.</p>
          </div>
        ) : operators.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-600 text-lg">No operators found</p>
            <p className="text-gray-500 text-sm">Create a new operator to get started</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">Operator ID</th>
                    <th className="px-6 py-3">Full Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Phone</th>
                    <th className="px-6 py-3">District</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {operators.map((operator) => (
                    <tr key={operator._id} className="hover:bg-green-50 transition">
                      <td className="px-6 py-4 font-semibold text-gray-800">{operator.operator_id || "N/A"}</td>
                      <td className="px-6 py-4">{operator.full_name || "Unknown"}</td>
                      <td className="px-6 py-4">{operator.email || "N/A"}</td>
                      <td className="px-6 py-4">{operator.phone || "N/A"}</td>
                      <td className="px-6 py-4">{operator.assigned_district || operator.assigned_districts?.[0] || "N/A"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          operator.is_active 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {operator.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => openViewModal(operator)}
                            className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded transition"
                            title="View details"
                          >
                            👁️ View
                          </button>
                          <button
                            onClick={() => openEditModal(operator)}
                            className="px-3 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded transition"
                            title="Edit operator"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(operator.operator_id, operator.is_active ?? true)}
                            disabled={updatingId === operator.operator_id}
                            className={`px-3 py-1 text-xs font-semibold rounded transition ${
                              operator.is_active
                                ? "bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-50"
                                : "bg-green-50 hover:bg-green-100 text-green-700 disabled:opacity-50"
                            }`}
                            title={operator.is_active ? "Deactivate" : "Activate"}
                          >
                            {updatingId === operator.operator_id ? "..." : (operator.is_active ? "🔴 Deactivate" : "🟢 Activate")}
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
              {operators.map((operator) => (
                <div key={operator._id} className="p-4 hover:bg-green-50 transition space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-gray-600 uppercase">ID</p>
                      <p className="font-semibold text-gray-800">{operator.operator_id || "N/A"}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      operator.is_active 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      {operator.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs font-bold text-gray-600 uppercase">Name</p>
                      <p className="text-gray-800">{operator.full_name || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-600 uppercase">Email</p>
                      <p className="text-gray-700">{operator.email || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-600 uppercase">Phone</p>
                      <p className="text-gray-700">{operator.phone || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-600 uppercase">District</p>
                      <p className="text-gray-700">{operator.assigned_district || operator.assigned_districts?.[0] || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => openViewModal(operator)}
                      className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded transition"
                    >
                      👁️ View
                    </button>
                    <button
                      onClick={() => openEditModal(operator)}
                      className="flex-1 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded transition"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(operator.operator_id, operator.is_active ?? true)}
                      disabled={updatingId === operator.operator_id}
                      className={`flex-1 px-3 py-2 text-xs font-semibold rounded transition ${
                        operator.is_active
                          ? "bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-50"
                          : "bg-green-50 hover:bg-green-100 text-green-700 disabled:opacity-50"
                      }`}
                    >
                      {updatingId === operator.operator_id ? "..." : (operator.is_active ? "🔴" : "🟢")}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-600">
              <span>Showing {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, totalOperators)} of {totalOperators}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => loadOperators(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => loadOperators(currentPage + 1)}
                  disabled={(currentPage + 1) * pageSize >= totalOperators}
                  className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal && selectedOperator && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">👁️ Operator Details</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">Operator ID</p>
                  <p className="text-gray-800 font-semibold">{selectedOperator.operator_id || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">Full Name</p>
                  <p className="text-gray-800">{selectedOperator.full_name || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">Email</p>
                  <p className="text-gray-800">{selectedOperator.email || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">Phone</p>
                  <p className="text-gray-800">{selectedOperator.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">Assigned District</p>
                  <p className="text-gray-800">{selectedOperator.assigned_district || selectedOperator.assigned_districts?.[0] || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">Status</p>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    selectedOperator.is_active 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  }`}>
                    {selectedOperator.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="pt-4 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={() => openEditModal(selectedOperator)}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedOperator && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full my-8 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">✏️ Edit Operator</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="mx-6 mt-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border-l-4 border-red-500">
                  {error}
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase">Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g., John Doe"
                    value={editFormData.full_name}
                    onChange={(e) => setEditFormData({...editFormData, full_name: e.target.value})}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase">Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g., +260 971 234567"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase">Province</label>
                  <select
                    value={editSelectedProvince}
                    onChange={(e) => handleEditProvinceChange(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                  >
                    <option value="">-- Select Province --</option>
                    {provinces.map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase">District</label>
                  <select
                    value={editFormData.assigned_district}
                    onChange={(e) => setEditFormData({...editFormData, assigned_district: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                    disabled={!editSelectedProvince && editDistricts.length === 0}
                  >
                    <option value="">-- Select District --</option>
                    {editDistricts.map(d => (
                      <option key={d.code} value={d.code}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <label className="text-xs font-bold text-gray-600 uppercase mb-2 block">Status</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={editFormData.is_active}
                        onChange={() => setEditFormData({...editFormData, is_active: true})}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">🟢 Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!editFormData.is_active}
                        onChange={() => setEditFormData({...editFormData, is_active: false})}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">🔴 Inactive</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
