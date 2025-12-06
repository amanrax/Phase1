import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { operatorService } from "@/services/operator.service";
import geoService from "@/services/geo.service";

const getErrorMessage = (err: unknown): string => {
  if (typeof err === "object" && err !== null) {
    const error = err as Record<string, unknown>;
    if (error.response && typeof error.response === "object") {
      const response = error.response as Record<string, unknown>;
      if (response.data && typeof response.data === "object") {
        const data = response.data as Record<string, unknown>;
        if (data.detail) {
          if (Array.isArray(data.detail)) {
            return data.detail.map((e: {loc: string[]; msg: string}) => 
              `${e.loc.join('.')}: ${e.msg}`
            ).join(', ');
          }
          if (typeof data.detail === "string") return data.detail;
        }
      }
    }
    if (error.message && typeof error.message === "string") {
      return error.message;
    }
  }
  return "An error occurred";
};

interface Operator {
  _id: string;
  operator_id: string;
  full_name: string;
  email: string;
  phone?: string;
  is_active?: boolean;
  assigned_district?: string;
}

interface Province { code: string; name: string }
interface District { code: string; name: string }

export default function OperatorManagement() {
  const navigate = useNavigate();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    assigned_district: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedProvince, setSelectedProvince] = useState("");

  useEffect(() => {
    loadOperators();
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
      setDistricts(data);
    } catch (err) {
      console.error("Failed to load districts:", err);
    }
  };

  const handleProvinceChange = async (provinceCode: string) => {
    setSelectedProvince(provinceCode);
    setFormData(prev => ({ ...prev, assigned_district: "" }));
    if (provinceCode) {
      await loadDistricts(provinceCode);
    } else {
      setDistricts([]);
    }
  };

  const loadOperators = async () => {
    setLoading(true);
    try {
      const data = await operatorService.getOperators(100, 0);
      const operatorList = (data.results || data.operators || data || []).map(
        (op: Operator) => ({
          ...op,
          status: op.is_active ? "active" : "inactive",
        })
      );
      setOperators(operatorList);
    } catch (err) {
      console.error("Failed to load operators:", err);
      setError("Failed to load operators");
    } finally {
      setLoading(false);
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
      setShowCreateForm(false);
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
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate("/admin-dashboard")} 
              className="text-green-700 hover:text-green-800 font-bold text-sm"
            >
              ← BACK
            </button>
            <h1 className="text-2xl font-bold text-gray-800">👨‍💼 Operator Management</h1>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            + Create Operator
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border-l-4 border-red-500">
            {error}
            <button onClick={() => setError("")} className="ml-auto block text-xs hover:underline">Dismiss</button>
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm border-l-4 border-green-600">
            {success}
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">➕ Create New Operator</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase">First Name</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase">Email</label>
                  <input
                    type="email"
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
                  <label className="text-xs font-bold text-gray-600 uppercase">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase">Confirm Password</label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  Create Operator
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Operators List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
            <p className="text-gray-600 mt-4">Loading operators...</p>
          </div>
        ) : operators.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-600 text-lg">No operators found</p>
            <p className="text-gray-500 text-sm">Create a new operator to get started</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Phone</th>
                    <th className="px-6 py-3">District</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {operators.map(op => (
                    <tr key={op._id} className="hover:bg-green-50 transition">
                      <td className="px-6 py-4 font-bold">{op.full_name}</td>
                      <td className="px-6 py-4 text-xs font-mono">{op.email}</td>
                      <td className="px-6 py-4 text-sm">{op.phone || "-"}</td>
                      <td className="px-6 py-4 text-sm">{op.assigned_district || "All"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                          op.is_active !== false ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {op.is_active !== false ? "✓ Active" : "✗ Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs space-x-2">
                        <button
                          onClick={() => navigate(`/operators/${op.operator_id}`)}
                          className="text-green-600 hover:text-green-700 font-bold"
                        >
                          View
                        </button>
                        <button
                          onClick={() => navigate(`/operators/${op.operator_id}/edit`)}
                          className="text-blue-600 hover:text-blue-700 font-bold"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {operators.map(op => (
                <div key={op._id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-800 text-sm">{op.full_name}</h3>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                      op.is_active !== false ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {op.is_active !== false ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1"><strong>Email:</strong> {op.email}</p>
                  <p className="text-xs text-gray-600 mb-1"><strong>Phone:</strong> {op.phone || "-"}</p>
                  <p className="text-xs text-gray-600 mb-3"><strong>District:</strong> {op.assigned_district || "All"}</p>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => navigate(`/operators/${op.operator_id}`)}
                      className="flex-1 bg-green-100 text-green-700 hover:bg-green-200 font-bold py-1 rounded"
                    >
                      View
                    </button>
                    <button
                      onClick={() => navigate(`/operators/${op.operator_id}/edit`)}
                      className="flex-1 bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold py-1 rounded"
                    >
                      Edit
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
