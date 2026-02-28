import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BackButton from "@/components/BackButton";
import { farmerService } from "@/services/farmer.service";
import geoService from "@/services/geo.service";
import { handleNRCChange } from "@/utils/nrcFormatter";
import PhoneInput from "@/components/PhoneInput";
import { useNotification } from "@/contexts/NotificationContext";
import { logger } from "@/utils/logger";

const COMPONENT = "EditFarmer";

const getErrorMessage = (err: unknown): string => {
  if (typeof err === "object" && err !== null) {
    const error = err as Record<string, unknown>;
    if (error.response && typeof error.response === "object") {
      const response = error.response as Record<string, unknown>;
      if (response.data && typeof response.data === "object") {
        const data = response.data as Record<string, unknown>;
        if (data.detail && typeof data.detail === "string") return data.detail;
      }
    }
    if (error.message && typeof error.message === "string") {
      return error.message;
    }
  }
  return "An error occurred";
};

interface FarmerFormData {
  first_name: string;
  last_name: string;
  phone_primary: string;
  phone_secondary: string;
  email: string;
  nrc: string;
  date_of_birth: string;
  gender: string;
  ethnic_group: string;
  province_code: string;
  province_name: string;
  district_code: string;
  district_name: string;
  chiefdom_code: string;
  chiefdom_name: string;
  village: string;
  farm_size_hectares: string;
  crops_grown: string;
  livestock_types: string;
  has_irrigation: boolean;
  years_farming: string;
  household_size: string;
  number_of_dependents: string;
  primary_income_source: string;
}

interface Province { code: string; name: string }
interface District { code: string; name: string }
interface Chiefdom { code: string; name: string }

export default function EditFarmer() {
  const navigate = useNavigate();
  const { farmerId } = useParams<{ farmerId: string }>();
  const { success: showSuccess, error: showError } = useNotification();
  
  const [formData, setFormData] = useState<FarmerFormData>({
    first_name: "", last_name: "", phone_primary: "", phone_secondary: "",
    email: "", nrc: "", date_of_birth: "", gender: "", ethnic_group: "",
    province_code: "", province_name: "", district_code: "", district_name: "",
    chiefdom_code: "", chiefdom_name: "", village: "",
    farm_size_hectares: "", crops_grown: "", livestock_types: "",
    has_irrigation: false, years_farming: "",
    household_size: "", number_of_dependents: "", primary_income_source: "",
  });

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [chiefdoms, setChiefdoms] = useState<Chiefdom[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showCustomProvince, setShowCustomProvince] = useState(false);
  const [customProvince, setCustomProvince] = useState("");
  const [showCustomDistrict, setShowCustomDistrict] = useState(false);
  const [customDistrict, setCustomDistrict] = useState("");
  const [showCustomChiefdom, setShowCustomChiefdom] = useState(false);
  const [customChiefdom, setCustomChiefdom] = useState("");

  useEffect(() => {
    logger.info(COMPONENT, 'Component mounted', { farmerId });
    loadProvinces();
    if (farmerId) {
      fetchFarmer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId]);

  const loadProvinces = async () => {
    try {
      const data = await geoService.provinces();
      setProvinces(data);
    } catch (_err) {
      // handled silently — geo data is optional
    }
  };

  const loadDistricts = async (provinceCode: string) => {
    try {
      const data = await geoService.districts(provinceCode);
      setDistricts(data);
    } catch (_err) {
      // handled silently
    }
  };

  const loadChiefdoms = async (districtCode: string) => {
    try {
      const data = await geoService.chiefdoms(districtCode);
      setChiefdoms(data);
    } catch (_err) {
      // handled silently
    }
  };

  const fetchFarmer = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const farmer: any = await farmerService.getFarmer(farmerId!);
      
      if (farmer.address?.province_code) {
        await loadDistricts(farmer.address.province_code);
      }
      if (farmer.address?.district_code) {
        await loadChiefdoms(farmer.address.district_code);
      }

      const isCustomProvince = farmer.address?.province_code === "OTHER";
      const isCustomDistrict = farmer.address?.district_code === "OTHER";
      const isCustomChiefdom = farmer.address?.chiefdom_code === "OTHER";

      if (isCustomProvince) {
        setShowCustomProvince(true);
        setCustomProvince(farmer.address?.province_name || "");
      }
      if (isCustomDistrict) {
        setShowCustomDistrict(true);
        setCustomDistrict(farmer.address?.district_name || "");
      }
      if (isCustomChiefdom) {
        setShowCustomChiefdom(true);
        setCustomChiefdom(farmer.address?.chiefdom_name || "");
      }

      setFormData({
        first_name: farmer.personal_info?.first_name || "",
        last_name: farmer.personal_info?.last_name || "",
        phone_primary: farmer.personal_info?.phone_primary || "",
        phone_secondary: farmer.personal_info?.phone_secondary || "",
        email: farmer.personal_info?.email || "",
        nrc: farmer.personal_info?.nrc || "",
        date_of_birth: farmer.personal_info?.date_of_birth || "",
        gender: farmer.personal_info?.gender || "",
        ethnic_group: farmer.personal_info?.ethnic_group || "",
        province_code: isCustomProvince ? "OTHER" : (farmer.address?.province_code || ""),
        province_name: farmer.address?.province_name || "",
        district_code: isCustomDistrict ? "OTHER" : (farmer.address?.district_code || ""),
        district_name: farmer.address?.district_name || "",
        chiefdom_code: isCustomChiefdom ? "OTHER" : (farmer.address?.chiefdom_code || ""),
        chiefdom_name: farmer.address?.chiefdom_name || "",
        village: farmer.address?.village || "",
        farm_size_hectares: farmer.farm_info?.farm_size_hectares?.toString() || "",
        crops_grown: farmer.farm_info?.crops_grown?.join(", ") || "",
        livestock_types: farmer.farm_info?.livestock_types?.join(", ") || "",
        has_irrigation: farmer.farm_info?.has_irrigation || false,
        years_farming: farmer.farm_info?.years_farming?.toString() || "",
        household_size: farmer.household_info?.household_size?.toString() || "",
        number_of_dependents: farmer.household_info?.number_of_dependents?.toString() || "",
        primary_income_source: farmer.household_info?.primary_income_source || "",
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleProvinceChange = async (provinceCode: string) => {
    if (provinceCode === "OTHER") {
      setShowCustomProvince(true);
      setFormData(prev => ({
        ...prev, province_code: "OTHER", province_name: "",
        district_code: "", district_name: "", chiefdom_code: "", chiefdom_name: "",
      }));
      setDistricts([]);
      setChiefdoms([]);
      setShowCustomDistrict(false);
      setShowCustomChiefdom(false);
    } else {
      setShowCustomProvince(false);
      setCustomProvince("");
      const province = provinces.find(p => p.code === provinceCode);
      setFormData(prev => ({
        ...prev, province_code: provinceCode, province_name: province?.name || "",
        district_code: "", district_name: "", chiefdom_code: "", chiefdom_name: "",
      }));
      setDistricts([]);
      setChiefdoms([]);
      if (provinceCode) await loadDistricts(provinceCode);
    }
  };

  const handleDistrictChange = async (districtCode: string) => {
    if (districtCode === "OTHER") {
      setShowCustomDistrict(true);
      setFormData(prev => ({ ...prev, district_code: "OTHER", district_name: "", chiefdom_code: "", chiefdom_name: "" }));
      setChiefdoms([]);
      setShowCustomChiefdom(false);
    } else {
      setShowCustomDistrict(false);
      setCustomDistrict("");
      const district = districts.find(d => d.code === districtCode);
      setFormData(prev => ({ ...prev, district_code: districtCode, district_name: district?.name || "", chiefdom_code: "", chiefdom_name: "" }));
      setChiefdoms([]);
      if (districtCode) await loadChiefdoms(districtCode);
    }
  };

  const handleChiefdomChange = (chiefdomCode: string) => {
    if (chiefdomCode === "OTHER") {
      setShowCustomChiefdom(true);
      setFormData(prev => ({ ...prev, chiefdom_code: "OTHER", chiefdom_name: "" }));
    } else {
      setShowCustomChiefdom(false);
      setCustomChiefdom("");
      const chiefdom = chiefdoms.find(c => c.code === chiefdomCode);
      setFormData(prev => ({ ...prev, chiefdom_code: chiefdomCode, chiefdom_name: chiefdom?.name || "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    
    try {
      const cleanPhone = (phone: string) => phone.replace(/[\s\-()]/g, "");
      
      const normalizeGender = (g: string) => {
        const val = g?.toLowerCase();
        if (val === "male") return "Male";
        if (val === "female") return "Female";
        if (val === "other") return "Other";
        return "";
      };

      const finalProvinceCode = showCustomProvince ? "OTHER" : formData.province_code;
      const finalProvinceName = showCustomProvince ? customProvince : formData.province_name;
      const finalDistrictCode = showCustomDistrict ? "OTHER" : formData.district_code;
      const finalDistrictName = showCustomDistrict ? customDistrict : formData.district_name;
      const finalChiefdomCode = showCustomChiefdom ? "OTHER" : formData.chiefdom_code;
      const finalChiefdomName = showCustomChiefdom ? customChiefdom : formData.chiefdom_name;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        personal_info: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone_primary: cleanPhone(formData.phone_primary),
          nrc: formData.nrc.trim(),
          date_of_birth: formData.date_of_birth,
          gender: normalizeGender(formData.gender),
        },
        address: {
          province_code: finalProvinceCode,
          province_name: finalProvinceName,
          district_code: finalDistrictCode,
          district_name: finalDistrictName,
          chiefdom_code: finalChiefdomCode || "",
          chiefdom_name: finalChiefdomName || "",
          village: formData.village,
        },
      };
      
      // Add optional personal_info fields
      if (formData.phone_secondary) payload.personal_info.phone_secondary = cleanPhone(formData.phone_secondary);
      if (formData.email) payload.personal_info.email = formData.email;
      if (formData.ethnic_group) payload.personal_info.ethnic_group = formData.ethnic_group;
      
      // Add farm_info if any field is filled
      if (formData.farm_size_hectares || formData.crops_grown || formData.livestock_types || formData.years_farming) {
        payload.farm_info = {
          farm_size_hectares: formData.farm_size_hectares ? parseFloat(formData.farm_size_hectares) : 0,
          crops_grown: formData.crops_grown ? formData.crops_grown.split(",").map((c) => c.trim()).filter(Boolean) : [],
          livestock_types: formData.livestock_types ? formData.livestock_types.split(",").map((l) => l.trim()).filter(Boolean) : [],
          has_irrigation: formData.has_irrigation,
          years_farming: formData.years_farming ? parseInt(formData.years_farming) : 0,
        };
      }
      
      // Add household_info if any field is filled
      if (formData.household_size || formData.number_of_dependents || formData.primary_income_source) {
        payload.household_info = {
          household_size: formData.household_size ? parseInt(formData.household_size) : 1,
          number_of_dependents: formData.number_of_dependents ? parseInt(formData.number_of_dependents) : 0,
          primary_income_source: formData.primary_income_source || "Farming",
        };
      }

      await farmerService.update(farmerId!, payload);
      logger.info(COMPONENT, 'Farmer updated successfully', { farmerId });
      showSuccess('Farmer updated successfully!', 4000);
      setTimeout(() => navigate(-1), 500);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      logger.error(COMPONENT, 'Update failed', { farmerId, error: msg });
      setError(msg);
      showError(msg, 5000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 dark:border-gray-600 border-t-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading farmer data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <BackButton />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">✏️ Edit Farmer</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-12">
        {error && (
          <div className="mb-5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 border-l-4 border-l-red-500 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Personal Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-5 pb-2 border-b-2 border-indigo-400">
              👤 Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input type="text" required value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input type="text" required value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Phone Primary <span className="text-red-500">*</span>
                </label>
                <PhoneInput
                  value={formData.phone_primary}
                  onChange={(v) => setFormData(prev => ({ ...prev, phone_primary: v }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Phone Secondary
                </label>
                <PhoneInput
                  value={formData.phone_secondary}
                  onChange={(v) => setFormData(prev => ({ ...prev, phone_secondary: v }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Email</label>
                <input type="email" value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  NRC <span className="text-red-500">*</span>
                </label>
                <input type="text" required value={formData.nrc}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nrc: handleNRCChange(e.target.value) }))}
                  placeholder="123456/78/9" maxLength={12}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input type="date" required value={formData.date_of_birth}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select required value={formData.gender}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Ethnic Group</label>
                <input type="text" value={formData.ethnic_group}
                  onChange={(e) => setFormData(prev => ({ ...prev, ethnic_group: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-5 pb-2 border-b-2 border-indigo-400">
              📍 Address
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Province</label>
                <select value={formData.province_code}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                >
                  <option value="">Select Province</option>
                  {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                  <option value="OTHER">Other (Custom)</option>
                </select>
              </div>
              {showCustomProvince && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Custom Province</label>
                  <input type="text" value={customProvince}
                    onChange={(e) => setCustomProvince(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">District</label>
                <select value={formData.district_code}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  disabled={!formData.province_code}
                  className={`w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${!formData.province_code ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <option value="">Select District</option>
                  {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                  <option value="OTHER">Other (Custom)</option>
                </select>
              </div>
              {showCustomDistrict && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Custom District</label>
                  <input type="text" value={customDistrict}
                    onChange={(e) => setCustomDistrict(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Chiefdom</label>
                <select value={formData.chiefdom_code}
                  onChange={(e) => handleChiefdomChange(e.target.value)}
                  disabled={!formData.district_code}
                  className={`w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition ${!formData.district_code ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <option value="">Select Chiefdom</option>
                  {chiefdoms.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  <option value="OTHER">Other (Custom)</option>
                </select>
              </div>
              {showCustomChiefdom && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Custom Chiefdom</label>
                  <input type="text" value={customChiefdom}
                    onChange={(e) => setCustomChiefdom(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  />
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Village</label>
                <input type="text" value={formData.village}
                  onChange={(e) => setFormData(prev => ({ ...prev, village: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Farm Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-5 pb-2 border-b-2 border-indigo-400">
              🌾 Farm Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Farm Size (hectares)</label>
                <input type="number" step="0.01" value={formData.farm_size_hectares}
                  onChange={(e) => setFormData(prev => ({ ...prev, farm_size_hectares: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Years Farming</label>
                <input type="number" value={formData.years_farming}
                  onChange={(e) => setFormData(prev => ({ ...prev, years_farming: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Crops Grown <span className="text-gray-400 normal-case font-normal">(comma-separated)</span>
                </label>
                <input type="text" value={formData.crops_grown}
                  onChange={(e) => setFormData(prev => ({ ...prev, crops_grown: e.target.value }))}
                  placeholder="e.g., Maize, Beans, Cassava"
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Livestock Types <span className="text-gray-400 normal-case font-normal">(comma-separated)</span>
                </label>
                <input type="text" value={formData.livestock_types}
                  onChange={(e) => setFormData(prev => ({ ...prev, livestock_types: e.target.value }))}
                  placeholder="e.g., Cattle, Goats, Chickens"
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                  <input type="checkbox" checked={formData.has_irrigation}
                    onChange={(e) => setFormData(prev => ({ ...prev, has_irrigation: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                  />
                  Has Irrigation
                </label>
              </div>
            </div>
          </div>

          {/* Household Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-5 pb-2 border-b-2 border-indigo-400">
              🏠 Household Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Household Size</label>
                <input type="number" value={formData.household_size}
                  onChange={(e) => setFormData(prev => ({ ...prev, household_size: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Number of Dependents</label>
                <input type="number" value={formData.number_of_dependents}
                  onChange={(e) => setFormData(prev => ({ ...prev, number_of_dependents: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">Primary Income Source</label>
                <input type="text" value={formData.primary_income_source}
                  onChange={(e) => setFormData(prev => ({ ...prev, primary_income_source: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end flex-wrap pt-2">
            <button type="button" onClick={() => navigate(-1)}
              className="flex-1 sm:flex-none px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-lg text-sm transition active:scale-95"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 sm:flex-none px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm transition active:scale-95"
            >
              {saving ? "Saving..." : "💾 Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
