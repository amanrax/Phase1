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
    // HARDCODED AWS backend for mobile app
    const url = 'http://13.233.201.167:8000';
    console.log('[Mobile] ✅ USING HARDCODED AWS BACKEND:', url);
    console.log('[Mobile] This should work if your phone can reach this IP');
    
    // Test alert
    alert(`Mobile App Starting\nBackend: ${url}\nIf login fails, check if phone can access this IP in browser`);
    
    return url;
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
