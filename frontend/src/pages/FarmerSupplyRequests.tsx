// src/pages/FarmerSupplyRequests.tsx — Advanced farmer supply request management
import { useCallback, useEffect, useRef, useState } from "react";
import BackButton from "@/components/BackButton";
import axios from "@/utils/axios";
import { useNotification } from "@/contexts/NotificationContext";
import { logger } from "@/utils/logger";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

const COMPONENT = "FarmerSupplyRequests";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SupplyItem { name: string; quantity_value: number; quantity_unit: string; }
interface StatusHistoryEntry { status: string; changed_by: string; role: string; note: string; timestamp: string; }
interface SupplyRequest {
  id: string; request_ref: string; farmer_id: string;
  category: string; items: SupplyItem[]; urgency: string;
  delivery_location: string; preferred_delivery_date: string | null;
  purpose: string; season: string | null;
  farm_size_covered: number | null; budget_estimate: number | null;
  contact_phone: string | null; notes: string | null;
  status: string; admin_notes: string | null;
  estimated_delivery_date: string | null; fulfilled_items: string[];
  status_history: StatusHistoryEntry[];
  created_at: string; updated_at: string;
}
interface FormItem { name: string; quantity_value: string; quantity_unit: string; }

// ─── Constants ───────────────────────────────────────────────────────────────
const CATEGORIES = ["Seeds","Fertilizers","Pesticides","Tools","Equipment","Storage","Transport","Irrigation","Other"];
const UNITS      = ["bags","kg","liters","units","tonnes","crates","boxes","pieces","rolls","drums"];
const URGENCIES  = [
  { value:"low",      label:"Low",      color:"text-green-600 dark:text-green-400",  bg:"bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" },
  { value:"medium",   label:"Medium",   color:"text-amber-600 dark:text-amber-400",  bg:"bg-amber-100  dark:bg-amber-900/30  text-amber-800  dark:text-amber-300" },
  { value:"high",     label:"High",     color:"text-orange-600 dark:text-orange-400",bg:"bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300" },
  { value:"critical", label:"Critical", color:"text-red-600 dark:text-red-400",      bg:"bg-red-100    dark:bg-red-900/30    text-red-800    dark:text-red-300" },
];
const STATUSES = [
  { value:"pending",    label:"Pending",    style:"bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300" },
  { value:"approved",   label:"Approved",   style:"bg-blue-100   dark:bg-blue-900/30   text-blue-800   dark:text-blue-300" },
  { value:"processing", label:"Processing", style:"bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300" },
  { value:"dispatched", label:"Dispatched", style:"bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300" },
  { value:"fulfilled",  label:"Fulfilled",  style:"bg-green-100  dark:bg-green-900/30  text-green-800  dark:text-green-300" },
  { value:"rejected",   label:"Rejected",   style:"bg-red-100    dark:bg-red-900/30    text-red-800    dark:text-red-300" },
  { value:"cancelled",  label:"Cancelled",  style:"bg-gray-100   dark:bg-gray-700      text-gray-600   dark:text-gray-400" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const statusStyle = (s: string) => STATUSES.find(x => x.value === s)?.style ?? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";
const urgencyStyle = (u: string) => URGENCIES.find(x => x.value === u)?.bg ?? "";
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
const fmtDate = (s: string | null) => s ? new Date(s).toLocaleString("en-ZM",{dateStyle:"medium",timeStyle:"short"}) : "—";
const fmtDateOnly = (s: string | null) => s ? new Date(s).toLocaleDateString("en-ZM",{year:"numeric",month:"short",day:"numeric"}) : "—";
const blankForm = (): {category:string;urgency:string;delivery_location:string;preferred_delivery_date:string;purpose:string;season:string;farm_size_covered:string;budget_estimate:string;contact_phone:string;notes:string} => ({
  category:"Seeds", urgency:"medium", delivery_location:"", preferred_delivery_date:"",
  purpose:"", season:"", farm_size_covered:"", budget_estimate:"", contact_phone:"", notes:"",
});
const blankItem = (): FormItem => ({ name:"", quantity_value:"1", quantity_unit:"bags" });

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, count, color }: { label:string; count:number; color:string }) {
  return (
    <div className={`rounded-xl p-4 flex flex-col items-center justify-center border ${color}`}>
      <span className="text-2xl font-extrabold">{count}</span>
      <span className="text-xs font-semibold mt-1 opacity-80">{label}</span>
    </div>
  );
}

function StatusTimeline({ history }: { history: StatusHistoryEntry[] }) {
  if (!history?.length) return <p className="text-xs text-gray-400">No history available.</p>;
  return (
    <ol className="relative border-l-2 border-gray-200 dark:border-gray-600 ml-2 space-y-4">
      {history.map((h, i) => (
        <li key={i} className="ml-4">
          <span className="absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full ring-2 ring-white dark:ring-gray-800 bg-green-500 mt-0.5"></span>
          <div className="ml-1">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mb-1 ${statusStyle(h.status)}`}>{cap(h.status)}</span>
            <p className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(h.timestamp)} · {h.role === "FARMER" ? "You" : "Admin"}</p>
            {h.note && <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">"{h.note}"</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ req, onClose, onCancelled }: { req: SupplyRequest; onClose: () => void; onCancelled: () => void }) {
  const { success: ok, error: err } = useNotification();
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    logger.info(COMPONENT, "cancelRequest.start", { id: req.id });
    try {
      await axios.patch(`/supplies/cancel/${req.id}`, { reason: cancelReason || undefined });
      logger.info(COMPONENT, "cancelRequest.success", { id: req.id });
      ok("Request cancelled successfully");
      onCancelled();
    } catch (e: any) {
      const msg = e.response?.data?.detail || "Failed to cancel request";
      logger.error(COMPONENT, "cancelRequest.error", { id: req.id, msg, e });
      err(msg);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-600 to-emerald-700 rounded-t-2xl text-white">
          <div>
            <h2 className="text-lg font-bold">{req.request_ref || "Supply Request"}</h2>
            <p className="text-green-100 text-xs mt-0.5">{req.category} · Created {fmtDateOnly(req.created_at)}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusStyle(req.status)}`}>{cap(req.status)}</span>
            <button onClick={onClose} className="text-white hover:text-green-200 text-2xl leading-none">&times;</button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Urgency + Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${urgencyStyle(req.urgency)}`}>
              {req.urgency === "critical" ? "🚨" : req.urgency === "high" ? "🔴" : req.urgency === "medium" ? "🟡" : "🟢"} {cap(req.urgency)} Urgency
            </span>
            {req.season && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300">Season: {req.season}</span>}
          </div>

          {/* Items */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Items Requested</h3>
            <div className="space-y-2">
              {req.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.name}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.quantity_value} {item.quantity_unit}</span>
                </div>
              ))}
            </div>
            {req.fulfilled_items?.length > 0 && (
              <p className="text-xs text-green-700 dark:text-green-400 mt-2 font-semibold">✓ Fulfilled: {req.fulfilled_items.join(", ")}</p>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              { label:"Purpose",           value: req.purpose },
              { label:"Delivery Location", value: req.delivery_location },
              { label:"Preferred Date",    value: req.preferred_delivery_date ? fmtDateOnly(req.preferred_delivery_date) : null },
              { label:"Est. Delivery",     value: req.estimated_delivery_date  ? fmtDateOnly(req.estimated_delivery_date)  : null },
              { label:"Farm Size",         value: req.farm_size_covered ? `${req.farm_size_covered} ha` : null },
              { label:"Budget Estimate",   value: req.budget_estimate   ? `ZMW ${req.budget_estimate.toLocaleString()}` : null },
              { label:"Contact Phone",     value: req.contact_phone },
            ].filter(r => r.value).map(({ label, value }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-gray-800 dark:text-gray-200 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {req.notes && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">Your Notes</p>
              <p className="text-sm text-blue-800 dark:text-blue-300">{req.notes}</p>
            </div>
          )}

          {req.admin_notes && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-300 dark:border-indigo-600 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">Admin Response</p>
              <p className="text-sm text-indigo-800 dark:text-indigo-200">{req.admin_notes}</p>
            </div>
          )}

          {/* Status History */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">Status History</h3>
            <StatusTimeline history={req.status_history} />
          </div>

          {/* Cancel form */}
          {req.status === "pending" && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              {!showCancelForm ? (
                <button
                  onClick={() => setShowCancelForm(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  Cancel This Request
                </button>
              ) : (
                <div className="space-y-3">
                  <textarea
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-400 outline-none resize-none"
                    rows={2} placeholder="Reason for cancellation (optional)"
                    value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel} disabled={cancelling}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white transition"
                    >
                      {cancelling ? "Cancelling..." : "Confirm Cancel"}
                    </button>
                    <button onClick={() => setShowCancelForm(false)} className="flex-1 py-2 rounded-xl text-sm font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                      Keep Request
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create / Edit Form Modal ─────────────────────────────────────────────────
function RequestFormModal({
  editTarget, onClose, onSaved,
}: {
  editTarget: SupplyRequest | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { success: ok, error: err } = useNotification();
  const isEdit = !!editTarget;

  const [form, setForm]   = useState(blankForm());
  const [items, setItems] = useState<FormItem[]>([blankItem()]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});

  useEffect(() => {
    if (editTarget) {
      setForm({
        category:               editTarget.category,
        urgency:                editTarget.urgency,
        delivery_location:      editTarget.delivery_location,
        preferred_delivery_date:editTarget.preferred_delivery_date?.split("T")[0] ?? "",
        purpose:                editTarget.purpose,
        season:                 editTarget.season ?? "",
        farm_size_covered:      editTarget.farm_size_covered?.toString() ?? "",
        budget_estimate:        editTarget.budget_estimate?.toString() ?? "",
        contact_phone:          editTarget.contact_phone ?? "",
        notes:                  editTarget.notes ?? "",
      });
      setItems(editTarget.items.map(i => ({
        name: i.name, quantity_value: String(i.quantity_value), quantity_unit: i.quantity_unit,
      })));
    }
  }, [editTarget]);

  const setField = (k: keyof ReturnType<typeof blankForm>, v: string) =>
    setForm(p => ({ ...p, [k]: v }));

  const addItem    = () => setItems(p => [...p, blankItem()]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, k: keyof FormItem, v: string) =>
    setItems(p => p.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  const validate = (): boolean => {
    const e: Record<string,string> = {};
    if (!form.delivery_location.trim())   e.delivery_location = "Delivery location is required";
    if (!form.purpose.trim())             e.purpose = "Purpose is required";
    const validItems = items.filter(i => i.name.trim());
    if (!validItems.length)              e.items = "Add at least one item";
    items.forEach((it, idx) => {
      if (it.name.trim() && (isNaN(Number(it.quantity_value)) || Number(it.quantity_value) <= 0))
        e[`item_qty_${idx}`] = "Quantity must be a positive number";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const validItems = items.filter(i => i.name.trim()).map(i => ({
      name: i.name.trim(),
      quantity_value: Number(i.quantity_value),
      quantity_unit: i.quantity_unit,
    }));
    const payload: any = {
      category: form.category,
      items:    validItems,
      urgency:  form.urgency,
      delivery_location: form.delivery_location.trim(),
      purpose:  form.purpose.trim(),
      ...(form.preferred_delivery_date && { preferred_delivery_date: form.preferred_delivery_date }),
      ...(form.season                  && { season: form.season }),
      ...(form.farm_size_covered       && { farm_size_covered: Number(form.farm_size_covered) }),
      ...(form.budget_estimate         && { budget_estimate:   Number(form.budget_estimate) }),
      ...(form.contact_phone           && { contact_phone: form.contact_phone }),
      ...(form.notes                   && { notes: form.notes }),
    };
    const action = isEdit ? "editRequest" : "createRequest";
    logger.info(COMPONENT, `${action}.start`, { payload });
    try {
      if (isEdit && editTarget) {
        await axios.patch(`/supplies/farmer-edit/${editTarget.id}`, payload);
        logger.info(COMPONENT, `${action}.success`, { id: editTarget.id });
        ok("Request updated successfully");
      } else {
        const res = await axios.post("/supplies/request", payload);
        logger.info(COMPONENT, `${action}.success`, { ref: res.data.request_ref });
        ok(`Request submitted — Ref: ${res.data.request_ref}`);
      }
      onSaved();
    } catch (e: any) {
      const msg = e.response?.data?.detail || `Failed to ${isEdit ? "update" : "create"} request`;
      logger.error(COMPONENT, `${action}.error`, { msg, e });
      if (Array.isArray(msg)) {
        err(msg.map((x: any) => x.msg || JSON.stringify(x)).join("; "));
      } else {
        err(typeof msg === "string" ? msg : JSON.stringify(msg));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-600 to-emerald-700 rounded-t-2xl text-white">
          <h2 className="text-lg font-bold">{isEdit ? "Edit Supply Request" : "New Supply Request"}</h2>
          <button onClick={onClose} className="text-white hover:text-green-200 text-2xl">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Supply Category *</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat} type="button"
                  onClick={() => setField("category", cat)}
                  className={`px-2 py-2 rounded-xl text-xs font-semibold border-2 transition ${form.category === cat
                    ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-green-300"}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Items Needed *</label>
              <button type="button" onClick={addItem} className="text-xs text-green-600 dark:text-green-400 font-semibold hover:underline">+ Add Item</button>
            </div>
            {errors.items && <p className="text-xs text-red-500 mb-1">{errors.items}</p>}
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input
                    className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Item name (e.g., Maize seeds)"
                    value={item.name} onChange={e => updateItem(i, "name", e.target.value)}
                  />
                  <input
                    type="number" min="0.1" step="0.1"
                    className={`w-20 px-2 py-2 text-sm border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none ${errors[`item_qty_${i}`] ? "border-red-400" : "border-gray-300 dark:border-gray-600"}`}
                    value={item.quantity_value} onChange={e => updateItem(i, "quantity_value", e.target.value)}
                  />
                  <select
                    className="w-24 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                    value={item.quantity_unit} onChange={e => updateItem(i, "quantity_unit", e.target.value)}
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-lg font-bold leading-none pt-2">&times;</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Urgency *</label>
            <div className="flex gap-2">
              {URGENCIES.map(u => (
                <button key={u.value} type="button"
                  onClick={() => setField("urgency", u.value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition ${form.urgency === u.value ? u.bg + " border-transparent" : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300"}`}>
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Purpose *</label>
            {errors.purpose && <p className="text-xs text-red-500 mb-1">{errors.purpose}</p>}
            <textarea
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none resize-none"
              rows={2} placeholder="Why do you need these supplies? (e.g., Planting season 2026)"
              value={form.purpose} onChange={e => setField("purpose", e.target.value)}
            />
          </div>

          {/* Delivery Location */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Delivery Location *</label>
            {errors.delivery_location && <p className="text-xs text-red-500 mb-1">{errors.delivery_location}</p>}
            <input
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="Village / area where delivery should go"
              value={form.delivery_location} onChange={e => setField("delivery_location", e.target.value)}
            />
          </div>

          {/* Row: Preferred date + Season */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Preferred Delivery Date</label>
              <input type="date"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                value={form.preferred_delivery_date} onChange={e => setField("preferred_delivery_date", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Season</label>
              <input
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="e.g. 2025/2026"
                value={form.season} onChange={e => setField("season", e.target.value)}
              />
            </div>
          </div>

          {/* Row: Farm size + Budget */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Farm Size (hectares)</label>
              <input type="number" min="0" step="0.1"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="e.g. 2.5"
                value={form.farm_size_covered} onChange={e => setField("farm_size_covered", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Budget Estimate (ZMW)</label>
              <input type="number" min="0"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="e.g. 1500"
                value={form.budget_estimate} onChange={e => setField("budget_estimate", e.target.value)}
              />
            </div>
          </div>

          {/* Contact phone + Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Contact Phone (for this request)</label>
            <input
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="+260XXXXXXXXX (optional override)"
              value={form.contact_phone} onChange={e => setField("contact_phone", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Additional Notes</label>
            <textarea
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none resize-none"
              rows={3} placeholder="Any additional details or special requirements"
              value={form.notes} onChange={e => setField("notes", e.target.value)}
            />
          </div>

          {/* Save */}
          <div className="flex gap-3 pb-2">
            <button
              onClick={handleSave} disabled={saving}
              className="flex-1 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white shadow-md transition-all"
            >
              {saving ? (isEdit ? "Saving..." : "Submitting...") : (isEdit ? "Save Changes" : "Submit Request")}
            </button>
            <button onClick={onClose} className="flex-1 py-3 rounded-xl font-semibold text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Request Card (mobile) ────────────────────────────────────────────────────
function RequestCard({ req, onView, onEdit }: { req: SupplyRequest; onView: () => void; onEdit: () => void }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-gray-900 dark:text-white text-sm">{req.request_ref || "—"}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{req.category} · {fmtDateOnly(req.created_at)}</p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${statusStyle(req.status)}`}>{cap(req.status)}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {req.items.slice(0, 3).map((it, i) => (
          <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300">{it.name} ({it.quantity_value}{it.quantity_unit})</span>
        ))}
        {req.items.length > 3 && <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-500 dark:text-gray-400">+{req.items.length - 3} more</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${urgencyStyle(req.urgency)}`}>{cap(req.urgency)}</span>
        {req.admin_notes && <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Admin replied</span>}
      </div>
      {req.admin_notes && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-3 py-2 text-xs text-indigo-800 dark:text-indigo-300">
          <strong>Admin:</strong> {req.admin_notes.length > 100 ? req.admin_notes.slice(0, 100) + "..." : req.admin_notes}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={onView}  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 transition">View Details</button>
        {req.status === "pending" && (
          <button onClick={onEdit} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition">Edit</button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FarmerSupplyRequests() {
  const { error: showError } = useNotification();

  const [requests,  setRequests]  = useState<SupplyRequest[]>([]);
  const [summary,   setSummary]   = useState<Record<string,number>>({});
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [filter,    setFilter]    = useState("all");
  const [search,    setSearch]    = useState("");

  const [detailReq,  setDetailReq]  = useState<SupplyRequest | null>(null);
  const [editTarget, setEditTarget] = useState<SupplyRequest | null>(null);
  const [showForm,   setShowForm]   = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const loadRequests = useCallback(async (statusFilter = filter) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    logger.info(COMPONENT, "loadRequests.start", { filter: statusFilter });
    try {
      const params: any = { limit: 200, skip: 0 };
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await axios.get("/supplies/my-requests", { params });
      const data = res.data;
      setRequests(data.requests || []);
      setTotal(data.total ?? 0);
      setSummary(data.summary || {});
      logger.info(COMPONENT, "loadRequests.success", { count: data.total });
    } catch (e: any) {
      if (e.code === "ERR_CANCELED") return;
      const msg = e.response?.data?.detail || "Failed to load supply requests";
      logger.error(COMPONENT, "loadRequests.error", { msg, e });
      showError(typeof msg === "string" ? msg : "Failed to load supply requests");
    } finally {
      setLoading(false);
    }
  }, [filter, showError]);

  useEffect(() => { loadRequests(); }, []);

  // Pull-to-refresh on mobile (P8)
  const { pulling, pullDistance, threshold } = usePullToRefresh({
    onRefresh: () => loadRequests(filter),
    disabled: loading,
  });

  const handleFilterChange = (f: string) => {
    setFilter(f);
    loadRequests(f);
  };

  const handleFormSaved = () => { setShowForm(false); setEditTarget(null); loadRequests(filter); };
  const handleCancelled = () => { setDetailReq(null); loadRequests(filter); };

  const displayed = search.trim()
    ? requests.filter(r =>
        r.request_ref?.toLowerCase().includes(search.toLowerCase()) ||
        r.category?.toLowerCase().includes(search.toLowerCase()) ||
        r.items.some(i => i.name.toLowerCase().includes(search.toLowerCase()))
      )
    : requests;

  const totalRequests = Object.values(summary).reduce((a, b) => a + b, 0);
  const statCards = [
    { label:"Total",     count: totalRequests,            color:"border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200" },
    { label:"Pending",   count: summary["pending"]   || 0, color:"border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300" },
    { label:"Approved",  count: summary["approved"]  || 0, color:"border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300" },
    { label:"Fulfilled", count: summary["fulfilled"] || 0, color:"border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300" },
    { label:"Rejected",  count: summary["rejected"]  || 0, color:"border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      {/* Modals */}
      {detailReq && (
        <DetailModal
          req={detailReq}
          onClose={() => setDetailReq(null)}
          onCancelled={handleCancelled}
        />
      )}
      {(showForm || editTarget) && (
        <RequestFormModal
          editTarget={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          onSaved={handleFormSaved}
        />
      )}

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackButton to="/farmer-dashboard" />
            <div>
              <h1 className="text-xl font-extrabold text-gray-800 dark:text-gray-100">My Supply Requests</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{total} total request{total !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button
            onClick={() => { setEditTarget(null); setShowForm(true); }}
            className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-xl text-sm shadow transition shrink-0"
          >
            + New Request
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
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
        {/* Stats */}
        <div className="grid grid-cols-5 gap-2">
          {statCards.map(c => <StatCard key={c.label} {...c} />)}
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
            placeholder="Search by ref, category, item..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <div className="flex gap-1 flex-wrap">
            {["all","pending","approved","processing","dispatched","fulfilled","rejected","cancelled"].map(f => (
              <button key={f}
                onClick={() => handleFilterChange(f)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${filter === f ? "bg-green-700 text-white" : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                {cap(f)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-24" />
                    <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <div className="flex gap-3">
                    <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-32" />
                    <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-20" />
                  </div>
                  <div className="h-3 rounded bg-gray-100 dark:bg-gray-600 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <p className="text-5xl mb-4">📦</p>
            <p className="font-bold text-gray-700 dark:text-gray-300 text-lg">
              {search ? "No requests match your search" : filter === "all" ? "No supply requests yet" : `No ${filter} requests`}
            </p>
            {!search && filter === "all" && (
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Click "New Request" to get started</p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-4 py-3">Ref</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Urgency</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {displayed.map(req => (
                    <tr key={req.id} className="hover:bg-green-50 dark:hover:bg-green-900/10 transition">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{req.request_ref || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200 text-xs">{req.category}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        {req.items.slice(0,2).map(i=>`${i.name}(${i.quantity_value}${i.quantity_unit})`).join(", ")}
                        {req.items.length > 2 && <span className="text-gray-400"> +{req.items.length-2}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${urgencyStyle(req.urgency)}`}>{cap(req.urgency)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusStyle(req.status)}`}>{cap(req.status)}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDateOnly(req.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 text-xs">
                          <button onClick={() => setDetailReq(req)} className="text-green-700 dark:text-green-400 font-bold hover:underline whitespace-nowrap">View</button>
                          {req.status === "pending" && (
                            <button onClick={() => setEditTarget(req)} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Edit</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {displayed.map(req => (
                <RequestCard
                  key={req.id} req={req}
                  onView={() => setDetailReq(req)}
                  onEdit={() => setEditTarget(req)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
