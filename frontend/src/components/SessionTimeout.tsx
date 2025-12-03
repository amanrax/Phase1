// src/components/SessionTimeout.tsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import SessionTimeoutModal from './SessionTimeoutModal';

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
    extendSession 
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

  const clearAllTimers = () => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (activityCheckRef.current) clearInterval(activityCheckRef.current);
  };

  const handleExtendSession = () => {
    extendSession();
    setShowTimeoutWarning(false);
  };

  const handleLogout = () => {
    clearAllTimers();
    logout();
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
