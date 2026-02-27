import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BackButton from "@/components/BackButton";
import { operatorService } from "@/services/operator.service";
import geoService from "@/services/geo.service";
import { useNotification } from '@/contexts/NotificationContext';

const getErrorMessage = (err: unknown): string => {
  if (typeof err === "object" && err !== null) {
    const error = err as Record<string, unknown>;
    if (error.response && typeof error.response === "object") {
      const response = error.response as Record<string, unknown>;
      if (response.data && typeof response.data === "object") {
        const data = response.data as Record<string, string>;
        return data.detail || "An error occurred";
      }
    }
    if (error.message && typeof error.message === "string") {
      return error.message;
    }
  }
  return "An error occurred";
};

interface Province { code: string; name: string }
interface District { code: string; name: string }

export default function OperatorEdit() {
  const { operatorId } = useParams<{ operatorId: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    assigned_district: "",
    is_active: true,
  });

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom inputs for Others option
  const [customProvince, setCustomProvince] = useState("");
  const [customDistrict, setCustomDistrict] = useState("");
  const [showCustomProvince, setShowCustomProvince] = useState(false);
  const [showCustomDistrict, setShowCustomDistrict] = useState(false);
  
  const { success: showSuccess, error: showError } = useNotification();

  useEffect(() => {
    loadProvinces();
    if (operatorId) {
      fetchOperator();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatorId]);

  const loadProvinces = async () => {
    try {
      const data = await geoService.provinces();
      setProvinces(data);
    } catch (err) {
      console.error("Failed to load provinces", err);
    }
  };

  const loadDistricts = async (provinceCode: string) => {
    try {
      const data = await geoService.districts(provinceCode);
      setDistricts(data);
    } catch (err) {
      console.error("Failed to load districts", err);
    }
  };

  const fetchOperator = async () => {
    try {
      setLoading(true);
      const op = await operatorService.getOperator(operatorId!);
      // Backend returns assigned_districts (array), we use first element
      const district = op.assigned_districts?.[0] || op.assigned_district || "";
      setFormData({
        full_name: op.full_name || "",
        email: op.email || "",
        phone: op.phone || "",
        assigned_district: district,
        is_active: op.is_active ?? true,
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleProvinceChange = async (provinceCode: string) => {
    if (provinceCode === 'OTHER') {
      setShowCustomProvince(true);
      setShowCustomDistrict(false);
      setSelectedProvince("");
      setFormData(prev => ({ ...prev, assigned_district: "" }));
      setDistricts([]);
      return;
    }
    
    setShowCustomProvince(false);
    setCustomProvince("");
    setSelectedProvince(provinceCode);
    setFormData(prev => ({ ...prev, assigned_district: "" }));
    if (provinceCode) {
      await loadDistricts(provinceCode);
    } else {
      setDistricts([]);
    }
  };
  
  const handleDistrictChange = (districtName: string) => {
    if (districtName === 'OTHER') {
      setShowCustomDistrict(true);
      setFormData(prev => ({ ...prev, assigned_district: "" }));
      return;
    }
    
    setShowCustomDistrict(false);
    setCustomDistrict("");
    setFormData(prev => ({ ...prev, assigned_district: districtName }));
  };

  const handleSave = async () => {
    if (!operatorId) return;

    if (!formData.full_name.trim() || !formData.email.trim()) {
      showError("Please fill in all required fields");
      return;
    }

    try {
      setSaving(true);
      
      // Handle custom province creation
      if (showCustomProvince && customProvince.trim()) {
        const newProvince = await geoService.createCustomProvince(customProvince.trim());
        showSuccess(`Custom province "${newProvince.name}" created successfully!`);
        
        // Reload provinces
        const allProvinces = await geoService.provinces();
        setProvinces(allProvinces);
        setSelectedProvince(newProvince.code);
        
        // Load districts for the new province
        await loadDistricts(newProvince.code);
      }
      
      // Handle custom district creation
      if (showCustomDistrict && customDistrict.trim() && selectedProvince) {
        const newDistrict = await geoService.createCustomDistrict(
          selectedProvince,
          customDistrict.trim()
        );
        formData.assigned_district = newDistrict.name;
        showSuccess(`Custom district "${newDistrict.name}" created successfully!`);
        
        // Reload districts
        const allDistricts = await geoService.districts(selectedProvince);
        setDistricts(allDistricts);
      }
      
      await operatorService.update(operatorId, formData);
      showSuccess("Operator updated successfully");
      navigate("/operators/manage");
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err) || "Failed to update operator";
      showError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-7xl mb-5">❌</div>
          <p className="text-2xl mb-6">{error}</p>
          <BackButton to="/operators/manage" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <BackButton to="/operators/manage" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">✏️ Edit Operator</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 sm:p-8 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-6 pb-2 border-b-2 border-indigo-400">
            👨‍💼 Operator Information
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Province
                </label>
                <select
                  value={showCustomProvince ? 'OTHER' : selectedProvince}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                >
                  <option value="">Select Province</option>
                  {provinces.map(p => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                  <option value="OTHER">Others - Specify</option>
                </select>
                {showCustomProvince && (
                  <input
                    type="text"
                    value={customProvince}
                    onChange={(e) => setCustomProvince(e.target.value)}
                    placeholder="Enter province name"
                    className="w-full mt-2 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Assigned District
                </label>
                <select
                  value={showCustomDistrict ? 'OTHER' : formData.assigned_district}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  disabled={showCustomProvince || (!selectedProvince && !customProvince)}
                  className={`w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${(showCustomProvince || (!selectedProvince && !customProvince)) ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <option value="">All Districts</option>
                  {districts.map(d => (
                    <option key={d.code} value={d.name}>{d.name}</option>
                  ))}
                  <option value="OTHER">Others - Specify</option>
                </select>
                {showCustomDistrict && (
                  <input
                    type="text"
                    value={customDistrict}
                    onChange={(e) => setCustomDistrict(e.target.value)}
                    placeholder="Enter district name"
                    className="w-full mt-2 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                />
                Active Operator
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-8 flex-wrap">
            <button
              type="button"
              onClick={() => navigate("/operators/manage")}
              className="flex-1 sm:flex-none px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-lg text-sm transition active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 sm:flex-none px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm transition active:scale-95"
            >
              {saving ? "⏳ Saving..." : "💾 Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
