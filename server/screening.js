import { analyzeIntegrity } from './integrity.js';
import { evaluateAnswerTiming } from './responseTiming.js';

export function parseKeywords(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((k) => String(k).trim().toLowerCase()).filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((k) => String(k).trim().toLowerCase()).filter(Boolean);
  } catch {
    /* comma-separated */
  }
  return String(raw)
    .split(/[,;]/)
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
}

export function keywordMatchScore(text, keywords) {
  if (!keywords?.length) return { score: 0, matched: 0, hits: [] };
  const t = (text || '').toLowerCase();
  if (!t.trim()) return { score: 0, matched: 0, hits: [] };
  const hits = keywords.filter((k) => t.includes(k));
  const ratio = hits.length / keywords.length;
  return {
    score: Math.min(100, Math.round(40 + ratio * 60)),
    matched: hits.length,
    hits,
  };
}

export function computeCompletion(categories, answersByCategory) {
  const mandatory = categories.filter((c) => c.priority !== 'optional');
  const highPriority = categories.filter((c) => c.priority === 'high_priority');
  const all = categories.length || 1;

  const answered = (cat) => {
    const a = answersByCategory[cat.id];
    if (!a) return false;
    if (a.media_path) return true;
    return (a.body || '').trim().length >= 10;
  };

  const mandatoryDone = mandatory.every(answered);
  const highDone = highPriority.every(answered);
  const answeredCount = categories.filter(answered).length;
  const completion_pct = Math.round((answeredCount / all) * 100);

  return {
    completion_pct,
    mandatory_complete: mandatoryDone,
    high_priority_complete: highDone || highPriority.length === 0,
    answered_count: answeredCount,
    total_questions: categories.length,
  };
}

export function classifyScreeningStatus({ completion, integrityResult, mandatoryComplete }) {
  if (!mandatoryComplete || completion.completion_pct < 100) {
    return {
      screening_status: 'incomplete',
      screening_category: 'Incomplete Applications',
      recommendation: 'Candidate did not complete all required screening questions.',
    };
  }

  if (integrityResult.proctoring_failed) {
    return {
      screening_status: 'proctoring_violation',
      screening_category: 'Proctoring Violation',
      recommendation:
        integrityResult.proctoring_verdict ||
        'Session failed proctoring requirements — review log before advancing.',
    };
  }

  const aiLikely =
    integrityResult.authenticity_score != null &&
    (integrityResult.authenticity_score < 50 ||
      (integrityResult.flags || []).some((f) => f.includes('AI-style') || f.includes('paste')));

  if (aiLikely) {
    return {
      screening_status: 'ai_used',
      screening_category: 'AI Used',
      recommendation: 'Flagged for review — possible AI-generated responses or suspicious session behavior.',
    };
  }

  if (integrityResult.authenticity_score != null && integrityResult.authenticity_score < 75) {
    return {
      screening_status: 'complete',
      screening_category: 'Review Needed',
      recommendation: 'Completed screening; integrity signals warrant human review before advancing.',
    };
  }

  return {
    screening_status: 'complete',
    screening_category: 'Ready for Review',
    recommendation: 'Strong completion and integrity signals — recommend for hiring manager review.',
  };
}

export function generateAnonymizedCode(applicationId) {
  const suffix = applicationId.replace(/\D/g, '').slice(-4) || Math.floor(Math.random() * 9999);
  return `CAND-${String(suffix).padStart(4, '0')}`;
}

export function anonymizeApplication(app, revealed = false) {
  if (revealed || app.identity_revealed) {
    return { ...app, display_name: app.name, anonymized: false };
  }
  return {
    ...app,
    display_name: app.anonymized_code || generateAnonymizedCode(app.id),
    name_hidden: true,
    email_hidden: true,
    phone_hidden: true,
    anonymized: true,
  };
}

export function buildScreeningMetrics(orgId, db) {
  const apps = db
    .prepare(
      `SELECT a.screening_status, a.completion_pct, a.authenticity_score, a.proctoring_failed, s.bucket, s.overall
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       LEFT JOIN scores s ON s.application_id = a.id
       WHERE j.org_id = ? AND j.deleted_at IS NULL AND a.deleted_at IS NULL`
    )
    .all(orgId);

  const hasIntegrityFlag = (a) =>
    (a.authenticity_score != null && a.authenticity_score < 75) ||
    a.screening_status === 'ai_used' ||
    a.screening_status === 'proctoring_violation' ||
    !!a.proctoring_failed;

  const total = apps.length;
  const complete = apps.filter((a) => a.screening_status === 'complete').length;
  const incomplete = apps.filter((a) => a.screening_status === 'incomplete').length;
  const aiUsed = apps.filter((a) => a.screening_status === 'ai_used').length;
  const avgCompletion = total
    ? Math.round(apps.reduce((s, a) => s + (a.completion_pct || 0), 0) / total)
    : 0;
  const integrityAlerts = apps.filter(hasIntegrityFlag).length;
  const highPriorityReady = apps.filter(
    (a) => a.screening_status === 'complete' && a.bucket === 'Green'
  ).length;

  return {
    total_screened: total,
    complete,
    incomplete,
    ai_used: aiUsed,
    avg_completion_pct: avgCompletion,
    completion_rate_pct: total ? Math.round((complete / total) * 100) : 0,
    integrity_alerts: integrityAlerts,
    integrity_flags: integrityAlerts,
    high_priority_shortlist: highPriorityReady,
  };
}

export function scoreAnswersWithKeywords(categories, answers) {
  const boosts = [];
  for (const cat of categories) {
    const answer = answers.find((a) => a.category_id === cat.id);
    if (!answer) continue;
    const keywords = parseKeywords(cat.keywords);
    const text = [answer.body, answer.transcript_text].filter(Boolean).join(' ');
    const km = keywordMatchScore(text, keywords);
    boosts.push({ category_id: cat.id, ...km });
    answer.keywords_matched = km.matched;
  }
  return boosts;
}

export function analyzePerAnswerIntegrity(answerMeta, integrityFields) {
  const flags = [];
  let risk = 0;
  for (const meta of answerMeta || []) {
    if ((meta.idle_seconds || 0) > 45) {
      flags.push(`Q${meta.sort_order + 1}: long idle period (${meta.idle_seconds}s)`);
      risk += 15;
    }
    if ((meta.focus_loss_count || 0) >= 2) {
      flags.push(`Q${meta.sort_order + 1}: left interview window ${meta.focus_loss_count} times`);
      risk += 10;
    }
    const maxT = meta.max_seconds || 300;
    const taken = meta.time_taken_seconds || 0;
    if (taken > 0 && taken < maxT * 0.15 && (meta.body || '').length > 200) {
      flags.push(`Q${meta.sort_order + 1}: unusually fast long answer`);
      risk += 12;
    }
    const timing = evaluateAnswerTiming(taken, maxT);
    if (timing.exceeded_beyond_grace) {
      flags.push(`Q${(meta.sort_order ?? 0) + 1}: ${timing.flag}`);
      risk += timing.score_penalty * 5;
    }
  }
  return { flags, risk };
}
