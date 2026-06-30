export {
  MAIN_NAV_ITEMS,
  BOTTOM_NAV_ITEMS,
  NAV_ITEMS,
  navForRole,
  canAccess,
} from './nav.js';

export const ROLES = [
  {
    role: 'Admin',
    description: 'Full workspace control: settings, team, integrations, and policies.',
    access: [
      'Settings, scoring thresholds, DEI, and workspace mode',
      'Team access, integrations (Jira + ATS on eligible plans)',
      'Positions, candidates, audit, and all analytics',
    ],
  },
  {
    role: 'Recruiter',
    description: 'Runs hiring operations day to day.',
    access: [
      'Positions, candidates, screening, and pipeline stages',
      'Scorecards, notes, scheduling, and compare',
      'Integrations (Jira workflow; ATS on eligible plans)',
    ],
  },
  {
    role: 'Hiring Manager',
    description: 'Reviews candidates and makes hiring decisions.',
    access: [
      'Positions, candidates, scorecards, and recommendations',
      'Jira links on candidate profiles (when created by recruiters)',
      'No Integrations page or team administration',
    ],
  },
  {
    role: 'Compliance Auditor',
    description: 'Read-only compliance and audit visibility.',
    access: [
      'Audit log, analytics, and anonymized candidate views',
      'Team access page (view members, cannot edit)',
      'No candidate PII unlock or configuration changes',
    ],
  },
  {
    role: 'External Recruiter',
    description: 'Submits candidates for assigned roles only.',
    access: [
      'Submit applicants and view their own submissions',
      'No org-wide candidate list or intelligence exports',
    ],
  },
];

export function roleTone(role) {
  switch (role) {
    case 'Admin':
      return 'admin';
    case 'Recruiter':
      return 'recruiter';
    case 'Hiring Manager':
      return 'manager';
    case 'Compliance Auditor':
      return 'auditor';
    case 'External Recruiter':
      return 'external';
    default:
      return 'neutral';
  }
}
