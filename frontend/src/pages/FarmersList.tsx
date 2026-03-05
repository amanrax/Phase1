// src/pages/FarmersList.tsx — Peak-functionality farmers list
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "@/components/BackButton";
import { farmerService } from "@/services/farmer.service";
import { useNotification } from "@/contexts/NotificationContext";
import { logger } from "@/utils/logger";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
// ─── Types ────────────────────────────────────────────────────────────────────
interface Farmer {
  _id: string;
  farmer_id: string;
  personal_info?: { first_name?: string; last_name?: string; phone_primary?: string; };
  full_name?: string;
  phone?: string;
  phone_primary?: string;
  first_name?: string;
  last_name?: string;
  address?: { village?: string; district_name?: string; province_name?: string; };
  district?: string;
  district_name?: string;
  province_name?: string;
  location?: { district_name?: string; province_name?: string; };
  village?: string;
  nrc?: string;
  national_id?: string;
  registration_status?: string;
  created_at?: string;
  is_active: boolean;
}

type FilterType = "all" | "active" | "pending" | "inactive";
type SearchField = "name" | "farmer_id" | "nrc";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getFarmerName(f: Farmer): string {
  if (f.full_name?.trim()) return f.full_name.trim();
  const first = (f as any).first_name?.trim() || f.personal_info?.first_name?.trim() || "";
  const last  = (f as any).last_name?.trim()  || f.personal_info?.last_name?.trim()  || "";
  return (`${first} ${last}`).trim() || "Unnamed Farmer";
}

function getFarmerPhone(f: Farmer): string {
  return f.phone?.trim() || (f as any).phone_primary?.trim() || f.personal_info?.phone_primary?.trim() || "—";
}

function getFarmerDistrict(f: Farmer): string {
  return (f as any).district_name?.trim() || f.district?.trim() || f.address?.district_name?.trim() || f.location?.district_name?.trim() || "—";
}

function getFarmerProvince(f: Farmer): string {
  return f.province_name?.trim() || (f as any).province?.trim() || f.address?.province_name?.trim() || f.location?.province_name?.trim() || "—";
}

function formatDate(s?: string): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-ZM", { year: "numeric", month: "short", day: "numeric" });
}

interface StatusMeta { label: string; color: string; }
function getStatusMeta(f: Farmer): StatusMeta {
  if (!f.is_active) return { label: "Inactive", color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" };
  const s = f.registration_status?.toLowerCase() || "registered";
  const map: Record<string, StatusMeta> = {
    registered:        { label: "✓ Registered",   color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
    verified:          { label: "✅ Verified",     color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
    pending:           { label: "⏳ Pending",      color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400" },
    submitted:         { label: "⏳ Submitted",    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400" },
    under_review:      { label: "🔍 Under Review", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
    pending_documents: { label: "📄 Docs Needed",  color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400" },
    rejected:          { label: "✗ Rejected",      color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  };
  return map[s] ?? { label: s, color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-2/5" />
        <div className="h-3 bg-gray-100 dark:bg-gray-700/60 rounded w-1/4" />
      </div>
      <div className="w-20 h-5 bg-gray-200 dark:bg-gray-700 rounded-full" />
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
interface ConfirmProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}
function ConfirmDialog({ message, onConfirm, onCancel, danger }: ConfirmProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-100 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-5 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition active:scale-95 ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
            }`}
          >Confirm</button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition active:scale-95"
          >Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────
interface ReviewModalProps {
  farmer: Farmer;
  onClose:  () => void;
  onSaved: () => void;
}
function ReviewModal({ farmer, onClose, onSaved }: ReviewModalProps) {
  const notify = useNotification();
  const [status, setStatus]   = useState(farmer.registration_status || "");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    if (!status) { notify.warning("Please select a status"); return; }
    setSaving(true);
    logger.info("FarmersList", "Reviewing farmer", { farmer_id: farmer.farmer_id, new_status: status });
    try {
      const qs = `new_status=${encodeURIComponent(status)}&review_notes=${encodeURIComponent(remarks)}`;
      await farmerService.review(farmer.farmer_id, qs);
      logger.info("FarmersList", "Farmer review saved", { farmer_id: farmer.farmer_id, status });
      notify.success(`Status updated to "${status}" for ${getFarmerName(farmer)}`);
      onSaved();
      onClose();
    } catch (err: any) {
      const code = err?.response?.status;
      const msg  = err?.response?.data?.detail || err?.message || "Failed to update status";
      logger.error("FarmersList", "Farmer review failed", { farmer_id: farmer.farmer_id, error: msg, code });
      if (code === 401)      notify.error("Session expired — please log in again.");
      else if (code === 403) notify.error("You don't have permission to review farmers.");
      else if (code === 404) notify.error("Farmer not found. Refresh and try again.");
      else if (code === 422) notify.error(`Validation error: ${msg}`);
      else                   notify.error(`Update failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">📋 Review Farmer</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 text-lg">✕</button>
        </div>
        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Farmer info */}
          <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Farmer</p>
            <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">{getFarmerName(farmer)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{farmer.farmer_id} · {getFarmerDistrict(farmer)}</p>
          </div>
          {/* Current status */}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Current Status</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getStatusMeta(farmer).color}`}>
              {getStatusMeta(farmer).label}
            </span>
          </div>
          {/* New status */}
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1.5">
              New Status <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">— Select Status —</option>
              <option value="under_review">🔍 Under Review</option>
              <option value="registered">✓ Registered (Approved)</option>
              <option value="pending_documents">📄 Pending Documents</option>
              <option value="verified">✅ Verified</option>
              <option value="rejected">✗ Rejected</option>
              <option value="pending">⏳ Pending</option>
            </select>
          </div>
          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1.5">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional notes about this decision..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>
        </div>
        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
          <button
            onClick={handleSave}
            disabled={saving || !status}
            className="flex-1 text-sm font-bold py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "✓ Update Status"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 text-sm font-bold py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Farmer Card (mobile) ──────────────────────────────────────────────────────
interface FarmerCardProps {
  farmer: Farmer;
  actioningId: string | null;
  onView: () => void;
  onEdit: () => void;
  onReview: () => void;
  onToggleActive: () => void;
}
function FarmerCard({ farmer, actioningId, onView, onEdit, onReview, onToggleActive }: FarmerCardProps) {
  const meta    = getStatusMeta(farmer);
  const busy    = actioningId === farmer.farmer_id;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Top row */}
      <div className="flex items-start gap-3 p-4">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
          {getFarmerName(farmer)[0]?.toUpperCase() ?? "F"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{getFarmerName(farmer)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{farmer.farmer_id}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${meta.color}`}>
          {meta.label}
        </span>
      </div>
      {/* Detail row */}
      <div className="flex gap-0 border-t border-gray-50 dark:border-gray-700/60">
        {[
          { k: "📍 District", v: getFarmerDistrict(farmer) },
          { k: "📞 Phone",    v: getFarmerPhone(farmer) },
          { k: "📅 Joined",   v: formatDate(farmer.created_at) },
        ].map(({ k, v }) => (
          <div key={k} className="flex-1 px-3 py-2 border-r last:border-r-0 border-gray-50 dark:border-gray-700/60">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{k}</p>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{v}</p>
          </div>
        ))}
      </div>
      {/* Action buttons */}
      <div className="flex border-t border-gray-100 dark:border-gray-700">
        <button onClick={onView}   className="flex-1 py-2.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition active:scale-95">👁 View</button>
        <button onClick={onEdit}   className="flex-1 py-2.5 text-[11px] font-bold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition border-x border-gray-100 dark:border-gray-700 active:scale-95">✏️ Edit</button>
        <button onClick={onReview} className="flex-1 py-2.5 text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition border-r border-gray-100 dark:border-gray-700 active:scale-95">📋 Review</button>
        <button
          onClick={onToggleActive}
          disabled={busy}
          className={`flex-1 py-2.5 text-[11px] font-bold transition active:scale-95 disabled:opacity-50 ${
            farmer.is_active
              ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              : "text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
          }`}
        >
          {busy ? "…" : farmer.is_active ? "🔴 Off" : "🟢 On"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FarmersList() {
  const navigate = useNavigate();
  const notify   = useNotification();

  const [allFarmers,      setAllFarmers]      = useState<Farmer[]>([]);
  const [filteredFarmers, setFilteredFarmers] = useState<Farmer[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);

  // Pull-to-refresh on mobile (P8)
  const { pulling, pullDistance, threshold } = usePullToRefresh({
    onRefresh: () => loadFarmers(currentPage, true),
    disabled: loading || refreshing,
  });
  const [filter,          setFilter]          = useState<FilterType>("all");
  const [searchBy,        setSearchBy]        = useState<SearchField>("name");
  const [searchValue,     setSearchValue]     = useState("");
  const [provinceFilter,  setProvinceFilter]  = useState<string>("all");
  const [districtFilter,  setDistrictFilter]  = useState<string>("all");
  const [currentPage,     setCurrentPage]     = useState(0);
  const PAGE_SIZE = 20;
  const [totalCount,      setTotalCount]      = useState(0);

  // Modals / actions
  const [reviewFarmer,    setReviewFarmer]    = useState<Farmer | null>(null);
  const [confirmAction,   setConfirmAction]   = useState<{ farmer: Farmer; action: "activate" | "deactivate" } | null>(null);
  const [actioningId,     setActioningId]     = useState<string | null>(null);

  const loadingRef = useRef(false);

  // ── Load page of farmers ────────────────────────────────────────────────
  const loadFarmers = useCallback(async (page = 0, isRefresh = false) => {
    if (loadingRef.current) { logger.warn("FarmersList", "Load already in-progress"); return; }
    loadingRef.current = true;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const skip = page * PAGE_SIZE;
    logger.info("FarmersList", "Loading farmers", { page, skip, limit: PAGE_SIZE });

    try {
      const data = await farmerService.getFarmers(PAGE_SIZE, skip);
      let list: Farmer[] = [];
      if (Array.isArray(data))                              list = data;
      else if (Array.isArray(data?.results))                list = data.results;
      else if (Array.isArray(data?.farmers))                list = data.farmers;

      setAllFarmers(list);
      setTotalCount(data?.total ?? data?.count ?? list.length);
      setCurrentPage(page);
      logger.info("FarmersList", "Farmers loaded", { count: list.length, page });
      if (isRefresh) notify.success("List refreshed.");
    } catch (err: any) {
      const code = err?.response?.status;
      const msg  = err?.response?.data?.detail || err?.message || "Failed to load farmers";
      logger.error("FarmersList", "Load failed", { error: msg, code, page });
      if      (code === 401) { notify.error("Session expired. Please log in again."); }
      else if (code === 403) { notify.error("Access denied."); }
      else if (code === 500) { notify.error("Server error — please try again."); }
      else                   { notify.error(msg); }
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  }, [notify]);

  useEffect(() => { loadFarmers(0); }, [loadFarmers]);

  // ── Apply filter + search ────────────────────────────────────────────────
  useEffect(() => {
    let result = allFarmers;
    if (filter === "active")   result = result.filter(f => f.is_active && ["registered","approved","verified"].includes((f.registration_status||"").toLowerCase()));
    if (filter === "pending")  result = result.filter(f => ["pending","submitted","under_review","pending_documents"].includes((f.registration_status||"").toLowerCase()));
    if (filter === "inactive") result = result.filter(f => !f.is_active || f.registration_status?.toLowerCase() === "rejected");

    if (provinceFilter !== "all") {
      result = result.filter(f => getFarmerProvince(f) === provinceFilter);
    }
    if (districtFilter !== "all") {
      result = result.filter(f => getFarmerDistrict(f) === districtFilter);
    }
    if (searchValue.trim()) {
      const q = searchValue.toLowerCase().trim();
      result = result.filter(f => {
        if (searchBy === "name")      return getFarmerName(f).toLowerCase().includes(q);
        if (searchBy === "farmer_id") return f.farmer_id.toLowerCase().includes(q);
        if (searchBy === "nrc")       return ((f.nrc || f.national_id || "") as string).toLowerCase().includes(q);
        return false;
      });
    }
    setFilteredFarmers(result);
    logger.info("FarmersList", "Filter applied", { filter, searchBy, searchValue, provinceFilter, districtFilter, resultCount: result.length });
  }, [filter, allFarmers, searchBy, searchValue, provinceFilter, districtFilter]);

  const getCount = (f: FilterType) => {
    if (f === "all")      return allFarmers.length;
    if (f === "active")   return allFarmers.filter(x => x.is_active && ["registered","approved","verified"].includes((x.registration_status||"").toLowerCase())).length;
    if (f === "pending")  return allFarmers.filter(x => ["pending","submitted","under_review","pending_documents"].includes((x.registration_status||"").toLowerCase())).length;
    if (f === "inactive") return allFarmers.filter(x => !x.is_active || x.registration_status?.toLowerCase() === "rejected").length;
    return 0;
  };

  // ── Activate / Deactivate ────────────────────────────────────────────────
  const executeToggleActive = async () => {
    if (!confirmAction) return;
    const { farmer, action } = confirmAction;
    setConfirmAction(null);
    setActioningId(farmer.farmer_id);
    logger.info("FarmersList", `${action} farmer`, { farmer_id: farmer.farmer_id });
    try {
      if (action === "deactivate") await farmerService.deactivateFarmer(farmer.farmer_id);
      else                         await farmerService.activateFarmer(farmer.farmer_id);
      logger.info("FarmersList", `Farmer ${action}d`, { farmer_id: farmer.farmer_id });
      notify.success(`${getFarmerName(farmer)} ${action}d successfully.`);
      loadFarmers(currentPage, true);
    } catch (err: any) {
      const code = err?.response?.status;
      const msg  = err?.response?.data?.detail || err?.message || `Failed to ${action} farmer`;
      logger.error("FarmersList", `${action} farmer failed`, { farmer_id: farmer.farmer_id, error: msg, code });
      if      (code === 401) notify.error("Session expired. Please log in again.");
      else if (code === 403) notify.error("You don't have permission to modify farmers.");
      else if (code === 404) notify.error("Farmer not found. Refresh and try again.");
      else if (code === 422) notify.error(`Validation error: ${msg}`);
      else                   notify.error(`${action.charAt(0).toUpperCase() + action.slice(1)} failed: ${msg}`);
    } finally {
      setActioningId(null);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 pb-8">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-base font-extrabold text-gray-800 dark:text-gray-100">👨‍🌾 Farmers</h1>
              {!loading && <p className="text-[11px] text-gray-500 dark:text-gray-400">{totalCount} total</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { logger.info("FarmersList", "Refresh triggered"); loadFarmers(currentPage, true); }}
              disabled={refreshing || loading}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition active:scale-90 disabled:opacity-40"
              aria-label="Refresh"
            >
              <span className={refreshing ? "animate-spin block" : "block"}>🔄</span>
            </button>
            <button
              onClick={() => { logger.info("FarmersList", "Navigate: Add Farmer"); navigate("/farmers/create"); }}
              className="text-xs font-bold px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition active:scale-95 shadow-sm"
            >
              + Add
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-4 space-y-4">
        {/* Pull-to-refresh indicator */}
        {pulling && (
          <div
            className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-green-600 dark:text-green-400 transition-all"
            style={{ height: `${Math.min(pullDistance, threshold + 20)}px` }}
          >
            <div className={`w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full ${pullDistance >= threshold ? "animate-spin" : ""}`} />
            <span>{pullDistance >= threshold ? "Release to refresh…" : "Pull to refresh…"}</span>
          </div>
        )}
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {(["all", "active", "pending", "inactive"] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); logger.info("FarmersList", "Filter changed", { filter: f }); }}
              className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                filter === f
                  ? "bg-green-600 text-white shadow-sm"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({getCount(f)})
            </button>
          ))}
        </div>

        {/* Province + District filters */}
        {(() => {
          const provinces = Array.from(new Set(allFarmers.map(getFarmerProvince).filter(p => p !== "—"))).sort();
          const districts = Array.from(new Set(
            allFarmers
              .filter(f => provinceFilter === "all" || getFarmerProvince(f) === provinceFilter)
              .map(getFarmerDistrict)
              .filter(d => d !== "—")
          )).sort();
          return (
            <div className="flex gap-2">
              <select
                value={provinceFilter}
                onChange={(e) => { setProvinceFilter(e.target.value); setDistrictFilter("all"); }}
                className="flex-1 text-xs px-2 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Provinces</option>
                {provinces.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="flex-1 text-xs px-2 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Districts</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          );
        })()}

        {/* Search */}
        <div className="flex gap-2">
          <select
            value={searchBy}
            onChange={(e) => { setSearchBy(e.target.value as SearchField); logger.info("FarmersList", "SearchBy changed", { searchBy: e.target.value }); }}
            className="w-28 text-xs px-2 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 flex-shrink-0"
          >
            <option value="name">Name</option>
            <option value="farmer_id">ID</option>
            <option value="nrc">NRC</option>
          </select>
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={`Search by ${searchBy === "farmer_id" ? "Farmer ID" : searchBy.toUpperCase()}…`}
              className="w-full text-sm px-3 py-2 pr-8 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {searchValue && (
              <button
                onClick={() => { setSearchValue(""); logger.info("FarmersList", "Search cleared"); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
              >✕</button>
            )}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {[...Array(8)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : filteredFarmers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
            <p className="text-3xl mb-2">🌾</p>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">No farmers found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {searchValue ? "Try a different search term" : "Change the filter or register a new farmer"}
            </p>
            {filter !== "all" && (
              <button
                onClick={() => setFilter("all")}
                className="mt-4 text-xs font-bold text-green-600 dark:text-green-400 active:opacity-70"
              >Show All Farmers</button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filteredFarmers.map(f => (
                <FarmerCard
                  key={f._id}
                  farmer={f}
                  actioningId={actioningId}
                  onView={() => { logger.info("FarmersList", "View farmer", { id: f.farmer_id }); navigate(`/farmers/${f.farmer_id}`); }}
                  onEdit={() => { logger.info("FarmersList", "Edit farmer", { id: f.farmer_id }); navigate(`/farmers/edit/${f.farmer_id}`); }}
                  onReview={() => { logger.info("FarmersList", "Open review modal", { id: f.farmer_id }); setReviewFarmer(f); }}
                  onToggleActive={() => setConfirmAction({ farmer: f, action: f.is_active ? "deactivate" : "activate" })}
                />
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/60 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    {["Farmer", "Phone", "District", "Status", "Joined", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {filteredFarmers.map(f => {
                    const meta = getStatusMeta(f);
                    const busy = actioningId === f.farmer_id;
                    return (
                      <tr key={f._id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition">
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">{getFarmerName(f)}</p>
                          <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{f.farmer_id}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{getFarmerPhone(f)}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{getFarmerDistrict(f)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{formatDate(f.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 flex-wrap">
                            <button onClick={() => navigate(`/farmers/${f.farmer_id}`)} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition active:scale-95">👁 View</button>
                            <button onClick={() => navigate(`/farmers/edit/${f.farmer_id}`)} className="px-2.5 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition active:scale-95">✏️ Edit</button>
                            <button onClick={() => setReviewFarmer(f)} className="px-2.5 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px] font-bold rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50 transition active:scale-95">📋 Review</button>
                            <button
                              onClick={() => setConfirmAction({ farmer: f, action: f.is_active ? "deactivate" : "activate" })}
                              disabled={busy}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition active:scale-95 disabled:opacity-50 ${
                                f.is_active
                                  ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
                                  : "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50"
                              }`}
                            >{busy ? "…" : f.is_active ? "Deactivate" : "Activate"}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        {!loading && filteredFarmers.length > 0 && (
          <div className="flex justify-between items-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
            <span>
              Showing <strong className="text-gray-700 dark:text-gray-200">{filteredFarmers.length}</strong> of <strong className="text-gray-700 dark:text-gray-200">{totalCount}</strong> farmers
            </span>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => { logger.info("FarmersList", "Pagination: prev", { page: currentPage - 1 }); loadFarmers(currentPage - 1); }}
                disabled={currentPage === 0 || loading}
                className="px-3 py-1 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95"
              >← Prev</button>
              <span className="font-bold text-gray-600 dark:text-gray-300">p.{currentPage + 1}</span>
              <button
                onClick={() => { logger.info("FarmersList", "Pagination: next", { page: currentPage + 1 }); loadFarmers(currentPage + 1); }}
                disabled={filteredFarmers.length < PAGE_SIZE || loading}
                className="px-3 py-1 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95"
              >Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewFarmer && (
        <ReviewModal
          farmer={reviewFarmer}
          onClose={() => { setReviewFarmer(null); }}
          onSaved={() => loadFarmers(currentPage)}
        />
      )}

      {/* Confirm Dialog */}
      {confirmAction && (
        <ConfirmDialog
          message={`${confirmAction.action === "deactivate" ? "Deactivate" : "Activate"} ${getFarmerName(confirmAction.farmer)}?\n\nFarmer ID: ${confirmAction.farmer.farmer_id}`}
          danger={confirmAction.action === "deactivate"}
          onConfirm={executeToggleActive}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
