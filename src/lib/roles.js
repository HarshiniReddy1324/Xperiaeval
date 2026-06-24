export {
  MAIN_NAV_ITEMS,
  BOTTOM_NAV_ITEMS,
  NAV_ITEMS,
  navForRole,
  canAccess,
} from './nav.js';

export const ROLES = [
  { role: 'Admin', description: 'Configure users, permissions, integrations, retention, and scoring policies.' },
  { role: 'Hiring Manager', description: 'View scorecards, explanations, reviewer notes, and decision recommendations.' },
  { role: 'Recruiter', description: 'Manage jobs, applications, communication, stages, and candidate data.' },
  { role: 'External Recruiter', description: 'Submit candidates and view only submitted applicants.' },
  { role: 'Compliance Auditor', description: 'View scoring versions, logs, overrides, reports, and exports.' },
];
