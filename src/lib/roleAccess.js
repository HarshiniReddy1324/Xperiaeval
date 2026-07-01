/** Role-based visibility for product internals vs day-to-day hiring work. */

import { canAccess } from './nav.js';

export function userRole(user) {
  return user?.role || 'Hiring Manager';
}

export function isAdmin(userOrRole) {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
  return role === 'Admin';
}

/** Scoring weights, methodology, workspace config, pilot limits, platform architecture. */
export function canViewProductInternals(user) {
  return isAdmin(user);
}

export function canManageSettings(user) {
  return isAdmin(user);
}

export function canViewPilotProgram(user) {
  return isAdmin(user);
}

export function canAccessIntegrationsNav(user) {
  return ['Admin', 'Recruiter'].includes(userRole(user));
}

export function canConfigureScreening(user) {
  return ['Admin', 'Recruiter'].includes(userRole(user));
}

export function canViewAuditLog(user) {
  return ['Admin', 'Compliance Auditor'].includes(userRole(user));
}

export function canViewTrash(user) {
  return ['Admin', 'Recruiter'].includes(userRole(user));
}

/** Help sections that expose scoring architecture or admin-only configuration. */
export const HELP_INTERNAL_SECTIONS = new Set([
  'modules',
  'scoring',
  'settings',
  'integrations',
  'proctoring',
  'experience',
  'audit',
]);

export function canViewHelpSection(sectionId, user) {
  if (isAdmin(user)) return true;
  const role = userRole(user);
  if (HELP_INTERNAL_SECTIONS.has(sectionId)) return false;
  if (sectionId === 'analytics' && role === 'Hiring Manager') return false;
  if (sectionId === 'screening' && role === 'Hiring Manager') return false;
  if (sectionId === 'identity' && role === 'Hiring Manager') return false;
  return true;
}

export function canAccessRoute(role, pathname) {
  const path = (pathname || '').split('?')[0];
  if (path === '/dashboard' || path === '/recruiter-performance') {
    return ['Admin', 'Hiring Manager', 'Recruiter', 'Compliance Auditor', 'External Recruiter'].includes(role);
  }
  if (path.startsWith('/candidates')) return canAccess(role, '/candidates');
  if (path.startsWith('/jobs')) return canAccess(role, '/jobs');
  if (path.startsWith('/rubrics')) return canAccess(role, '/rubrics');
  if (path.startsWith('/reports')) return canAccess(role, '/reports');
  if (path.startsWith('/settings')) return canAccess(role, '/settings');
  if (path.startsWith('/integrations')) return canAccess(role, '/integrations');
  if (path.startsWith('/audit')) return canAccess(role, '/audit');
  if (path.startsWith('/access')) return canAccess(role, '/access');
  if (path.startsWith('/trash')) return canAccess(role, '/trash');
  if (path.startsWith('/help')) return canAccess(role, '/help');
  return true;
}
