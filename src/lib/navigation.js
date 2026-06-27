/** Navigation state for “back to where I came from” flows. */

/** @deprecated Prefer browser back; kept for links that still pass state (ignored by PageBack). */
export const FROM_DASHBOARD = { from: '/', fromLabel: 'Dashboard' };

export function pageLabel(pathname) {
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/recruiter-performance')) return 'Recruiter performance';
  if (pathname.startsWith('/candidates/compare')) return 'Compare candidates';
  if (/^\/candidates\/[^/]+\/scorecard$/.test(pathname)) return 'Scorecard';
  if (/^\/candidates\/[^/]+$/.test(pathname)) return 'Candidate';
  if (pathname.startsWith('/candidates')) return 'Candidates';
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
  return {
    from: location.pathname + location.search,
    fromLabel: label || pageLabel(location.pathname),
  };
}
