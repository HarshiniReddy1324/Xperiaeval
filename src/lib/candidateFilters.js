/** Shared candidate list filters — URL is the source of truth. */

export const SCREENING_CHIPS = [
  { key: '', label: 'All screening' },
  { key: 'complete', label: 'Complete' },
  { key: 'incomplete', label: 'Incomplete' },
  { key: 'ai_used', label: 'AI used' },
];

export const BUCKET_TILES = [
  { key: 'Green', label: 'Green', tone: 'green', description: 'Strong fit — recommend for interview' },
  { key: 'Amber', label: 'Amber', tone: 'amber', description: 'Mixed fit — review carefully' },
  { key: 'Red', label: 'Red', tone: 'red', description: 'Weak fit or integrity concerns' },
];

export const BUCKET_CHIPS = [
  { key: 'Green', label: 'Green', tone: 'green' },
  { key: 'Amber', label: 'Amber', tone: 'amber' },
  { key: 'Red', label: 'Red', tone: 'red' },
];

export const PIPELINE_LABELS = {
  application_review: 'Application review',
  shortlisted_interview: 'Shortlisted',
  interview_scheduled: 'Interview scheduled',
  interview_pending: 'Interview pending',
  interview_completed: 'Interview completed',
  final_review: 'Final review',
  offer_extended: 'Offer extended',
  hired: 'Hired',
  rejected: 'Not advancing',
};

export const PIPELINE_FILTER_OPTIONS = [
  { value: '', label: 'All pipeline stages' },
  { value: 'application_review', label: PIPELINE_LABELS.application_review },
  { value: 'shortlisted_interview', label: PIPELINE_LABELS.shortlisted_interview },
  { value: 'interviewing', label: 'Interviewing (all stages)' },
  { value: 'interview_scheduled', label: PIPELINE_LABELS.interview_scheduled },
  { value: 'interview_pending', label: PIPELINE_LABELS.interview_pending },
  { value: 'interview_completed', label: PIPELINE_LABELS.interview_completed },
  { value: 'final_review', label: PIPELINE_LABELS.final_review },
  { value: 'selected', label: 'Selected / hired' },
  { value: 'offer_extended', label: PIPELINE_LABELS.offer_extended },
  { value: 'hired', label: PIPELINE_LABELS.hired },
  { value: 'rejected', label: PIPELINE_LABELS.rejected },
];

export function readCandidateFilters(searchParams) {
  return {
    jobId: searchParams.get('jobId') || '',
    bucket: searchParams.get('bucket') || '',
    pipeline: searchParams.get('pipeline') || '',
    screening: searchParams.get('screening') || '',
    integrity: searchParams.get('integrity') || '',
    hiddenGem: searchParams.get('hiddenGem') || '',
  };
}

export function buildCandidatesUrl(searchParams, patch = {}) {
  const next = new URLSearchParams(searchParams);
  Object.entries(patch).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') next.delete(key);
    else next.set(key, String(value));
  });
  const q = next.toString();
  return q ? `/candidates?${q}` : '/candidates';
}

export function filtersToQuery(filters) {
  const q = new URLSearchParams();
  if (filters.jobId) q.set('jobId', filters.jobId);
  if (filters.bucket) q.set('bucket', filters.bucket);
  if (filters.pipeline) q.set('pipeline', filters.pipeline);
  if (filters.screening) q.set('screening', filters.screening);
  if (filters.integrity) q.set('integrity', filters.integrity);
  if (filters.hiddenGem) q.set('hiddenGem', filters.hiddenGem);
  return q;
}

export function hasNonBucketFilters(filters) {
  return Boolean(
    filters.jobId || filters.pipeline || filters.screening || filters.integrity || filters.hiddenGem
  );
}

export function activeFilterTags(filters, jobs = []) {
  const tags = [];
  if (filters.jobId) {
    const job = jobs.find((j) => j.id === filters.jobId);
    tags.push({ key: 'jobId', label: job ? job.title : filters.jobId });
  }
  if (filters.pipeline) {
    const label = PIPELINE_FILTER_OPTIONS.find((o) => o.value === filters.pipeline)?.label || filters.pipeline;
    tags.push({ key: 'pipeline', label });
  }
  if (filters.screening) {
    const label = SCREENING_CHIPS.find((c) => c.key === filters.screening)?.label || filters.screening;
    tags.push({ key: 'screening', label: `Screening: ${label}` });
  }
  if (filters.integrity === 'flagged') tags.push({ key: 'integrity', label: 'Integrity flagged' });
  if (filters.hiddenGem === '1') tags.push({ key: 'hiddenGem', label: 'Hidden gems' });
  return tags;
}
