// src/contexts/NotificationContext.tsx
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number; // milliseconds, 0 = persistent
  timestamp: number; // ✅ NEW: explicit timestamp
}

interface NotificationContextType {
  notifications: Notification[];
  show: (type: NotificationType, message: string, duration?: number) => string;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // ✅ NEW: Use ref to track recent notifications (prevents duplicates across renders)
  const recentNotifications = useRef<Map<string, number>>(new Map());

  const generateId = () => `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const show = useCallback((
    type: NotificationType,
    message: string,
    duration: number = 4000
  ): string => {
    const now = Date.now();
    
    // ✅ IMPROVED: Check for duplicates using ref (immediate, not affected by state updates)
    const notificationKey = `${type}:${message}`;
    const lastShown = recentNotifications.current.get(notificationKey);
    
    if (lastShown && (now - lastShown) < 500) { // ✅ Prevent duplicates within 500ms
      console.log('[Notification] 🚫 Duplicate prevented:', type, message.substring(0, 50));
      return ''; // Return empty string to indicate duplicate was prevented
    }
    
    // Update ref with current timestamp
    recentNotifications.current.set(notificationKey, now);
    
    // Clean up old entries from ref (keep last 50 entries)
    if (recentNotifications.current.size > 50) {
      const entries = Array.from(recentNotifications.current.entries());
      const recentEntries = entries
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50);
      recentNotifications.current = new Map(recentEntries);
    }

    const id = generateId();
    const notification: Notification = { 
      id, 
      type, 
      message, 
      duration,
      timestamp: now 
    };

    console.log('[Notification] ✅ Showing:', type, message.substring(0, 50));

    setNotifications(prev => {
      // ✅ EXTRA CHECK: Ensure no duplicate IDs in state
      const filtered = prev.filter(n => n.id !== id);
      return [...filtered, notification];
    });

    if (duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }

    return id;
  }, []); // ✅ FIXED: Remove notifications dependency to prevent recreation

  const success = useCallback((message: string, duration?: number) => {
    return show('success', message, duration ?? 4000);
  }, [show]);

  const error = useCallback((message: string, duration?: number) => {
    return show('error', message, duration ?? 5000);
  }, [show]);

  const warning = useCallback((message: string, duration?: number) => {
    return show('warning', message, duration ?? 4000);
  }, [show]);

  const info = useCallback((message: string, duration?: number) => {
    return show('info', message, duration ?? 3000);
  }, [show]);

  const dismiss = useCallback((id: string) => {
    if (!id) {
      console.warn('[Notification] ⚠️ Attempted to dismiss notification with empty ID');
      return;
    }
    
    console.log('[Notification] 🗑️ Dismissing:', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    console.log('[Notification] 🗑️ Dismissing all notifications');
    setNotifications([]);
    recentNotifications.current.clear();
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        show,
        success,
        error,
        warning,
        info,
        dismiss,
        dismissAll
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
