/**
 * CORS for split deploy: Vercel (frontend) + Render (API).
 * Set ALLOWED_ORIGINS and PUBLIC_APP_URL on the API service.
 */

function parseOriginList() {
  const fromEnv = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const appUrl = process.env.PUBLIC_APP_URL?.trim();
  return [...new Set([...fromEnv, appUrl].filter(Boolean))];
}

function originAllowed(origin, allowed) {
  if (!origin) return false;
  if (allowed.some((o) => origin === o)) return true;
  // Vercel production + preview deployments
  if (allowed.some((o) => o.includes('vercel.app')) && origin.endsWith('.vercel.app')) return true;
  if (origin.endsWith('.vercel.app')) return true;
  return false;
}

export function buildCorsMiddleware() {
  const allowed = parseOriginList();

  return (req, res, next) => {
    const origin = req.headers.origin;

    if (process.env.NODE_ENV !== 'production' || !allowed.length) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    } else if (origin && originAllowed(origin, allowed)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] || 'Content-Type, Authorization'
    );

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  };
}
