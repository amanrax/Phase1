// Environment configuration for mobile builds
export const getApiBaseUrl = (): string => {
  // Check if running in Capacitor (native mobile app)
  const isCapacitor = !!(window as any).Capacitor;
  
  if (isCapacitor) {
    // Production API URL for mobile builds
    const prodApiUrl = import.meta.env.VITE_API_PROD_URL;
    if (prodApiUrl) {
      return prodApiUrl;
    }
    
    // Fallback to development API if VITE_API_PROD_URL not set
    console.warn('[Mobile] Production API URL not set. Using development URL.');
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
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
