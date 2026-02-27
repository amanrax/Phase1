// frontend/src/components/ToastContainer.tsx — Dynamic-island pill notifications
// Consistent dark pill on light AND dark backgrounds — no more maroon in dark mode
import React, { useEffect, useState } from 'react';
import { useNotification, type Notification } from '@/contexts/NotificationContext';

// ─── Per-type accent: coloured dot + left border strip ────────────────────────
const accentMap = {
  success: { dot: 'bg-emerald-400',  bar: 'border-l-emerald-400',  icon: '✓' },
  error:   { dot: 'bg-rose-400',     bar: 'border-l-rose-400',     icon: '✕' },
  warning: { dot: 'bg-amber-400',    bar: 'border-l-amber-400',    icon: '!' },
  info:    { dot: 'bg-sky-400',      bar: 'border-l-sky-400',      icon: 'i' },
} as const;

// ─── Single Toast ──────────────────────────────────────────────────────────────
function Toast({ notification, onDismiss }: { notification: Notification; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const acc = accentMap[notification.type];

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      onClick={dismiss}
      className={[
        // ── pill shell ── charcoal in both modes → no maroon, always readable
        'flex items-center gap-3 pl-1 pr-4 py-3 rounded-2xl cursor-pointer select-none',
        'bg-gray-900/95 dark:bg-gray-950/95',
        'border border-white/[0.07]',
        'border-l-4', acc.bar,
        'shadow-[0_8px_30px_rgba(0,0,0,0.45)]',
        'backdrop-blur-md',
        'min-w-[260px] max-w-[360px] w-max',
        // ── animation ──
        'transition-all duration-300 ease-out',
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-5 scale-90',
      ].join(' ')}
    >
      {/* Coloured icon badge */}
      <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-gray-900 ${acc.dot}`}>
        {acc.icon}
      </span>

      {/* Always-white message text looks crisp on the dark pill in any theme */}
      <p className="flex-1 text-sm font-semibold leading-snug text-white">
        {notification.message}
      </p>

      {/* Dismiss */}
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        className="flex-shrink-0 ml-1 w-5 h-5 rounded-full flex items-center justify-center text-white/40 hover:text-white/90 transition-colors text-xs font-bold"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Container — fixed top-centre, stacks downward ────────────────────────────
export const ToastContainer: React.FC = () => {
  const { notifications, dismiss } = useNotification();
  if (notifications.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed top-4 inset-x-0 z-[9999] flex flex-col items-center gap-2 px-4 pointer-events-none"
    >
      {notifications.map((n) => (
        <div key={n.id} className="pointer-events-auto">
          <Toast notification={n} onDismiss={() => dismiss(n.id)} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
