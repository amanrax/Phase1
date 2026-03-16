// Intelligent network probe with exponential backoff and better error handling
import { getApiBaseUrl } from "@/config/mobile";
import { logger } from "@/utils/logger";

let cachedBase: string | null = null;
let probeAttempts = 0;
const MAX_PROBE_ATTEMPTS = 3;

// Timeout fetch with abort controller
const timeoutFetch = async (url: string, ms = 5000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  
  try {
    logger.info("networkProbe", "Attempting probe", { url });
    const res = await fetch(url, { 
      method: "HEAD", // Use HEAD instead of GET for faster probes
      signal: controller.signal,
      cache: "no-cache",
      headers: {
        'Accept': 'application/json',
      }
    });
    logger.info("networkProbe", "Probe response", { url, status: res.status });
    return res;
  } catch (err) {
    logger.warn("networkProbe", "Probe failed", { url, error: err instanceof Error ? err.message : String(err) });
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

const normalize = (url: string) => url.replace(/\/+$/, "");

export const ensureApiBase = async (): Promise<string> => {
  // Return cached if available
  if (cachedBase) {
    logger.info("networkProbe", "Using cached base", { base: cachedBase });
    return cachedBase;
  }

  // Prevent infinite retry loops
  if (probeAttempts >= MAX_PROBE_ATTEMPTS) {
    logger.error("networkProbe", "Max probe attempts reached; using fallback", { maxAttempts: MAX_PROBE_ATTEMPTS });
    const fallback = normalize(getApiBaseUrl());
    cachedBase = fallback;
    return fallback;
  }

  probeAttempts++;
  logger.info("networkProbe", "Probe attempt", { attempt: probeAttempts, maxAttempts: MAX_PROBE_ATTEMPTS });

  const candidate = normalize(getApiBaseUrl());
  
  // Only probe /api/health - most reliable endpoint
  const healthPath = "/api/health";
  
  // Try the configured URL first (should be https://automatic-doodle-wqp6gjqwxvqhggvw.github.dev/)
  try {
    const url = `${candidate}${healthPath}`;
    const response = await timeoutFetch(url, 5000);
    
    if (response.ok || response.status === 200) {
      cachedBase = candidate;
      logger.info("networkProbe", "Backend reachable", { base: cachedBase });
      probeAttempts = 0; // Reset on success
      return cachedBase;
    }
  } catch (err) {
    logger.warn("networkProbe", "Primary probe failed", { error: err instanceof Error ? err.message : String(err) });
  }

  // If HTTP failed and we were using HTTP, don't try HTTPS
  // Mobile apps should stick to HTTP for the configured backend
  logger.warn("networkProbe", "Backend not reachable; using configured URL anyway", { base: candidate });
  cachedBase = candidate;
  probeAttempts = 0;
  return cachedBase;
};

export const getCachedApiBase = () => cachedBase;

export const resetProbeCache = () => {
  logger.info("networkProbe", "Probe cache reset");
  cachedBase = null;
  probeAttempts = 0;
};
