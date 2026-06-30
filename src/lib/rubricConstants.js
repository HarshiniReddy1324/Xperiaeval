export const RESPONSE_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
];

export const PRIORITIES = [
  { value: 'mandatory', label: 'Required' },
  { value: 'optional', label: 'Optional' },
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

export const MIN_RUBRIC_QUESTIONS = 1;
export const MAX_RUBRIC_QUESTIONS = 40;

export const SCREENING_HUB_TILES = [
  {
    key: 'new',
    to: '/rubrics/new',
    label: 'Create questionnaire',
    description: 'Build a custom screening questionnaire for a position.',
    tone: 'blue',
  },
  {
    key: 'templates',
    to: '/rubrics/templates',
    label: 'Saved templates',
    description: 'Browse, preview, and apply reusable questionnaires.',
    tone: 'purple',
  },
  {
    key: 'library',
    to: '/rubrics/library',
    label: 'Question library',
    description: 'Manage questions by department and role level.',
    tone: 'green',
  },
  {
    key: 'jobs',
    to: '/rubrics/jobs',
    label: 'Manage by position',
    description: 'Assign or update screening questionnaires for open positions.',
    tone: 'amber',
  },
];

export function distributeWeights(count) {
  if (count < 1) return [];
  const base = Math.floor(100 / count);
  const remainder = 100 - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function createEmptyQuestion(priority = 'mandatory') {
  return {
    name: '',
    weight: 0,
    question: '',
    ideal_answer: '',
    expected_evidence: '',
    category_type: 'General',
    response_type: 'text',
    priority,
    max_response_seconds: 300,
    keywords: '',
    sort_order: 0,
  };
}

export function emptyQuestionnaireSlots() {
  return [createEmptyQuestion('mandatory')];
}

export function normalizeQuestionnaire(questions) {
  const weights = distributeWeights(questions.length);
  return questions.map((q, i) => ({ ...q, weight: weights[i], sort_order: i }));
}

export function validateQuestionnaire(questions) {
  const n = questions.length;
  if (n < MIN_RUBRIC_QUESTIONS) {
    return `Add at least ${MIN_RUBRIC_QUESTIONS} question.`;
  }
  if (n > MAX_RUBRIC_QUESTIONS) {
    return `Maximum ${MAX_RUBRIC_QUESTIONS} questions per questionnaire.`;
  }
  if (!questions.every((q) => q.question?.trim() && q.name?.trim())) {
    return 'Every question needs a name and question text';
  }
  return null;
}

export function questionnaireCounts(questions) {
  const mandatory = questions.filter((q) => q.priority !== 'optional').length;
  const optional = questions.filter((q) => q.priority === 'optional').length;
  const weights = distributeWeights(questions.length);
  const mandatoryPts = questions.reduce(
    (sum, q, i) => sum + (q.priority !== 'optional' ? weights[i] : 0),
    0
  );
  const optionalPts = 100 - mandatoryPts;
  return {
    mandatory,
    optional,
    total: questions.length,
    mandatoryPts,
    optionalPts,
    valid: !validateQuestionnaire(questions),
  };
}
