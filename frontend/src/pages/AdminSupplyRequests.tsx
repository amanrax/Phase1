// src/pages/AdminSupplyRequests.tsx — Admin supply request management with stats, bulk ops, full detail
import { useCallback, useEffect, useRef, useState } from "react";
import BackButton from "@/components/BackButton";
import axios from "@/utils/axios";
import { useNotification } from "@/contexts/NotificationContext";
import { logger } from "@/utils/logger";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

const COMPONENT = "AdminSupplyRequests";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface SupplyItem       { name: string; quantity_value: number; quantity_unit: string; }
interface StatusHistory    { status: string; changed_by: string; role: string; note: string; timestamp: string; }
interface SupplyRequest {
  id: string; request_ref: string;
  farmer_id: string; farmer_name: string; farmer_email: string;
  farmer_phone: string; farmer_district: string; farmer_province: string;
  category: string; items: SupplyItem[]; urgency: string;
  delivery_location: string; preferred_delivery_date: string | null;
  purpose: string; season: string | null;
  farm_size_covered: number | null; budget_estimate: number | null;
  contact_phone: string | null; notes: string | null;
  status: string; admin_notes: string | null;
  estimated_delivery_date: string | null; fulfilled_items: string[];
  status_history: StatusHistory[];
  created_at: string; updated_at: string;
}
interface Stats {
  total: number;
  by_status:   Record<string,number>;
  by_urgency:  Record<string,number>;
  by_category: Record<string,number>;
  by_province: Record<string,number>;
  monthly:     { month: string; count: number }[];
}
interface AdminUpdateForm {
  status: string; admin_notes: string;
  estimated_delivery_date: string; fulfilled_items: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const STATUSES = [
  { value:"pending",    label:"Pending",    style:"bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300" },
  { value:"approved",   label:"Approved",   style:"bg-blue-100   dark:bg-blue-900/30   text-blue-800   dark:text-blue-300" },
  { value:"processing", label:"Processing", style:"bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300" },
  { value:"dispatched", label:"Dispatched", style:"bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300" },
  { value:"fulfilled",  label:"Fulfilled",  style:"bg-green-100  dark:bg-green-900/30  text-green-800  dark:text-green-300" },
  { value:"rejected",   label:"Rejected",   style:"bg-red-100    dark:bg-red-900/30    text-red-800    dark:text-red-300" },
  { value:"cancelled",  label:"Cancelled",  style:"bg-gray-100   dark:bg-gray-700      text-gray-600   dark:text-gray-400" },
];
const URGENCY_STYLES: Record<string,string> = {
  low:      "bg-green-100  dark:bg-green-900/30  text-green-800  dark:text-green-300",
  medium:   "bg-amber-100  dark:bg-amber-900/30  text-amber-800  dark:text-amber-300",
  high:     "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
  critical: "bg-red-100    dark:bg-red-900/30    text-red-800    dark:text-red-300",
};
const CATEGORIES = ["Seeds","Fertilizers","Pesticides","Tools","Equipment","Storage","Transport","Irrigation","Other"];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const statusStyle = (s: string) => STATUSES.find(x => x.value === s)?.style ?? "bg-gray-100 dark:bg-gray-700 text-gray-600";
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
const fmtDate = (s: string | null) => s ? new Date(s).toLocaleString("en-ZM",{dateStyle:"medium",timeStyle:"short"}) : "—";
const fmtDateOnly = (s: string | null) => s ? new Date(s).toLocaleDateString("en-ZM",{year:"numeric",month:"short",day:"numeric"}) : "—";

// ─── Status Timeline ────────────────────────────────────────────────────────────
function StatusTimeline({ history }: { history: StatusHistory[] }) {
  if (!history?.length) return <p className="text-xs text-gray-400">No history.</p>;
  return (
    <ol className="relative border-l-2 border-gray-200 dark:border-gray-600 ml-2 space-y-3">
      {history.map((h, i) => (
        <li key={i} className="ml-4">
          <span className="absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full ring-2 ring-white dark:ring-gray-800 bg-green-500 mt-0.5"></span>
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${statusStyle(h.status)}`}>{cap(h.status)}</span>
          <p className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(h.timestamp)} · {h.role === "FARMER" ? "Farmer" : "Admin"}: {h.changed_by}</p>
          {h.note && <p className="text-xs text-gray-600 dark:text-gray-300 italic">"{h.note}"</p>}
        </li>
      ))}
    </ol>
  );
}

// ─── Confirm Dialog ─────────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel, danger = true }: { message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <p className="text-gray-800 dark:text-gray-100 font-semibold text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition ${danger ? "bg-red-600 hover:bg-red-700" : "bg-green-700 hover:bg-green-800"}`}>
            Confirm
          </button>
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail / Edit Modal ────────────────────────────────────────────────────────
function DetailModal({ req, onClose, onUpdated, onDeleted }: {
  req: SupplyRequest; onClose: () => void; onUpdated: () => void; onDeleted: () => void;
}) {
  const { success: ok, error: err } = useNotification();
  const [tab, setTab] = useState<"details"|"edit"|"history">("details");
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelConfirm, setShowDelConfirm] = useState(false);
  const [upd, setUpd] = useState<AdminUpdateForm>({
    status:                   req.status,
    admin_notes:              req.admin_notes ?? "",
    estimated_delivery_date:  req.estimated_delivery_date?.split("T")[0] ?? "",
    fulfilled_items:          req.fulfilled_items?.join(", ") ?? "",
  });

  const handleUpdate = async () => {
    setSaving(true);
    const payload: any = {
      status: upd.status,
      ...(upd.admin_notes             && { admin_notes: upd.admin_notes }),
      ...(upd.estimated_delivery_date && { estimated_delivery_date: upd.estimated_delivery_date }),
      ...(upd.fulfilled_items         && {
        fulfilled_items: upd.fulfilled_items.split(",").map(s => s.trim()).filter(Boolean)
      }),
    };
    logger.info(COMPONENT, "updateRequest.start", { id: req.id, payload });
    try {
      await axios.patch(`/supplies/${req.id}`, payload);
      logger.info(COMPONENT, "updateRequest.success", { id: req.id });
      ok("Request updated successfully");
      onUpdated();
    } catch (e: any) {
      const msg = e.response?.data?.detail || "Failed to update request";
      logger.error(COMPONENT, "updateRequest.error", { id: req.id, msg, e });
      err(typeof msg === "string" ? msg : "Failed to update request");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    logger.info(COMPONENT, "deleteRequest.start", { id: req.id });
    try {
      await axios.delete(`/supplies/${req.id}`);
      logger.info(COMPONENT, "deleteRequest.success", { id: req.id });
      ok("Request deleted");
      onDeleted();
    } catch (e: any) {
      const msg = e.response?.data?.detail || "Failed to delete request";
      logger.error(COMPONENT, "deleteRequest.error", { id: req.id, msg, e });
      err(typeof msg === "string" ? msg : "Failed to delete request");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto" onClick={onClose}>
      {showDelConfirm && (
        <ConfirmDialog
          message={`Permanently delete request ${req.request_ref}? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelConfirm(false)}
        />
      )}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-green-700 to-emerald-800 rounded-t-2xl text-white">
          <div>
            <h2 className="text-lg font-bold">{req.request_ref}</h2>
            <p className="text-xs text-green-100">{req.farmer_name} · {req.farmer_district}, {req.farmer_province}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusStyle(req.status)}`}>{cap(req.status)}</span>
            <button onClick={onClose} className="text-white hover:text-green-200 text-2xl">&times;</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          {(["details","edit","history"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold capitalize transition ${tab === t ? "border-b-2 border-green-600 text-green-700 dark:text-green-400 bg-white dark:bg-gray-800" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
              {t === "edit" ? "Update Status" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 max-h-[65vh] overflow-y-auto space-y-4">
          {/* DETAILS TAB */}
          {tab === "details" && (
            <>
              {/* Farmer Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-2">Farmer</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-xs text-gray-400">Name</p><p className="font-semibold text-gray-800 dark:text-gray-200">{req.farmer_name}</p></div>
                  <div><p className="text-xs text-gray-400">Phone</p><p className="text-gray-800 dark:text-gray-200">{req.farmer_phone || "—"}</p></div>
                  <div><p className="text-xs text-gray-400">District</p><p className="text-gray-800 dark:text-gray-200">{req.farmer_district || "—"}</p></div>
                  <div><p className="text-xs text-gray-400">Province</p><p className="text-gray-800 dark:text-gray-200">{req.farmer_province || "—"}</p></div>
                </div>
              </div>

              {/* Urgency + Category */}
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${URGENCY_STYLES[req.urgency] ?? ""}`}>
                  {req.urgency === "critical" ? "🚨" : req.urgency === "high" ? "🔴" : req.urgency === "medium" ? "🟡" : "🟢"} {cap(req.urgency)}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300">{req.category}</span>
                {req.season && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">Season: {req.season}</span>}
              </div>

              {/* Items */}
              <div>
                <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 mb-2">Items Requested</h3>
                <div className="space-y-1">
                  {req.items.map((it, i) => (
                    <div key={i} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{it.name}</span>
                      <span className="text-gray-600 dark:text-gray-400">{it.quantity_value} {it.quantity_unit}</span>
                    </div>
                  ))}
                </div>
                {req.fulfilled_items?.length > 0 && (
                  <p className="text-xs text-green-700 dark:text-green-400 mt-2 font-semibold">Fulfilled: {req.fulfilled_items.join(", ")}</p>
                )}
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { l: "Purpose",          v: req.purpose },
                  { l: "Delivery Location",v: req.delivery_location },
                  { l: "Preferred Date",   v: fmtDateOnly(req.preferred_delivery_date) },
                  { l: "Est. Delivery",    v: fmtDateOnly(req.estimated_delivery_date) },
                  { l: "Farm Size",        v: req.farm_size_covered ? `${req.farm_size_covered} ha` : null },
                  { l: "Budget",           v: req.budget_estimate   ? `ZMW ${req.budget_estimate.toLocaleString()}` : null },
                  { l: "Contact Phone",    v: req.contact_phone },
                  { l: "Submitted",        v: fmtDate(req.created_at) },
                  { l: "Last Updated",     v: fmtDate(req.updated_at) },
                ].filter(r => r.v && r.v !== "—").map(({ l, v }) => (
                  <div key={l} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{l}</p>
                    <p className="text-gray-800 dark:text-gray-200 text-xs mt-0.5">{v}</p>
                  </div>
                ))}
              </div>

              {req.notes && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">Farmer Notes</p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">{req.notes}</p>
                </div>
              )}
              {req.admin_notes && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-300 dark:border-indigo-600 rounded-xl px-4 py-3">
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">Admin Notes</p>
                  <p className="text-sm text-indigo-800 dark:text-indigo-200">{req.admin_notes}</p>
                </div>
              )}
            </>
          )}

          {/* EDIT/UPDATE TAB */}
          {tab === "edit" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Status</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {STATUSES.map(s => (
                    <button key={s.value} type="button"
                      onClick={() => setUpd(p => ({ ...p, status: s.value }))}
                      className={`py-2 rounded-xl text-xs font-bold border-2 transition ${upd.status === s.value ? s.style + " border-transparent" : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Admin Notes</label>
                <textarea
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none resize-none"
                  rows={3} placeholder="Add response or notes visible to farmer"
                  value={upd.admin_notes} onChange={e => setUpd(p => ({ ...p, admin_notes: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Estimated Delivery Date</label>
                <input type="date"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                  value={upd.estimated_delivery_date} onChange={e => setUpd(p => ({ ...p, estimated_delivery_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Fulfilled Items (comma-separated)</label>
                <input
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="e.g. Maize seeds, Fertilizer"
                  value={upd.fulfilled_items} onChange={e => setUpd(p => ({ ...p, fulfilled_items: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleUpdate} disabled={saving}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white transition">
                  {saving ? "Saving..." : "Save Update"}
                </button>
                <button onClick={() => setShowDelConfirm(true)} disabled={deleting}
                  className="py-3 px-5 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white transition">
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {tab === "history" && (
            <StatusTimeline history={req.status_history} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stats Card ─────────────────────────────────────────────────────────────────
function StatsCard({ label, count, sub, color }: { label:string; count:number; sub?:string; color:string }) {
  return (
    <div className={`rounded-2xl p-4 border ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-3xl font-extrabold mt-1">{count}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminSupplyRequests() {
  const { success: ok, error: err } = useNotification();

  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [total,    setTotal]    = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [statsLoading,  setStatsLoading]  = useState(false);

  const [search,         setSearch]         = useState("");
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterUrgency,  setFilterUrgency]  = useState("all");

  const [detailReq,      setDetailReq]      = useState<SupplyRequest | null>(null);
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set());
  const [bulkAction,     setBulkAction]     = useState<{ action:"approve"|"reject"; message:string } | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    logger.info(COMPONENT, "loadStats.start");
    try {
      const res = await axios.get("/supplies/stats");
      setStats(res.data);
      logger.info(COMPONENT, "loadStats.success");
    } catch (e: any) {
      logger.error(COMPONENT, "loadStats.error", { e });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadRequests = useCallback(async (params?: Record<string,string>) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    const p: Record<string,string> = {
      limit: "100", skip: "0",
      ...(filterStatus   !== "all" ? { status: filterStatus }     : {}),
      ...(filterCategory !== "all" ? { category: filterCategory } : {}),
      ...(filterUrgency  !== "all" ? { urgency: filterUrgency }   : {}),
      ...(search.trim()            ? { search: search.trim() }    : {}),
      ...params,
    };
    logger.info(COMPONENT, "loadRequests.start", { p });
    try {
      const res = await axios.get("/supplies/all", { params: p, signal: abortRef.current.signal });
      setRequests(res.data.requests || []);
      setTotal(res.data.total ?? 0);
      logger.info(COMPONENT, "loadRequests.success", { count: res.data.total });
    } catch (e: any) {
      if (e.code === "ERR_CANCELED") return;
      logger.error(COMPONENT, "loadRequests.error", { e });
      err("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCategory, filterUrgency, search, err]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadRequests(), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [loadRequests, filterStatus, filterCategory, filterUrgency, search]);

  const refresh = () => { loadRequests(); loadStats(); };

  // Pull-to-refresh on mobile (P8)
  const { pulling, pullDistance, threshold } = usePullToRefresh({
    onRefresh: refresh,
    disabled: loading,
  });

  // Selection helpers
  const toggleSelect = (id: string) =>
    setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll  = () => setSelectedIds(new Set(requests.map(r => r.id)));
  const clearSelect = () => setSelectedIds(new Set());

  // Quick action (single)
  const quickAction = async (id: string, newStatus: "approved" | "rejected") => {
    logger.info(COMPONENT, `quickAction.start`, { id, newStatus });
    try {
      await axios.patch(`/supplies/${id}`, { status: newStatus });
      logger.info(COMPONENT, `quickAction.success`, { id, newStatus });
      ok(`Request ${newStatus}`);
      refresh();
    } catch (e: any) {
      logger.error(COMPONENT, "quickAction.error", { id, e });
      err(`Failed to ${newStatus} request`);
    }
  };

  // Bulk action
  const executeBulk = async () => {
    if (!bulkAction) return;
    setBulkProcessing(true);
    const ids = [...selectedIds];
    const newStatus = bulkAction.action === "approve" ? "approved" : "rejected";
    logger.info(COMPONENT, "bulkAction.start", { ids, newStatus });
    const results = await Promise.allSettled(ids.map(id => axios.patch(`/supplies/${id}`, { status: newStatus })));
    const succeeded = results.filter(r => r.status === "fulfilled").length;
    const failed    = results.filter(r => r.status === "rejected").length;
    logger.info(COMPONENT, "bulkAction.complete", { succeeded, failed });
    if (failed === 0) ok(`All ${succeeded} requests ${newStatus}`);
    else err(`${succeeded} succeeded, ${failed} failed`);
    clearSelect();
    setBulkAction(null);
    setBulkProcessing(false);
    refresh();
  };

  const statsCards = stats ? [
    { label:"Total",      count: stats.total,                    color:"border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200" },
    { label:"Pending",    count: stats.by_status["pending"]   || 0, sub:"Awaiting review",     color:"border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-200" },
    { label:"Approved",   count: stats.by_status["approved"]  || 0, color:"border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200" },
    { label:"Processing", count: stats.by_status["processing"] || 0, color:"border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-200" },
    { label:"Dispatched", count: stats.by_status["dispatched"] || 0, color:"border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200" },
    { label:"Fulfilled",  count: stats.by_status["fulfilled"]  || 0, color:"border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200" },
    { label:"Rejected",   count: stats.by_status["rejected"]   || 0, color:"border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200" },
  ] : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      {/* Modals */}
      {detailReq && (
        <DetailModal
          req={detailReq}
          onClose={() => setDetailReq(null)}
          onUpdated={() => { setDetailReq(null); refresh(); }}
          onDeleted={() => { setDetailReq(null); refresh(); }}
        />
      )}
      {bulkAction && (
        <ConfirmDialog
          message={bulkAction.message}
          onConfirm={executeBulk}
          onCancel={() => setBulkAction(null)}
          danger={bulkAction.action === "reject"}
        />
      )}
      {bulkProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-gray-700 border-t-green-600 mx-auto mb-4"></div>
            <p className="text-gray-700 dark:text-gray-300 font-semibold">Processing bulk action...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackButton to="/admin-dashboard" />
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">Supply Requests</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{total} total · {stats?.by_status["pending"] || 0} pending</p>
            </div>
          </div>
          <button onClick={refresh} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 transition text-lg" title="Refresh">↻</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Pull-to-refresh indicator */}
        {pulling && (
          <div
            className="flex items-center justify-center gap-2 text-sm font-medium text-green-600 dark:text-green-400 transition-all"
            style={{ height: `${Math.min(pullDistance, threshold + 20)}px` }}
          >
            <div className={`w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full ${pullDistance >= threshold ? "animate-spin" : ""}`} />
            <span>{pullDistance >= threshold ? "Release to refresh…" : "Pull to refresh…"}</span>
          </div>
        )}
        {/* Stats Grid */}
        {statsLoading ? (
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
            {statsCards.map(c => <StatsCard key={c.label} {...c} />)}
          </div>
        )}

        {/* Top Distributions */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">By Category</h3>
              <div className="space-y-2">
                {Object.entries(stats.by_category).sort((a,b) => b[1]-a[1]).slice(0,5).map(([cat,cnt]) => {
                  const pct = stats.total > 0 ? Math.round((cnt / stats.total) * 100) : 0;
                  return (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="text-xs text-gray-700 dark:text-gray-300 w-24 truncate">{cat}</span>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">{cnt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">By Province (top 5)</h3>
              <div className="space-y-2">
                {Object.entries(stats.by_province).sort((a,b) => b[1]-a[1]).slice(0,5).map(([prov,cnt]) => {
                  const pct = stats.total > 0 ? Math.round((cnt / stats.total) * 100) : 0;
                  return (
                    <div key={prov} className="flex items-center gap-2">
                      <span className="text-xs text-gray-700 dark:text-gray-300 w-28 truncate">{prov}</span>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">{cnt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <input
            className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
            placeholder="Search by ref, farmer name, category, item name..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <select
              className="px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select
              className="px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
              value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              className="px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
              value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}>
              <option value="all">All Urgency</option>
              {["low","medium","high","critical"].map(u => <option key={u} value={u}>{cap(u)}</option>)}
            </select>
          </div>
        </div>

        {/* Bulk actions bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-indigo-600 dark:bg-indigo-700 text-white rounded-2xl px-5 py-3">
            <span className="font-semibold text-sm">{selectedIds.size} selected</span>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => setBulkAction({ action:"approve", message:`Approve all ${selectedIds.size} selected requests?` })}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-green-500 hover:bg-green-400 transition">
                Approve All
              </button>
              <button
                onClick={() => setBulkAction({ action:"reject",  message:`Reject all ${selectedIds.size} selected requests?` })}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-500 hover:bg-red-400 transition">
                Reject All
              </button>
              <button onClick={clearSelect} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/20 hover:bg-white/30 transition">
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-3">
                      <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-20" />
                      <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-28" />
                      <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-16" />
                    </div>
                    <div className="flex gap-3">
                      <div className="h-3 rounded bg-gray-100 dark:bg-gray-600 w-32" />
                      <div className="h-3 rounded bg-gray-100 dark:bg-gray-600 w-20" />
                    </div>
                  </div>
                  <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <p className="text-5xl mb-4">📦</p>
            <p className="font-bold text-gray-700 dark:text-gray-300 text-lg">No supply requests found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting the filters</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-4 py-3 w-8">
                      <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600"
                        checked={selectedIds.size === requests.length && requests.length > 0}
                        onChange={e => e.target.checked ? selectAll() : clearSelect()}
                      />
                    </th>
                    <th className="px-4 py-3">Ref</th>
                    <th className="px-4 py-3">Farmer</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Urgency</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {requests.map(req => (
                    <tr key={req.id} className={`hover:bg-green-50 dark:hover:bg-green-900/10 transition ${selectedIds.has(req.id) ? "bg-indigo-50 dark:bg-indigo-900/10" : ""}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600"
                          checked={selectedIds.has(req.id)}
                          onChange={() => toggleSelect(req.id)}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{req.request_ref || "—"}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800 dark:text-gray-200 text-xs">{req.farmer_name || req.farmer_email}</p>
                        <p className="text-gray-400 text-xs">{req.farmer_district || "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {req.items.slice(0,2).map(i=>`${i.name}(${i.quantity_value}${i.quantity_unit})`).join(", ")}
                        {req.items.length > 2 && <span className="text-gray-400"> +{req.items.length-2}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${URGENCY_STYLES[req.urgency] || ""}`}>{cap(req.urgency)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusStyle(req.status)}`}>{cap(req.status)}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDateOnly(req.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 text-xs">
                          <button onClick={() => setDetailReq(req)} className="px-2 py-1 rounded font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 transition whitespace-nowrap">View</button>
                          {req.status === "pending" && <>
                            <button onClick={() => quickAction(req.id, "approved")} className="px-2 py-1 rounded font-bold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 transition whitespace-nowrap">Approve</button>
                            <button onClick={() => quickAction(req.id, "rejected")} className="px-2 py-1 rounded font-bold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 transition whitespace-nowrap">Reject</button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {requests.map(req => (
                <div key={req.id} className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 space-y-3 ${selectedIds.has(req.id) ? "ring-2 ring-indigo-400" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <input type="checkbox" className="mt-0.5 rounded border-gray-300 dark:border-gray-600" checked={selectedIds.has(req.id)} onChange={() => toggleSelect(req.id)} />
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{req.request_ref || "—"}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{req.farmer_name} · {fmtDateOnly(req.created_at)}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${statusStyle(req.status)}`}>{cap(req.status)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {req.items.slice(0,2).map((it,i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300">{it.name}</span>
                    ))}
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${URGENCY_STYLES[req.urgency] || ""}`}>{cap(req.urgency)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setDetailReq(req)} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 transition">View / Edit</button>
                    {req.status === "pending" && <>
                      <button onClick={() => quickAction(req.id, "approved")} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 transition">Approve</button>
                      <button onClick={() => quickAction(req.id, "rejected")} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 transition">Reject</button>
                    </>}
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
