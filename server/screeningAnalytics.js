import { buildScreeningMetrics } from './screening.js';

/**
 * Pre-screening funnel analytics for the Analytics page.
 */
export function buildScreeningAnalytics(db, orgId) {
  const metrics = buildScreeningMetrics(orgId, db);

  const apps = db
    .prepare(
      `SELECT a.screening_status, a.completion_pct, a.screening_category
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE j.org_id = ? AND j.deleted_at IS NULL AND a.deleted_at IS NULL`
    )
    .all(orgId);

  const proctoringViolation = apps.filter((a) => a.screening_status === 'proctoring_violation').length;
  const partialMandatory = apps.filter(
    (a) => a.screening_status === 'incomplete' && (a.completion_pct || 0) >= 70
  ).length;

  const buckets = [
    { id: 'complete', label: 'Complete screening', count: metrics.complete, tone: 'green' },
    { id: 'incomplete', label: 'Incomplete applications', count: metrics.incomplete, tone: 'amber' },
    { id: 'ai_used', label: 'AI used / flagged', count: metrics.ai_used, tone: 'red' },
    { id: 'proctoring_violation', label: 'Proctoring violations', count: proctoringViolation, tone: 'red' },
    {
      id: 'partial',
      label: 'Mandatory complete only',
      count: partialMandatory,
      tone: 'blue',
    },
  ].map((b) => ({
    ...b,
    pct: metrics.total_screened ? Math.round((b.count / metrics.total_screened) * 100) : 0,
  }));

  const byJob = db
    .prepare(
      `SELECT j.id, j.title,
              COUNT(a.id) as total,
              SUM(CASE WHEN a.screening_status = 'complete' THEN 1 ELSE 0 END) as complete,
              SUM(CASE WHEN a.screening_status = 'incomplete' THEN 1 ELSE 0 END) as incomplete,
              SUM(CASE WHEN a.screening_status = 'ai_used' THEN 1 ELSE 0 END) as ai_used,
              ROUND(AVG(a.completion_pct), 0) as avg_completion
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id AND a.deleted_at IS NULL
       WHERE j.org_id = ? AND j.deleted_at IS NULL
       GROUP BY j.id
       HAVING total > 0
       ORDER BY total DESC`
    )
    .all(orgId);

  return {
    ...metrics,
    proctoring_violation: proctoringViolation,
    partial_mandatory_complete: partialMandatory,
    buckets,
    byJob,
  };
}
