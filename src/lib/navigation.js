/** Navigation state for “back to where I came from” flows. */

import { homeNavLabel } from './productMode.js';
import { candidateSectionLabel } from './candidateSections.js';

/** @deprecated Prefer browser back; kept for links that still pass state (ignored by PageBack). */
export function fromDashboardState(productMode) {
  return { from: '/', fromLabel: homeNavLabel(productMode) };
}

/** @deprecated Use fromDashboardState(productMode) */
export const FROM_DASHBOARD = { from: '/', fromLabel: 'Dashboard' };

export function pageLabel(pathname) {
  if (pathname === '/') return 'Home';
  if (pathname.startsWith('/recruiter-performance')) return 'Recruiter performance';
  if (pathname.startsWith('/candidates/compare')) return 'Compare candidates';
  if (/^\/candidates\/[^/]+\/scorecard$/.test(pathname)) return 'Scorecard';
  const candidateSection = pathname.match(/^\/candidates\/([^/]+)\/([^/]+)$/);
  if (candidateSection && candidateSection[2] !== 'scorecard') {
    return candidateSectionLabel(candidateSection[2]);
  }
  if (/^\/candidates\/[^/]+$/.test(pathname)) return 'Candidate';
  if (pathname.startsWith('/candidates')) {
    if (pathname.includes('integrity=flagged')) return 'Experience Verification';
    return 'Candidates';
  }
  if (pathname === '/jobs/new') return 'New position';
  if (/^\/jobs\/[^/]+\/edit$/.test(pathname)) return 'Edit position';
  if (/^\/jobs\/[^/]+$/.test(pathname)) return 'Position';
  if (pathname.startsWith('/jobs')) return 'Positions';
  if (pathname.startsWith('/rubrics')) return 'Screening';
  if (pathname.startsWith('/reports')) return 'Analytics';
  if (pathname.startsWith('/integrations')) return 'Integrations';
  if (pathname.startsWith('/trash')) return 'Trash';
  if (pathname.startsWith('/help')) return 'Help';
  if (pathname.startsWith('/settings')) return 'Settings';
  if (pathname.startsWith('/audit')) return 'Audit';
  if (pathname.startsWith('/access')) return 'Access';
  return 'Previous page';
}

/** Fallback parent route when there is no browser history (e.g. opened from a bookmark). */
export function parentRoute(pathname) {
  if (pathname === '/') return null;
  if (pathname === '/jobs/new') return '/jobs';
  const jobEdit = pathname.match(/^\/jobs\/([^/]+)\/edit$/);
  if (jobEdit) return `/jobs/${jobEdit[1]}`;
  if (/^\/jobs\/[^/]+$/.test(pathname)) return '/jobs';
  if (pathname.startsWith('/jobs')) return '/';
  if (pathname === '/candidates/compare') return '/candidates';
  const scorecard = pathname.match(/^\/candidates\/([^/]+)\/scorecard$/);
  if (scorecard) return `/candidates/${scorecard[1]}`;
  const candidateSection = pathname.match(/^\/candidates\/([^/]+)\/([^/]+)$/);
  if (candidateSection && candidateSection[2] !== 'scorecard') {
    return `/candidates/${candidateSection[1]}`;
  }
  if (/^\/candidates\/[^/]+$/.test(pathname)) return '/candidates';
  if (pathname.startsWith('/candidates')) return '/';
  if (/^\/rubrics\/templates\/[^/]+$/.test(pathname)) return '/rubrics/templates';
  if (pathname.startsWith('/rubrics/')) return '/rubrics';
  if (pathname.startsWith('/recruiter-performance')) return '/';
  if (pathname.startsWith('/trash')) return '/';
  if (pathname.startsWith('/reports')) return '/';
  if (pathname.startsWith('/integrations')) return '/';
  if (pathname.startsWith('/audit')) return '/';
  if (pathname.startsWith('/access')) return '/';
  if (pathname.startsWith('/help')) return '/';
  if (pathname.startsWith('/settings')) return '/';
  return '/';
}

/** @deprecated PageBack uses browser history; this is unused but safe on Link state. */
export function returnState(location, label) {
  let fromLabel = label;
  if (!fromLabel && location.pathname === '/candidates') {
    const params = new URLSearchParams(location.search);
    const bucket = params.get('bucket');
    if (bucket) fromLabel = `${bucket} candidates`;
    else if (params.get('integrity') === 'flagged') fromLabel = 'Experience Verification';
  }
  return {
    from: location.pathname + location.search,
    fromLabel: fromLabel || pageLabel(location.pathname),
  };
}

const CANDIDATES_RETURN_KEY = 'xperieval_candidates_return';

/** Remember the last filtered candidates list so back from a profile restores context. */
export function rememberCandidatesList(pathname, search) {
  if (typeof sessionStorage === 'undefined' || pathname !== '/candidates') return;
  const path = `${pathname}${search || ''}`;
  if (path === '/candidates') return;
  sessionStorage.setItem(CANDIDATES_RETURN_KEY, path);
}

/** Best return path for leaving a candidate profile (hub, section, or compare). */
export function candidatesListReturnPath(state) {
  if (state?.from?.startsWith('/candidates')) return state.from;
  if (typeof sessionStorage !== 'undefined') {
    const stored = sessionStorage.getItem(CANDIDATES_RETURN_KEY);
    if (stored?.startsWith('/candidates')) return stored;
  }
  return '/candidates';
}

export function isCandidateSectionPath(pathname) {
  const m = pathname.match(/^\/candidates\/([^/]+)\/([^/]+)$/);
  return Boolean(m && m[2] !== 'scorecard');
}

export function isCandidateHubPath(pathname) {
  return /^\/candidates\/[^/]+$/.test(pathname);
}
