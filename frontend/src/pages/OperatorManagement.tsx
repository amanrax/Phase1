import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { operatorService } from "@/services/operator.service";
import geoService from "@/services/geo.service";

interface Operator {
  _id: string;
  operator_id: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone?: string;
  is_active?: boolean;
  assigned_district?: string;
  assigned_districts?: string[];
  assigned_regions?: string[];
  created_at?: string;
  updated_at?: string;
  farmer_count?: number;
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
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    assigned_district: "",
    password: "",
    confirmPassword: "",
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
  const [searchBy, setSearchBy] = useState<"name" | "operator_id">("name");
  const [searchValue, setSearchValue] = useState("");

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

  // Helper function to get district display name
  const getDistrictDisplayName = (districtValue: string | undefined): string => {
    if (!districtValue) return "N/A";
    // If it looks like a code (e.g., CP01), show with label
    if (/^[A-Z]{2}\d{2}$/.test(districtValue)) {
      return `${districtValue} (Code)`;
    }
    // Otherwise it's already a name
    return districtValue;
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

  // Filter operators based on search
  const filteredOperators = operators.filter((op: Operator) => {
    if (!searchValue.trim()) return true;
    const searchLower = searchValue.toLowerCase().trim();
    if (searchBy === "name") {
      return op.full_name.toLowerCase().includes(searchLower);
    } else if (searchBy === "operator_id") {
      return op.operator_id.toLowerCase().includes(searchLower);
    }
    return false;
  });
  const openViewModal = (operator: Operator) => {
    setSelectedOperator(operator);
    setShowViewModal(true);
  };

  const openEditModal = async (operator: Operator) => {
    setSelectedOperator(operator);
    
    // Get the current district and region values
    const currentDistrict = operator.assigned_district || operator.assigned_districts?.[0] || "";
    const currentRegion = operator.assigned_regions?.[0] || "";
    
    // If it looks like a district code (e.g., LK02, CP01), we need to fetch and convert it to a name
    let districtValue = currentDistrict;
    let provinceCode = "";
    
    if (currentDistrict && /^[A-Z]{2}\d{2}$/.test(currentDistrict)) {
      // It's a code - fetch all districts to find the name and province
      try {
        const allDistricts = await geoService.districts();
        const matchingDistrict = allDistricts.find((d: District) => d.code === currentDistrict);
        if (matchingDistrict) {
          districtValue = matchingDistrict.name;
        }
      } catch (err) {
        console.error("Failed to convert district code to name:", err);
      }
    }
    
    // Find the province code from the region name
    if (currentRegion) {
      const matchingProvince = provinces.find((p: Province) => p.name === currentRegion);
      if (matchingProvince) {
        provinceCode = matchingProvince.code;
      }
    }
    
    // If we have a province, load its districts
    let districtsForProvince: District[] = [];
    if (provinceCode) {
      try {
        districtsForProvince = await loadDistricts(provinceCode);
      } catch (err) {
        console.error("Failed to load districts for province:", err);
      }
    }
    
    // Split full_name into first and last name
    const nameParts = (operator.full_name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    
    setEditFormData({
      first_name: firstName,
      last_name: lastName,
      email: operator.email || "",
      phone: operator.phone || "",
      assigned_district: districtValue,
      password: "",
      confirmPassword: "",
      is_active: operator.is_active ?? true,
    });
    setEditSelectedProvince(provinceCode);
    setEditDistricts(districtsForProvince);
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

    // Validate password if provided
    if (editFormData.password || editFormData.confirmPassword) {
      if (editFormData.password !== editFormData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (editFormData.password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
    }

    try {
      const provinceName = provinces.find(p => p.code === editSelectedProvince)?.name;
      const full_name = `${editFormData.first_name} ${editFormData.last_name}`.trim();
      const payload: any = {
        full_name: full_name,
        email: editFormData.email,
        phone: editFormData.phone,
        is_active: editFormData.is_active,
      };
      
      // Only include password if it's been filled in
      if (editFormData.password) {
        payload.password = editFormData.password;
      }

      if (editFormData.assigned_district) {
        payload.assigned_districts = [editFormData.assigned_district];
      }
      if (provinceName) {
        payload.assigned_regions = [provinceName];
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
      const provinceName = provinces.find(p => p.code === selectedProvince)?.name;
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone.replace(/[\s\-()]/g, ""),
        password: formData.password,
        role: "OPERATOR",
        assigned_districts: formData.assigned_district ? [formData.assigned_district] : [],
        assigned_regions: provinceName ? [provinceName] : [],
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

        {/* Search Filter */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4 flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-64">
            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Search By</label>
            <select
              value={searchBy}
              onChange={(e) => setSearchBy(e.target.value as any)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 text-sm"
            >
              <option value="name">Name</option>
              <option value="operator_id">Operator ID</option>
            </select>
          </div>

          <div className="flex-1 min-w-64">
            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Search Value</label>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={`Search by ${searchBy === "name" ? "name" : "operator ID"}...`}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 text-sm"
            />
          </div>

          <button
            onClick={() => {
              setSearchValue("");
              setSearchBy("name");
            }}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 text-xs font-semibold rounded-lg transition"
          >
            Clear Search
          </button>
        </div>

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
                        <option key={d.code} value={d.name}>{d.name} ({d.code})</option>
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
                  {filteredOperators.map((operator) => (
                    <tr key={operator._id} className="hover:bg-green-50 transition">
                      <td className="px-6 py-4 font-semibold text-gray-800">{operator.operator_id || "N/A"}</td>
                      <td className="px-6 py-4">{operator.full_name || "Unknown"}</td>
                      <td className="px-6 py-4">{operator.email || "N/A"}</td>
                      <td className="px-6 py-4">{operator.phone || "N/A"}</td>
                      <td className="px-6 py-4">{getDistrictDisplayName(operator.assigned_district || operator.assigned_districts?.[0])}</td>
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
                          {operator.is_active ? (
                            <button
                              onClick={() => handleToggleActive(operator.operator_id, operator.is_active ?? true)}
                              disabled={updatingId === operator.operator_id}
                              className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded transition disabled:opacity-50"
                              title="Deactivate"
                            >
                              {updatingId === operator.operator_id ? "..." : "🔴 Deactivate"}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleActive(operator.operator_id, operator.is_active ?? true)}
                              disabled={updatingId === operator.operator_id}
                              className="px-3 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded transition disabled:opacity-50"
                              title="Activate"
                            >
                              {updatingId === operator.operator_id ? "..." : "🟢 Activate"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {filteredOperators.map((operator) => (
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
                      <p className="text-gray-700">{getDistrictDisplayName(operator.assigned_district || operator.assigned_districts?.[0])}</p>
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
                      className={operator.is_active 
                        ? "flex-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded transition disabled:opacity-50"
                        : "flex-1 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded transition disabled:opacity-50"
                      }
                    >
                      {updatingId === operator.operator_id ? "..." : (operator.is_active ? "🔴 Deactivate" : "🟢 Activate")}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-600">
              <span>Showing {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, filteredOperators.length)} of {filteredOperators.length} (Total: {totalOperators})</span>
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
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">👁️ Operator Details</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 space-y-6">
                {/* Header with Status Badge */}
                <div className="flex justify-between items-start pb-4 border-b border-gray-200">
                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase mb-1">Operator ID</p>
                    <p className="text-2xl font-bold text-gray-800">{selectedOperator.operator_id || "N/A"}</p>
                  </div>
                  <span className={`px-4 py-2 text-sm font-semibold rounded-full ${
                    selectedOperator.is_active 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  }`}>
                    {selectedOperator.is_active ? "🟢 Active" : "🔴 Inactive"}
                  </span>
                </div>

                {/* Personal Information */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span>👤</span> Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-gray-600 uppercase mb-1">Full Name</p>
                      <p className="text-gray-800">{selectedOperator.full_name || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-600 uppercase mb-1">Email</p>
                      <p className="text-gray-800 break-all">{selectedOperator.email || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-600 uppercase mb-1">Phone</p>
                      <p className="text-gray-800">{selectedOperator.phone || "N/A"}</p>
                    </div>
                    {selectedOperator.user_id && (
                      <div>
                        <p className="text-xs font-bold text-gray-600 uppercase mb-1">User ID</p>
                        <p className="text-gray-600 text-xs font-mono">{selectedOperator.user_id}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assignment Information */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span>📍</span> Assignment Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-gray-600 uppercase mb-1">Assigned Districts</p>
                      {selectedOperator.assigned_districts && selectedOperator.assigned_districts.length > 0 ? (
                        <div className="space-y-1">
                          {selectedOperator.assigned_districts.map((district, idx) => (
                            <span key={idx} className="inline-block bg-blue-50 text-blue-800 px-2 py-1 rounded text-sm mr-1 mb-1">
                              {getDistrictDisplayName(district)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No districts assigned</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-600 uppercase mb-1">Assigned Regions</p>
                      {selectedOperator.assigned_regions && selectedOperator.assigned_regions.length > 0 ? (
                        <div className="space-y-1">
                          {selectedOperator.assigned_regions.map((region, idx) => (
                            <span key={idx} className="inline-block bg-purple-50 text-purple-800 px-2 py-1 rounded text-sm mr-1 mb-1">
                              {region}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No regions assigned</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span>📊</span> Statistics
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-600">
                      <p className="text-xs font-bold text-gray-600 uppercase mb-1">Registered Farmers</p>
                      <p className="text-2xl font-bold text-gray-800">{selectedOperator.farmer_count ?? 0}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs font-bold text-gray-600 uppercase mb-1">Account Status</p>
                      <p className="text-sm text-gray-700 mt-2">
                        {selectedOperator.is_active ? "✅ Can login and register farmers" : "⛔ Account disabled"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span>🕒</span> Timestamps
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedOperator.created_at && (
                      <div>
                        <p className="text-xs font-bold text-gray-600 uppercase mb-1">Created At</p>
                        <p className="text-gray-800 text-sm">
                          {new Date(selectedOperator.created_at).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                    {selectedOperator.updated_at && (
                      <div>
                        <p className="text-xs font-bold text-gray-600 uppercase mb-1">Last Updated</p>
                        <p className="text-gray-800 text-sm">
                          {new Date(selectedOperator.updated_at).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={() => openEditModal(selectedOperator)}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg transition shadow-lg"
                  >
                    ✏️ Edit Operator
                  </button>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-4 rounded-lg transition"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase">First Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g., John"
                      value={editFormData.first_name}
                      onChange={(e) => setEditFormData({...editFormData, first_name: e.target.value})}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase">Last Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g., Doe"
                      value={editFormData.last_name}
                      onChange={(e) => setEditFormData({...editFormData, last_name: e.target.value})}
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
                      placeholder="e.g., john@example.com"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      disabled={!editSelectedProvince && editDistricts.length === 0 && !editFormData.assigned_district}
                    >
                      <option value="">-- Select District --</option>
                      {editFormData.assigned_district && !editDistricts.some(d => d.name === editFormData.assigned_district) && (
                        <option value={editFormData.assigned_district}>{editFormData.assigned_district}</option>
                      )}
                      {editDistricts.map(d => (
                        <option key={d.code} value={d.name}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs font-bold text-gray-600 uppercase mb-2">Change Password (Optional)</p>
                  <p className="text-xs text-gray-500 mb-3">Leave blank to keep current password</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase">New Password</label>
                      <input
                        type="password"
                        placeholder="Min 8 characters (optional)"
                        value={editFormData.password}
                        onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 uppercase">Confirm New Password</label>
                      <input
                        type="password"
                        placeholder="Re-enter password (optional)"
                        value={editFormData.confirmPassword}
                        onChange={(e) => setEditFormData({...editFormData, confirmPassword: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                      />
                    </div>
                  </div>
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
