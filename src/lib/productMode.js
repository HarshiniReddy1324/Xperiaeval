/** Client-side product mode helpers (mirrors server/productMode.js). */

export const PRODUCT_MODES = ['hiring', 'intelligence', 'both'];

export const PRODUCT_LABELS = {
  hiring: 'Xperieval Hiring',
  intelligence: 'Xperieval Intelligence',
  both: 'Hiring + Intelligence',
};

export const PRODUCT_SUBTITLES = {
  hiring: 'Hiring workspace',
  intelligence: 'Experience intelligence',
  both: 'Unified platform',
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

export function homeNavLabel(mode) {
  return normalizeProductMode(mode) === 'intelligence' ? 'Intelligence' : 'Dashboard';
}

const HIRING_ONLY_PATHS = new Set(['/jobs', '/rubrics', '/trash']);

/** Filter sidebar nav items by org product mode. */
export function filterNavByProductMode(navItems, productMode) {
  const mode = normalizeProductMode(productMode);
  if (mode === 'both') return navItems;

  return navItems.filter((item) => {
    const base = item.path.split('?')[0];
    if (mode === 'intelligence') {
      if (HIRING_ONLY_PATHS.has(base)) return false;
      if (item.path.includes('pipeline=shortlisted')) return false;
      if (item.path.includes('integrity=flagged')) return false;
      return true;
    }
    if (mode === 'hiring') {
      if (base === '/integrations') return false;
      return true;
    }
    return true;
  });
}
