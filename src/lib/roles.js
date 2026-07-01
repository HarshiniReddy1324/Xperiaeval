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
      'Integrations for workflow (Jira; ATS on eligible plans)',
      'No workspace settings, pilot program, or scoring methodology docs',
    ],
  },
  {
    role: 'Hiring Manager',
    description: 'Reviews candidates and makes hiring decisions.',
    access: [
      'Dashboard overview and candidate pipeline visibility',
      'Simplified scorecards and interview-focused candidate views',
      'Compare, notes, and scheduling on assigned candidates',
      'Limited analytics (overview, applicants, by position)',
      'No screening setup, audit log, settings, or integrations',
    ],
  },
  {
    role: 'Compliance Auditor',
    description: 'Read-only compliance and audit visibility.',
    access: [
      'Audit log, compliance analytics, and anonymized candidate views',
      'Team access page (view members only)',
      'No positions management, screening config, or settings',
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
