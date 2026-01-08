import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "@/utils/axios";
import { dashboardCache } from "@/pages/AdminDashboard";

interface User {
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface SystemStats {
  total_users: number;
  total_admins: number;
  total_operators: number;
  total_farmers: number;
}

type SettingsTab = "users" | "system" | "security";

export default function AdminSettings() {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>("users");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Create Admin Form
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);

  useEffect(() => {
    // Load users first, then stats (since stats depends on user count)
    const init = async () => {
      await loadUsers();
      await loadStats();
    };
    init();
    
    // Reload on window focus
    const handleFocus = () => {
      init();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/users/");
      // API returns {users: [...]}
      if (response.data.users && Array.isArray(response.data.users)) {
        setUsers(response.data.users);
      } else if (Array.isArray(response.data)) {
        setUsers(response.data);
      } else {
        setUsers([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get("/reports/dashboard");
      const metrics = response.data?.metrics || response.data || {};
      
      // Count admins from the already-loaded users list
      const adminCount = users.filter(u => u.role.toUpperCase() === 'ADMIN').length;
      
      setStats({
        total_users: users.length, // Use actual users array length
        total_admins: adminCount,
        total_operators: metrics.operators_total || 0,
        total_farmers: metrics.farmers_total || 0
      });
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  };

  const createAdmin = async () => {
    if (!newAdminEmail || !newAdminPassword) {
      setError("Email and password required");
      return;
    }
    try {
      await axios.post("/auth/register", {
        email: newAdminEmail,
        password: newAdminPassword,
        roles: ["ADMIN"]
      });
      setSuccess("Admin created successfully");
      setNewAdminEmail("");
      setNewAdminPassword("");
      setShowCreateAdmin(false);
      loadUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create admin");
    }
  };

  const deactivateUser = async (email: string) => {
    if (!confirm(`Deactivate ${email}?`)) return;
    try {
      await axios.patch(`/users/${email}/status`, { is_active: false });
      setSuccess("User deactivated");
      // Clear admin dashboard cache
      dashboardCache.clear();
      loadUsers();
      loadStats(); // Refresh stats after user update
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to deactivate user");
    }
  };

  const activateUser = async (email: string) => {
    if (!confirm(`Activate ${email}?`)) return;
    try {
      await axios.patch(`/users/${email}/status`, { is_active: true });
      setSuccess("User activated");
      // Clear admin dashboard cache
      dashboardCache.clear();
      loadUsers();
      loadStats(); // Refresh stats after user update
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to activate user");
    }
  };

  const deleteUser = async (email: string) => {
    if (!confirm(`Delete ${email}? This cannot be undone.`)) return;
    try {
      await axios.delete(`/users/${email}`);
      setSuccess("User deleted");
      // Clear admin dashboard cache so it shows updated data
      dashboardCache.clear();
      loadUsers();
      loadStats(); // Also refresh stats
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete user");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin-dashboard")} className="text-green-700 hover:text-green-800 font-bold text-sm">
              ← BACK
            </button>
            <h1 className="text-2xl font-bold text-gray-800">⚙️ Settings</h1>
          </div>
          <button
            onClick={async () => {
              dashboardCache.clear();
              await loadUsers();
              await loadStats();
            }}
            disabled={loading}
            className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 flex items-center gap-2"
          >
            <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
            Refresh
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border-l-4 border-red-500">
            {error}
            <button onClick={() => setError(null)} className="ml-auto block text-xs hover:underline">Dismiss</button>
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm border-l-4 border-green-600">
            ✓ {success}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-2 flex gap-2 overflow-x-auto">
          {[
            { value: "users", label: "👥 Users" },
            { value: "system", label: "📊 System" },
            { value: "security", label: "🔐 Security" }
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value as any)}
              className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition ${
                activeTab === t.value ? "bg-green-700 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
            <p className="text-gray-600 mt-4">Loading settings...</p>
          </div>
        ) : (
          <>
            {/* Users Tab */}
            {activeTab === "users" && (
              <div className="space-y-6">
                {/* Create Admin Card */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">➕ Create New Admin</h2>
                  {!showCreateAdmin ? (
                    <button
                      onClick={() => setShowCreateAdmin(true)}
                      className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg transition"
                    >
                      Create Admin
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <input
                        type="email"
                        placeholder="Email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={createAdmin}
                          className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg transition"
                        >
                          Create
                        </button>
                        <button
                          onClick={() => setShowCreateAdmin(false)}
                          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Users List */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-800">System Users</h2>
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                      <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
                        <tr>
                          <th className="px-6 py-3">Email</th>
                          <th className="px-6 py-3">Role</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3">Created</th>
                          <th className="px-6 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {users.map(user => (
                          <tr key={user.email} className="hover:bg-green-50 transition">
                            <td className="px-6 py-4 font-mono text-xs">{user.email}</td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                                {user.role.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}>
                                {user.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-xs space-x-2">
                              {user.is_active ? (
                                <button
                                  onClick={() => deactivateUser(user.email)}
                                  className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded transition"
                                  title="Deactivate"
                                >
                                  🔴 Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => activateUser(user.email)}
                                  className="px-3 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded transition"
                                  title="Activate"
                                >
                                  🟢 Activate
                                </button>
                              )}
                              <button
                                onClick={() => deleteUser(user.email)}
                                className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded transition"
                                title="Delete"
                              >
                                🗑️ Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y divide-gray-200">
                    {users.map(user => (
                      <div key={user.email} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-sm text-gray-800 break-all">{user.email}</h3>
                          <span className={`px-2 py-1 text-xs font-bold rounded-full whitespace-nowrap ml-2 ${
                            user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2"><strong>Role:</strong> {user.role.toUpperCase()}</p>
                        <p className="text-xs text-gray-600 mb-3"><strong>Created:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
                        <div className="flex gap-2 text-xs">
                          {user.is_active ? (
                            <button
                              onClick={() => deactivateUser(user.email)}
                              className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 font-bold py-1 px-2 rounded transition"
                              title="Deactivate"
                            >
                              🔴 Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => activateUser(user.email)}
                              className="flex-1 bg-green-100 text-green-700 hover:bg-green-200 font-bold py-1 px-2 rounded transition"
                              title="Activate"
                            >
                              🟢 Activate
                            </button>
                          )}
                          <button
                            onClick={() => deleteUser(user.email)}
                            className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 font-bold py-1 px-2 rounded transition"
                            title="Delete"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* System Tab */}
            {activeTab === "system" && stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-green-600">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Users</p>
                  <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.total_users}</h3>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-blue-600">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Admins</p>
                  <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.total_admins}</h3>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-orange-500">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Operators</p>
                  <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.total_operators}</h3>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-purple-600">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Farmers</p>
                  <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.total_farmers}</h3>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="bg-white rounded-xl shadow-sm p-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">🔐 Security Settings</h2>
                <div className="space-y-4 text-gray-600">
                  <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-600">
                    <p className="font-bold text-sm text-blue-800">JWT Token Expiration</p>
                    <p className="text-xs mt-1">Access tokens expire after 15 minutes. Refresh tokens expire after 7 days.</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-600">
                    <p className="font-bold text-sm text-green-800">Password Requirements</p>
                    <p className="text-xs mt-1">Minimum 8 characters, includes uppercase, lowercase, numbers, and special characters.</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                    <p className="font-bold text-sm text-orange-800">API Rate Limiting</p>
                    <p className="text-xs mt-1">100 requests per minute per IP address for public endpoints.</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
