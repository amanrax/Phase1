// src/hooks/useBackButton.ts
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logger } from '@/utils/logger';

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
            logger.info('useBackButton', 'Back press debounced');
            return;
          }
          lastBackPress = now;

          const currentPath = location.pathname;
          logger.info('useBackButton', 'Back button pressed', {
            currentPath,
            canGoBack,
            historyLength: window.history.length,
          });

          // Dashboard paths - show exit confirmation
          const dashboardPaths = [
            '/admin-dashboard',
            '/operator-dashboard',
            '/farmer-dashboard'
          ];

          // Root/Login paths - exit immediately
          const rootPaths = ['/', '/login', ''];

          if (rootPaths.includes(currentPath)) {
            logger.info('useBackButton', 'At root, exiting app');
            App.exitApp();
            return;
          }

          // At dashboard - show exit confirmation
          if (dashboardPaths.includes(currentPath)) {
            logger.info('useBackButton', 'At dashboard, requesting exit confirmation');
            
            const shouldExit = window.confirm('Exit the app?');
            if (shouldExit) {
              App.exitApp();
            }
            return;
          }

          // For all other pages - just go back in history
          if (canGoBack && window.history.length > 1) {
            logger.info('useBackButton', 'Going back in history');
            window.history.back();
          } else {
            // No history - navigate to appropriate dashboard based on current path
            logger.info('useBackButton', 'No history, navigating to dashboard');
            
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
        logger.info('useBackButton', 'Back button listener registered');

      } catch (error) {
        logger.info('useBackButton', 'Not running on Capacitor platform');
      }
    };

    setupBackButton();

    return () => {
      if (removeListener) {
        logger.info('useBackButton', 'Cleaning up back button listener');
        removeListener();
      }
    };
  }, [location.pathname, navigate]);
};

export default useBackButton;
