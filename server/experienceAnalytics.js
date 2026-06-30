/** Experience Intelligence aggregates, org, job, and analytics views. */

function safeJson(raw) {
  if (!raw) return null;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

/** Tier counts from scored applications in a period. */
export function summarizeExperienceScores(scoredApps = []) {
  const scored = scoredApps.filter((a) => a.overall != null);
  const avg =
    scored.length > 0
      ? Math.round(scored.reduce((s, a) => s + Number(a.overall), 0) / scored.length)
      : null;

  return {
    avg_experience_score: avg,
    elite_candidates: scored.filter((a) => a.overall >= 90).length,
    strong_match: scored.filter((a) => a.overall >= 80 && a.overall < 90).length,
    needs_review: scored.filter((a) => a.overall >= 60 && a.overall < 80).length,
    high_risk: scored.filter((a) => a.overall < 60 || a.bucket === 'Red').length,
    scored_count: scored.length,
    green: scored.filter((a) => a.bucket === 'Green').length,
    amber: scored.filter((a) => a.bucket === 'Amber').length,
    red: scored.filter((a) => a.bucket === 'Red').length,
  };
}

const SCORED_APP_SELECT = `SELECT a.id, a.job_id, a.authenticity_score, s.overall, s.bucket
  FROM applications a
  JOIN jobs j ON j.id = a.job_id
  LEFT JOIN scores s ON s.application_id = a.id
  WHERE j.org_id = ? AND j.deleted_at IS NULL AND a.deleted_at IS NULL`;

/** Dashboard widget, period filter first, then all scored apps if the period is empty. */
export function summarizeExperienceScoresForDashboard(db, orgId, rangeModifier) {
  const inRange = db
    .prepare(
      `${SCORED_APP_SELECT}
         AND datetime(a.created_at) >= datetime('now', ?)`
    )
    .all(orgId, rangeModifier);
  const periodSummary = summarizeExperienceScores(inRange);
  if (periodSummary.scored_count > 0) return periodSummary;

  const allScored = db
    .prepare(
      `${SCORED_APP_SELECT}
         AND s.overall IS NOT NULL`
    )
    .all(orgId);
  return summarizeExperienceScores(allScored);
}

/** Monthly average experience score for trend charts (last N months). */
export function buildQualityTrend(db, orgId, months = 6) {
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m', a.created_at) as month,
              ROUND(AVG(s.overall), 1) as avg_score,
              COUNT(s.id) as scored
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN scores s ON s.application_id = a.id
       WHERE j.org_id = ? AND j.deleted_at IS NULL AND a.deleted_at IS NULL
         AND s.overall IS NOT NULL
         AND datetime(a.created_at) >= datetime('now', ?)
       GROUP BY month
       ORDER BY month ASC`
    )
    .all(orgId, `-${months} months`);

  return rows.map((r) => ({
    month: r.month,
    label: formatMonthLabel(r.month),
    avg_score: r.avg_score,
    scored: r.scored,
  }));
}

function formatMonthLabel(ym) {
  if (!ym) return 'N/A';
  const [y, m] = ym.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/** Average experience score by application source. */
export function buildSourceQuality(db, orgId) {
  const rows = db
    .prepare(
      `SELECT COALESCE(NULLIF(TRIM(a.source), ''), 'Unknown') as source,
              COUNT(*) as submissions,
              ROUND(AVG(s.overall), 1) as avg_score,
              SUM(CASE WHEN s.bucket = 'Green' THEN 1 ELSE 0 END) as green,
              SUM(CASE WHEN a.experience_mismatch = 1 THEN 1 ELSE 0 END) as mismatch_flags
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       LEFT JOIN scores s ON s.application_id = a.id
       WHERE j.org_id = ? AND j.deleted_at IS NULL AND a.deleted_at IS NULL
       GROUP BY source
       HAVING submissions >= 1
       ORDER BY submissions DESC
       LIMIT 12`
    )
    .all(orgId);

  return rows
    .map((r) => ({
      source: r.source,
      submissions: r.submissions,
      avg_score: r.avg_score,
      green: r.green || 0,
      mismatch_flags: r.mismatch_flags || 0,
    }))
    .sort((a, b) => (b.avg_score ?? 0) - (a.avg_score ?? 0));
}

/** Agency / external recruiter performance from source field heuristics. */
export function buildAgencyPerformance(db, orgId) {
  const rows = db
    .prepare(
      `SELECT COALESCE(NULLIF(TRIM(a.source), ''), 'Unknown') as agency,
              COUNT(*) as submissions,
              SUM(CASE WHEN s.bucket = 'Green' THEN 1 ELSE 0 END) as recommended,
              SUM(CASE WHEN a.pipeline_stage IN ('hired', 'offer_extended') THEN 1 ELSE 0 END) as hired,
              ROUND(AVG(s.overall), 1) as avg_score,
              SUM(CASE WHEN a.experience_mismatch = 1 OR (s.overall IS NOT NULL AND s.overall < 40) THEN 1 ELSE 0 END) as risk_count
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       LEFT JOIN scores s ON s.application_id = a.id
       WHERE j.org_id = ? AND j.deleted_at IS NULL AND a.deleted_at IS NULL
         AND (
           LOWER(a.source) LIKE '%recruiter%'
           OR LOWER(a.source) LIKE '%agency%'
           OR LOWER(a.source) LIKE '%staffing%'
           OR LOWER(a.source) LIKE '%referral%'
           OR LOWER(a.source) LIKE '%linkedin%'
           OR LOWER(a.source) LIKE '%job board%'
         )
       GROUP BY agency
       ORDER BY submissions DESC
       LIMIT 10`
    )
    .all(orgId);

  return rows;
}

/** Recruiter-style performance when owner is tracked on jobs (fallback: org-level screening stats). */
export function buildRecruiterQuality(db, orgId) {
  const byOwner = db
    .prepare(
      `SELECT COALESCE(u.name, 'Unassigned') as recruiter,
              COUNT(a.id) as candidates_submitted,
              ROUND(AVG(s.overall), 1) as avg_score,
              SUM(CASE WHEN s.bucket = 'Green' THEN 1 ELSE 0 END) as green,
              SUM(CASE WHEN a.pipeline_stage IN ('shortlisted_interview', 'interview_scheduled', 'interview_completed', 'interview_pending') THEN 1 ELSE 0 END) as interview_pool,
              SUM(CASE WHEN a.pipeline_stage IN ('hired', 'offer_extended') THEN 1 ELSE 0 END) as offers
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id AND a.deleted_at IS NULL
       LEFT JOIN scores s ON s.application_id = a.id
       LEFT JOIN users u ON u.id = j.owner_id
       WHERE j.org_id = ? AND j.deleted_at IS NULL
       GROUP BY recruiter
       HAVING candidates_submitted > 0
       ORDER BY candidates_submitted DESC
       LIMIT 10`
    )
    .all(orgId);

  return byOwner.map((r) => ({
    recruiter: r.recruiter,
    candidates_submitted: r.candidates_submitted,
    avg_score: r.avg_score,
    green: r.green || 0,
    interview_pct:
      r.candidates_submitted > 0
        ? Math.round(((r.interview_pool || 0) / r.candidates_submitted) * 100)
        : 0,
    offer_pct:
      r.candidates_submitted > 0 ? Math.round(((r.offers || 0) / r.candidates_submitted) * 100) : 0,
  }));
}

export function buildJobExperienceIntelligence(db, jobId) {
  const apps = db
    .prepare(
      `SELECT s.overall, s.bucket, a.experience_mismatch, a.integrity_json, a.authenticity_score
       FROM applications a
       LEFT JOIN scores s ON s.application_id = a.id
       WHERE a.job_id = ? AND a.deleted_at IS NULL`
    )
    .all(jobId);

  const summary = summarizeExperienceScores(apps);
  const integrityFlags = apps.filter((a) => {
    if (a.experience_mismatch) return true;
    const i = safeJson(a.integrity_json);
    return (i?.paste_attempts || 0) > 0 || (a.authenticity_score != null && a.authenticity_score < 50);
  }).length;

  return { ...summary, integrity_flags: integrityFlags };
}

export function buildReportsExperienceAnalytics(db, orgId) {
  return {
    qualityTrend: buildQualityTrend(db, orgId, 6),
    sourceQuality: buildSourceQuality(db, orgId),
    agencyPerformance: buildAgencyPerformance(db, orgId),
    recruiterQuality: buildRecruiterQuality(db, orgId),
    summary: summarizeExperienceScores(
      db
        .prepare(
          `SELECT s.overall, s.bucket FROM applications a
           JOIN jobs j ON j.id = a.job_id
           LEFT JOIN scores s ON s.application_id = a.id
           WHERE j.org_id = ? AND j.deleted_at IS NULL AND a.deleted_at IS NULL`
        )
        .all(orgId)
    ),
  };
}
