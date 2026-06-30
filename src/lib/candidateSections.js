import {
  BarChart3,
  FileText,
  MessageSquare,
  ShieldCheck,
  Target,
  ClipboardCheck,
  Activity,
  Calendar,
  Mic,
  ShieldAlert,
  Gem,
  History,
  SlidersHorizontal,
} from 'lucide-react';

export const CANDIDATE_SECTIONS = [
  {
    id: 'intelligence',
    label: 'Experience Intelligence',
    description: 'Explainable fit score, evidence, and recommendation.',
    icon: BarChart3,
    tone: 'purple',
    group: 'Evaluation',
    hiring: true,
    intelligence: true,
  },
  {
    id: 'experience-fit',
    label: 'Experience fit',
    description: 'How role requirements align with the candidate profile.',
    icon: Target,
    tone: 'blue',
    group: 'Evaluation',
    hiring: true,
    intelligence: true,
  },
  {
    id: 'resume-validation',
    label: 'Resume validation',
    description: 'Claims checked against screening evidence.',
    icon: ClipboardCheck,
    tone: 'green',
    group: 'Evaluation',
    hiring: true,
    intelligence: true,
  },
  {
    id: 'behavioral',
    label: 'Behavioral signals',
    description: 'Response patterns and communication style.',
    icon: Activity,
    tone: 'amber',
    group: 'Evaluation',
    hiring: true,
    intelligence: true,
  },
  {
    id: 'integrity-signals',
    label: 'Integrity signals',
    description: 'Risk flags from session and response analysis.',
    icon: ShieldAlert,
    tone: 'amber',
    group: 'Evaluation',
    hiring: true,
    intelligence: true,
  },
  {
    id: 'score-breakdown',
    label: 'Score breakdown',
    description: 'Per-question scores and re-score controls.',
    icon: SlidersHorizontal,
    tone: 'blue',
    group: 'Evaluation',
    hiring: true,
    intelligence: true,
  },
  {
    id: 'hidden-gem',
    label: 'Standout review',
    description: 'Strong screening with weaker resume overlap: advisory only.',
    icon: Gem,
    tone: 'amber',
    group: 'Evaluation',
    hiring: true,
    intelligence: true,
    when: ({ hiddenGem }) => hiddenGem?.isHiddenGem,
  },
  {
    id: 'audit',
    label: 'Audit timeline',
    description: 'Scoring, reviews, overrides, and pipeline changes.',
    icon: History,
    tone: 'purple',
    group: 'Activity',
    hiring: true,
    intelligence: true,
    when: ({ activity }) => (activity?.length ?? 0) > 0,
  },
  {
    id: 'scheduling',
    label: 'Interview scheduling',
    description: 'Send booking links and confirm interview times.',
    icon: Calendar,
    tone: 'blue',
    group: 'Hiring workflow',
    hiring: true,
    intelligence: false,
  },
  {
    id: 'resume',
    label: 'Resume',
    description: 'Uploaded file and text used for scoring.',
    icon: FileText,
    tone: 'green',
    group: 'Application materials',
    hiring: true,
    intelligence: false,
  },
  {
    id: 'answers',
    label: 'Application answers',
    description: 'Screening responses, recordings, and transcripts.',
    icon: MessageSquare,
    tone: 'purple',
    group: 'Application materials',
    hiring: true,
    intelligence: false,
  },
  {
    id: 'proctoring',
    label: 'Session integrity',
    description: 'Proctoring signals from the apply session.',
    icon: ShieldAlert,
    tone: 'amber',
    group: 'Application materials',
    hiring: true,
    intelligence: false,
    when: ({ canSeeIntegrity }) => canSeeIntegrity,
  },
  {
    id: 'notes',
    label: 'Reviewer notes',
    description: 'Team comments recorded in the audit log.',
    icon: MessageSquare,
    tone: 'blue',
    group: 'Reviewer actions',
    hiring: true,
    intelligence: false,
  },
  {
    id: 'voice',
    label: 'Voice verification',
    description: 'Identity check against application audio.',
    icon: Mic,
    tone: 'purple',
    group: 'Reviewer actions',
    hiring: true,
    intelligence: false,
  },
  {
    id: 'override',
    label: 'Bucket override',
    description: 'Change Green, Amber, or Red after human review.',
    icon: SlidersHorizontal,
    tone: 'amber',
    group: 'Reviewer actions',
    hiring: true,
    intelligence: false,
  },
  {
    id: 'background',
    label: 'Background check',
    description: 'Pre-employment verification for Green-bucket candidates.',
    icon: ShieldCheck,
    tone: 'green',
    group: 'Reviewer actions',
    hiring: true,
    intelligence: false,
  },
];

export function getVisibleCandidateSections(ctx) {
  const { isIntelOnly } = ctx;
  return CANDIDATE_SECTIONS.filter((section) => {
    if (isIntelOnly && !section.intelligence) return false;
    if (!isIntelOnly && !section.hiring) return false;
    if (section.when && !section.when(ctx)) return false;
    return true;
  });
}

export function getCandidateSection(id) {
  return CANDIDATE_SECTIONS.find((s) => s.id === id);
}

export function candidateSectionLabel(id) {
  return getCandidateSection(id)?.label || 'Candidate section';
}
