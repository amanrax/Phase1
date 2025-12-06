import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "@/utils/axios";
import useAuthStore from "@/store/authStore";

interface SupplyRequest {
  id: string;
  items: string[];
  quantity: string;
  urgency: string;
  notes: string;
  status: string;
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

const AVAILABLE_ITEMS = ["Seeds", "Fertilizers", "Pesticides", "Tools", "Irrigation Equipment", "Tractor Services", "Other"];
const URGENCY_LEVELS = ["low", "medium", "high"];

export default function FarmerSupplyRequests() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "fulfilled" | "rejected">("all");
  
  // New request form state
  const [showForm, setShowForm] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [quantity, setQuantity] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/supplies/my-requests");
      const data = response.data;
      // Backend returns { requests: [...], total: n }
      const list = Array.isArray(data) ? data : data.requests || data.results || [];
      setRequests(list);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async () => {
    if (!selectedItems.length || !quantity) {
      setError("Please select items and quantity");
      return;
    }
    try {
      await axios.post("/supplies/request", {
        items: selectedItems,
        quantity,
        urgency,
        notes
      });
      setSuccess("Request submitted successfully");
      setSelectedItems([]);
      setQuantity("");
      setUrgency("medium");
      setNotes("");
      setShowForm(false);
      loadRequests();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create request");
    }
  };

  const deleteRequest = async (id: string) => {
    if (!confirm("Delete this request?")) return;
    try {
      await axios.delete(`/supplies/${id}`);
      setSuccess("Request deleted");
      loadRequests();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete request");
    }
  };

  const filteredRequests = requests.filter(r => filter === "all" || r.status.toLowerCase() === filter);

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "pending") return "bg-yellow-100 text-yellow-800";
    if (s === "approved") return "bg-blue-100 text-blue-800";
    if (s === "fulfilled") return "bg-green-100 text-green-800";
    if (s === "rejected") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const getUrgencyColor = (urg: string) => {
    const u = urg.toLowerCase();
    if (u === "high") return "text-red-600";
    if (u === "medium") return "text-orange-600";
    return "text-green-600";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/farmer-dashboard")} className="text-green-700 hover:text-green-800 font-bold text-sm">
              ← BACK
            </button>
            <h1 className="text-2xl font-bold text-gray-800">📦 Supply Requests</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            + New Request
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

        {/* New Request Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📝 Create New Request</h2>
            <div className="space-y-4">
              {/* Items Selection */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Items Needed</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                  {AVAILABLE_ITEMS.map(item => (
                    <label key={item} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedItems([...selectedItems, item]);
                          else setSelectedItems(selectedItems.filter(i => i !== item));
                        }}
                        className="w-4 h-4 accent-green-600"
                      />
                      <span className="text-sm">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Quantity</label>
                <input
                  type="text"
                  placeholder="e.g., 10 bags, 2 units"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                />
              </div>

              {/* Urgency */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Urgency</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                >
                  {URGENCY_LEVELS.map(u => (
                    <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Notes</label>
                <textarea
                  placeholder="Additional details or special requests"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg mt-1 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={createRequest}
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  Submit Request
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-2 flex gap-2 overflow-x-auto">
          {["all", "pending", "approved", "fulfilled", "rejected"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition ${
                filter === f ? "bg-green-700 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
            <p className="text-gray-600 mt-4">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-600 text-lg">No requests found</p>
            <p className="text-gray-500 text-sm">Create a new supply request to get started</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">Items</th>
                    <th className="px-6 py-3">Quantity</th>
                    <th className="px-6 py-3">Urgency</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRequests.map(req => (
                    <tr key={req.id} className="hover:bg-green-50 transition">
                      <td className="px-6 py-4 font-bold">{req.items.join(", ")}</td>
                      <td className="px-6 py-4">{req.quantity}</td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${getUrgencyColor(req.urgency)}`}>
                          {req.urgency.charAt(0).toUpperCase() + req.urgency.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(req.status)}`}>
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">{new Date(req.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-xs space-x-2">
                        <button
                          onClick={() => navigate(`/supply-request/${req.id}`)}
                          className="text-green-600 hover:text-green-700 font-bold"
                        >
                          View
                        </button>
                        {req.status.toLowerCase() === "pending" && (
                          <button
                            onClick={() => deleteRequest(req.id)}
                            className="text-red-600 hover:text-red-700 font-bold"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {filteredRequests.map(req => (
                <div key={req.id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-800 text-sm flex-1">{req.items.join(", ")}</h3>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(req.status)} whitespace-nowrap ml-2`}>
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4 text-xs text-gray-600">
                    <p><strong>Quantity:</strong> {req.quantity}</p>
                    <p>
                      <strong>Urgency:</strong>
                      <span className={`ml-2 font-bold ${getUrgencyColor(req.urgency)}`}>
                        {req.urgency.charAt(0).toUpperCase() + req.urgency.slice(1)}
                      </span>
                    </p>
                    <p><strong>Date:</strong> {new Date(req.created_at).toLocaleDateString()}</p>
                    {req.notes && <p><strong>Notes:</strong> {req.notes}</p>}
                    {req.admin_notes && <p className="bg-blue-50 p-2 rounded"><strong>Admin Reply:</strong> {req.admin_notes}</p>}
                  </div>

                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => navigate(`/supply-request/${req.id}`)}
                      className="flex-1 bg-green-100 text-green-700 hover:bg-green-200 font-bold py-2 rounded transition"
                    >
                      View Details
                    </button>
                    {req.status.toLowerCase() === "pending" && (
                      <button
                        onClick={() => deleteRequest(req.id)}
                        className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 font-bold py-2 rounded transition"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
