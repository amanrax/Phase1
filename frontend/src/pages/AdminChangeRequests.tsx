// frontend/src/pages/AdminChangeRequests.tsx — Admin/operator review and decision UI for pending farmer change requests
import { useCallback, useEffect, useMemo, useState } from "react";
import BackButton from "@/components/BackButton";
import { changeRequestsService, ChangeRequest } from "@/services/changeRequests.service";
import { useNotification } from "@/contexts/NotificationContext";
import { logger } from "@/utils/logger";

const COMPONENT = "AdminChangeRequests";

export default function AdminChangeRequests() {
	const toast = useNotification();
	const [loading, setLoading] = useState(true);
	const [requests, setRequests] = useState<ChangeRequest[]>([]);
	const [decisionBusyId, setDecisionBusyId] = useState<string | null>(null);
	const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>({});

	const pendingCount = useMemo(() => requests.length, [requests]);

	const loadPending = useCallback(async () => {
		try {
			setLoading(true);
			const res = await changeRequestsService.listPending(0, 200);
			setRequests(res.requests || []);
			logger.info(COMPONENT, "Pending change requests loaded", { total: res.total });
		} catch (err: unknown) {
			logger.error(COMPONENT, "Failed loading pending change requests", { err });
			toast.error("Failed to load change requests.");
		} finally {
			setLoading(false);
		}
	}, [toast]);

	useEffect(() => {
		loadPending();
	}, [loadPending]);

	const handleApprove = async (req: ChangeRequest) => {
		try {
			setDecisionBusyId(req.request_id);
			await changeRequestsService.decide(req.request_id, {
				decision: "approved",
				note: "Approved by reviewer",
			});
			toast.success("Request approved.");
			setRequests((prev) => prev.filter((r) => r.request_id !== req.request_id));
		} catch (err: unknown) {
			logger.error(COMPONENT, "Approve failed", { requestId: req.request_id, err });
			toast.error("Could not approve request.");
		} finally {
			setDecisionBusyId(null);
		}
	};

	const handleReject = async (req: ChangeRequest) => {
		const note = (rejectReasonById[req.request_id] || "").trim();
		if (!note) {
			// TC-098: reject without reason -> backend 422; enforce in UI too
			toast.error("Please provide a rejection reason.");
			return;
		}

		try {
			setDecisionBusyId(req.request_id);
			await changeRequestsService.decide(req.request_id, {
				decision: "rejected",
				note,
			});
			toast.success("Request rejected.");
			setRequests((prev) => prev.filter((r) => r.request_id !== req.request_id));
		} catch (err: unknown) {
			logger.error(COMPONENT, "Reject failed", { requestId: req.request_id, err });
			toast.error("Could not reject request.");
		} finally {
			setDecisionBusyId(null);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
					<BackButton />
					<div>
						<h1 className="text-xl font-bold text-gray-900 dark:text-white">Change Request Review</h1>
						<p className="text-xs text-gray-500 dark:text-gray-400">Pending requests: {pendingCount}</p>
					</div>
					<button
						type="button"
						onClick={loadPending}
						className="ml-auto text-sm px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
					>
						Refresh
					</button>
				</div>
			</header>

			<main className="max-w-5xl mx-auto p-4 sm:p-6">
				{loading ? (
					<div className="space-y-3">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
								<div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
								<div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2" />
								<div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-700 rounded" />
							</div>
						))}
					</div>
				) : requests.length === 0 ? (
					<div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
						<p className="text-gray-600 dark:text-gray-300">No pending change requests.</p>
					</div>
				) : (
					<div className="space-y-3">
						{requests.map((req) => {
							const busy = decisionBusyId === req.request_id;
							return (
								<div key={req.request_id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="font-semibold text-gray-900 dark:text-gray-100">{req.farmer_name || req.farmer_id || "Farmer"}</p>
											<p className="text-xs text-gray-500 dark:text-gray-400 font-mono">Request ID: {req.request_id}</p>
										</div>
										<span className="text-xs px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">Pending</span>
									</div>

									<div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
										<div>
											<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Field</p>
											<p className="font-medium text-gray-800 dark:text-gray-200">{req.field_name}</p>
										</div>
										<div>
											<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Submitted</p>
											<p className="font-medium text-gray-800 dark:text-gray-200">{new Date(req.created_at).toLocaleString()}</p>
										</div>
										<div>
											<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Old Value</p>
											<p className="font-medium text-gray-800 dark:text-gray-200 break-all">{req.old_value || "—"}</p>
										</div>
										<div>
											<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">New Value</p>
											<p className="font-medium text-gray-800 dark:text-gray-200 break-all">{req.new_value || "—"}</p>
										</div>
									</div>

									{req.reason ? (
										<div className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3 text-sm text-gray-700 dark:text-gray-200">
											<span className="font-semibold">Reason: </span>{req.reason}
										</div>
									) : null}

									<div className="mt-3">
										<label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Rejection Note (required for reject)</label>
										<textarea
											value={rejectReasonById[req.request_id] || ""}
											onChange={(e) => setRejectReasonById((prev) => ({ ...prev, [req.request_id]: e.target.value }))}
											rows={2}
											className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
											placeholder="Enter reason if rejecting"
										/>
									</div>

									<div className="mt-3 flex items-center gap-2">
										<button
											type="button"
											disabled={busy}
											onClick={() => handleApprove(req)}
											className="px-3 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
										>
											{busy ? "Working..." : "Approve"}
										</button>
										<button
											type="button"
											disabled={busy}
											onClick={() => handleReject(req)}
											className="px-3 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
										>
											{busy ? "Working..." : "Reject"}
										</button>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</main>
		</div>
	);
}
