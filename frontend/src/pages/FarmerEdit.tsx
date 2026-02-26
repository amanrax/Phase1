// DEAD CODE — not routed. Active edit form is EditFarmer.tsx (see App.tsx router).
// Keep for reference only. Do not delete without team review.
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import farmerService from '../services/farmer.service';
import geoService from '../services/geo.service';
import { useNotification } from '@/contexts/NotificationContext';
import { logger } from '@/utils/logger';

const COMPONENT = 'FarmerEdit';

interface FarmerData {
  farmer_id?: string;
  personal_info: {
    first_name: string;
    last_name: string;
    phone_primary: string;
    phone_secondary?: string;
    email?: string;
    nrc: string;
    date_of_birth: string;
    gender: string;
    ethnic_group?: string;
  };
  address: {
    province_code: string;
    province_name: string;
    district_code: string;
    district_name: string;
    chiefdom_code?: string;
    chiefdom_name?: string;
    village: string;
    street?: string;
    gps_latitude?: number;
    gps_longitude?: number;
  };
  farm_info?: {
    farm_size_hectares: number;
    crops_grown: string[];
    livestock_types: string[];
    has_irrigation: boolean;
    years_farming: number;
  };
  household_info?: {
    household_size: number;
    number_of_dependents: number;
    primary_income_source: string;
  };
}

interface GeoOption {
  code: string;
  name: string;
}

const inputCls =
  'w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg mt-1 ' +
  'bg-white dark:bg-gray-700 text-gray-900 dark:text-white ' +
  'focus:ring-2 focus:ring-green-500 outline-none text-sm transition';

const labelCls = 'text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide';

const sectionCls =
  'bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700';

const FarmerEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useNotification();
  const [formData, setFormData] = useState<FarmerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [provinces, setProvinces] = useState<GeoOption[]>([]);
  const [districts, setDistricts] = useState<GeoOption[]>([]);
  const [chiefdoms, setChiefdoms] = useState<GeoOption[]>([]);

  const [customProvince, setCustomProvince] = useState('');
  const [customDistrict, setCustomDistrict] = useState('');
  const [customChiefdom, setCustomChiefdom] = useState('');
  const [showCustomProvince, setShowCustomProvince] = useState(false);
  const [showCustomDistrict, setShowCustomDistrict] = useState(false);
  const [showCustomChiefdom, setShowCustomChiefdom] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        logger.info(COMPONENT, 'loadData start', { id });

        const farmer = await farmerService.getFarmer(id!);
        setFormData(farmer);
        logger.info(COMPONENT, 'loadData farmer loaded', { farmer_id: farmer.farmer_id });

        const allProvinces = await geoService.provinces();
        setProvinces(allProvinces);

        if (farmer.address.province_code) {
          const farmerDistricts = await geoService.districts(farmer.address.province_code);
          setDistricts(farmerDistricts);
          if (farmer.address.district_code) {
            const farmerChiefdoms = await geoService.chiefdoms(farmer.address.district_code);
            setChiefdoms(farmerChiefdoms);
          }
        }

        setError(null);
        logger.info(COMPONENT, 'loadData complete');
      } catch (err: any) {
        const msg = err.response?.data?.detail || 'Failed to load farmer data';
        logger.error(COMPONENT, 'loadData failed', { msg, err });
        setError(msg);
        showError(msg, 5000);
      } finally {
        setLoading(false);
      }
    };

    if (id) loadData();
  }, [id]);

  const handleProvinceChange = async (provinceCode: string) => {
    if (provinceCode === 'OTHER') {
      setShowCustomProvince(true);
      setShowCustomDistrict(false);
      setShowCustomChiefdom(false);
      setFormData(prev =>
        prev ? { ...prev, address: { ...prev.address, province_code: '', province_name: '', district_code: '', district_name: '', chiefdom_code: '', chiefdom_name: '' } } : null,
      );
      setDistricts([]);
      setChiefdoms([]);
      return;
    }
    setShowCustomProvince(false);
    setCustomProvince('');
    const selectedProvince = provinces.find(p => p.code === provinceCode);
    if (!selectedProvince) return;
    setFormData(prev =>
      prev ? { ...prev, address: { ...prev.address, province_code: selectedProvince.code, province_name: selectedProvince.name, district_code: '', district_name: '', chiefdom_code: '', chiefdom_name: '' } } : null,
    );
    try {
      const newDistricts = await geoService.districts(provinceCode);
      setDistricts(newDistricts);
      setChiefdoms([]);
      logger.info(COMPONENT, 'districts loaded', { provinceCode, count: newDistricts.length });
    } catch (err) {
      logger.warn(COMPONENT, 'Failed to load districts', { provinceCode, err });
      showError('Failed to load districts', 3000);
    }
  };

  const handleDistrictChange = async (districtCode: string) => {
    if (districtCode === 'OTHER') {
      setShowCustomDistrict(true);
      setShowCustomChiefdom(false);
      setFormData(prev =>
        prev ? { ...prev, address: { ...prev.address, district_code: '', district_name: '', chiefdom_code: '', chiefdom_name: '' } } : null,
      );
      setChiefdoms([]);
      return;
    }
    setShowCustomDistrict(false);
    setCustomDistrict('');
    const selectedDistrict = districts.find(d => d.code === districtCode);
    if (!selectedDistrict) return;
    setFormData(prev =>
      prev ? { ...prev, address: { ...prev.address, district_code: selectedDistrict.code, district_name: selectedDistrict.name, chiefdom_code: '', chiefdom_name: '' } } : null,
    );
    try {
      const newChiefdoms = await geoService.chiefdoms(districtCode);
      setChiefdoms(newChiefdoms);
      logger.info(COMPONENT, 'chiefdoms loaded', { districtCode, count: newChiefdoms.length });
    } catch (err) {
      logger.warn(COMPONENT, 'Failed to load chiefdoms', { districtCode, err });
      showError('Failed to load chiefdoms', 3000);
    }
  };

  const handleChiefdomChange = (chiefdomCode: string) => {
    if (chiefdomCode === 'OTHER') {
      setShowCustomChiefdom(true);
      setFormData(prev => prev ? { ...prev, address: { ...prev.address, chiefdom_code: '', chiefdom_name: '' } } : null);
      return;
    }
    setShowCustomChiefdom(false);
    setCustomChiefdom('');
    const selectedChiefdom = chiefdoms.find(c => c.code === chiefdomCode);
    setFormData(prev =>
      prev ? { ...prev, address: { ...prev.address, chiefdom_code: selectedChiefdom?.code || '', chiefdom_name: selectedChiefdom?.name || '' } } : null,
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    setSubmitting(true);
    setError(null);
    logger.info(COMPONENT, 'handleSubmit start', { id });

    try {
      if (showCustomProvince && customProvince.trim()) {
        const newProvince = await geoService.createCustomProvince(customProvince.trim());
        formData.address.province_code = newProvince.code;
        formData.address.province_name = newProvince.name;
        const allProvinces = await geoService.provinces();
        setProvinces(allProvinces);
        logger.info(COMPONENT, 'custom province created', { code: newProvince.code });
      }
      if (showCustomDistrict && customDistrict.trim() && formData.address.province_code) {
        const newDistrict = await geoService.createCustomDistrict(formData.address.province_code, customDistrict.trim());
        formData.address.district_code = newDistrict.code;
        formData.address.district_name = newDistrict.name;
        const allDistricts = await geoService.districts(formData.address.province_code);
        setDistricts(allDistricts);
        logger.info(COMPONENT, 'custom district created', { code: newDistrict.code });
      }
      if (showCustomChiefdom && customChiefdom.trim() && formData.address.district_code) {
        const newChiefdom = await geoService.createCustomChiefdom(formData.address.district_code, customChiefdom.trim());
        formData.address.chiefdom_code = newChiefdom.code;
        formData.address.chiefdom_name = newChiefdom.name;
        const allChiefdoms = await geoService.chiefdoms(formData.address.district_code);
        setChiefdoms(allChiefdoms);
        logger.info(COMPONENT, 'custom chiefdom created', { code: newChiefdom.code });
      }

      await farmerService.update(id!, formData);
      logger.info(COMPONENT, 'handleSubmit success', { id });
      showSuccess('Farmer updated successfully!', 4000);
      navigate(`/farmers/${id}`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update farmer';
      logger.error(COMPONENT, 'handleSubmit failed', { id, msg, err });
      setError(msg);
      showError(msg, 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const updatePersonalInfo = (field: string, value: any) =>
    setFormData(prev => prev ? { ...prev, personal_info: { ...prev.personal_info, [field]: value } } : null);

  const updateAddress = (field: string, value: any) =>
    setFormData(prev => prev ? { ...prev, address: { ...prev.address, [field]: value } } : null);

  const updateFarmInfo = (field: string, value: any) =>
    setFormData(prev => prev ? { ...prev, farm_info: { ...prev.farm_info!, [field]: value } } : null);

  const updateHouseholdInfo = (field: string, value: any) =>
    setFormData(prev => prev ? { ...prev, household_info: { ...prev.household_info!, [field]: value } } : null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-300 dark:border-gray-600 border-t-green-600 rounded-full animate-spin mx-auto mb-5" />
          <p className="text-base text-gray-600 dark:text-gray-400">Loading farmer data...</p>
        </div>
      </div>
    );
  }

  if (error && !formData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-md max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-red-600 dark:text-red-400 font-semibold mb-6">{error}</p>
          <button onClick={() => navigate(-1)} className="px-6 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg font-semibold transition">
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!formData) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 fade-in">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">Edit Farmer</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Farmer ID: {formData.farmer_id || id}</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
          {/* Honeypot */}
          <input type="text" name="username" className="hidden" tabIndex={-1} readOnly />
          <input type="password" name="password" className="hidden" tabIndex={-1} readOnly />

          {/* Personal Information */}
          <div className={sectionCls}>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">👤 Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>First Name *</label>
                <input type="text" value={formData.personal_info.first_name} onChange={e => updatePersonalInfo('first_name', e.target.value)} className={inputCls} autoComplete="off" required />
              </div>
              <div>
                <label className={labelCls}>Last Name *</label>
                <input type="text" value={formData.personal_info.last_name} onChange={e => updatePersonalInfo('last_name', e.target.value)} className={inputCls} autoComplete="off" required />
              </div>
              <div>
                <label className={labelCls}>Primary Phone *</label>
                <input type="text" value={formData.personal_info.phone_primary} onChange={e => updatePersonalInfo('phone_primary', e.target.value)} className={inputCls} placeholder="+260977123456" autoComplete="off" required />
              </div>
              <div>
                <label className={labelCls}>Secondary Phone</label>
                <input type="text" value={formData.personal_info.phone_secondary || ''} onChange={e => updatePersonalInfo('phone_secondary', e.target.value || undefined)} className={inputCls} placeholder="+260977123456" autoComplete="off" />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={formData.personal_info.email || ''} onChange={e => updatePersonalInfo('email', e.target.value || undefined)} className={inputCls} placeholder="farmer@example.com" autoComplete="off" />
              </div>
              <div>
                <label className={labelCls}>NRC Number *</label>
                <input type="text" value={formData.personal_info.nrc} onChange={e => updatePersonalInfo('nrc', e.target.value)} className={inputCls} placeholder="123456/12/1" autoComplete="off" required />
              </div>
              <div>
                <label className={labelCls}>Date of Birth *</label>
                <input type="date" value={formData.personal_info.date_of_birth} onChange={e => updatePersonalInfo('date_of_birth', e.target.value)} className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Gender *</label>
                <select value={formData.personal_info.gender} onChange={e => updatePersonalInfo('gender', e.target.value)} className={inputCls} required>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Ethnic Group</label>
                <input type="text" value={formData.personal_info.ethnic_group || ''} onChange={e => updatePersonalInfo('ethnic_group', e.target.value || undefined)} className={inputCls} autoComplete="off" />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className={sectionCls}>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">📍 Address Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Province *</label>
                <select value={showCustomProvince ? 'OTHER' : formData.address.province_code} onChange={e => handleProvinceChange(e.target.value)} className={inputCls} required={!showCustomProvince}>
                  <option value="">Select Province</option>
                  {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                  <option value="OTHER">Others – Specify</option>
                </select>
                {showCustomProvince && (
                  <input type="text" value={customProvince} onChange={e => setCustomProvince(e.target.value)} placeholder="Enter province name" className={`${inputCls} mt-2`} autoComplete="off" required />
                )}
              </div>
              <div>
                <label className={labelCls}>District *</label>
                <select value={showCustomDistrict ? 'OTHER' : formData.address.district_code} onChange={e => handleDistrictChange(e.target.value)} className={inputCls} required={!showCustomDistrict} disabled={showCustomProvince || (!formData.address.province_code && !customProvince)}>
                  <option value="">Select District</option>
                  {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                  <option value="OTHER">Others – Specify</option>
                </select>
                {showCustomDistrict && (
                  <input type="text" value={customDistrict} onChange={e => setCustomDistrict(e.target.value)} placeholder="Enter district name" className={`${inputCls} mt-2`} autoComplete="off" required />
                )}
              </div>
              <div>
                <label className={labelCls}>Chiefdom</label>
                <select value={showCustomChiefdom ? 'OTHER' : (formData.address.chiefdom_code || '')} onChange={e => handleChiefdomChange(e.target.value)} className={inputCls} disabled={showCustomDistrict || (!formData.address.district_code && !customDistrict)}>
                  <option value="">Select Chiefdom (Optional)</option>
                  {chiefdoms.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  <option value="OTHER">Others – Specify</option>
                </select>
                {showCustomChiefdom && (
                  <input type="text" value={customChiefdom} onChange={e => setCustomChiefdom(e.target.value)} placeholder="Enter chiefdom name" className={`${inputCls} mt-2`} autoComplete="off" />
                )}
              </div>
              <div>
                <label className={labelCls}>Village *</label>
                <input type="text" value={formData.address.village} onChange={e => updateAddress('village', e.target.value)} className={inputCls} autoComplete="off" required />
              </div>
              <div>
                <label className={labelCls}>Street</label>
                <input type="text" value={formData.address.street || ''} onChange={e => updateAddress('street', e.target.value || undefined)} className={inputCls} autoComplete="off" />
              </div>
              <div>
                <label className={labelCls}>GPS Latitude</label>
                <input type="number" step="0.000001" value={formData.address.gps_latitude || ''} onChange={e => updateAddress('gps_latitude', e.target.value ? parseFloat(e.target.value) : undefined)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>GPS Longitude</label>
                <input type="number" step="0.000001" value={formData.address.gps_longitude || ''} onChange={e => updateAddress('gps_longitude', e.target.value ? parseFloat(e.target.value) : undefined)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Farm Information */}
          {formData.farm_info && (
            <div className={sectionCls}>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">🌾 Farm Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Farm Size (Hectares) *</label>
                  <input type="number" step="0.01" value={formData.farm_info.farm_size_hectares} onChange={e => updateFarmInfo('farm_size_hectares', parseFloat(e.target.value))} className={inputCls} required />
                </div>
                <div>
                  <label className={labelCls}>Years Farming *</label>
                  <input type="number" value={formData.farm_info.years_farming} onChange={e => updateFarmInfo('years_farming', parseInt(e.target.value))} className={inputCls} required />
                </div>
                <div>
                  <label className={labelCls}>Crops Grown</label>
                  <input type="text" value={formData.farm_info.crops_grown.join(', ')} onChange={e => updateFarmInfo('crops_grown', e.target.value.split(',').map(s => s.trim()))} className={inputCls} placeholder="Maize, Wheat, Rice" autoComplete="off" />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Comma-separated</p>
                </div>
                <div>
                  <label className={labelCls}>Livestock Types</label>
                  <input type="text" value={formData.farm_info.livestock_types.join(', ')} onChange={e => updateFarmInfo('livestock_types', e.target.value.split(',').map(s => s.trim()))} className={inputCls} placeholder="Cattle, Goats, Chickens" autoComplete="off" />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Comma-separated</p>
                </div>
                <div>
                  <label className={labelCls}>Has Irrigation</label>
                  <select value={formData.farm_info.has_irrigation ? 'true' : 'false'} onChange={e => updateFarmInfo('has_irrigation', e.target.value === 'true')} className={inputCls}>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Household Information */}
          {formData.household_info && (
            <div className={sectionCls}>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">🏠 Household Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Household Size *</label>
                  <input type="number" value={formData.household_info.household_size} onChange={e => updateHouseholdInfo('household_size', parseInt(e.target.value))} className={inputCls} required />
                </div>
                <div>
                  <label className={labelCls}>Number of Dependents *</label>
                  <input type="number" value={formData.household_info.number_of_dependents} onChange={e => updateHouseholdInfo('number_of_dependents', parseInt(e.target.value))} className={inputCls} required />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Primary Income Source *</label>
                  <input type="text" value={formData.household_info.primary_income_source} onChange={e => updateHouseholdInfo('primary_income_source', e.target.value)} className={inputCls} autoComplete="off" required />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="submit" disabled={submitting} className="flex-1 sm:flex-none bg-green-700 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition shadow-md text-sm">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                  Saving...
                </span>
              ) : '💾 Save Changes'}
            </button>
            <button type="button" onClick={() => navigate(`/farmers/${id}`)} className="flex-1 sm:flex-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 px-6 rounded-lg transition text-sm">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FarmerEdit;
