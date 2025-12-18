import React, { createContext, useContext, useState, useCallback } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number; // milliseconds, 0 = persistent
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

  const generateId = () => `notification-${Date.now()}-${Math.random()}`;

  const show = useCallback((
    type: NotificationType,
    message: string,
    duration: number = 4000
  ): string => {
    const id = generateId();
    const notification: Notification = { id, type, message, duration };

    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }

    return id;
  }, []);

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
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications([]);
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
