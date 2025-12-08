import React from 'react';
import { useNotification } from '@/contexts/NotificationContext';

export const ToastContainer: React.FC = () => {
  const { notifications, dismiss } = useNotification();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm pointer-events-none">
      {notifications.map(notification => (
        <Toast
          key={notification.id}
          notification={notification}
          onDismiss={() => dismiss(notification.id)}
        />
      ))}
    </div>
  );
};

interface ToastProps {
  notification: {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  };
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onDismiss }) => {
  const bgColor = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
  }[notification.type];

  const textColor = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800'
  }[notification.type];

  const borderColor = {
    success: 'border-l-green-500',
    error: 'border-l-red-500',
    warning: 'border-l-yellow-500',
    info: 'border-l-blue-500'
  }[notification.type];

  const iconEmoji = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }[notification.type];

  return (
    <div
      className={`${bgColor} ${textColor} px-4 py-3 rounded-lg shadow-lg border border-l-4 ${borderColor} pointer-events-auto flex items-start justify-between gap-3 animate-slide-in`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{iconEmoji}</span>
        <p className="text-sm font-medium leading-relaxed">{notification.message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="text-lg leading-none opacity-70 hover:opacity-100 transition flex-shrink-0"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
};

export default ToastContainer;
