/**
 * API base URL for production (Vercel frontend + Render API).
 * Leave unset in local dev — Vite proxies /api to localhost:3001.
 */
export function apiBase() {
  return (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
}

/** @param {string} path — must start with /api/... */
export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = apiBase();
  return base ? `${base}${p}` : p;
}

/** Resume/audio/upload paths from API — prefix with Render URL when UI is on Vercel. */
export function assetUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = apiBase();
  return base ? `${base}${p}` : p;
}
