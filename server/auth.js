import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  return 'xperieval-dev-secret-change-in-production';
}

const JWT_SECRET = getJwtSecret();

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, orgId: user.org_id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  req.user = payload;
  next();
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    const payload = verifyToken(token);
    if (payload) req.user = payload;
  }
  next();
}

export function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user?.role || !allowed.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires role: ${allowed.join(' or ')}` });
    }
    next();
  };
}

/** API key auth for Xperieval Intelligence public API (xpi_… keys). */
export function createApiKeyMiddleware(db, resolveApiKey) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const raw = header.startsWith('Bearer ') ? header.slice(7) : req.headers['x-api-key'];
    if (!raw) return res.status(401).json({ error: 'API key required' });
    const row = resolveApiKey(db, raw);
    if (!row) return res.status(401).json({ error: 'Invalid or revoked API key' });
    req.apiKey = row;
    req.user = { sub: null, orgId: row.org_id, role: 'API', name: 'API Key', email: '' };
    next();
  };
}
