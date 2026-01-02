// Mobile configuration with comprehensive logging and fallbacks

export const getApiBaseUrl = (): string => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║            MOBILE CONFIG - API URL RESOLVER                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Check if running in Capacitor (native mobile app)
  const isCapacitor = !!(window as any).Capacitor;
  const platform = (window as any).Capacitor?.getPlatform?.() || 'unknown';
  
  console.log('[Mobile] Platform:', platform);
  console.log('[Mobile] Is Capacitor:', isCapacitor);
  console.log('[Mobile] User Agent:', navigator.userAgent.substring(0, 50));

  // For mobile apps (Capacitor)
  if (isCapacitor) {
    console.log('[Mobile] Running in Capacitor mobile app');

    // Priority 1: Build-time mobile-specific URL
    const mobileUrl = import.meta.env.VITE_MOBILE_API_URL as string | undefined;
    if (mobileUrl) {
      console.log('[Mobile] ✅ Using VITE_MOBILE_API_URL:', mobileUrl);
      return mobileUrl.replace(/\/+$/, '');
    }

    // Priority 2: Production URL
    const prodUrl = import.meta.env.VITE_API_PROD_URL as string | undefined;
    if (prodUrl) {
      console.log('[Mobile] ✅ Using VITE_API_PROD_URL:', prodUrl);
      return prodUrl.replace(/\/+$/, '');
    }

    // Priority 3: Standard base URL
    const baseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
    if (baseUrl) {
      console.log('[Mobile] ✅ Using VITE_API_BASE_URL:', baseUrl);
      return baseUrl.replace(/\/+$/, '');
    }

    // Final fallback for mobile - production backend
    const fallback = 'http://13.204.83.198:8000';
    console.warn('[Mobile] ⚠️ Using hardcoded fallback:', fallback);
    return fallback;
  }

  // For web builds
  console.log('[Mobile] Running in web browser');

  // Check for GitHub Codespaces
  const isCodespaces = typeof window !== 'undefined' && 
    window.location.hostname.endsWith('.app.github.dev');

  if (isCodespaces) {
    const currentHost = window.location.hostname;
    const backendHost = currentHost.replace('-5173.', '-8000.');
    const codespaceUrl = `https://${backendHost}`;
    console.log('[Mobile] ✅ Detected GitHub Codespaces:', codespaceUrl);
    return codespaceUrl;
  }

  // Standard web build
  const webUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (webUrl) {
    console.log('[Mobile] ✅ Using VITE_API_BASE_URL for web:', webUrl);
    return webUrl.replace(/\/+$/, '');
  }

  // Final fallback
  const defaultUrl = 'http://13.204.83.198:8000';
  console.log('[Mobile] ✅ Using default URL:', defaultUrl);
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
