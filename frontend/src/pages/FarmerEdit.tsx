import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import farmerService from '../../services/farmerService';
import { PROVINCES, DISTRICTS, CHIEFDOMS } from '../../constants';

const FarmerEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [formData, setFormData] = useState<any>({
    name: '',
    email: '',
    phone: '',
    province: '',
    district: '',
    chiefdom: '',
    // ...other fields
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Add state for "Other" fields
  const [otherProvince, setOtherProvince] = useState('');
  const [otherDistrict, setOtherDistrict] = useState('');
  const [otherChiefdom, setOtherChiefdom] = useState('');

  useEffect(() => {
    const fetchFarmer = async () => {
      try {
        const response = await farmerService.getFarmer(id!);
        setFormData(response.data);
        
        // Check if current values are "Other"
        if (response.data.province && !PROVINCES.includes(response.data.province)) {
          setOtherProvince(response.data.province);
          setFormData((prev: any) => ({ ...prev, province: 'Other' }));
        }
        if (response.data.district && !DISTRICTS.includes(response.data.district)) {
          setOtherDistrict(response.data.district);
          setFormData((prev: any) => ({ ...prev, district: 'Other' }));
        }
        if (response.data.chiefdom && !CHIEFDOMS.includes(response.data.chiefdom)) {
          setOtherChiefdom(response.data.chiefdom);
          setFormData((prev: any) => ({ ...prev, chiefdom: 'Other' }));
        }
        
        setLoading(false);
      } catch (err: any) {
        // Handle error
        setLoading(false);
      }
    };

    fetchFarmer();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Use "Other" field values if selected
      const submitData = {
        ...formData,
        province: formData.province === 'Other' ? otherProvince : formData.province,
        district: formData.district === 'Other' ? otherDistrict : formData.district,
        chiefdom: formData.chiefdom === 'Other' ? otherChiefdom : formData.chiefdom,
      };

      await farmerService.updateFarmer(id!, submitData);
      // Handle successful submission (e.g., show a success message, redirect, etc.)
    } catch (err: any) {
      // Handle error
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Farmer</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter farmer's name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter farmer's email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter farmer's phone number"
                required
              />
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Location Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Province
              </label>
              <select
                value={formData.province || ''}
                onChange={(e) => {
                  setFormData({ ...formData, province: e.target.value });
                  if (e.target.value !== 'Other') {
                    setOtherProvince('');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Province</option>
                {PROVINCES.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>
            </div>

            {formData.province === 'Other' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specify Province
                </label>
                <input
                  type="text"
                  value={otherProvince}
                  onChange={(e) => setOtherProvince(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter province name"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                District
              </label>
              <select
                value={formData.district || ''}
                onChange={(e) => {
                  setFormData({ ...formData, district: e.target.value });
                  if (e.target.value !== 'Other') {
                    setOtherDistrict('');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select District</option>
                {DISTRICTS.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>
            </div>

            {formData.district === 'Other' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specify District
                </label>
                <input
                  type="text"
                  value={otherDistrict}
                  onChange={(e) => setOtherDistrict(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter district name"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chiefdom
              </label>
              <select
                value={formData.chiefdom || ''}
                onChange={(e) => {
                  setFormData({ ...formData, chiefdom: e.target.value });
                  if (e.target.value !== 'Other') {
                    setOtherChiefdom('');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Chiefdom</option>
                {CHIEFDOMS.map((chiefdom) => (
                  <option key={chiefdom} value={chiefdom}>
                    {chiefdom}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>
            </div>

            {formData.chiefdom === 'Other' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specify Chiefdom
                </label>
                <input
                  type="text"
                  value={otherChiefdom}
                  onChange={(e) => setOtherChiefdom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter chiefdom name"
                />
              </div>
            )}

            {/* ...existing code for other location fields... */}
          </div>
        </div>

        {/* ...existing code for other sections... */}
      </form>
    </div>
  );
};

export default FarmerEdit;