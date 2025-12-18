// src/pages/OperatorDashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { farmerService } from "@/services/farmer.service";
import axios from "@/utils/axios";
import { useNotification } from "@/contexts/NotificationContext";

interface Farmer {
  _id: string;
  farmer_id: string;
  first_name?: string;
  last_name?: string;
  phone_primary?: string;
  village?: string;
  district_name?: string;
  registration_status?: string;
  is_active?: boolean;
  personal_info?: {
    first_name?: string;
    last_name?: string;
    phone_primary?: string;
    email?: string;
  };
  primary_phone?: string;
  phone?: string;
  email?: string;
}

export default function OperatorDashboard() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const { error: showError, info: showInfo } = useNotification();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");

  useEffect(() => {
    loadOperatorInfo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOperatorInfo = async () => {
    try {
      // Get operator's assigned district from their profile
      const response = await axios.get("/operators/me");
      loadFarmers(response.data.assigned_district);
    } catch (error: any) {
      console.error("Failed to load operator info:", error);
      const errorMsg = error.response?.data?.detail || "Failed to load operator information";
      showError(errorMsg, 4000);
      // Fallback: load all farmers if operator info fails
      loadFarmers();
    }
  };

  const loadFarmers = async (district?: string) => {
    setLoading(true);
    try {
      let url = "/farmers?limit=100&skip=0";
      // Filter by operator's district if available
      if (district) {
        url += `&district=${encodeURIComponent(district)}`;
      }
      const data = await farmerService.getFarmers(100, 0, { district });
      const farmersList = Array.isArray(data) ? data : (data.results || data.farmers || []);
      setFarmers(farmersList);
    } catch (error: any) {
      console.error("Failed to load farmers:", error);
      const errorMsg = error.response?.data?.detail || "Failed to load farmers";
      showError(errorMsg, 4000);
    } finally {
      setLoading(false);
    }
  };

  const filteredFarmers = farmers.filter(farmer => {
    const firstName = farmer.first_name || farmer.personal_info?.first_name || "";
    const lastName = farmer.last_name || farmer.personal_info?.last_name || "";
    const phone = farmer.phone_primary || farmer.personal_info?.phone_primary || farmer.primary_phone || farmer.phone || "";
    
    return (
      firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery) ||
      farmer.farmer_id.includes(searchQuery)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 pb-8">
      {/* Header */}
      <div className="text-center text-white pt-6 sm:pt-8 pb-6 sm:pb-8 px-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold drop-shadow-lg mb-2">
          🌾 Chiefdom Management Model
        </h1>
        <p className="text-xs sm:text-sm md:text-base opacity-90">Advanced Agricultural Management System - Operator Dashboard</p>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 pb-6">
        {/* Stats Grid - Mobile responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {/* My Farmers Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">{farmers.length}</div>
            <div className="opacity-90 text-xs sm:text-sm md:text-base">👨‍🌾 My Farmers</div>
          </div>

          {/* This Month Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">3</div>
            <div className="opacity-90 text-xs sm:text-sm md:text-base">📅 This Month</div>
          </div>

          {/* Pending Docs Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">8</div>
            <div className="opacity-90 text-xs sm:text-sm md:text-base">📄 Pending Docs</div>
          </div>

          {/* Total Land Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">45.2</div>
            <div className="opacity-90 text-xs sm:text-sm md:text-base">🌾 Total Land (ha)</div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 md:p-8">
          {/* Header with Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900">📋 My Farmers</h2>
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => setViewMode("table")}
                className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  viewMode === "table"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                }`}
              >
                📋 Table
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  viewMode === "grid"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                }`}
              >
                📱 Grid
              </button>

              <button
                onClick={() => navigate("/farmers")}
                className="px-2 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
              >
                👨‍🌾 All Farmers
              </button>

              <button
                onClick={() => navigate("/farmers/create")}
                className="px-2 sm:px-4 py-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
              >
                ➕ Add Farmer
              </button>

              <button
                onClick={logout}
                className="px-2 sm:px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
              >
                🚪 Logout
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search by name, phone, or farmer ID..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Farmers List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin">
                <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
              </div>
              <p className="mt-4 text-gray-600 text-sm">Loading farmers...</p>
            </div>
          ) : filteredFarmers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🌾</div>
              <p className="text-lg font-semibold text-gray-800 mb-2">
                {searchQuery ? "No farmers found" : "No farmers assigned"}
              </p>
              <p className="text-sm text-gray-600 mb-6">
                {searchQuery ? "Try a different search term" : "Farmers will appear here when assigned to you"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => navigate("/farmers/create")}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-all"
                >
                  ➕ Create First Farmer
                </button>
              )}
            </div>
          ) : viewMode === "table" ? (
            /* Table View */
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">#</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">ID</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Phone</th>
                    <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredFarmers.map((farmer, index) => {
                    const firstName = farmer.first_name || farmer.personal_info?.first_name || "Unknown";
                    const lastName = farmer.last_name || farmer.personal_info?.last_name || "";
                    const phone = farmer.phone_primary || farmer.personal_info?.phone_primary || farmer.primary_phone || farmer.phone || "N/A";
                    const status = farmer.registration_status || "pending";

                    return (
                      <tr
                        key={farmer._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900">
                          {firstName} {lastName}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-xs text-gray-600 font-mono">{farmer.farmer_id}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{phone}</td>
                        <td className="px-4 sm:px-6 py-4 text-center">
                          <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                            status === "verified"
                              ? "bg-green-100 text-green-800"
                              : status === "registered"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => navigate(`/farmers/${farmer.farmer_id}`)}
                              title="View Details"
                              className="px-2 sm:px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            >
                              👁️ View
                            </button>
                            <button
                              onClick={() => navigate(`/farmers/edit/${farmer.farmer_id}`)}
                              title="Edit"
                              className="px-2 sm:px-3 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors"
                            >
                              ✏️ Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="bg-gray-50 px-4 sm:px-6 py-3 text-xs text-gray-600 border-t border-gray-200">
                Showing {filteredFarmers.length} of {farmers.length} farmers
              </div>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFarmers.map((farmer) => {
                const firstName = farmer.first_name || farmer.personal_info?.first_name || "Unknown";
                const lastName = farmer.last_name || farmer.personal_info?.last_name || "";
                const phone = farmer.phone_primary || farmer.personal_info?.phone_primary || farmer.primary_phone || farmer.phone || "N/A";
                const email = farmer.email || farmer.personal_info?.email || "";
                const status = farmer.registration_status || "pending";

                return (
                  <div
                    key={farmer._id}
                    className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-lg hover:scale-105 transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {firstName} {lastName}
                        </div>
                        <div className="text-xs text-gray-600">{farmer.farmer_id}</div>
                      </div>
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        status === "verified"
                          ? "bg-green-100 text-green-800"
                          : status === "registered"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {status}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 mb-4 line-clamp-3">
                      📱 {phone}{email ? ` • 📧 ${email}` : ""}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/farmers/${farmer.farmer_id}`)}
                        className="flex-1 px-2 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      >
                        👁️ View
                      </button>
                      <button
                        onClick={() => navigate(`/farmers/edit/${farmer.farmer_id}`)}
                        className="flex-1 px-2 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
