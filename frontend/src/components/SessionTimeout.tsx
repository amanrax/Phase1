// src/components/SessionTimeout.tsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import SessionTimeoutModal from './SessionTimeoutModal';
import secureStorage from '@/utils/secureStorage';
import { globalToast } from '@/utils/globalToast';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME_MS = 25 * 60 * 1000; // Show warning at 25 minutes (5 min before timeout)

export default function SessionTimeout() {
  const navigate = useNavigate();
  const { 
    token, 
    lastActivity, 
    showTimeoutWarning, 
    setShowTimeoutWarning, 
    logout, 
    extendSession,
    updateActivity,
  } = useAuthStore();
  
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activityCheckRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only run if user is logged in
    if (!token) {
      clearAllTimers();
      return;
    }

    const checkActivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      
      // If warning time reached, show warning modal
      if (timeSinceLastActivity >= WARNING_TIME_MS && !showTimeoutWarning) {
        setShowTimeoutWarning(true);
      }
      
      // If session timeout reached, logout
      if (timeSinceLastActivity >= SESSION_TIMEOUT_MS) {
        handleLogout();
      }
    };

    // Check activity every second
    activityCheckRef.current = setInterval(checkActivity, 1000);

    return () => {
      clearAllTimers();
    };
  }, [token, lastActivity, showTimeoutWarning, setShowTimeoutWarning]);

  useEffect(() => {
    if (!token) return;

    // Any user interaction should reset inactivity timer.
    const onActivity = () => updateActivity();
    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'keydown',
      'click',
      'scroll',
      'touchstart',
    ];

    events.forEach((eventName) => window.addEventListener(eventName, onActivity, { passive: true }));

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, onActivity));
    };
  }, [token, updateActivity]);

  useEffect(() => {
    if (!token) return;

    let listener: { remove: () => Promise<void> } | null = null;

    import('@capacitor/app')
      .then(({ App }) => App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) return;

        const idleFor = Date.now() - lastActivity;
        if (idleFor >= SESSION_TIMEOUT_MS) {
          void handleLogout();
        } else if (idleFor >= WARNING_TIME_MS) {
          setShowTimeoutWarning(true);
        }
      }))
      .then((l) => {
        listener = l;
      })
      .catch(() => {
        // Plugin may be unavailable on web; timer-based checks still apply.
      });

    return () => {
      if (listener) {
        void listener.remove();
      }
    };
  }, [token, lastActivity, setShowTimeoutWarning]);

  const clearAllTimers = () => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (activityCheckRef.current) clearInterval(activityCheckRef.current);
  };

  const handleExtendSession = () => {
    extendSession();
    setShowTimeoutWarning(false);
  };

  const handleLogout = async () => {
    clearAllTimers();

    // Keep native/web token stores aligned when session expires.
    try {
      await Promise.all([
        secureStorage.removeItem('access_token'),
        secureStorage.removeItem('refresh_token'),
      ]);
    } catch {
      // Ignore storage cleanup failures and continue logout.
    }

    logout();
    globalToast.error('Session expired. Please log in again.');
    navigate('/login');
  };

  const getRemainingSeconds = () => {
    const timeSinceLastActivity = Date.now() - lastActivity;
    const remainingMs = SESSION_TIMEOUT_MS - timeSinceLastActivity;
    return Math.max(0, Math.floor(remainingMs / 1000));
  };

  return (
    <SessionTimeoutModal
      show={showTimeoutWarning}
      remainingSeconds={getRemainingSeconds()}
      onExtend={handleExtendSession}
      onLogout={handleLogout}
    />
  );
}
