// src/pages/NotificationCentre.tsx — In-app notification centre (v4.0)
import { useCallback, useEffect, useState } from "react";
import BackButton from "@/components/BackButton";
import { notificationsService, Notification as AppNotification } from "@/services/notifications.service";
import { useNotification } from "@/contexts/NotificationContext";
import { logger } from "@/utils/logger";
import FarmerBottomNav from "@/components/FarmerBottomNav";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

const COMPONENT = "NotificationCentre";
const PAGE_SIZE = 30;

type FilterTab = "all" | "unread";

const NotificationCentre = () => {
  const toast = useNotification();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false); // TC-107: load-more state
  const [hasMore, setHasMore] = useState(false);         // TC-107: more pages available
  const [skip, setSkip] = useState(0);                   // TC-107: current offset
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async (reset = true) => {
    const offset = reset ? 0 : skip;
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);
      const start = performance.now();
      logger.info(COMPONENT, "Fetching notifications", { tab: activeTab, offset });
      const res = await notificationsService.list(activeTab === "unread", offset, PAGE_SIZE);
      const newItems = res.notifications;
      if (reset) {
        setNotifications(newItems);
        setSkip(newItems.length);
      } else {
        setNotifications(prev => [...prev, ...newItems]);
        setSkip(prev => prev + newItems.length);
      }
      setHasMore(newItems.length === PAGE_SIZE); // TC-107: more pages if full page returned
      setUnreadCount(res.unread_count);
      logger.info(COMPONENT, `Notifications loaded (${Math.round(performance.now() - start)}ms)`, {
        count: newItems.length,
        unread: res.unread_count,
      });
    } catch (err) {
      logger.error(COMPONENT, "Failed to fetch notifications", { err });
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, skip, toast]);

  useEffect(() => {
    setSkip(0);
    setHasMore(false);
    fetchNotifications(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const { pulling, pullDistance, threshold } = usePullToRefresh({
    onRefresh: async () => {
      setRefreshing(true);
      await fetchNotifications(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setRefreshing(false);
    },
    disabled: loading || loadingMore || refreshing,
  });

  const handleMarkRead = async (id: string) => {
    try {
      logger.info(COMPONENT, "Marking notification read", { id });
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      logger.info(COMPONENT, "Marking all notifications read");
      await notificationsService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      logger.info(COMPONENT, "Deleting notification", { id });
      await notificationsService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification deleted");
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "verification_approved":
      case "change_request_decision":
        return (
          <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        );
      case "verification_rejected":
        return (
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          </div>
        );
      case "supply_request_update":
        return (
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h17.25" /></svg>
          </div>
        );
      default:
        return (
          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
          </div>
        );
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  // ── Skeletons ──────────────────────────────────────────────────────────────
  const Skeleton = () => (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-3 p-4 rounded-xl bg-white dark:bg-gray-800">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
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
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-emerald-600 dark:text-emerald-400 font-medium"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex mt-3 gap-2">
          {(["all", "unread"] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              {tab === "all" ? "All" : "Unread"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2 max-w-2xl mx-auto">
        {/* Pull-to-refresh indicator (mobile) */}
        {pulling && (
          <div
            className="flex items-center justify-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 transition-all"
            style={{ height: `${Math.min(pullDistance, threshold + 20)}px` }}
          >
            <div className={`w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full ${pullDistance >= threshold ? "animate-spin" : ""}`} />
            <span>{pullDistance >= threshold ? "Release to refresh..." : "Pull to refresh..."}</span>
          </div>
        )}

        {loading ? (
          <Skeleton />
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No notifications yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              {activeTab === "unread" ? "All caught up!" : "You'll see updates here"}
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`flex gap-3 p-4 rounded-xl transition-colors cursor-pointer ${
                n.read
                  ? "bg-white dark:bg-gray-800"
                  : "bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800"
              }`}
              onClick={() => !n.read && handleMarkRead(n.id)}
            >
              {getTypeIcon(n.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium break-words pr-2 ${n.read ? "text-gray-700 dark:text-gray-300" : "text-gray-900 dark:text-white"}`}>
                    {n.title}
                  </p>
                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                    {formatTimeAgo(n.created_at)}
                  </span>
                </div>
                {n.body && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 break-words">
                    {n.body}
                  </p>
                )}
                {!n.read && (
                  <span className="inline-block mt-1 w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))
        )}
        {/* TC-107: Load more / infinite scroll button */}
        {!loading && hasMore && (
          <div className="pt-2 pb-4 flex justify-center">
            <button
              onClick={() => fetchNotifications(false)}
              disabled={loadingMore}
              className="px-6 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 transition"
            >
              {loadingMore ? "Loading…" : "Load More"}
            </button>
          </div>
        )}
      </div>
      <FarmerBottomNav />
    </div>
  );
};

export default NotificationCentre;
