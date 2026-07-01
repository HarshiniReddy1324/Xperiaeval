import {
  Building2,
  Calendar,
  Cpu,
  FileText,
  Scale,
  Shield,
  ShieldCheck,
  Timer,
  Rocket,
} from 'lucide-react';

export const SETTINGS_SECTIONS = [
  {
    id: 'pilot',
    label: 'Pilot program',
    description: 'Usage limits, plan status, and upgrade requests.',
    icon: Rocket,
    tone: 'green',
    modes: ['hiring', 'intelligence', 'both'],
    adminOnly: true,
  },
  {
    id: 'general',
    label: 'Organization',
    description: 'Company name shown on apply forms and communications.',
    icon: Building2,
    tone: 'blue',
    modes: ['hiring', 'intelligence', 'both'],
  },
  {
    id: 'thresholds',
    label: 'Scoring thresholds',
    description: 'Green, amber, and tier defaults for new positions.',
    icon: Scale,
    tone: 'purple',
    modes: ['hiring', 'intelligence', 'both'],
  },
  {
    id: 'notice',
    label: 'Candidate notice',
    description: 'Legal copy on every public apply form.',
    icon: FileText,
    tone: 'green',
    modes: ['hiring', 'both'],
  },
  {
    id: 'retention',
    label: 'Data retention',
    description: 'How long applications are kept and deleted.',
    icon: Timer,
    tone: 'amber',
    modes: ['hiring', 'intelligence', 'both'],
  },
  {
    id: 'scheduling',
    label: 'Interview scheduling',
    description: 'Scheduling link on candidate communications.',
    icon: Calendar,
    tone: 'blue',
    modes: ['hiring', 'both'],
  },
  {
    id: 'proctoring',
    label: 'Apply proctoring',
    description: 'Fullscreen, focus tracking, timers, and integrity rules.',
    icon: ShieldCheck,
    tone: 'red',
    modes: ['hiring', 'both'],
  },
  {
    id: 'dei',
    label: 'Blind review',
    description: 'Hide identity until shortlist for fair screening.',
    icon: Shield,
    tone: 'slate',
    modes: ['hiring', 'both'],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    description: 'Which Xperieval modules appear in the sidebar (Admin).',
    icon: Cpu,
    tone: 'purple',
    modes: ['hiring', 'intelligence', 'both'],
    adminOnly: true,
  },
];

export function getVisibleSettingsSections(productMode, { isAdmin = false } = {}) {
  const mode = productMode || 'both';
  return SETTINGS_SECTIONS.filter(
    (s) => s.modes.includes(mode) && (!s.adminOnly || isAdmin)
  );
}

export function settingsSectionById(id) {
  return SETTINGS_SECTIONS.find((s) => s.id === id) || null;
}

export function settingsSectionLabel(id) {
  return settingsSectionById(id)?.label || 'Settings';
}

export function isSettingsHubPath(pathname) {
  return pathname === '/settings' || pathname === '/settings/';
}

export function isSettingsSectionPath(pathname) {
  return /^\/settings\/[^/]+$/.test(pathname);
}
