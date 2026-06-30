/** Resolve and normalize how a candidate entered the pipeline. */

const LABELS = {
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  glassdoor: 'Glassdoor',
  ziprecruiter: 'ZipRecruiter',
  handshake: 'Handshake',
  referral: 'Employee referral',
  'employee-referral': 'Employee referral',
  employee_referral: 'Employee referral',
  refer: 'Employee referral',
  recruiter: 'Recruiter',
  agency: 'Agency',
  staffing: 'Agency',
  'job-board': 'Job board',
  jobboard: 'Job board',
  'job board': 'Job board',
  careers: 'Careers page',
  direct: 'Careers page',
  'direct apply': 'Careers page',
  directapply: 'Careers page',
  embed: 'Embedded apply',
  sample: 'Sample data',
};

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\+/g, ' ')
    .replace(/[_\s]+/g, ' ')
    .replace(/[^a-z0-9 -]/g, '')
    .trim();
}

function titleCase(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function pickLabel(token) {
  if (!token) return null;
  if (LABELS[token]) return LABELS[token];
  const compact = token.replace(/\s+/g, '');
  if (LABELS[compact]) return LABELS[compact];
  if (token.includes('linkedin')) return 'LinkedIn';
  if (token.includes('indeed')) return 'Indeed';
  if (token.includes('glassdoor')) return 'Glassdoor';
  if (token.includes('referral') || token.includes('refer')) return 'Employee referral';
  if (token.includes('recruiter') || token.includes('agency') || token.includes('staffing')) {
    return token.includes('recruiter') ? 'Recruiter' : 'Agency';
  }
  if (token.includes('job board') || token.includes('jobboard')) return 'Job board';
  return null;
}

function resolveFromUtm(utmSource, utmMedium) {
  const source = normalizeToken(utmSource);
  const medium = normalizeToken(utmMedium);
  if (!source && !medium) return null;

  if (
    medium === 'referral' ||
    source === 'referral' ||
    source === 'employee' ||
    medium === 'employee referral' ||
    source === 'employee referral'
  ) {
    return 'Employee referral';
  }

  const fromSource = pickLabel(source);
  if (fromSource) return fromSource;
  if (source) return titleCase(source);
  return null;
}

function resolveFromReferrer(referrer) {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '').toLowerCase();
    if (host.includes('linkedin')) return 'LinkedIn';
    if (host.includes('indeed')) return 'Indeed';
    if (host.includes('glassdoor')) return 'Glassdoor';
    if (host.includes('ziprecruiter')) return 'ZipRecruiter';
    if (host.includes('handshake')) return 'Handshake';
  } catch {
    return null;
  }
  return null;
}

/**
 * @param {object} input
 * @param {string} [input.explicit] - raw source field from client or ATS
 * @param {string} [input.utmSource]
 * @param {string} [input.utmMedium]
 * @param {string} [input.ref] - ?ref= or ?source= tracking param
 * @param {string} [input.referrer] - HTTP Referer
 * @param {'careers'|'embed'|'ats'} [input.channel]
 * @param {string} [input.provider] - ATS provider name when channel is ats
 */
export function resolveApplicationSource(input = {}) {
  const { explicit, utmSource, utmMedium, ref, referrer, channel, provider } = input;

  if (channel === 'ats') {
    const fromPayload = pickLabel(normalizeToken(explicit)) || (explicit ? titleCase(explicit) : null);
    if (fromPayload) return fromPayload;
    const prov = titleCase(provider || 'ATS');
    return `${prov} import`;
  }

  const fromRef = pickLabel(normalizeToken(ref));
  if (fromRef) return fromRef;

  const fromUtm = resolveFromUtm(utmSource, utmMedium);
  if (fromUtm) return fromUtm;

  const fromReferrer = resolveFromReferrer(referrer);
  if (fromReferrer) return fromReferrer;

  const fromExplicit = pickLabel(normalizeToken(explicit));
  if (fromExplicit) return fromExplicit;

  if (channel === 'embed') return 'Embedded apply';

  return 'Careers page';
}

export function formatApplicationSource(source) {
  const trimmed = String(source || '').trim();
  if (!trimmed) return 'Careers page';
  return trimmed;
}
