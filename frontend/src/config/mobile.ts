// Environment configuration for mobile builds
export const getApiBaseUrl = (): string => {
  // Check if running in Capacitor (native mobile app)
  const isCapacitor = !!(window as any).Capacitor;
  
  if (isCapacitor) {
    // HARDCODED AWS backend for mobile app
    console.log('[Mobile] Using AWS backend: http://13.233.201.167:8000');
    return 'http://13.233.201.167:8000';
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
