export const MAIN_NAV_ITEMS = [
  { path: '/', label: 'Dashboard', roles: ['Admin', 'Hiring Manager', 'Recruiter', 'Compliance Auditor'] },
  { path: '/jobs', label: 'Positions', roles: ['Admin', 'Hiring Manager', 'Recruiter', 'External Recruiter'] },
  { path: '/candidates', label: 'Candidates', roles: ['Admin', 'Hiring Manager', 'Recruiter', 'External Recruiter', 'Compliance Auditor'] },
  { path: '/rubrics', label: 'Screening', roles: ['Admin', 'Hiring Manager', 'Recruiter'] },
  { path: '/audit', label: 'Audit', roles: ['Admin', 'Compliance Auditor', 'Recruiter'] },
  { path: '/reports', label: 'Reports', roles: ['Admin', 'Hiring Manager', 'Recruiter', 'Compliance Auditor'] },
  { path: '/integrations', label: 'Integrations', roles: ['Admin', 'Recruiter'] },
  { path: '/access', label: 'Access', roles: ['Admin', 'Compliance Auditor'] },
  { path: '/help', label: 'Help', roles: ['Admin', 'Hiring Manager', 'Recruiter', 'Compliance Auditor', 'External Recruiter'] },
];

export const BOTTOM_NAV_ITEMS = [
  { path: '/trash', label: 'Trash', roles: ['Admin', 'Hiring Manager', 'Recruiter'] },
  { path: '/settings', label: 'Settings', roles: ['Admin', 'Recruiter'] },
];

export function navForRole(role) {
  const main = MAIN_NAV_ITEMS.filter((n) => n.roles.includes(role));
  const bottom = BOTTOM_NAV_ITEMS.filter((n) => n.roles.includes(role));
  return { main, bottom };
}

export const NAV_ITEMS = [...MAIN_NAV_ITEMS, ...BOTTOM_NAV_ITEMS];

export function canAccess(role, path) {
  const item = NAV_ITEMS.find((n) => n.path === path || (path !== '/' && path.startsWith(n.path) && n.path !== '/'));
  if (!item) return true;
  return item.roles.includes(role);
}
