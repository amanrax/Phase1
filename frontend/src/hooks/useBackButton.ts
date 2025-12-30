import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const useBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let removeListener: (() => void) | undefined;

    const setupBackButton = async () => {
      try {
        const { App } = await import('@capacitor/app');

        const listener = await App.addListener('backButton', ({ canGoBack }) => {
          console.log('[BackButton] Hardware back pressed, canGoBack:', canGoBack);
          console.log('[BackButton] Current path:', location.pathname);

          const exitPaths = [
            '/admin-dashboard',
            '/operator-dashboard',
            '/farmer-dashboard',
            '/login',
          ];

          if (exitPaths.includes(location.pathname)) {
            if (window.confirm('Exit app?')) {
              App.exitApp();
            }
          } else if (canGoBack) {
            navigate(-1);
          } else {
            if (location.pathname.startsWith('/admin')) {
              navigate('/admin-dashboard', { replace: true });
            } else if (location.pathname.startsWith('/operator')) {
              navigate('/operator-dashboard', { replace: true });
            } else if (location.pathname.startsWith('/farmer')) {
              navigate('/farmer-dashboard', { replace: true });
            } else {
              navigate('/login', { replace: true });
            }
          }
        });

        removeListener = () => listener.remove();
      } catch (error) {
        console.log('[BackButton] Not running on Capacitor or App plugin not available');
      }
    };

    setupBackButton();

    return () => {
      if (removeListener) removeListener();
    };
  }, [navigate, location]);
};

export default useBackButton;
