import React, { createContext, useContext, useState, useCallback } from 'react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  showNotification: (type: NotificationType, message: string, action?: Notification['action']) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((type: NotificationType, message: string, action?: Notification['action']) => {
    const id = `notif-${Date.now()}-${Math.random()}`;
    const notification: Notification = { id, type, message, action };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const showSuccess = useCallback((message: string) => showNotification('success', message), [showNotification]);
  const showError = useCallback((message: string) => showNotification('error', message), [showNotification]);
  const showWarning = useCallback((message: string) => showNotification('warning', message), [showNotification]);
  const showInfo = useCallback((message: string) => showNotification('info', message), [showNotification]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return 'fa-check-circle';
      case 'error': return 'fa-times-circle';
      case 'warning': return 'fa-exclamation-triangle';
      case 'info': return 'fa-info-circle';
    }
  };

  const getColors = (type: NotificationType) => {
    switch (type) {
      case 'success': return { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-800', icon: 'text-green-600' };
      case 'error': return { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-800', icon: 'text-red-600' };
      case 'warning': return { bg: 'bg-yellow-50', border: 'border-yellow-500', text: 'text-yellow-800', icon: 'text-yellow-600' };
      case 'info': return { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-800', icon: 'text-blue-600' };
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification, showSuccess, showError, showWarning, showInfo }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2" style={{ maxWidth: '400px' }}>
        {notifications.map((notif) => {
          const colors = getColors(notif.type);
          return (
            <div
              key={notif.id}
              className={`${colors.bg} ${colors.border} border-l-4 p-4 rounded-lg shadow-lg transition-all duration-300 animate-slide-in`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <i className={`fa-solid ${getIcon(notif.type)} ${colors.icon} text-xl mt-1`}></i>
                  <div className="flex-1">
                    <p className={`${colors.text} text-sm font-medium`}>{notif.message}</p>
                    {notif.action && (
                      <button
                        onClick={() => {
                          notif.action!.onClick();
                          removeNotification(notif.id);
                        }}
                        className={`mt-2 text-sm font-bold ${colors.text} hover:underline`}
                      >
                        {notif.action.label}
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeNotification(notif.id)}
                  className={`${colors.text} hover:opacity-70 ml-2`}
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out forwards;
        }
      `}</style>
    </NotificationContext.Provider>
  );
};
