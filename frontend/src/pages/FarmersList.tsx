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
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "pending" | "inactive">("all");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [reviewStatus, setReviewStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [updating, setUpdating] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(20);
  const [totalFarmers, setTotalFarmers] = useState(0);

  useEffect(() => {
    loadFarmers(0);
  }, []);

  useEffect(() => {
    applyFilter();
  }, [filter, allFarmers]);

  const loadFarmers = async (page = 0) => {
    setLoading(true);
    setError("");
    try {
      const skip = page * pageSize;
      if (import.meta.env.DEV) console.log(`Fetching farmers... skip=${skip}, limit=${pageSize}`);
      
      // Backend limit max is 100, so use that instead of 1000
      const data = await farmerService.getFarmers(pageSize, skip);
      if (import.meta.env.DEV) console.log("Farmers response:", data);
      
      // Handle different response structures
      let farmerList: Farmer[] = [];
      if (Array.isArray(data)) {
        farmerList = data;
      } else if (data?.results && Array.isArray(data.results)) {
        farmerList = data.results;
      } else if (data?.farmers && Array.isArray(data.farmers)) {
        farmerList = data.farmers;
      } else if (data && typeof data === 'object') {
        farmerList = [];
      }
      if (import.meta.env.DEV) console.log("Processed farmer list:", farmerList);
      
      setAllFarmers(farmerList);
      setTotalFarmers(farmerList.length);
      setCurrentPage(page);
    } catch (err: any) {
      console.error("Fetch farmers error:", err);
      const errorMsg = err.response?.data?.detail || err.message || "Failed to load farmers";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllFarmers = async () => {
    // For filtering, we need to get all farmers - do this by fetching multiple pages
    setLoading(true);
    setError("");
    try {
      if (import.meta.env.DEV) console.log("Fetching all farmers for filtering...");
      // Fetch up to 5 pages (100 farmers max per page = 500 total)
      let allFarmersData: Farmer[] = [];
      for (let page = 0; page < 5; page++) {
        const skip = page * 100;
        try {
          const data = await farmerService.getFarmers(100, skip);
          let pageData: Farmer[] = [];
          
          if (Array.isArray(data)) {
            pageData = data;
          } else if (data?.results && Array.isArray(data.results)) {
            pageData = data.results;
          } else if (data?.farmers && Array.isArray(data.farmers)) {
            pageData = data.farmers;
          }
          
          if (pageData.length === 0) break; // No more data
          allFarmersData = [...allFarmersData, ...pageData];
        } catch (err) {
          if (page === 0) throw err; // Re-throw if first page fails
          break; // Stop fetching on error
        }
      }
      
      setAllFarmers(allFarmersData);
      setTotalFarmers(allFarmersData.length);
    } catch (err: any) {
      console.error("Fetch all farmers error:", err);
      const errorMsg = err.response?.data?.detail || err.message || "Failed to load farmers";
      setError(errorMsg);
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
    if (farmer.full_name && typeof farmer.full_name === 'string' && farmer.full_name.trim()) return farmer.full_name;
    if (farmer.personal_info?.first_name && farmer.personal_info?.last_name) {
      return `${farmer.personal_info.first_name} ${farmer.personal_info.last_name}`.trim();
    }
    if (farmer.personal_info?.first_name) return farmer.personal_info.first_name.trim();
    return farmer.personal_info?.last_name?.trim() || "Unnamed";
  };

  const getFarmerPhone = (farmer: Farmer) => {
    return (farmer.phone && farmer.phone.trim()) || (farmer.personal_info?.phone_primary && farmer.personal_info?.phone_primary.trim()) || "-";
  };

  const getFarmerDistrict = (farmer: Farmer) => {
    return (farmer.district && farmer.district.trim()) || (farmer.address?.district_name && farmer.address?.district_name.trim()) || "Unknown";
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

  const openViewModal = (farmer: Farmer) => {
    setSelectedFarmer(farmer);
    setShowViewModal(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedFarmer || !reviewStatus) {
      setError("Please select a status");
      return;
    }
    setError("");
    setUpdating(true);
    try {
      // Use the review endpoint with query parameters
      const queryParams = `new_status=${reviewStatus}&review_notes=${encodeURIComponent(remarks)}`;
      await farmerService.review(selectedFarmer.farmer_id, queryParams);
      setSuccess("✅ Farmer status updated successfully!");
      setShowReviewModal(false);
      setSelectedFarmer(null);
      fetchAllFarmers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update farmer status");
    } finally {
      setUpdating(false);
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
            <span>{error}</span>
            <p className="text-gray-500 text-xs mt-2">If this is a validation error, check your input or try refreshing. If the problem persists, contact support.</p>
            <button onClick={() => setError("")} className="ml-auto block text-xs hover:underline">Dismiss</button>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm border-l-4 border-green-600">
            {success}
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
                      <td className="px-6 py-4 text-xs space-x-2 flex gap-1">
                        <button
                          onClick={() => openViewModal(farmer)}
                          className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded transition"
                        >
                          👁️ View
                        </button>
                        <button
                          onClick={() => navigate(`/farmers/${farmer.farmer_id}`)}
                          className="px-3 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded transition"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleReviewClick(farmer)}
                          className="px-3 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded transition"
                        >
                          📋 Review
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
                      onClick={() => openViewModal(farmer)}
                      className="flex-1 bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold py-1 rounded transition"
                    >
                      👁️ View
                    </button>
                    <button
                      onClick={() => navigate(`/farmers/${farmer.farmer_id}`)}
                      className="flex-1 bg-green-100 text-green-700 hover:bg-green-200 font-bold py-1 rounded transition"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleReviewClick(farmer)}
                      className="flex-1 bg-orange-100 text-orange-700 hover:bg-orange-200 font-bold py-1 rounded transition"
                    >
                      📋 Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {!loading && filteredFarmers.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-4 flex justify-between items-center text-xs text-gray-600">
            <span>Showing {filteredFarmers.length} farmer{filteredFarmers.length !== 1 ? "s" : ""} (Total: {totalFarmers})</span>
            <div className="flex gap-2">
              <button
                onClick={() => loadFarmers(currentPage - 1)}
                disabled={currentPage === 0}
                className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <span className="px-3 py-1">Page {currentPage + 1}</span>
              <button
                onClick={() => loadFarmers(currentPage + 1)}
                disabled={filteredFarmers.length < pageSize}
                className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {showViewModal && selectedFarmer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 p-6 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-800">👁️ Farmer Details</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase mb-1">Farmer ID</p>
                <p className="font-bold text-gray-800">{selectedFarmer.farmer_id}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 uppercase mb-1">Full Name</p>
                <p className="font-bold text-gray-800">{getFarmerName(selectedFarmer)}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 uppercase mb-1">Phone</p>
                <p className="text-gray-800">{getFarmerPhone(selectedFarmer)}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 uppercase mb-1">District</p>
                <p className="text-gray-800">{getFarmerDistrict(selectedFarmer)}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 uppercase mb-1">Village</p>
                <p className="text-gray-800">{selectedFarmer.address?.village || "N/A"}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 uppercase mb-1">Status</p>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(selectedFarmer.registration_status || "", selectedFarmer.is_active)}`}>
                  {selectedFarmer.is_active ? (selectedFarmer.registration_status === "registered" ? "✓ Registered" : "⏳ Pending") : "✗ Inactive"}
                </span>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 uppercase mb-1">Registered Date</p>
                <p className="text-gray-800">{selectedFarmer.created_at ? new Date(selectedFarmer.created_at).toLocaleDateString() : "N/A"}</p>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    navigate(`/farmers/${selectedFarmer.farmer_id}`);
                  }}
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2 rounded-lg transition"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Status Modal */}
      {showReviewModal && selectedFarmer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="border-b border-gray-200 p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">📋 Review Farmer Status</h2>
              <button
                onClick={() => setShowReviewModal(false)}
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

            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase mb-1">Farmer</p>
                <p className="font-bold text-gray-800">{getFarmerName(selectedFarmer)}</p>
                <p className="text-xs text-gray-600">{selectedFarmer.farmer_id}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Status <span className="text-red-500">*</span></label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                >
                  <option value="">-- Select Status --</option>
                  <option value="pending">⏳ Pending Review</option>
                  <option value="registered">✓ Registered (Approved)</option>
                  <option value="rejected">✗ Rejected</option>
                  <option value="under_verification">🔍 Under Verification</option>
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
                  disabled={updating || !reviewStatus}
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? "Updating..." : "✓ Update Status"}
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
