// runtime network probe to determine whether backend is reachable via http or https
import { getApiBaseUrl } from "@/config/mobile";

let cachedBase: string | null = null;

const timeoutFetch = async (url: string, ms = 3000): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
};

const normalize = (u: string) => u.replace(/\/$/, "");

export const ensureApiBase = async (): Promise<string> => {
  if (cachedBase) return cachedBase;

  const candidate = normalize(getApiBaseUrl());
  const tryPaths = ["/api/health", "/health", "/api"];

  // Try candidate protocol first (as returned)
  for (const path of tryPaths) {
    const url = `${candidate}${path}`;
    try {
      const r = await timeoutFetch(url, 3000);
      if (r.ok) {
        cachedBase = candidate;
        console.log('[networkProbe] OK:', url);
        return cachedBase;
      }
    } catch (err) {
      // ignore and continue
      console.warn('[networkProbe] failed:', url, err);
    }
  }

  // If candidate used http, try https fallback
  if (candidate.startsWith('http://')) {
    const httpsCandidate = candidate.replace(/^http:\/\//, 'https://');
    for (const path of tryPaths) {
      const url = `${httpsCandidate}${path}`;
      try {
        const r = await timeoutFetch(url, 3000);
        if (r.ok) {
          cachedBase = httpsCandidate;
          console.log('[networkProbe] OK (https fallback):', url);
          return cachedBase;
        }
      } catch (err) {
        console.warn('[networkProbe] https fallback failed:', url, err);
      }
    }
  }

  // If nothing worked, throw to let caller handle error
  throw new Error('Backend unreachable via HTTP or HTTPS from this device');
};

export const getCachedApiBase = () => cachedBase;
