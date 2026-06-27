/**
 * Job requisition workflow stages — set manually when creating/editing a position.
 * Not derived from applicant counts or pipeline stages.
 *
 * Order matches the hiring workflow left → right.
 */
export const JOB_STAGES = [
  'Draft',
  'Open',
  'Screening',
  'Hiring Team Review',
  'Interviewing',
  'Filled',
];

export const JOB_STAGE_DESCRIPTIONS = {
  Draft: 'Requisition is being prepared — not yet accepting applicants.',
  Open: 'Posting is live and accepting applications.',
  Screening: 'Applicants are being screened and scored.',
  'Hiring Team Review': 'Hiring team is reviewing scored candidates.',
  Interviewing: 'Candidates are in the interview process.',
  Filled: 'Position has been filled.',
};

/** How each stage appears on the Positions page filters / dashboard buckets. */
export const JOB_STAGE_FILTER_HINT = {
  Draft: 'More Time',
  Open: 'About to Start',
  Screening: 'In Progress',
  'Hiring Team Review': 'In Progress',
  Interviewing: 'In Progress',
  Filled: 'Filled',
};

export const STAGE_TONE = {
  Draft: 'purple',
  Open: 'amber',
  Screening: 'blue',
  'Hiring Team Review': 'blue',
  Interviewing: 'green',
  Filled: 'green',
};

export function stageSortIndex(stage) {
  const index = JOB_STAGES.indexOf(stage);
  return index === -1 ? JOB_STAGES.length : index;
}

export function compareJobsByStage(a, b) {
  const byStage = stageSortIndex(a.stage) - stageSortIndex(b.stage);
  if (byStage !== 0) return byStage;
  return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
}

/** Aligns with dashboard position KPI buckets. */
export const JOB_STAGE_BUCKET = {
  Draft: 'delayed',
  Open: 'about_to_start',
  Screening: 'in_progress',
  'Hiring Team Review': 'in_progress',
  Interviewing: 'in_progress',
  Filled: 'filled',
  Closed: 'filled',
  Hired: 'filled',
};

export const POSITION_FILTERS = [
  { id: '', label: 'All positions', tone: 'blue' },
  { id: 'filled', label: 'Filled', tone: 'green' },
  { id: 'in_progress', label: 'In Progress', tone: 'blue' },
  { id: 'about_to_start', label: 'About to Start', tone: 'amber' },
  { id: 'delayed', label: 'More Time', tone: 'purple' },
];

/** Legacy dashboard links used ?stage= — map to bucket filters. */
export const LEGACY_STAGE_FILTER = {
  Filled: 'filled',
  Screening: 'in_progress',
  Open: 'about_to_start',
  Draft: 'delayed',
};

export function jobPositionBucket(job) {
  if (job.is_filled) return 'filled';
  return JOB_STAGE_BUCKET[job.stage] || 'in_progress';
}

export function matchesPositionFilter(job, filterId) {
  if (!filterId) return true;
  return jobPositionBucket(job) === filterId;
}

export function positionFilterLabel(filterId) {
  return POSITION_FILTERS.find((f) => f.id === filterId)?.label || filterId;
}

/** Career level for sorting and filtering positions. */
export const POSITION_LEVELS = [
  { id: 'internship', label: 'Internship', shortLabel: 'Internship', tone: 'purple', description: 'Intern and co-op roles' },
  { id: 'entry', label: 'Entry level', shortLabel: 'Entry', tone: 'green', description: 'Early-career and associate roles' },
  { id: 'mid', label: 'Mid level', shortLabel: 'Mid', tone: 'blue', description: 'Experienced individual contributors' },
  { id: 'senior', label: 'Senior level', shortLabel: 'Senior', tone: 'amber', description: 'Senior, staff, and leadership roles' },
];

export function positionLevelLabel(levelId) {
  return POSITION_LEVELS.find((l) => l.id === levelId)?.label || levelId || '—';
}

export function positionLevelSortIndex(levelId) {
  const index = POSITION_LEVELS.findIndex((l) => l.id === levelId);
  return index === -1 ? POSITION_LEVELS.length : index;
}

export function compareJobsByLevel(a, b) {
  const byLevel = positionLevelSortIndex(a.position_level) - positionLevelSortIndex(b.position_level);
  if (byLevel !== 0) return byLevel;
  return compareJobsByStage(a, b);
}

export function compareJobsByStageOnly(a, b) {
  return compareJobsByStage(a, b);
}

export function matchesPositionLevel(job, levelId) {
  if (!levelId) return true;
  return (job.position_level || 'entry') === levelId;
}
