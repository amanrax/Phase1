import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "@/utils/axios";
import { useNotification } from "@/contexts/NotificationContext";

interface SupplyRequest {
  id: string;
  farmer_id: string;
  farmer_email: string;
  farmer_name: string;
  items: string[];
  quantity: string;
  urgency: string;
  notes: string;
  status: string;
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

export default function AdminSupplyRequests() {
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useNotification();
  const [allRequests, setAllRequests] = useState<SupplyRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<SupplyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<SupplyRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [filter, allRequests]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/supplies/all");
      // Handle different response structures
      let requestList: SupplyRequest[] = [];
      if (Array.isArray(response.data)) {
        requestList = response.data;
      } else if (response.data?.requests && Array.isArray(response.data.requests)) {
        requestList = response.data.requests;
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        requestList = response.data.results;
      }
      setAllRequests(requestList);
      // Clear any loading errors
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || "Failed to load supply requests";
      showError(errorMsg, 5000);
      console.error("Error loading requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (filter === "all") {
      setFilteredRequests(allRequests);
    } else {
      setFilteredRequests(allRequests.filter(r => r.status === filter));
    }
  };

  const getFilterCount = (status: string) => {
    if (status === "all") return allRequests.length;
    return allRequests.filter(r => r.status === status).length;
  };

  const updateRequest = async () => {
    if (!selectedRequest) return;
    
    if (!newStatus) {
      showError("Please select a status", 4000);
      return;
    }

    try {
      setLoading(true);
      await axios.patch(`/supplies/${selectedRequest.id}`, {
        status: newStatus,
        admin_notes: adminNotes
      });
      showSuccess(`Request status updated to ${newStatus}`, 4000);
      closeModal();
      await loadRequests();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || "Failed to update request";
      showError(errorMsg, 5000);
      console.error("Error updating request:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteRequest = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supply request?")) return;
    try {
      setLoading(true);
      await axios.delete(`/supplies/${id}`);
      showSuccess("Request deleted successfully", 4000);
      await loadRequests();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || "Failed to delete request";
      showError(errorMsg, 5000);
      console.error("Error deleting request:", error);
    } finally {
      setLoading(false);
    }
  };

  const openUpdateModal = (request: SupplyRequest) => {
    setSelectedRequest(request);
    setNewStatus(request.status);
    setAdminNotes(request.admin_notes || "");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setAdminNotes("");
    setNewStatus("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "approved": return "bg-blue-100 text-blue-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "fulfilled": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-orange-100 text-orange-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100";
    }
  };

  const pendingCount = allRequests.filter(r => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin-dashboard")} className="text-green-700 hover:text-green-800 font-bold text-sm">
              ← BACK
            </button>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">📦 Requests</h1>
          </div>
          {pendingCount > 0 && (
            <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">{pendingCount} Pending</span>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filter Tabs */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-2 flex flex-wrap gap-2 lg:gap-1">
          {[
            { value: "all", label: "All" },
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "fulfilled", label: "Fulfilled" },
            { value: "rejected", label: "Rejected" }
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`flex-1 lg:flex-none px-3 py-2 rounded-lg font-bold text-sm transition ${
                filter === tab.value ? "bg-green-700 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:bg-gray-700"
              }`}
            >
              {tab.label} ({getFilterCount(tab.value)})
            </button>
          ))}
        </div>

        {/* Requests List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 dark:border-gray-600 border-t-green-600"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400 text-lg">📭 No supply requests found</p>
            </div>
          ) : (
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">Farmer</th>
                    <th className="px-6 py-3">Items</th>
                    <th className="px-6 py-3">Quantity</th>
                    <th className="px-6 py-3">Urgency</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-green-50 transition">
                      <td className="px-6 py-4 font-bold">{request.farmer_name || request.farmer_email}</td>
                      <td className="px-6 py-4 text-xs">{request.items.slice(0, 2).join(", ")}{request.items.length > 2 ? "..." : ""}</td>
                      <td className="px-6 py-4">{request.quantity}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${getUrgencyColor(request.urgency)}`}>
                          {request.urgency}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">{new Date(request.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 flex gap-2">
                        <button
                          onClick={() => openUpdateModal(request)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-bold transition"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteRequest(request.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-bold transition"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile Card View */}
          {!loading && filteredRequests.length > 0 && (
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRequests.map((request) => (
                <div key={request.id} className="p-4 hover:bg-green-50 transition">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100">{request.farmer_name || request.farmer_email}</h3>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                    <p><strong>Items:</strong> {request.items.join(", ")}</p>
                    <p><strong>Quantity:</strong> {request.quantity}</p>
                    <p><strong>Urgency:</strong> <span className={`px-2 py-1 text-xs font-bold rounded-full ${getUrgencyColor(request.urgency)}`}>{request.urgency}</span></p>
                    <p><strong>Date:</strong> {new Date(request.created_at).toLocaleDateString()}</p>
                  </div>
                  {request.notes && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded mb-4"><strong>Notes:</strong> {request.notes}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openUpdateModal(request)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded font-bold text-sm transition"
                    >
                      ✏️ Update
                    </button>
                    <button
                      onClick={() => deleteRequest(request.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded font-bold text-sm transition"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Update Supply Request</h2>
              <button onClick={closeModal} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:text-gray-100 text-2xl font-bold">×</button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2"><strong>Farmer:</strong> {selectedRequest.farmer_name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2"><strong>Items:</strong> {selectedRequest.items.join(", ")}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400"><strong>Quantity:</strong> {selectedRequest.quantity}</p>
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block mb-2">Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-green-500 outline-none"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="fulfilled">Fulfilled</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block mb-2">Admin Notes</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this request..."
                rows={4}
                className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={updateRequest}
                disabled={loading}
                className={`flex-1 font-bold py-2 px-4 rounded-lg transition ${
                  loading ? "bg-gray-400 cursor-not-allowed text-white" : "bg-green-700 hover:bg-green-800 text-white"
                }`}
              >
                {loading ? "Updating..." : "Update Request"}
              </button>
              <button
                onClick={closeModal}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 dark:text-gray-100 font-bold py-2 px-4 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
