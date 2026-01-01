// src/components/PermissionRequest.tsx
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

interface PermissionRequestProps {
  onComplete: () => void;
}

export const PermissionRequest: React.FC<PermissionRequestProps> = ({ onComplete }) => {
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const checkPlatform = async () => {
      const native = Capacitor.isNativePlatform();
      setIsNative(native);

      // Check if permissions were already requested
      const hasRequested = localStorage.getItem('permissions_requested');
      if (hasRequested || !native) {
        setPermissionsGranted(true);
        onComplete();
      }
    };

    checkPlatform();
  }, [onComplete]);

  const requestPermissions = async () => {
    try {
      // Request Camera permission
      await Camera.requestPermissions();

      // Request Geolocation permission
      await Geolocation.requestPermissions();

      // Request File system permissions (handled by Capacitor automatically)
      
      // Mark as requested
      localStorage.setItem('permissions_requested', 'true');
      setPermissionsGranted(true);
      onComplete();
    } catch (error) {
      console.error('Error requesting permissions:', error);
      // Continue anyway - permissions can be requested later
      localStorage.setItem('permissions_requested', 'true');
      setPermissionsGranted(true);
      onComplete();
    }
  };

  if (!isNative || permissionsGranted) {
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
          onClick={requestPermissions}
          className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-4 rounded-lg transition active:scale-95"
        >
          Grant Permissions
        </button>

        <button
          onClick={() => {
            localStorage.setItem('permissions_requested', 'true');
            onComplete();
          }}
          className="w-full mt-3 text-gray-600 hover:text-gray-800 font-medium py-2 text-sm transition"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
};

export default PermissionRequest;
