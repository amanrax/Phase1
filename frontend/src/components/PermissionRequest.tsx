// src/components/PermissionRequest.tsx
import { useState, useEffect } from 'react';

interface PermissionRequestProps {
  onComplete: () => void;
}

export const PermissionRequest: React.FC<PermissionRequestProps> = ({ onComplete }) => {
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    // Check if permissions dialog was already shown
    const hasShown = localStorage.getItem('permissions_dialog_shown');
    if (!hasShown) {
      setShowDialog(true);
    } else {
      onComplete();
    }
  }, [onComplete]);

  const handleContinue = () => {
    // Mark dialog as shown
    localStorage.setItem('permissions_dialog_shown', 'true');
    setShowDialog(false);
    onComplete();
  };

  if (!showDialog) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            App Permissions Required
          </h2>
          <p className="text-gray-600 text-sm">
            CEM needs access to the following features to work properly:
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">📷</div>
            <div>
              <h3 className="font-semibold text-gray-900">Camera</h3>
              <p className="text-sm text-gray-600">
                To capture farmer photos and documents
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-2xl">📁</div>
            <div>
              <h3 className="font-semibold text-gray-900">Storage</h3>
              <p className="text-sm text-gray-600">
                To save ID cards and documents
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-2xl">📍</div>
            <div>
              <h3 className="font-semibold text-gray-900">Location</h3>
              <p className="text-sm text-gray-600">
                To track farm locations (optional)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleContinue}
          className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-4 rounded-lg transition active:scale-95"
        >
          Got it, Continue
        </button>

        <p className="text-xs text-gray-500 text-center mt-3">
          The app will request permissions when needed
        </p>
      </div>
    </div>
  );
};

export default PermissionRequest;
