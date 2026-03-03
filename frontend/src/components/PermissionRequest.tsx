// frontend/src/components/PermissionRequest.tsx
// Reusable component for requesting Capacitor device permissions with proper deep-link for denied state
import { useState, useEffect } from 'react';
import { openAppSettings, checkAndRequestPermission, PermissionType } from '@/utils/permissions';

// ─── Multi-permission first-launch dialog ────────────────────────────────────

interface PermissionRequestProps {
  onComplete: () => void;
}

export const PermissionRequest: React.FC<PermissionRequestProps> = ({ onComplete }) => {
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const hasShown = localStorage.getItem('permissions_dialog_shown');
    if (!hasShown) {
      setShowDialog(true);
    } else {
      onComplete();
    }
  }, [onComplete]);

  const handleContinue = () => {
    localStorage.setItem('permissions_dialog_shown', 'true');
    setShowDialog(false);
    onComplete();
  };

  if (!showDialog) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            App Permissions Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            CEM needs access to the following features to work properly:
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <PermissionRow icon="📷" title="Camera" description="To capture farmer photos, documents, and scan QR codes" />
          <PermissionRow icon="📁" title="Storage" description="To save ID cards and log files" />
          <PermissionRow icon="📍" title="Location" description="To track farm locations (optional)" />
        </div>

        <button
          onClick={handleContinue}
          className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-4 rounded-lg transition active:scale-95"
        >
          Got it, Continue
        </button>

        <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-3">
          The app will request individual permissions when needed
        </p>
      </div>
    </div>
  );
};

interface PermissionRowProps {
  icon: string;
  title: string;
  description: string;
}

const PermissionRow: React.FC<PermissionRowProps> = ({ icon, title, description }) => (
  <div className="flex items-start gap-3">
    <div className="text-2xl">{icon}</div>
    <div>
      <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  </div>
);

// ─── Single-permission gate (inline, for specific features) ──────────────────

interface PermissionGateProps {
  /** Which permission type to check before rendering children */
  permission: PermissionType;
  /** Displayed while permission is being checked */
  loadingFallback?: React.ReactNode;
  /** Rendered when permission is permanently denied */
  deniedFallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Wrap a feature behind a permission gate.
 * Usage:
 *   <PermissionGate permission="camera">
 *     <QRScanButton />
 *   </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  loadingFallback = null,
  deniedFallback,
  children,
}) => {
  const [state, setState] = useState<'checking' | 'granted' | 'denied' | 'permanent'>('checking');

  useEffect(() => {
    let mounted = true;
    checkAndRequestPermission(permission).then(({ granted, permanent }) => {
      if (!mounted) return;
      if (granted)   setState('granted');
      else if (permanent) setState('permanent');
      else           setState('denied');
    });
    return () => { mounted = false; };
  }, [permission]);

  if (state === 'checking') return <>{loadingFallback}</>;
  if (state === 'granted')  return <>{children}</>;

  if (deniedFallback) return <>{deniedFallback}</>;

  return (
    <PermissionDeniedCard
      permission={permission}
      permanent={state === 'permanent'}
    />
  );
};

// ─── Denied-state card ────────────────────────────────────────────────────────

interface PermissionDeniedCardProps {
  permission: PermissionType;
  permanent?: boolean;
}

const PERMISSION_LABELS: Record<PermissionType, { icon: string; name: string }> = {
  camera:   { icon: '📷', name: 'Camera' },
  storage:  { icon: '📁', name: 'Storage' },
  location: { icon: '📍', name: 'Location' },
};

export const PermissionDeniedCard: React.FC<PermissionDeniedCardProps> = ({
  permission,
  permanent = false,
}) => {
  const meta = PERMISSION_LABELS[permission];

  return (
    <div className="rounded-xl border border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20 p-5 text-center space-y-3">
      <p className="text-3xl">{meta.icon}</p>
      <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
        {meta.name} Permission {permanent ? 'Denied' : 'Required'}
      </p>
      <p className="text-xs text-orange-700 dark:text-orange-300">
        {permanent
          ? `${meta.name} access was permanently denied. Open Settings and enable it for CEM.`
          : `${meta.name} access is required for this feature.`}
      </p>
      {permanent && (
        <button
          onClick={() => openAppSettings()}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl transition active:scale-95"
        >
          Open Settings
        </button>
      )}
    </div>
  );
};

export default PermissionRequest;

