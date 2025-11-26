import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { operatorService } from "@/services/operator.service";
import geoService from "@/services/geo.service";

interface OperatorFormData {
  full_name: string;
  email: string;
  phone: string;
  assigned_regions: string[];
  assigned_districts: string[];
  is_active: boolean;
}

interface Province { code: string; name: string }
interface District { code: string; name: string }
interface OperatorDTO {
  operator_id: string;
  email: string;
  full_name: string;
  phone?: string;
  assigned_regions?: string[];
  assigned_districts?: string[];
  is_active?: boolean;
}

export default function OperatorEdit() {
  const { operatorId } = useParams<{ operatorId: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<OperatorFormData>({
    full_name: "",
    email: "",
    phone: "",
    assigned_regions: [],
    assigned_districts: [],
    is_active: true,
  });

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await loadProvinces();
      if (operatorId) {
        await fetchOperator();
      }
    })();
  }, [operatorId]);

  const loadProvinces = async () => {
    try {
      const data: Province[] = await geoService.provinces();
      setProvinces(data);
    } catch (err) {
      console.error("Failed to load provinces", err);
    }
  };

  const loadDistricts = async (provinceCode: string) => {
    try {
      const data: District[] = await geoService.districts(provinceCode);
      setDistricts(data);
    } catch (err) {
      console.error("Failed to load districts", err);
    }
  };

  const fetchOperator = async () => {
    try {
      setLoading(true);
      const op: OperatorDTO = await operatorService.getOperator(operatorId!);
      setFormData({
        full_name: op.full_name || "",
        email: op.email || "",
        phone: op.phone || "",
        assigned_regions: Array.isArray(op.assigned_regions) ? op.assigned_regions : [],
        assigned_districts: Array.isArray(op.assigned_districts) ? op.assigned_districts : [],
        is_active: op.is_active ?? true,
      });
      // Try to infer province from assigned_regions (province names)
      const provinceName = op.assigned_regions && op.assigned_regions.length > 0 ? op.assigned_regions[0] : "";
      const matchedProvince = provinces.find((p: Province) => p.name === provinceName);
      if (matchedProvince) {
        setSelectedProvince(matchedProvince.code);
        await loadDistricts(matchedProvince.code);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load operator");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!operatorId) return;
    try {
      setSaving(true);
      setError(null);
      const payload: any = {
        full_name: formData.full_name,
        phone: formData.phone,
        assigned_regions: formData.assigned_regions,
        assigned_districts: formData.assigned_districts,
        is_active: formData.is_active,
      };
      await operatorService.update(operatorId, payload);
      alert("✅ Operator updated successfully");
      navigate(`/operators/${operatorId}`);
    } catch (err: any) {
      console.error("Save operator failed", err);
      alert(err.response?.data?.detail || "Failed to save operator");
    } finally {
      setSaving(false);
    }
  };

  const toggleDistrict = (name: string) => {
    setFormData((prev: OperatorFormData) => {
      const exists = prev.assigned_districts.includes(name);
      return {
        ...prev,
        assigned_districts: exists
          ? prev.assigned_districts.filter((d: string) => d !== name)
          : [...prev.assigned_districts, name],
      };
    });
  };

  const setRegionFromProvince = (provinceName: string) => {
    setFormData((prev: OperatorFormData) => ({
      ...prev,
      assigned_regions: provinceName ? [provinceName] : [],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading operator...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">❌ {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">✏️ Edit Operator</h1>
            <p className="text-gray-600 text-sm mt-1">ID: {operatorId}</p>
          </div>
          <button
            onClick={() => navigate(`/operators/${operatorId}`)}
            className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 py-2 px-4 rounded-lg"
          >
            ← Back
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">Full Name</label>
            <input
              className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">Phone</label>
            <input
              className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">📍 Assignment</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Province</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                value={selectedProvince}
                onChange={async (e) => {
                  const code = e.target.value;
                  setSelectedProvince(code);
                  const province = provinces.find(p => p.code === code);
                  await loadDistricts(code);
                  setRegionFromProvince(province?.name || "");
                }}
              >
                <option value="">Select province</option>
                {provinces.map((p) => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Assigned Districts</label>
              <div className="border border-gray-300 rounded-lg p-3 mt-1 max-h-48 overflow-auto">
                {districts.length === 0 ? (
                  <p className="text-sm text-gray-500">Select a province to load districts</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {districts.map((d: District) => (
                      <label key={d.code} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.assigned_districts.includes(d.name)}
                          onChange={() => toggleDistrict(d.name)}
                        />
                        <span>{d.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="text-xs font-bold text-gray-600 uppercase">Status</label>
          <div className="flex items-center gap-3 mt-2">
            <button
              className={`font-bold py-2 px-4 rounded-lg transition shadow-lg ${formData.is_active ? 'bg-green-700 hover:bg-green-800 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
              onClick={() => setFormData(prev => ({ ...prev, is_active: true }))}
            >
              Active
            </button>
            <button
              className={`font-bold py-2 px-4 rounded-lg transition shadow-lg ${!formData.is_active ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
              onClick={() => setFormData(prev => ({ ...prev, is_active: false }))}
            >
              Inactive
            </button>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={() => navigate(`/operators/${operatorId}`)}
            className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 py-2 px-4 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`font-bold py-3 px-4 rounded-lg transition shadow-lg ${saving ? 'opacity-50 cursor-not-allowed' : ''} bg-green-700 hover:bg-green-800 text-white`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
