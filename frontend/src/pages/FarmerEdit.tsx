import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import farmerService from '../services/farmer.service';
import geoService from '../services/geo.service';
import { useNotification } from '@/components/Notification';

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

const FarmerEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useNotification();
  const [formData, setFormData] = useState<FarmerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Geo data
  const [provinces, setProvinces] = useState<GeoOption[]>([]);
  const [districts, setDistricts] = useState<GeoOption[]>([]);
  const [chiefdoms, setChiefdoms] = useState<GeoOption[]>([]);
  
  // Custom input fields
  const [customProvince, setCustomProvince] = useState('');
  const [customDistrict, setCustomDistrict] = useState('');
  const [customChiefdom, setCustomChiefdom] = useState('');
  const [showCustomProvince, setShowCustomProvince] = useState(false);
  const [showCustomDistrict, setShowCustomDistrict] = useState(false);
  const [showCustomChiefdom, setShowCustomChiefdom] = useState(false);

  // Load farmer data and all geo data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load farmer
        const farmer = await farmerService.getFarmer(id!);
        setFormData(farmer);
        
        // Load all provinces
        const allProvinces = await geoService.provinces();
        setProvinces(allProvinces);
        
        // If farmer has province, load its districts
        if (farmer.address.province_code) {
          const farmerDistricts = await geoService.districts(farmer.address.province_code);
          setDistricts(farmerDistricts);
          
          // If farmer has district, load its chiefdoms
          if (farmer.address.district_code) {
            const farmerChiefdoms = await geoService.chiefdoms(farmer.address.district_code);
            setChiefdoms(farmerChiefdoms);
          }
        }
        
        setError(null);
      } catch (err: any) {
        console.error('Load error:', err);
        setError(err.response?.data?.detail || 'Failed to load data');
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
      setFormData(prev => prev ? {
        ...prev,
        address: {
          ...prev.address,
          province_code: '',
          province_name: '',
          district_code: '',
          district_name: '',
          chiefdom_code: '',
          chiefdom_name: ''
        }
      } : null);
      setDistricts([]);
      setChiefdoms([]);
      return;
    }
    
    setShowCustomProvince(false);
    setCustomProvince('');
    
    const selectedProvince = provinces.find(p => p.code === provinceCode);
    if (!selectedProvince) return;
    
    setFormData(prev => prev ? {
      ...prev,
      address: {
        ...prev.address,
        province_code: selectedProvince.code,
        province_name: selectedProvince.name,
        district_code: '',
        district_name: '',
        chiefdom_code: '',
        chiefdom_name: ''
      }
    } : null);
    
    // Load districts for new province
    try {
      const newDistricts = await geoService.districts(provinceCode);
      setDistricts(newDistricts);
      setChiefdoms([]);
    } catch (err) {
      console.error('Failed to load districts:', err);
    }
  };

  const handleDistrictChange = async (districtCode: string) => {
    if (districtCode === 'OTHER') {
      setShowCustomDistrict(true);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setSubmitting(true);
    setError(null);

    try {
      // Handle custom province creation
      if (showCustomProvince && customProvince.trim()) {
        const newProvince = await geoService.createCustomProvince(customProvince.trim());
        formData.address.province_code = newProvince.code;
        formData.address.province_name = newProvince.name;
        showSuccess(`Custom province "${newProvince.name}" created successfully!`);
        
        // Reload provinces to include the new one
        const allProvinces = await geoService.provinces();
        setProvinces(allProvinces);
      }
      
      // Handle custom district creation
      if (showCustomDistrict && customDistrict.trim() && formData.address.province_code) {
        const newDistrict = await geoService.createCustomDistrict(
          formData.address.province_code,
          customDistrict.trim()
        );
        formData.address.district_code = newDistrict.code;
        formData.address.district_name = newDistrict.name;
        showSuccess(`Custom district "${newDistrict.name}" created successfully!`);
        
        // Reload districts to include the new one
        const allDistricts = await geoService.districts(formData.address.province_code);
        setDistricts(allDistricts);
      }
      
      // Handle custom chiefdom creation
      if (showCustomChiefdom && customChiefdom.trim() && formData.address.district_code) {
        const newChiefdom = await geoService.createCustomChiefdom(
          formData.address.district_code,
          customChiefdom.trim()
        );
        formData.address.chiefdom_code = newChiefdom.code;
        formData.address.chiefdom_name = newChiefdom.name;
        showSuccess(`Custom chiefdom "${newChiefdom.name}" created successfully!`);
        
        // Reload chiefdoms to include the new one
        const allChiefdoms = await geoService.chiefdoms(formData.address.district_code);
        setChiefdoms(allChiefdoms);
      }
      
      await farmerService.update(id!, formData);
      showSuccess('Farmer updated successfully!');
      navigate(`/farmers/${id}`);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to update farmer';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };setCustomDistrict('');
    
    const selectedDistrict = districts.find(d => d.code === districtCode);
    if (!selectedDistrict) return;
    
    setFormData(prev => prev ? {
      ...prev,
      address: {
        ...prev.address,
        district_code: selectedDistrict.code,
        district_name: selectedDistrict.name,
        chiefdom_code: '',
        chiefdom_name: ''
      }
    } : null);
    
    // Load chiefdoms for new district
    try {
      const newChiefdoms = await geoService.chiefdoms(districtCode);
      setChiefdoms(newChiefdoms);
    } catch (err) {
      console.error('Failed to load chiefdoms:', err);
    }
  };

  const handleChiefdomChange = (chiefdomCode: string) => {
    if (chiefdomCode === 'OTHER') {
      setShowCustomChiefdom(true);
      setFormData(prev => prev ? {
        ...prev,
        address: {
          ...prev.address,
          chiefdom_code: '',
          chiefdom_name: ''
        }
      } : null);
      return;
    }
    
    setShowCustomChiefdom(false);
    setCustomChiefdom('');
    
    const selectedChiefdom = chiefdoms.find(c => c.code === chiefdomCode);
    
    setFormData(prev => prev ? {
      ...prev,
      address: {
        ...prev.address,
        chiefdom_code: selectedChiefdom?.code || '',
        chiefdom_name: selectedChiefdom?.name || ''
      }
    } : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setSubmitting(true);
    setError(null);

    try {
      // Handle custom province creation
      if (showCustomProvince && customProvince.trim()) {
        const newProvince = await geoService.createCustomProvince(customProvince.trim());
        formData.address.province_code = newProvince.code;
        formData.address.province_name = newProvince.name;
        
        // Reload provinces to include the new one
        const allProvinces = await geoService.provinces();
        setProvinces(allProvinces);
      }
      
      // Handle custom district creation
      if (showCustomDistrict && customDistrict.trim() && formData.address.province_code) {
        const newDistrict = await geoService.createCustomDistrict(
          formData.address.province_code,
          customDistrict.trim()
        );
        formData.address.district_code = newDistrict.code;
        formData.address.district_name = newDistrict.name;
        
        // Reload districts to include the new one
        const allDistricts = await geoService.districts(formData.address.province_code);
        setDistricts(allDistricts);
      }
      
      // Handle custom chiefdom creation
      if (showCustomChiefdom && customChiefdom.trim() && formData.address.district_code) {
        const newChiefdom = await geoService.createCustomChiefdom(
          formData.address.district_code,
          customChiefdom.trim()
        );
        formData.address.chiefdom_code = newChiefdom.code;
        formData.address.chiefdom_name = newChiefdom.name;
        
        // Reload chiefdoms to include the new one
        const allChiefdoms = await geoService.chiefdoms(formData.address.district_code);
        setChiefdoms(allChiefdoms);
      }
      
      await farmerService.update(id!, formData);
      alert('Farmer updated successfully!');
      navigate(`/farmers/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update farmer');
    } finally {
      setSubmitting(false);
    }
  };

  const updatePersonalInfo = (field: string, value: any) => {
    setFormData(prev => prev ? {
      ...prev,
      personal_info: { ...prev.personal_info, [field]: value }
    } : null);
  };

  const updateAddress = (field: string, value: any) => {
    setFormData(prev => prev ? {
      ...prev,
      address: { ...prev.address, [field]: value }
    } : null);
  };

  const updateFarmInfo = (field: string, value: any) => {
    setFormData(prev => prev ? {
      ...prev,
      farm_info: { ...prev.farm_info!, [field]: value }
    } : null);
  };

  const updateHouseholdInfo = (field: string, value: any) => {
    setFormData(prev => prev ? {
      ...prev,
      household_info: { ...prev.household_info!, [field]: value }
    } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading farmer data...</div>
      </div>
    );
  }

  if (error && !formData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!formData) return null;

  return (
    <div className="max-w-6xl mx-auto p-6 fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Edit Farmer</h1>
        <p className="text-sm text-gray-500">Farmer ID: {formData.farmer_id || id}</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">First Name *</label>
              <input
                type="text"
                value={formData.personal_info.first_name}
                onChange={(e) => updatePersonalInfo('first_name', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Last Name *</label>
              <input
                type="text"
                value={formData.personal_info.last_name}
                onChange={(e) => updatePersonalInfo('last_name', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Primary Phone *</label>
              <input
                type="text"
                value={formData.personal_info.phone_primary}
                onChange={(e) => updatePersonalInfo('phone_primary', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="+260977123456"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Secondary Phone</label>
              <input
                type="text"
                value={formData.personal_info.phone_secondary || ''}
                onChange={(e) => updatePersonalInfo('phone_secondary', e.target.value || undefined)}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="+260977123456"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Email</label>
              <input
                type="email"
                value={formData.personal_info.email || ''}
                onChange={(e) => updatePersonalInfo('email', e.target.value || undefined)}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="farmer@example.com"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">NRC Number *</label>
              <input
                type="text"
                value={formData.personal_info.nrc}
                onChange={(e) => updatePersonalInfo('nrc', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="123456/12/1"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Date of Birth *</label>
              <input
                type="date"
                value={formData.personal_info.date_of_birth}
                onChange={(e) => updatePersonalInfo('date_of_birth', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Gender *</label>
              <select
                value={formData.personal_info.gender}
                onChange={(e) => updatePersonalInfo('gender', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                required
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Ethnic Group</label>
              <input
                type="text"
                value={formData.personal_info.ethnic_group || ''}
                onChange={(e) => updatePersonalInfo('ethnic_group', e.target.value || undefined)}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Address Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Province *</label>
              <select
                value={showCustomProvince ? 'OTHER' : formData.address.province_code}
                onChange={(e) => handleProvinceChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                required={!showCustomProvince}
              >
                <option value="">Select Province</option>
                {provinces.map((province) => (
                  <option key={province.code} value={province.code}>
                    {province.name}
                  </option>
                ))}
                <option value="OTHER">Others - Specify</option>
              </select>
              {showCustomProvince && (
                <input
                  type="text"
                  value={customProvince}
                  onChange={(e) => setCustomProvince(e.target.value)}
                  placeholder="Enter province name"
                  className="w-full p-3 border border-gray-300 rounded-lg mt-2 focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">District *</label>
              <select
                value={showCustomDistrict ? 'OTHER' : formData.address.district_code}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                required={!showCustomDistrict}
                disabled={showCustomProvince || (!formData.address.province_code && !customProvince)}
              >
                <option value="">Select District</option>
                {districts.map((district) => (
                  <option key={district.code} value={district.code}>
                    {district.name}
                  </option>
                ))}
                <option value="OTHER">Others - Specify</option>
              </select>
              {showCustomDistrict && (
                <input
                  type="text"
                  value={customDistrict}
                  onChange={(e) => setCustomDistrict(e.target.value)}
                  placeholder="Enter district name"
                  className="w-full p-3 border border-gray-300 rounded-lg mt-2 focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Chiefdom</label>
              <select
                value={showCustomChiefdom ? 'OTHER' : (formData.address.chiefdom_code || '')}
                onChange={(e) => handleChiefdomChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                disabled={showCustomDistrict || (!formData.address.district_code && !customDistrict)}
              >
                <option value="">Select Chiefdom (Optional)</option>
                {chiefdoms.map((chiefdom) => (
                  <option key={chiefdom.code} value={chiefdom.code}>
                    {chiefdom.name}
                  </option>
                ))}
                <option value="OTHER">Others - Specify</option>
              </select>
              {showCustomChiefdom && (
                <input
                  type="text"
                  value={customChiefdom}
                  onChange={(e) => setCustomChiefdom(e.target.value)}
                  placeholder="Enter chiefdom name"
                  className="w-full p-3 border border-gray-300 rounded-lg mt-2 focus:ring-2 focus:ring-green-500 outline-none"
                />
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Village *</label>
              <input
                type="text"
                value={formData.address.village}
                onChange={(e) => updateAddress('village', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Street</label>
              <input
                type="text"
                value={formData.address.street || ''}
                onChange={(e) => updateAddress('street', e.target.value || undefined)}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">GPS Latitude</label>
              <input
                type="number"
                step="0.000001"
                value={formData.address.gps_latitude || ''}
                onChange={(e) => updateAddress('gps_latitude', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">GPS Longitude</label>
              <input
                type="number"
                step="0.000001"
                value={formData.address.gps_longitude || ''}
                onChange={(e) => updateAddress('gps_longitude', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Farm Information */}
        {formData.farm_info && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Farm Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Farm Size (Hectares) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.farm_info.farm_size_hectares}
                  onChange={(e) => updateFarmInfo('farm_size_hectares', parseFloat(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Years Farming *</label>
                <input
                  type="number"
                  value={formData.farm_info.years_farming}
                  onChange={(e) => updateFarmInfo('years_farming', parseInt(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Crops Grown</label>
                <input
                  type="text"
                  value={formData.farm_info.crops_grown.join(', ')}
                  onChange={(e) => updateFarmInfo('crops_grown', e.target.value.split(',').map(s => s.trim()))}
                  className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="Maize, Wheat, Rice"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Livestock Types</label>
                <input
                  type="text"
                  value={formData.farm_info.livestock_types.join(', ')}
                  onChange={(e) => updateFarmInfo('livestock_types', e.target.value.split(',').map(s => s.trim()))}
                  className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="Cattle, Goats, Chickens"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Has Irrigation</label>
                <select
                  value={formData.farm_info.has_irrigation ? 'true' : 'false'}
                  onChange={(e) => updateFarmInfo('has_irrigation', e.target.value === 'true')}
                  className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Household Information */}
        {formData.household_info && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Household Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Household Size *</label>
                <input
                  type="number"
                  value={formData.household_info.household_size}
                  onChange={(e) => updateHouseholdInfo('household_size', parseInt(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Number of Dependents *</label>
                <input
                  type="number"
                  value={formData.household_info.number_of_dependents}
                  onChange={(e) => updateHouseholdInfo('number_of_dependents', parseInt(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-600 uppercase">Primary Income Source *</label>
                <input
                  type="text"
                  value={formData.household_info.primary_income_source}
                  onChange={(e) => updateHouseholdInfo('primary_income_source', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/farmers/${id}`)}
            className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold py-3 px-6 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default FarmerEdit;