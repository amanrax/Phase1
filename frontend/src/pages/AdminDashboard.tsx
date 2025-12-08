// src/pages/AdminDashboard.tsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { farmerService } from "@/services/farmer.service";
import { dashboardService } from "@/services/dashboard.service";
import { operatorService } from "@/services/operator.service";

interface Farmer {
  _id: string;
  farmer_id: string;
  first_name: string;
  last_name: string;
  primary_phone?: string;
  phone?: string;
  registration_status?: string;
}

interface Operator {
  _id: string;
  email: string;
  full_name: string;
  phone?: string;
  assigned_district?: string;
  is_active?: boolean;
}

interface Stats {
  totalFarmers: number;
  totalOperators: number;
  pendingVerifications: number;
}

// Cache for dashboard data with 2 minute TTL
const dashboardCache = {
  data: null as any,
  timestamp: 0,
  TTL: 2 * 60 * 1000, // 2 minutes
  isValid() {
    return this.data && (Date.now() - this.timestamp) < this.TTL;
  },
  set(data: any) {
    this.data = data;
    this.timestamp = Date.now();
  },
  get() {
    return this.isValid() ? this.data : null;
  }
};

export default function AdminDashboard() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalFarmers: 0,
    totalOperators: 0,
    pendingVerifications: 0,
  });
  const loadingRef = useRef(false); // Prevent duplicate loads

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Check if already loading
    if (loadingRef.current) {
      console.log('Data already loading, skipping...');
      return;
    }

    // Check cache first
    const cachedData = dashboardCache.get();
    if (cachedData) {
      console.log('Loading from cache...');
      setFarmers(cachedData.farmers);
      setOperators(cachedData.operators);
      setStats(cachedData.stats);
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    try {
      // Load data in parallel for faster response
      const [statsData, farmersData, operatorsData] = await Promise.all([
        dashboardService.getStats(),
        farmerService.getFarmers(5, 0),
        operatorService.getOperators(10, 0)
      ]);
      
      // Farmers endpoint returns array directly
      const farmersList = Array.isArray(farmersData) ? farmersData : (farmersData.results || []);
      
      // Operators endpoint returns {count, results}
      const operatorsList = operatorsData.results || operatorsData.operators || [];
      
      console.log('Farmers loaded:', farmersList.length);
      console.log('Operators loaded:', operatorsList.length);
      
      const statsObject = {
        totalFarmers: statsData.farmers?.total || 0,
        totalOperators: statsData.operators || 0,
        pendingVerifications: statsData.farmers?.pending || 0,
      };

      // Cache the results
      dashboardCache.set({
        farmers: farmersList,
        operators: operatorsList,
        stats: statsObject
      });
      
      setFarmers(farmersList);
      setOperators(operatorsList);
      setStats(statsObject);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      {/* Header */}
      <div className="text-center text-white pt-6 sm:pt-8 pb-6 sm:pb-8 px-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold drop-shadow-lg mb-2">
          🌾 Chiefdom Management Model
        </h1>
        <p className="text-xs sm:text-sm md:text-base opacity-90">Advanced Agricultural Management System - Admin Dashboard</p>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 pb-6">
        {/* Stats Grid - Mobile responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
          {/* Operators Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">{stats.totalOperators}</div>
            <div className="opacity-90 text-xs sm:text-sm md:text-base">👨‍💼 Total Operators</div>
          </div>

          {/* Farmers Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">{stats.totalFarmers}</div>
            <div className="opacity-90 text-xs sm:text-sm md:text-base">👨‍🌾 Total Farmers</div>
          </div>

          {/* Pending Verifications Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">{stats.pendingVerifications}</div>
            <div className="opacity-90 text-xs sm:text-sm md:text-base">⏳ Pending Verifications</div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 md:p-8">
          {/* Header with Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900">🔧 Admin Dashboard</h2>
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => navigate("/operators/manage")}
                className="px-2 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
              >
                👨‍💼 Operators
              </button>

              <button
                onClick={() => navigate("/farmers")}
                className="px-2 sm:px-4 py-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
              >
                👨‍🌾 Farmers
              </button>

              <button
                onClick={() => navigate("/admin/reports")}
                className="px-2 sm:px-4 py-2 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
              >
                📊 Reports
              </button>

              <button
                onClick={() => navigate("/admin/supply-requests")}
                className="px-2 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
              >
                📦 Requests
              </button>

              <button
                onClick={() => navigate("/admin/settings")}
                className="px-2 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
              >
                ⚙️ Settings
              </button>

              <button
                onClick={() => navigate("/admin/logs")}
                className="px-2 sm:px-4 py-2 bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
              >
                📜 Logs
              </button>
              
              <button
                onClick={logout}
                className="px-2 sm:px-4 py-2 bg-gray-600 hover:bg-gray-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
              >
                🚪 Logout
              </button>
            </div>
          </div>

          {/* Operators Management Section */}
          <div className="mb-8 sm:mb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">👨‍💼 System Operators</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    dashboardCache.data = null;
                    loadData();
                  }}
                  disabled={loading}
                  className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Refresh dashboard data"
                >
                  <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
                  Refresh
                </button>
                <button
                  onClick={() => navigate("/operators/manage")}
                  className="px-3 sm:px-4 py-1 sm:py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
                >
                  ➕ Add Operator
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 sm:py-16">
                <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="mt-3 sm:mt-4 text-gray-600 text-sm sm:text-base">Loading...</p>
              </div>
            ) : operators.length === 0 ? (
              <div className="text-center py-8 sm:py-16 text-gray-600 bg-gray-50 rounded-lg">
                <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">👨‍💼</div>
                <p className="text-base sm:text-lg font-semibold mb-2">No operators found</p>
                <p className="text-xs sm:text-sm mb-3 sm:mb-4">Add operators to help manage farmers</p>
                <button
                  onClick={() => navigate("/operators/manage")}
                  className="px-4 sm:px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-all"
                >
                  Add First Operator
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg border border-gray-200">
                <div className="overflow-hidden">
                  <table className="w-full text-left text-sm table-fixed">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-700 text-xs uppercase truncate" style={{width: '20%'}}>Name</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-700 text-xs uppercase truncate" style={{width: '25%'}}>Email</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-700 text-xs uppercase truncate hidden md:table-cell" style={{width: '15%'}}>Phone</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-700 text-xs uppercase truncate hidden lg:table-cell" style={{width: '20%'}}>District</th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-700 text-xs uppercase text-center truncate" style={{width: '20%'}}>Status</th>
                      </tr>
                    </thead>
                  <tbody className="divide-y divide-gray-200">
                    {operators.slice(0, 5).map((op) => (
                      <tr
                        key={op.operator_id || op._id}
                        className="bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <td className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-900 truncate" title={op.full_name}>{op.full_name}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-600 text-xs sm:text-sm truncate" title={op.email}>{op.email}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-600 text-xs sm:text-sm truncate hidden md:table-cell" title={op.phone || "-"}>{op.phone || "-"}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-600 text-xs sm:text-sm truncate hidden lg:table-cell" title={op.assigned_district || "All Districts"}>{op.assigned_district || "All Districts"}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-center">
                          <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                            op.is_active !== false 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}>
                            {op.is_active !== false ? "✓ Active" : "✗ Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                {operators.length > 5 && (
                  <div className="text-center py-3 sm:py-4 bg-white border-t border-gray-200">
                    <button
                      onClick={() => navigate("/operators/manage")}
                      className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-semibold transition-colors"
                    >
                      View All {operators.length} Operators →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Farmers Section */}
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">👨‍🌾 Recent Farmers</h3>
              <button
                onClick={() => navigate("/farmers")}
                className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-semibold transition-colors"
              >
                View All →
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 sm:py-16">
                <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="mt-3 sm:mt-4 text-gray-600 text-sm sm:text-base">Loading...</p>
              </div>
            ) : farmers.length === 0 ? (
              <div className="text-center py-12 sm:py-20 text-gray-600">
                <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🌾</div>
                <p className="text-base sm:text-lg font-semibold mb-2">No farmers registered yet</p>
                <p className="text-xs sm:text-sm">Operators can register farmers in the system</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:gap-4">
                {farmers.map((farmer) => (
                  <div
                    key={farmer.farmer_id || farmer._id}
                    onClick={() => navigate(`/farmers/${farmer.farmer_id}`)}
                    className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50 hover:bg-white hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-base sm:text-lg font-bold text-gray-900 truncate">
                          {farmer.first_name} {farmer.last_name}
                        </div>
                        <div className="text-gray-600 text-xs sm:text-sm mt-1 line-clamp-2">
                          📱 {farmer.primary_phone || farmer.phone} • 🆔 {farmer.farmer_id}
                        </div>
                      </div>
                      <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        farmer.registration_status === "verified"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {farmer.registration_status || "Registered"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
