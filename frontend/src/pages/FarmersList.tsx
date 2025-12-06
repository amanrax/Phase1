import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { farmerService } from "@/services/farmer.service";

interface Farmer {
  _id: string;
  farmer_id: string;
  personal_info?: {
    first_name?: string;
    last_name?: string;
    phone_primary?: string;
  };
  full_name?: string;
  phone?: string;
  address?: {
    village?: string;
    district_name?: string;
  };
  district?: string;
  registration_status?: string;
  created_at?: string;
  is_active: boolean;
}

export default function FarmersList() {
  const navigate = useNavigate();
  const [allFarmers, setAllFarmers] = useState<Farmer[]>([]);
  const [filteredFarmers, setFilteredFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "pending" | "inactive">("all");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [reviewStatus, setReviewStatus] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    fetchAllFarmers();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [filter, allFarmers]);

  const fetchAllFarmers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await farmerService.getFarmers(1000, 0);
      const farmerList = Array.isArray(data) ? data : (data.results || data || []);
      setAllFarmers(farmerList);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error("Fetch farmers error:", err);
      setError(err.response?.data?.detail || "Failed to load farmers");
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    let filtered = allFarmers;
    
    if (filter === "active") {
      filtered = filtered.filter((f: any) => f.is_active && f.registration_status === "registered");
    } else if (filter === "pending") {
      filtered = filtered.filter((f: any) => f.registration_status === "pending");
    } else if (filter === "inactive") {
      filtered = filtered.filter((f: any) => !f.is_active);
    }
    
    setFilteredFarmers(filtered);
  };

  const getFilterCount = (filterType: string) => {
    if (filterType === "all") return allFarmers.length;
    if (filterType === "active") return allFarmers.filter((f: any) => f.is_active && f.registration_status === "registered").length;
    if (filterType === "pending") return allFarmers.filter((f: any) => f.registration_status === "pending").length;
    if (filterType === "inactive") return allFarmers.filter((f: any) => !f.is_active).length;
    return 0;
  };

  const getFarmerName = (farmer: Farmer) => {
    if (farmer.full_name) return farmer.full_name;
    if (farmer.personal_info?.first_name && farmer.personal_info?.last_name) {
      return `${farmer.personal_info.first_name} ${farmer.personal_info.last_name}`;
    }
    if (farmer.personal_info?.first_name) return farmer.personal_info.first_name;
    return "Unknown";
  };

  const getFarmerPhone = (farmer: Farmer) => {
    return farmer.phone || farmer.personal_info?.phone_primary || "-";
  };

  const getFarmerDistrict = (farmer: Farmer) => {
    return farmer.district || farmer.address?.district_name || "Unknown";
  };

  const getStatusColor = (status: string, isActive: boolean) => {
    if (!isActive) return "bg-gray-100 text-gray-800";
    if (status === "registered") return "bg-green-100 text-green-800";
    if (status === "pending") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const handleReviewClick = (farmer: Farmer) => {
    setSelectedFarmer(farmer);
    setReviewStatus(farmer.registration_status || "");
    setRemarks("");
    setShowReviewModal(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedFarmer) return;
    try {
      // TODO: Call API to update farmer status
      console.log(`Updating farmer ${selectedFarmer.farmer_id} to ${reviewStatus} with remarks: ${remarks}`);
      setShowReviewModal(false);
      fetchAllFarmers();
    } catch (err) {
      console.error("Failed to update farmer status:", err);
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
            <h1 className="text-2xl font-bold text-gray-800">👨‍🌾 All Farmers</h1>
          </div>
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

        {/* Filter Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-2 flex gap-2 overflow-x-auto">
          {["all", "active", "pending", "inactive"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition ${
                filter === f ? "bg-green-700 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({getFilterCount(f)})
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
            <p className="text-gray-600 mt-4">Loading farmers...</p>
          </div>
        ) : filteredFarmers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-600 text-lg">No farmers found</p>
            <p className="text-gray-500 text-sm">Try changing the filter</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">Farmer ID</th>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Phone</th>
                    <th className="px-6 py-3">District</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredFarmers.map(farmer => (
                    <tr key={farmer._id} className="hover:bg-green-50 transition">
                      <td className="px-6 py-4 font-mono font-bold text-xs">{farmer.farmer_id}</td>
                      <td className="px-6 py-4 font-bold">{getFarmerName(farmer)}</td>
                      <td className="px-6 py-4 text-xs">{getFarmerPhone(farmer)}</td>
                      <td className="px-6 py-4 text-sm">{getFarmerDistrict(farmer)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(farmer.registration_status || "", farmer.is_active)}`}>
                          {farmer.is_active ? (farmer.registration_status === "registered" ? "✓ Registered" : "⏳ Pending") : "✗ Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">{farmer.created_at ? new Date(farmer.created_at).toLocaleDateString() : "-"}</td>
                      <td className="px-6 py-4 text-xs space-x-2">
                        <button
                          onClick={() => navigate(`/farmers/${farmer.farmer_id}`)}
                          className="text-green-600 hover:text-green-700 font-bold"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleReviewClick(farmer)}
                          className="text-orange-600 hover:text-orange-700 font-bold"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {filteredFarmers.map(farmer => (
                <div key={farmer._id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-800 text-sm">{getFarmerName(farmer)}</h3>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(farmer.registration_status || "", farmer.is_active)}`}>
                      {farmer.is_active ? (farmer.registration_status === "registered" ? "Registered" : "Pending") : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1"><strong>ID:</strong> {farmer.farmer_id}</p>
                  <p className="text-xs text-gray-600 mb-1"><strong>Phone:</strong> {getFarmerPhone(farmer)}</p>
                  <p className="text-xs text-gray-600 mb-1"><strong>District:</strong> {getFarmerDistrict(farmer)}</p>
                  <p className="text-xs text-gray-600 mb-3"><strong>Registered:</strong> {farmer.created_at ? new Date(farmer.created_at).toLocaleDateString() : "-"}</p>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => navigate(`/farmers/${farmer.farmer_id}`)}
                      className="flex-1 bg-green-100 text-green-700 hover:bg-green-200 font-bold py-1 rounded transition"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleReviewClick(farmer)}
                      className="flex-1 bg-orange-100 text-orange-700 hover:bg-orange-200 font-bold py-1 rounded transition"
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Total Count */}
        {!loading && filteredFarmers.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-600">
            Showing {filteredFarmers.length} farmer{filteredFarmers.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Review Status Modal */}
      {showReviewModal && selectedFarmer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="border-b border-gray-200 p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Review Farmer Status</h2>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase mb-1">Farmer</p>
                <p className="font-bold text-gray-800">{getFarmerName(selectedFarmer)}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Status <span className="text-red-500">*</span></label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                >
                  <option value="">-- Select Status --</option>
                  <option value="pending">Pending Review</option>
                  <option value="registered">Registered (Approved)</option>
                  <option value="rejected">Rejected</option>
                  <option value="under_verification">Under Verification</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any notes or comments..."
                  className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm h-24 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={handleStatusUpdate}
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2 rounded-lg transition"
                >
                  Update Status
                </button>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
