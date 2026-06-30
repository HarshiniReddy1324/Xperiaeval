/** Xperieval Hiring vs Xperieval Intelligence product modes. */

export const PRODUCT_MODES = ['hiring', 'intelligence', 'both'];

export const PRODUCT_LABELS = {
  hiring: 'Xperieval Hiring',
  intelligence: 'Xperieval Intelligence',
  both: 'Hiring + Intelligence',
};

export function normalizeProductMode(mode) {
  return PRODUCT_MODES.includes(mode) ? mode : 'both';
}

export function hasHiringFeatures(mode) {
  const m = normalizeProductMode(mode);
  return m === 'hiring' || m === 'both';
}

export function hasIntelligenceFeatures(mode) {
  const m = normalizeProductMode(mode);
  return m === 'intelligence' || m === 'both';
}

/** Home nav label for product mode. */
export function homeNavLabel(mode) {
  return normalizeProductMode(mode) === 'intelligence' ? 'Intelligence' : 'Dashboard';
}

export function requireOrgProductFeature(db, feature) {
  return (req, res, next) => {
    const orgId = req.user?.orgId ?? req.apiKey?.org_id;
    if (!orgId) return res.status(401).json({ error: 'Unauthorized' });
    const row = db.prepare('SELECT product_mode FROM organizations WHERE id = ?').get(orgId);
    const ok =
      feature === 'hiring'
        ? hasHiringFeatures(row?.product_mode)
        : hasIntelligenceFeatures(row?.product_mode);
    if (!ok) {
      return res.status(403).json({
        error:
          feature === 'hiring'
            ? 'Xperieval Hiring is not enabled for this organization'
            : 'Xperieval Intelligence is not enabled for this organization',
      });
    }
    next();
  };
}
