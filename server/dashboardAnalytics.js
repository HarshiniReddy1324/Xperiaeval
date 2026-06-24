/** Dashboard aggregates for charts, funnel, and integrity alerts. */

function safeJson(raw) {
  if (!raw) return null;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

/** @returns {number} days for 7d / 30d / 90d range keys */
export function daysFromRange(range) {
  if (range === '7d') return 7;
  if (range === '90d') return 90;
  return 30;
}

/** SQLite-friendly datetime string for filtering applications.created_at */
export function sinceFromRange(range) {
  const days = daysFromRange(range);
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export function formatRangeLabel(range) {
  if (range === '7d') return 'Last 7 days';
  if (range === '90d') return 'Last 90 days';
  return 'Last 30 days';
}

/** Map internal job workflow stage → positions overview bucket (not hire outcomes). */
const JOB_STAGE_BUCKET = {
  Draft: 'delayed',
  Open: 'about_to_start',
  Screening: 'in_progress',
  'Hiring Team Review': 'in_progress',
  Interviewing: 'in_progress',
  Filled: 'filled',
  Closed: 'filled',
  Hired: 'filled',
};

export function buildPositionKpis(jobs, options = {}) {
  const hiredJobIds = new Set(options.hiredJobIds || []);
  const totalJobs = jobs.length;
  const positions = { total: totalJobs, filled: 0, in_progress: 0, about_to_start: 0, delayed: 0 };

  for (const job of jobs) {
    if (hiredJobIds.has(job.id) || JOB_STAGE_BUCKET[job.stage] === 'filled') {
      positions.filled += 1;
      continue;
    }
    const key = JOB_STAGE_BUCKET[job.stage] || 'in_progress';
    positions[key] += 1;
  }
  const pct = (n) => (totalJobs ? Math.round((n / totalJobs) * 100) : 0);

  return [
    { id: 'total', label: 'Total Positions', value: positions.total, sub: 'All positions', to: '/jobs', tone: 'blue' },
    { id: 'filled', label: 'Filled', value: positions.filled, sub: `${pct(positions.filled)}% of total`, to: '/jobs?stage=Filled', tone: 'green' },
    { id: 'in_progress', label: 'In Progress', value: positions.in_progress, sub: `${pct(positions.in_progress)}% of total`, to: '/jobs?stage=Screening', tone: 'blue' },
    { id: 'about_to_start', label: 'About to Start', value: positions.about_to_start, sub: `${pct(positions.about_to_start)}% of total`, to: '/jobs?stage=Open', tone: 'amber' },
    { id: 'more_time', label: 'More Time', value: positions.delayed, sub: `${pct(positions.delayed)}% of total`, to: '/jobs?stage=Draft', tone: 'purple' },
  ];
}

/** @deprecated use buildPositionKpis for dashboard KPI row */
export function buildApplicationKpis(jobs, totals, screening) {
  return buildPositionKpis(jobs);
}

export function buildDashboardAnalytics(orgId, db, jobs = [], options = {}) {
  const since = options.since || sinceFromRange('30d');
  const apps = db
    .prepare(
      `SELECT a.id, a.job_id, a.screening_status, a.authenticity_score, a.proctoring_failed,
              a.integrity_json, a.pipeline_stage, a.completion_pct, a.hidden_gem, a.experience_mismatch,
              s.overall, s.bucket, s.recommendation, s.intelligence_json
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       LEFT JOIN scores s ON s.application_id = a.id
       WHERE j.org_id = ? AND j.deleted_at IS NULL AND a.deleted_at IS NULL
         AND datetime(a.created_at) >= datetime(?)`
    )
    .all(orgId, since);

  const hiredJobIds = db
    .prepare(
      `SELECT DISTINCT a.job_id FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE j.org_id = ? AND j.deleted_at IS NULL AND a.deleted_at IS NULL
         AND a.pipeline_stage IN ('hired', 'offer_extended')`
    )
    .all(orgId)
    .map((r) => r.job_id);

  const totalJobs = jobs.length;
  const positions = { total: totalJobs, filled: 0, in_progress: 0, about_to_start: 0, delayed: 0 };
  for (const job of jobs) {
    if (hiredJobIds.includes(job.id) || JOB_STAGE_BUCKET[job.stage] === 'filled') {
      positions.filled += 1;
      continue;
    }
    const key = JOB_STAGE_BUCKET[job.stage] || 'in_progress';
    positions[key] += 1;
  }

  const pct = (n) => (totalJobs ? Math.round((n / totalJobs) * 100) : 0);

  const scored = apps.filter((a) => a.overall != null);
  const green = scored.filter((a) => a.bucket === 'Green').length;
  const amber = scored.filter((a) => a.bucket === 'Amber').length;
  const red = scored.filter((a) => a.bucket === 'Red').length;
  const scoredTotal = scored.length || 1;

  let pasteEvents = 0;
  let tabSwitches = 0;
  let voiceFailed = 0;

  for (const app of apps) {
    const integrity = safeJson(app.integrity_json);
    if (integrity) {
      pasteEvents += integrity.paste_attempts || 0;
      tabSwitches += integrity.focus_loss_count || 0;
    }
    if (app.authenticity_score != null && app.authenticity_score < 40) voiceFailed += 1;
  }

  const integrityAlerts = {
    ai_generated: apps.filter((a) => a.screening_status === 'ai_used').length,
    employment_mismatch: apps.filter((a) => {
      if (a.experience_mismatch) return true;
      try {
        const report = a.intelligence_json ? JSON.parse(a.intelligence_json) : null;
        return report?.experience_fit?.employment_mismatch;
      } catch {
        return false;
      }
    }).length,
    voice_verification_failed: voiceFailed,
    browser_switches: apps.filter((a) => {
      const i = safeJson(a.integrity_json);
      return (i?.focus_loss_count || 0) >= 3;
    }).length,
    fake_experience_risk: apps.filter((a) => a.bucket === 'Red' && a.overall != null && a.overall < 40).length,
    high_risk_candidates: apps.filter(
      (a) =>
        a.proctoring_failed ||
        a.screening_status === 'ai_used' ||
        (a.authenticity_score != null && a.authenticity_score < 50)
    ).length,
    paste_events: pasteEvents,
    tab_switches: tabSwitches,
  };

  const pipeline = {
    applied: apps.length,
    screened: apps.filter((a) => a.screening_status !== 'incomplete').length,
    scored: scored.length,
    recommended: scored.filter((a) => a.overall >= 65).length,
    shortlisted: apps.filter((a) => a.pipeline_stage === 'shortlisted_interview').length,
    interviewed: apps.filter((a) =>
      ['interview_scheduled', 'interview_completed', 'interview_pending'].includes(a.pipeline_stage)
    ).length,
    selected: apps.filter((a) => a.pipeline_stage === 'offer_extended' || a.pipeline_stage === 'hired').length,
  };

  const conversionRate =
    pipeline.applied > 0 ? Math.round((pipeline.selected / pipeline.applied) * 10000) / 100 : 0;

  const healthScore = Math.round(((green * 1 + amber * 0.5) / scoredTotal) * 100) || 0;
  const healthLabel = healthScore >= 75 ? 'Good' : healthScore >= 50 ? 'Fair' : 'Needs attention';

  const complete = apps.filter((a) => a.screening_status === 'complete').length;
  const screenedTotal = apps.length || 1;
  const autoScored = scored.length;
  const minutesSavedPerScore = 45;

  return {
    positions: {
      ...positions,
      filled_pct: pct(positions.filled),
      in_progress_pct: pct(positions.in_progress),
      about_to_start_pct: pct(positions.about_to_start),
      delayed_pct: pct(positions.delayed),
    },
    positionsOverview: [
      { label: 'Filled', value: positions.filled, pct: pct(positions.filled), color: '#22c55e' },
      { label: 'In Progress', value: positions.in_progress, pct: pct(positions.in_progress), color: '#3b82f6' },
      { label: 'About to Start', value: positions.about_to_start, pct: pct(positions.about_to_start), color: '#f59e0b' },
      { label: 'Delayed', value: positions.delayed, pct: pct(positions.delayed), color: '#a855f7' },
    ],
    pipeline,
    conversionRate,
    hiringHealth: {
      score: healthScore,
      label: healthLabel,
      healthy_pct: Math.round((green / scoredTotal) * 100),
      at_risk_pct: Math.round((amber / scoredTotal) * 100),
      critical_pct: Math.round((red / scoredTotal) * 100),
    },
    integrityAlerts,
    recruiterPerformance: {
      hours_saved: Math.round((autoScored * minutesSavedPerScore) / 60),
      hours_saved_basis: `${autoScored} auto-scored × ~${minutesSavedPerScore} min`,
      screening_accuracy: Math.round((complete / screenedTotal) * 100) || 0,
      screening_completion_pct: Math.round((complete / screenedTotal) * 100) || 0,
      fraud_prevented: integrityAlerts.high_risk_candidates,
      integrity_flags: integrityAlerts.high_risk_candidates,
    },
    hiddenGems: apps.filter((a) => a.hidden_gem === 1).length,
    dateRange: {
      since,
      days: options.days ?? daysFromRange('30d'),
      label: formatRangeLabel(options.range || '30d'),
    },
  };
}

export function buildJobTableRows(jobs, apps) {
  return jobs.map((job) => {
    const jobApps = apps.filter((a) => a.job_id === job.id);
    const scored = jobApps.filter((a) => a.overall != null);
    const green = scored.filter((a) => a.bucket === 'Green').length;
    const recommended = scored.filter((a) => a.overall >= 65).length;
    const verified = jobApps.filter(
      (a) => a.authenticity_score == null || a.authenticity_score >= 75
    ).length;
    const progress = jobApps.length
      ? Math.round((scored.length / jobApps.length) * 100)
      : 0;

    const statusMap = {
      Draft: { label: 'Delayed', tone: 'purple', hint: 'Job posting is still in draft — not yet accepting applicants.' },
      Open: { label: 'About to Start', tone: 'amber', hint: 'Posting is live; screening has not started in earnest.' },
      Screening: { label: 'In Progress', tone: 'blue', hint: 'Active applicants are being screened for this role.' },
      'Hiring Team Review': { label: 'In Progress', tone: 'blue', hint: 'Hiring team is reviewing scored candidates.' },
      Interviewing: { label: 'In Progress', tone: 'blue', hint: 'Role is in active interview stage.' },
      Filled: { label: 'Filled', tone: 'green', hint: 'Position has been filled or closed.' },
      Closed: { label: 'Filled', tone: 'green', hint: 'Position has been closed.' },
    };
    const status = statusMap[job.stage] || { label: job.stage, tone: 'blue', hint: 'Derived from job workflow stage.' };

    return {
      id: job.id,
      title: job.title,
      team: job.team || 'General',
      status: status.label,
      statusTone: status.tone,
      statusHint: status.hint,
      applicants: job.applicants ?? jobApps.length,
      verified,
      recommended,
      green,
      progress,
      stage: job.stage,
      targetHireDate: job.created_at
        ? new Date(new Date(job.created_at).getTime() + 45 * 86400000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : '—',
    };
  });
}
