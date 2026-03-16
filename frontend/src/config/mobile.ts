// Mobile configuration with comprehensive logging and fallbacks
import { logger } from '@/utils/logger';

export const getApiBaseUrl = (): string => {
  logger.info('mobileConfig', 'Resolving API base URL');

  // Check if running in Capacitor (native mobile app)
  const isCapacitor = !!(window as any).Capacitor;
  const platform = (window as any).Capacitor?.getPlatform?.() || 'unknown';
  
  logger.info('mobileConfig', 'Runtime platform detected', {
    platform,
    isCapacitor,
    userAgent: navigator.userAgent.substring(0, 50),
  });

  // For mobile apps (Capacitor)
  if (isCapacitor) {
    logger.info('mobileConfig', 'Running in Capacitor mobile app');

    // Priority 1: Build-time mobile-specific URL
    const mobileUrl = import.meta.env.VITE_MOBILE_API_URL as string | undefined;
    if (mobileUrl) {
      logger.info('mobileConfig', 'Using VITE_MOBILE_API_URL', { url: mobileUrl });
      return mobileUrl.replace(/\/+$/, '');
    }

    // Priority 2: Production URL
    const prodUrl = import.meta.env.VITE_API_PROD_URL as string | undefined;
    if (prodUrl) {
      logger.info('mobileConfig', 'Using VITE_API_PROD_URL', { url: prodUrl });
      return prodUrl.replace(/\/+$/, '');
    }

    // Priority 3: Standard base URL
    const baseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
    if (baseUrl) {
      logger.info('mobileConfig', 'Using VITE_API_BASE_URL', { url: baseUrl });
      return baseUrl.replace(/\/+$/, '');
    }

    // Final fallback for mobile - production backend
    const fallback = 'https://automatic-doodle-wqp6gjqwxvqhggvw-8000.app.github.dev';
    logger.warn('mobileConfig', 'Using fallback mobile API URL', { url: fallback });
    return fallback;
  }

  // For web builds
  logger.info('mobileConfig', 'Running in web browser');

  // Check for GitHub Codespaces
  const isCodespaces = typeof window !== 'undefined' && 
    window.location.hostname.endsWith('.app.github.dev');

  if (isCodespaces) {
    const currentHost = window.location.hostname;
    // Replace any port suffix (e.g. -5173, -5174, -3000) with -8000
    const backendHost = currentHost.replace(/-\d+\.app\.github\.dev$/, '-8000.app.github.dev');
    const codespaceUrl = `https://${backendHost}`;
    logger.info('mobileConfig', 'Detected GitHub Codespaces URL', { url: codespaceUrl });
    return codespaceUrl;
  }

  // Standard web build
  const webUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (webUrl) {
    logger.info('mobileConfig', 'Using VITE_API_BASE_URL for web', { url: webUrl });
    return webUrl.replace(/\/+$/, '');
  }

  // Final fallback
  const defaultUrl = 'https://automatic-doodle-wqp6gjqwxvqhggvw-8000.app.github.dev';
  logger.info('mobileConfig', 'Using default API URL', { url: defaultUrl });
  return defaultUrl;
};

// Helper to get full API endpoint
export const getApiEndpoint = (path: string): string => {
  const base = getApiBaseUrl();
  const cleanPath = path.replace(/^\/+/, '');
  return `${base}/api/${cleanPath}`;
};

// Export configuration object
export const mobileConfig = {
  getApiBaseUrl,
  getApiEndpoint,
  isProduction: () => import.meta.env.PROD,
  isDevelopment: () => import.meta.env.DEV,
};

export default mobileConfig;
