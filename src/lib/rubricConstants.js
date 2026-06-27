export const RESPONSE_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
];

export const PRIORITIES = [
  { value: 'mandatory', label: 'Mandatory (10 pts)' },
  { value: 'optional', label: 'Optional (10 pts)' },
];

export const CATEGORY_TYPES = [
  'Technical',
  'Behavioral',
  'Problem Solving',
  'Communication',
  'Project Experience',
  'Leadership',
  'Motivation',
  'General',
];

export const SCREENING_HUB_TILES = [
  {
    key: 'new',
    to: '/rubrics/new',
    label: 'Create questionnaire',
    description: 'Build a full 10-question screening set (7 required + 3 optional)',
    tone: 'blue',
  },
  {
    key: 'templates',
    to: '/rubrics/templates',
    label: 'Saved templates',
    description: 'Browse, preview, and apply reusable questionnaires',
    tone: 'purple',
  },
  {
    key: 'library',
    to: '/rubrics/library',
    label: 'Question library',
    description: 'Questions by department — pick, edit, or build a template',
    tone: 'green',
  },
  {
    key: 'jobs',
    to: '/rubrics/jobs',
    label: 'Manage by job',
    description: 'Edit screening rubrics tied to open positions',
    tone: 'amber',
  },
];

export function emptyQuestionnaireSlots() {
  return Array.from({ length: 10 }, (_, i) => ({
    name: '',
    weight: 10,
    question: '',
    ideal_answer: '',
    expected_evidence: '',
    category_type: 'General',
    response_type: 'text',
    priority: i < 7 ? 'mandatory' : 'optional',
    max_response_seconds: 300,
    keywords: '',
    sort_order: i,
  }));
}

export function validateQuestionnaire(questions) {
  const mandatory = questions.filter((q) => q.priority !== 'optional');
  const optional = questions.filter((q) => q.priority === 'optional');
  if (mandatory.length !== 7 || optional.length !== 3) {
    return `Need 7 mandatory + 3 optional (currently ${mandatory.length} + ${optional.length})`;
  }
  if (!questions.every((q) => q.question?.trim() && q.name?.trim())) {
    return 'Every question needs a name and question text';
  }
  if (!questions.every((q) => Number(q.weight) === 10)) {
    return 'Each question must be worth 10 points';
  }
  return null;
}

export function questionnaireCounts(questions) {
  const mandatory = questions.filter((q) => q.priority !== 'optional').length;
  const optional = questions.filter((q) => q.priority === 'optional').length;
  return { mandatory, optional, valid: mandatory === 7 && optional === 3 };
}
