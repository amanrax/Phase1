// src/pages/ChangeRequests.tsx — Farmer change request management (v4.0)
import { useCallback, useEffect, useState } from "react";
import BackButton from "@/components/BackButton";
import { changeRequestsService, ChangeRequest } from "@/services/changeRequests.service";
import { useNotification } from "@/contexts/NotificationContext";
import { logger } from "@/utils/logger";
import FarmerBottomNav from "@/components/FarmerBottomNav";
import { useFeedback } from "@/utils/feedback";

const COMPONENT = "ChangeRequests";

// Field choices the farmer can request changes for
const CHANGEABLE_FIELDS = [
  { value: "phone_primary", label: "Primary Phone" },
  { value: "phone_secondary", label: "Secondary Phone" },
  { value: "email", label: "Email" },
  { value: "date_of_birth", label: "Date of Birth" },
  { value: "village", label: "Village" },
  { value: "ward", label: "Ward" },
  { value: "camp", label: "Camp" },
  { value: "chiefdom", label: "Chiefdom" },
  { value: "farm_size", label: "Farm Size" },
  { value: "irrigation_access", label: "Irrigation Access" },
];

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
  approved: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
  rejected: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
};

const ChangeRequests = () => {
  const toast = useNotification();
  const { triggerSound, triggerVibration } = useFeedback();
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [fieldName, setFieldName] = useState("");
  const [oldValue, setOldValue] = useState("");
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const start = performance.now();
      logger.info(COMPONENT, "Fetching change requests", { filter });
      const statusParam = filter === "all" ? undefined : filter;
      const res = await changeRequestsService.listMine(statusParam);
      setRequests(res.requests);
      logger.info(COMPONENT, `Change requests loaded (${Math.round(performance.now() - start)}ms)`, {
        count: res.requests.length,
        filter,
      });
    } catch (err) {
      logger.error(COMPONENT, "Failed to fetch change requests", { err });
      toast.error("Failed to load change requests");
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSubmit = async () => {
    if (!fieldName || !newValue.trim()) {
      toast.warning("Please select a field and provide the new value");
      return;
    }
    try {
      setSubmitting(true);
      logger.info(COMPONENT, "Submitting change request", { fieldName, newValue: newValue.trim() });
      await changeRequestsService.create({
        field_name: fieldName,
        old_value: oldValue,
        new_value: newValue.trim(),
        reason: reason.trim(),
      });
      logger.info(COMPONENT, "Change request submitted", { fieldName });
      triggerVibration("doc_approved");
      triggerSound("save_success");
      toast.success("Change request submitted! Your operator will review it.");
      setShowForm(false);
      setFieldName("");
      setOldValue("");
      setNewValue("");
      setReason("");
      fetchRequests();
    } catch (err) {
      logger.error(COMPONENT, "Failed to submit change request", { err });
      triggerVibration("form_error");
      triggerSound("error");
      toast.error("Failed to submit change request");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return d;
    }
  };

  // ── Skeleton ─────────────────────────────────────────────────────────────
  const Skeleton = () => (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BackButton to="/farmer-dashboard" label="" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Change Requests</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {showForm ? "Cancel" : "+ New Request"}
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex mt-3 gap-2 overflow-x-auto">
          {(["all", "pending", "approved", "rejected"] as StatusFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === tab
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* New Request Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Request a Profile Change</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select the field you want to change and provide the new value. Your operator will review and approve the change.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Field to Change</label>
              <select
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Select field...</option>
                {CHANGEABLE_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Value (optional)</label>
              <input
                type="text"
                value={oldValue}
                onChange={(e) => setOldValue(e.target.value)}
                placeholder="What it currently shows..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Value <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="What it should be..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Why this change is needed..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !fieldName || !newValue.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Submitting...
                </span>
              ) : "Submit Change Request"}
            </button>
          </div>
        )}

        {/* Request List */}
        {loading ? (
          <Skeleton />
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No change requests</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              {filter !== "all" ? `No ${filter} requests found.` : "Tap '+ New Request' to request a profile update."}
            </p>
          </div>
        ) : (
          requests.map((r) => (
            <div key={r.request_id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {CHANGEABLE_FIELDS.find((f) => f.value === r.field_name)?.label || r.field_name}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(r.created_at)}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[r.status] || "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}>
                  {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                </span>
              </div>

              <div className="space-y-1 text-sm">
                {r.old_value && (
                  <div className="flex gap-2">
                    <span className="text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">From:</span>
                    <span className="text-gray-600 dark:text-gray-300 line-through">{r.old_value}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">To:</span>
                  <span className="text-gray-900 dark:text-white font-medium">{r.new_value}</span>
                </div>
                {r.reason && (
                  <div className="flex gap-2">
                    <span className="text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">Reason:</span>
                    <span className="text-gray-600 dark:text-gray-300">{r.reason}</span>
                  </div>
                )}
              </div>

              {/* Decision note */}
              {r.decision_note && (
                <div className={`mt-3 p-2.5 rounded-lg text-sm ${
                  r.status === "approved"
                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                    : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                }`}>
                  <span className="font-medium">Operator note:</span> {r.decision_note}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <FarmerBottomNav />
    </div>
  );
};

export default ChangeRequests;
