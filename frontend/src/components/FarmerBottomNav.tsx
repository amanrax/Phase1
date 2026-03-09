// Reusable bottom navigation bar for all farmer-facing pages
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { safeNavigate } from "@/config/navigation";
import { notificationsService } from "@/services/notifications.service";
import useAuthStore from "@/store/authStore";

type NavTab = "home" | "idcard" | "supplies" | "notifications" | "settings";

interface NavItemProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}

function NavItem({ icon, label, active, onClick, badge }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors duration-150 ${
        active ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"
      }`}
    >
      <span className={`text-xl leading-none ${active ? "scale-110" : "scale-100"} transition-transform duration-150 relative`}>
        {icon}
        {badge != null && badge > 0 && (
          <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span className={`text-[10px] font-semibold ${active ? "opacity-100" : "opacity-70"}`}>
        {label}
      </span>
      {active && <span className="w-1 h-1 rounded-full bg-green-500 dark:bg-green-400 mt-0.5" />}
    </button>
  );
}

const TAB_ROUTES: Record<NavTab, string> = {
  home: "/farmer-dashboard",
  idcard: "/farmer-idcard",
  supplies: "/farmer/supply-requests",
  notifications: "/notifications",
  settings: "/farmer-dashboard",
};

const ROUTE_TO_TAB: Record<string, NavTab> = {
  "/farmer-dashboard": "home",
  "/farmer-idcard": "idcard",
  "/farmer/idcard-view": "idcard",
  "/farmer/supply-requests": "supplies",
  "/farmer/documents": "home",
  "/farmer/change-requests": "home",
  "/notifications": "notifications",
};

interface FarmerBottomNavProps {
  /** Override active tab detection (used by dashboard for inline settings) */
  activeTabOverride?: NavTab;
  /** Override tab handler (used by dashboard for inline settings panel) */
  onTabChange?: (tab: NavTab) => void;
}

export default function FarmerBottomNav({ activeTabOverride, onTabChange }: FarmerBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll unread notification count every 60 seconds (TC-104/105)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const count = await notificationsService.getUnreadCount();
        if (!cancelled) setUnreadCount(count);
      } catch {
        // non-blocking — ignore errors
      }
    };
    fetchCount();
    const timer = setInterval(fetchCount, 60_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [token]);

  const currentTab: NavTab = activeTabOverride ?? ROUTE_TO_TAB[location.pathname] ?? "home";

  const handleTab = (tab: NavTab) => {
    if (onTabChange) {
      onTabChange(tab);
      return;
    }
    if (tab === "settings") {
      safeNavigate(navigate, "/farmer-dashboard?tab=settings");
      return;
    }
    const route = TAB_ROUTES[tab];
    if (route && location.pathname !== route) {
      safeNavigate(navigate, route);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
      <div className="flex max-w-lg mx-auto">
        <NavItem icon="🏠" label="Home" active={currentTab === "home"} onClick={() => handleTab("home")} />
        <NavItem icon="🆔" label="ID Card" active={currentTab === "idcard"} onClick={() => handleTab("idcard")} />
        <NavItem icon="🛒" label="Supplies" active={currentTab === "supplies"} onClick={() => handleTab("supplies")} />
        <NavItem icon="🔔" label="Alerts" active={currentTab === "notifications"} onClick={() => handleTab("notifications")} badge={unreadCount} />
        <NavItem icon="⚙️" label="Settings" active={currentTab === "settings"} onClick={() => handleTab("settings")} />
      </div>
    </nav>
  );
}
