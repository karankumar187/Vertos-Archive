/**
 * localCache.js
 * A simple localStorage-backed cache with TTL (time-to-live) support.
 * Data is shown instantly from cache, then refreshed in the background.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const cacheGet = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

export const cacheSet = (key, data, ttlMs = DEFAULT_TTL_MS) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, expiresAt: Date.now() + ttlMs }));
  } catch {
    // localStorage might be full – silently ignore
  }
};

export const cacheInvalidate = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {}
};
