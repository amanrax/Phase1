// src/components/SessionTimeoutModal.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';

interface SessionTimeoutModalProps {
  show: boolean;
  remainingSeconds: number;
  onExtend: () => void;
  onLogout: () => void;
}

export default function SessionTimeoutModal({
  show,
  remainingSeconds,
  onExtend,
  onLogout
}: SessionTimeoutModalProps) {
  const [countdown, setCountdown] = useState(remainingSeconds);

  useEffect(() => {
    setCountdown(remainingSeconds);
  }, [remainingSeconds]);

  useEffect(() => {
    if (!show) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [show, onLogout]);

  if (!show) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: 'fadeIn 0.3s ease-out'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-8"
        style={{
          maxWidth: '450px',
          width: '90%',
          animation: 'slideIn 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100 mb-4"
            style={{ animation: 'pulse 2s ease-in-out infinite' }}
          >
            <i className="fa-solid fa-clock text-4xl text-orange-600"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Session Expiring Soon</h2>
        </div>

        {/* Message */}
        <div className="text-center mb-6">
          <p className="text-gray-600 mb-4">
            Your session will expire in:
          </p>
          <div className="text-5xl font-bold text-orange-600 mb-2">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
          <p className="text-sm text-gray-500">
            You will be automatically logged out for security purposes.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition"
          >
            <i className="fa-solid fa-right-from-bracket mr-2"></i>
            Logout Now
          </button>
          <button
            onClick={onExtend}
            className="flex-1 py-3 px-4 bg-green-700 hover:bg-green-800 text-white font-semibold rounded-lg transition shadow-lg"
          >
            <i className="fa-solid fa-rotate-right mr-2"></i>
            Stay Logged In
          </button>
        </div>

        {/* Info */}
        <p className="text-xs text-gray-400 text-center mt-4">
          Click "Stay Logged In" to extend your session by 30 minutes
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateY(-50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
