// src/hooks/useBackButton.ts
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const useBackButton = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let removeListener: (() => void) | undefined;
    let lastBackPress = 0;

    const setupBackButton = async () => {
      try {
        const { App } = await import('@capacitor/app');

        const listener = await App.addListener('backButton', ({ canGoBack }) => {
          // Debounce - prevent rapid double-taps
          const now = Date.now();
          if (now - lastBackPress < 400) {
            console.log('[BackButton] Debounced');
            return;
          }
          lastBackPress = now;

          const currentPath = location.pathname;
          console.log('[BackButton] Pressed at:', currentPath);
          console.log('[BackButton] Can go back:', canGoBack, 'History length:', window.history.length);

          // Dashboard paths - show exit confirmation
          const dashboardPaths = [
            '/admin-dashboard',
            '/operator-dashboard',
            '/farmer-dashboard'
          ];

          // Root/Login paths - exit immediately
          const rootPaths = ['/', '/login', ''];

          if (rootPaths.includes(currentPath)) {
            console.log('[BackButton] At root - exiting app');
            App.exitApp();
            return;
          }

          // At dashboard - show exit confirmation
          if (dashboardPaths.includes(currentPath)) {
            console.log('[BackButton] At dashboard - confirm exit');
            
            const shouldExit = window.confirm('Exit the app?');
            if (shouldExit) {
              App.exitApp();
            }
            return;
          }

          // For all other pages - just go back in history
          if (canGoBack && window.history.length > 1) {
            console.log('[BackButton] Going back in history');
            window.history.back();
          } else {
            // No history - navigate to appropriate dashboard based on current path
            console.log('[BackButton] No history - going to dashboard');
            
            if (currentPath.startsWith('/admin')) {
              navigate('/admin-dashboard', { replace: true });
            } else if (currentPath.startsWith('/operator')) {
              navigate('/operator-dashboard', { replace: true });
            } else if (currentPath.startsWith('/farmer')) {
              navigate('/farmer-dashboard', { replace: true });
            } else {
              navigate('/login', { replace: true });
            }
          }
        });

        removeListener = () => listener.remove();
        console.log('[BackButton] ✅ Listener registered');

      } catch (error) {
        console.log('[BackButton] Not on Capacitor platform');
      }
    };

    setupBackButton();

    return () => {
      if (removeListener) {
        console.log('[BackButton] Cleaning up listener');
        removeListener();
      }
    };
  }, [location.pathname, navigate]);
};

export default useBackButton;
