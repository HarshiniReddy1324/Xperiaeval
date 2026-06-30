/** Navigation state for “back to where I came from” flows. */

import { homeNavLabel } from './productMode.js';
import { candidateSectionLabel } from './candidateSections.js';
import { analyticsSectionLabel } from './analyticsSections.js';
import { settingsSectionLabel } from './settingsSections.js';

/** @deprecated Prefer browser back; kept for links that still pass state (ignored by PageBack). */
export function fromDashboardState(productMode) {
  return { from: '/dashboard', fromLabel: homeNavLabel(productMode) };
}

/** @deprecated Use fromDashboardState(productMode) */
export const FROM_DASHBOARD = { from: '/dashboard', fromLabel: 'Dashboard' };

export function pageLabel(pathname) {
  if (pathname === '/dashboard') return 'Home';
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
  const analyticsSection = pathname.match(/^\/reports\/([^/]+)$/);
  if (analyticsSection) return analyticsSectionLabel(analyticsSection[1]);
  if (pathname.startsWith('/reports')) return 'Analytics';
  const settingsSection = pathname.match(/^\/settings\/([^/]+)$/);
  if (settingsSection) return settingsSectionLabel(settingsSection[1]);
  if (pathname.startsWith('/settings')) return 'Settings';
  if (pathname.startsWith('/integrations')) return 'Integrations';
  if (pathname.startsWith('/trash')) return 'Trash';
  if (pathname.startsWith('/help')) return 'Help';
  if (pathname.startsWith('/audit')) return 'Audit';
  if (pathname.startsWith('/access')) return 'Access';
  return 'Previous page';
}

/** Fallback parent route when there is no browser history (e.g. opened from a bookmark). */
export function parentRoute(pathname) {
  if (pathname === '/dashboard') return null;
  if (pathname === '/jobs/new') return '/jobs';
  const jobEdit = pathname.match(/^\/jobs\/([^/]+)\/edit$/);
  if (jobEdit) return `/jobs/${jobEdit[1]}`;
  if (/^\/jobs\/[^/]+$/.test(pathname)) return '/jobs';
  if (pathname.startsWith('/jobs')) return '/dashboard';
  if (pathname === '/candidates/compare') return '/candidates';
  const scorecard = pathname.match(/^\/candidates\/([^/]+)\/scorecard$/);
  if (scorecard) return `/candidates/${scorecard[1]}`;
  const candidateSection = pathname.match(/^\/candidates\/([^/]+)\/([^/]+)$/);
  if (candidateSection && candidateSection[2] !== 'scorecard') {
    return `/candidates/${candidateSection[1]}`;
  }
  if (/^\/candidates\/[^/]+$/.test(pathname)) return '/candidates';
  if (pathname.startsWith('/candidates')) return '/dashboard';
  if (/^\/rubrics\/templates\/[^/]+$/.test(pathname)) return '/rubrics/templates';
  if (pathname.startsWith('/rubrics/')) return '/rubrics';
  if (pathname.startsWith('/recruiter-performance')) return '/dashboard';
  if (pathname.startsWith('/trash')) return '/dashboard';
  if (pathname.match(/^\/reports\/[^/]+$/)) return '/reports';
  if (pathname.startsWith('/reports')) return '/dashboard';
  if (pathname.match(/^\/settings\/[^/]+$/)) return '/settings';
  if (pathname.startsWith('/settings')) return '/dashboard';
  if (pathname.startsWith('/integrations')) return '/dashboard';
  if (pathname.startsWith('/audit')) return '/dashboard';
  if (pathname.startsWith('/access')) return '/dashboard';
  if (pathname.startsWith('/help')) return '/dashboard';
  return '/dashboard';
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
