// src/hooks/useBackButton.ts
import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const useBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPress = useRef(0);
  const isHandling = useRef(false);

  useEffect(() => {
    let removeListener: (() => void) | undefined;

    const setupBackButton = async () => {
      try {
        const { App } = await import('@capacitor/app');

        const listener = await App.addListener('backButton', ({ canGoBack }) => {
          // Prevent rapid double-taps (debounce)
          const now = Date.now();
          if (now - lastBackPress.current < 500) {
            console.log('[BackButton] Debounced - too fast');
            return;
          }
          lastBackPress.current = now;

          // Prevent concurrent handling
          if (isHandling.current) {
            console.log('[BackButton] Already handling');
            return;
          }
          isHandling.current = true;

          try {
            // Get current path (handle HashRouter)
            const rawPath = location.pathname !== '/' ? location.pathname : location.hash;
            const currentPath = rawPath.startsWith('#') ? rawPath.replace('#', '') : rawPath;
            
            console.log('[BackButton] Hardware back pressed');
            console.log('[BackButton] Current path:', currentPath);
            console.log('[BackButton] Can go back:', canGoBack);

            // Paths that should exit the app with confirmation
            const dashboardPaths = [
              '/admin-dashboard',
              '/operator-dashboard',
              '/farmer-dashboard'
            ];

            // Login/root paths - exit immediately
            if (currentPath === '/login' || currentPath === '/' || currentPath === '') {
              console.log('[BackButton] At root - exiting app');
              App.exitApp();
              return;
            }

            // Dashboard paths - confirm before exit
            if (dashboardPaths.includes(currentPath)) {
              console.log('[BackButton] At dashboard - confirming exit');
              if (window.confirm('Do you want to exit the app?')) {
                App.exitApp();
              }
              return;
            }

            // Special navigation mappings for specific pages
            const routeMap: Record<string, string> = {
              '/farmer-idcard': '/farmer-dashboard',
              '/farmer/idcard-view': '/farmer-idcard',
              '/document-view': '/farmer-dashboard',
              '/farmers/create': '/farmers',
              '/admin/settings': '/admin-dashboard',
              '/admin/reports': '/admin-dashboard',
              '/admin/supply-requests': '/admin-dashboard',
              '/admin/logs': '/admin-dashboard',
              '/operators/manage': '/admin-dashboard',
              '/farmer/supply-requests': '/farmer-dashboard'
            };

            // Check if current path has a mapped destination
            if (routeMap[currentPath]) {
              console.log('[BackButton] Mapped route:', routeMap[currentPath]);
              navigate(routeMap[currentPath], { replace: true });
              return;
            }

            // Handle dynamic routes (edit, details)
            if (currentPath.match(/\/farmers\/edit\/.+/)) {
              console.log('[BackButton] Edit page - going to farmers list');
              navigate('/farmers', { replace: true });
              return;
            }

            if (currentPath.match(/\/farmers\/.+/) && !currentPath.includes('/create')) {
              console.log('[BackButton] Farmer detail - going to farmers list');
              navigate('/farmers', { replace: true });
              return;
            }

            if (currentPath.match(/\/operators\/.+/)) {
              console.log('[BackButton] Operator page - going to operators list');
              navigate('/operators/manage', { replace: true });
              return;
            }

            // If browser history exists, go back
            if (canGoBack && window.history.length > 1) {
              console.log('[BackButton] Going back in history');
              navigate(-1);
              return;
            }

            // Fallback: determine dashboard based on current path
            console.log('[BackButton] Fallback - determining dashboard');
            if (currentPath.startsWith('/admin')) {
              navigate('/admin-dashboard', { replace: true });
            } else if (currentPath.startsWith('/operator')) {
              navigate('/operator-dashboard', { replace: true });
            } else if (currentPath.startsWith('/farmer')) {
              navigate('/farmer-dashboard', { replace: true });
            } else {
              navigate('/login', { replace: true });
            }

          } finally {
            // Reset handling flag after delay
            setTimeout(() => {
              isHandling.current = false;
            }, 500);
          }
        });

        removeListener = () => listener.remove();
        console.log('[BackButton] Listener registered successfully');

      } catch (error) {
        console.log('[BackButton] Not running on Capacitor:', error);
      }
    };

    setupBackButton();

    return () => {
      if (removeListener) {
        console.log('[BackButton] Cleaning up listener');
        removeListener();
      }
    };
  }, [navigate, location.pathname, location.hash]); // Only depend on path changes
};

export default useBackButton;
