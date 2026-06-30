import {
  BarChart3,
  Briefcase,
  ClipboardCheck,
  Layers,
  Sparkles,
  Users,
} from 'lucide-react';

export const ANALYTICS_SECTIONS = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Score buckets, authenticity, and org-wide totals.',
    icon: BarChart3,
    tone: 'blue',
    hiring: true,
    intelligence: true,
  },
  {
    id: 'experience',
    label: 'Experience Intelligence',
    description: 'Quality trends, source performance, and recruiter contribution.',
    icon: Sparkles,
    tone: 'purple',
    hiring: true,
    intelligence: true,
  },
  {
    id: 'applicants',
    label: 'Applicant insights',
    description: 'Seniority, education, skills, and role fit signals.',
    icon: Users,
    tone: 'green',
    hiring: true,
    intelligence: false,
  },
  {
    id: 'screening',
    label: 'Pre-screening funnel',
    description: 'Completion rates, integrity flags, and routing buckets.',
    icon: ClipboardCheck,
    tone: 'amber',
    hiring: true,
    intelligence: false,
  },
  {
    id: 'positions',
    label: 'By position',
    description: 'Applicants per role, pipeline stages, and recent volume.',
    icon: Briefcase,
    tone: 'blue',
    hiring: true,
    intelligence: false,
  },
  {
    id: 'platform',
    label: 'Platform capabilities',
    description: 'Live and planned validation & integrity features.',
    icon: Layers,
    tone: 'slate',
    hiring: true,
    intelligence: false,
  },
];

export function getVisibleAnalyticsSections({ isIntelOnly = false } = {}) {
  return ANALYTICS_SECTIONS.filter((s) => (isIntelOnly ? s.intelligence : s.hiring));
}

/** Hub navigation tiles; overview is shown inline on /reports. */
export function getAnalyticsHubSections({ isIntelOnly = false } = {}) {
  return getVisibleAnalyticsSections({ isIntelOnly }).filter((s) => s.id !== 'overview');
}

export function analyticsSectionById(id) {
  return ANALYTICS_SECTIONS.find((s) => s.id === id) || null;
}

export function analyticsSectionLabel(id) {
  return analyticsSectionById(id)?.label || 'Analytics';
}

export function isAnalyticsHubPath(pathname) {
  return pathname === '/reports' || pathname === '/reports/';
}

export function isAnalyticsSectionPath(pathname) {
  return /^\/reports\/[^/]+$/.test(pathname);
}
