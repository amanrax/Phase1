// Intelligent network probe with exponential backoff and better error handling
import { getApiBaseUrl } from "@/config/mobile";

let cachedBase: string | null = null;
let probeAttempts = 0;
const MAX_PROBE_ATTEMPTS = 3;

// Timeout fetch with abort controller
const timeoutFetch = async (url: string, ms = 5000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  
  try {
    console.log(`[networkProbe] Attempting: ${url}`);
    const res = await fetch(url, { 
      method: "HEAD", // Use HEAD instead of GET for faster probes
      signal: controller.signal,
      cache: "no-cache",
      headers: {
        'Accept': 'application/json',
      }
    });
    console.log(`[networkProbe] ✅ Response ${res.status} from ${url}`);
    return res;
  } catch (err) {
    console.warn(`[networkProbe] ❌ Failed: ${url}`, err instanceof Error ? err.message : err);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

const normalize = (url: string) => url.replace(/\/+$/, "");

export const ensureApiBase = async (): Promise<string> => {
  // Return cached if available
  if (cachedBase) {
    console.log(`[networkProbe] Using cached base: ${cachedBase}`);
    return cachedBase;
  }

  // Prevent infinite retry loops
  if (probeAttempts >= MAX_PROBE_ATTEMPTS) {
    console.error(`[networkProbe] Max probe attempts (${MAX_PROBE_ATTEMPTS}) reached. Using fallback.`);
    const fallback = normalize(getApiBaseUrl());
    cachedBase = fallback;
    return fallback;
  }

  probeAttempts++;
  console.log(`[networkProbe] Probe attempt ${probeAttempts}/${MAX_PROBE_ATTEMPTS}`);

  const candidate = normalize(getApiBaseUrl());
  
  // Only probe /api/health - most reliable endpoint
  const healthPath = "/api/health";
  
  // Try the configured URL first (should be http://13.204.83.198:8000)
  try {
    const url = `${candidate}${healthPath}`;
    const response = await timeoutFetch(url, 5000);
    
    if (response.ok || response.status === 200) {
      cachedBase = candidate;
      console.log(`[networkProbe] ✅ Backend reachable at: ${cachedBase}`);
      probeAttempts = 0; // Reset on success
      return cachedBase;
    }
  } catch (err) {
    console.warn(`[networkProbe] Primary probe failed:`, err instanceof Error ? err.message : err);
  }

  // If HTTP failed and we were using HTTP, don't try HTTPS
  // Mobile apps should stick to HTTP for the configured backend
  console.warn(`[networkProbe] ⚠️ Backend not reachable. Using configured URL anyway: ${candidate}`);
  cachedBase = candidate;
  probeAttempts = 0;
  return cachedBase;
};

export const getCachedApiBase = () => cachedBase;

export const resetProbeCache = () => {
  console.log('[networkProbe] Cache reset');
  cachedBase = null;
  probeAttempts = 0;
};
