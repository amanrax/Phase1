// Environment configuration for mobile builds
export const getApiBaseUrl = (): string => {
  // Check if running in Capacitor (native mobile app)
  const isCapacitor = !!(window as any).Capacitor;
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              MOBILE CONFIG - API URL DEBUG                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('[Mobile] Is Capacitor?', isCapacitor);
  console.log('[Mobile] Window.Capacitor exists?', !!(window as any).Capacitor);
  
  if (isCapacitor) {
    // Prefer build-time override for mobile backend (secure & flexible)
    const envUrl = import.meta.env.VITE_MOBILE_API_URL as string | undefined || import.meta.env.VITE_API_PROD_URL as string | undefined;

    if (envUrl) {
      console.log('[Mobile] ✅ Using mobile API URL from build/env:', envUrl);
      return envUrl;
    }

    // Fallback to provided API base for mobile builds
    const fallback = 'http://13.204.83.198:8000';
    console.warn('[Mobile] Using fallback mobile backend (no env urls set):', fallback);
    return fallback;
  }
  
  // Web build - use standard logic
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }
  
  // Auto-detect GitHub Codespaces
  const isCodespaces = typeof window !== 'undefined' && 
    window.location.hostname.endsWith('.app.github.dev');
  
  if (isCodespaces) {
    const currentUrl = window.location.hostname;
    const backendUrl = currentUrl.replace('-5173.', '-8000.');
    return `https://${backendUrl}`;
  }
  
  return 'http://localhost:8000';
};
