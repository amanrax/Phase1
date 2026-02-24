// src/pages/AdminDashboard.tsx - FIXED VERSION
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { farmerService } from "@/services/farmer.service";
import { dashboardService } from "@/services/dashboard.service";
import { operatorService } from "@/services/operator.service";
import { useNotification } from "@/contexts/NotificationContext";
import { ThemeToggle } from "@/contexts/ThemeContext";

interface Farmer {
  _id: string;
  farmer_id: string;
  name: string;
  district: string;
  created_at: string;
  registration_status: string;
  is_active: boolean;
}

interface Operator {
  _id: string;
  operator_id: string;
  email: string;
  full_name: string;
  phone?: string;
  assigned_district?: string;
  assigned_districts?: string[];
  is_active?: boolean;
}

interface Stats {
  totalFarmers: number;
  activeFarmers: number;
  totalOperators: number;
  activeOperators: number;
  pendingVerifications: number;
  totalUsers: number;
  activeUsers: number;
  totalAdmins: number;
}

export default function AdminDashboard() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const { error: showError } = useNotification();

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalFarmers: 0,
    activeFarmers: 0,
    totalOperators: 0,
    activeOperators: 0,
    pendingVerifications: 0,
    totalUsers: 0,
    activeUsers: 0,
    totalAdmins: 0,
  });
  const loadingRef = useRef(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (loadingRef.current) {
      console.log('Data already loading, skipping...');
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    
    try {
      console.log('[Dashboard] Loading data...');
      
      // Load stats from backend (with accurate counts)
      const statsData = await dashboardService.getStats();
      console.log('[Dashboard] Stats received:', statsData);
      
      // Extract farmers data from stats
      const recentFarmers = statsData.farmers?.recent || [];
      console.log('[Dashboard] Recent farmers:', recentFarmers.length);
      
      // Load operators data
      const operatorsData = await operatorService.getOperators(20, 0);
      const operatorsList = operatorsData.results || operatorsData.operators || [];
      console.log('[Dashboard] Operators loaded:', operatorsList.length);
      
      // Update stats with correct data structure
      const newStats: Stats = {
        totalFarmers: statsData.farmers?.total || 0,
        activeFarmers: statsData.farmers?.active || 0,
        totalOperators: statsData.operators?.total || 0,
        activeOperators: statsData.operators?.active || 0,
        pendingVerifications: statsData.farmers?.pending || 0,
        totalUsers: statsData.users?.total || 0,
        activeUsers: statsData.users?.active || 0,
        totalAdmins: statsData.users?.by_role?.admin || 0,
      };
      
      console.log('[Dashboard] Processed stats:', newStats);
      
      setFarmers(recentFarmers);
      setOperators(operatorsList);
      setStats(newStats);
      
      console.log('[Dashboard] ✅ Data loaded successfully');
    } catch (error: any) {
      console.error("[Dashboard] Failed to load data:", error);
      showError(error.response?.data?.detail || "Failed to load dashboard data", 5000);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const handleRefresh = () => {
    console.log('[Dashboard] Manual refresh triggered');
    loadingRef.current = false; // Reset loading flag
    loadData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-gray-900 dark:via-indigo-950 dark:to-gray-900 relative overflow-hidden transition-all duration-300">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-40 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <div className="text-center text-white pt-6 sm:pt-8 pb-6 sm:pb-8 px-4 relative z-10">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)' }}>
          🌾 Chiefdom Management Model
        </h1>
        <p className="text-xs sm:text-sm md:text-base opacity-90" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>Advanced Agricultural Management System - Admin Dashboard</p>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 pb-6 relative z-10">
        {/* Stats Grid - Mobile responsive with CORRECT DATA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {/* Total Users Card */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-indigo-600/90 to-purple-600/90 text-white p-4 sm:p-6 rounded-2xl border border-white/20 transition-all duration-300 transform hover:scale-105 hover:translate-y-[-4px] cursor-pointer" 
               style={{ 
                 boxShadow: '0 15px 30px rgba(99,102,241,0.4), 0 5px 15px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                 transformStyle: 'preserve-3d'
               }}>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
              {stats.totalUsers}
            </div>
            <div className="opacity-90 text-xs sm:text-sm md:text-base">👥 Total Users</div>
            <div className="opacity-75 text-xs mt-1">
              {stats.activeUsers} active • {stats.totalAdmins} admins
            </div>
          </div>

          {/* Operators Card */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-indigo-600/90 to-purple-600/90 text-white p-4 sm:p-6 rounded-2xl border border-white/20 transition-all duration-300 transform hover:scale-105 hover:translate-y-[-4px] cursor-pointer" 
               style={{ 
                 boxShadow: '0 15px 30px rgba(99,102,241,0.4), 0 5px 15px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                 transformStyle: 'preserve-3d'
               }}>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
              {stats.totalOperators}
            </div>
            <div className="opacity-90 text-xs sm:text-sm md:text-base">👨‍💼 Total Operators</div>
            <div className="opacity-75 text-xs mt-1">
              {stats.activeOperators} active
            </div>
          </div>

          {/* Farmers Card */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-indigo-600/90 to-purple-600/90 text-white p-4 sm:p-6 rounded-2xl border border-white/20 transition-all duration-300 transform hover:scale-105 hover:translate-y-[-4px] cursor-pointer"
               style={{ 
                 boxShadow: '0 15px 30px rgba(99,102,241,0.4), 0 5px 15px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                 transformStyle: 'preserve-3d'
               }}>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
              {stats.totalFarmers}
            </div>
            <div className="opacity-90 text-xs sm:text-sm md:text-base">👨‍🌾 Total Farmers</div>
            <div className="opacity-75 text-xs mt-1">
              {stats.activeFarmers} active
            </div>
          </div>

          {/* Pending Verifications Card */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-indigo-600/90 to-purple-600/90 text-white p-4 sm:p-6 rounded-2xl border border-white/20 transition-all duration-300 transform hover:scale-105 hover:translate-y-[-4px] cursor-pointer"
               style={{ 
                 boxShadow: '0 15px 30px rgba(99,102,241,0.4), 0 5px 15px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                 transformStyle: 'preserve-3d'
               }}>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
              {stats.pendingVerifications}
            </div>
            <div className="opacity-90 text-xs sm:text-sm md:text-base">⏳ Pending Verifications</div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="backdrop-blur-xl bg-white/95 rounded-3xl p-4 sm:p-6 md:p-8 border border-white/50 transition-all duration-500" 
             style={{ 
               boxShadow: '0 25px 50px -12px rgba(99,102,241,0.4), 0 0 0 1px rgba(255,255,255,0.5), inset 0 1px 0 0 rgba(255,255,255,0.8)',
               transformStyle: 'preserve-3d'
             }}>
          {/* Header with Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900">🔧 Admin Dashboard</h2>
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-2 sm:px-3 py-2 bg-gradient-to-br from-cyan-600 to-cyan-700 hover:scale-105 hover:translate-y-[-2px] active:scale-95 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ boxShadow: '0 4px 12px rgba(8,145,178,0.3)' }}
              >
                <i className={`fa-solid fa-rotate-right mr-2 ${loading ? 'animate-spin' : ''}`}></i>
                Refresh
              </button>

              <button
                onClick={() => navigate("/operators/manage")}
                className="px-2 sm:px-4 py-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:scale-105 hover:translate-y-[-2px] active:scale-95 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                style={{ boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}
              >
                👨‍💼 Operators
              </button>

              <button
                onClick={() => navigate("/farmers")}
                className="px-2 sm:px-4 py-2 bg-gradient-to-br from-green-600 to-green-700 hover:scale-105 hover:translate-y-[-2px] active:scale-95 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                style={{ boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}
              >
                👨‍🌾 Farmers
              </button>

              <button
                onClick={() => navigate("/farmers/create")}
                className="px-2 sm:px-4 py-2 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:scale-105 hover:translate-y-[-2px] active:scale-95 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                style={{ boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}
              >
                ➕ Add Farmer
              </button>

              <button
                onClick={() => navigate("/admin/reports")}
                className="px-2 sm:px-4 py-2 bg-gradient-to-br from-orange-600 to-orange-700 hover:scale-105 hover:translate-y-[-2px] active:scale-95 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                style={{ boxShadow: '0 4px 12px rgba(234,88,12,0.3)' }}
              >
                📊 Reports
              </button>

              <button
                onClick={() => navigate("/admin/analytics")}
                className="px-2 sm:px-4 py-2 bg-gradient-to-br from-teal-600 to-teal-700 hover:scale-105 hover:translate-y-[-2px] active:scale-95 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                style={{ boxShadow: '0 4px 12px rgba(13,148,136,0.3)' }}
              >
                📈 Analytics
              </button>

              <button
                onClick={() => navigate("/admin/settings")}
                className="px-2 sm:px-4 py-2 bg-gradient-to-br from-purple-600 to-purple-700 hover:scale-105 hover:translate-y-[-2px] active:scale-95 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                style={{ boxShadow: '0 4px 12px rgba(147,51,234,0.3)' }}
              >
                ⚙️ Settings
              </button>

              <ThemeToggle className="text-xs sm:text-sm" />
              
              <button
                onClick={logout}
                className="px-2 sm:px-4 py-2 bg-gradient-to-br from-gray-600 to-gray-700 hover:scale-105 hover:translate-y-[-2px] active:scale-95 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                style={{ boxShadow: '0 4px 12px rgba(75,85,99,0.3)' }}
              >
                🚪 Logout
              </button>
            </div>
          </div>

          {/* Operators Management Section */}
          <div className="mb-8 sm:mb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">👨‍💼 System Operators</h3>
              <button
                onClick={() => navigate("/operators/manage")}
                className="px-3 sm:px-4 py-1 sm:py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all"
              >
                ➕ Add Operator
              </button>
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
                          onClick={() => navigate(`/operators/${op.operator_id}`)}
                        >
                          <td className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-900 truncate" title={op.full_name}>{op.full_name}</td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-600 text-xs sm:text-sm truncate" title={op.email}>{op.email}</td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-600 text-xs sm:text-sm truncate hidden md:table-cell" title={op.phone || "-"}>{op.phone || "-"}</td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-600 text-xs sm:text-sm truncate hidden lg:table-cell" title={op.assigned_district || (op.assigned_districts?.[0]) || "All Districts"}>
                            {op.assigned_district || (op.assigned_districts?.[0]) || "All Districts"}
                          </td>
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
                    key={farmer.farmer_id}
                    onClick={() => navigate(`/farmers/${farmer.farmer_id}`)}
                    className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50 hover:bg-white hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-base sm:text-lg font-bold text-gray-900 truncate">
                          {farmer.name}
                        </div>
                        <div className="text-gray-600 text-xs sm:text-sm mt-1 line-clamp-2">
                          📍 {farmer.district} • 🆔 {farmer.farmer_id}
                        </div>
                      </div>
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        farmer.is_active
                          ? farmer.registration_status === "verified"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {!farmer.is_active ? "Inactive" : (farmer.registration_status || "Registered")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Animations */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }

        * {
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}
