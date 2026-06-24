/**
 * Internal per-question time guidelines — not enforced on applicants in real time.
 * Recruiters configure max_response_seconds; we flag and score when exceeded beyond grace.
 */

/** Seconds over the guideline that are still acceptable (≈1–2 min). */
export const TIMING_GRACE_SECONDS = 120;

export function formatDuration(seconds = 0) {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

/**
 * @param {number} timeTakenSeconds
 * @param {number} maxAllowedSeconds — recruiter-configured guideline per question
 * @param {number} [graceSeconds]
 */
export function evaluateAnswerTiming(timeTakenSeconds, maxAllowedSeconds, graceSeconds = TIMING_GRACE_SECONDS) {
  const taken = Math.max(0, Number(timeTakenSeconds) || 0);
  const maxAllowed = Math.max(30, Number(maxAllowedSeconds) || 300);
  const grace = Math.max(0, Number(graceSeconds) || TIMING_GRACE_SECONDS);

  const base = {
    time_taken_seconds: taken,
    max_allowed_seconds: maxAllowed,
    grace_seconds: grace,
    over_by_seconds: 0,
    beyond_grace_seconds: 0,
    status: 'ok',
    exceeded_beyond_grace: false,
    score_penalty: 0,
    flag: null,
    detail: null,
  };

  if (taken <= 0) {
    return { ...base, status: 'unknown', detail: 'No time recorded for this answer.' };
  }

  const overBy = taken - maxAllowed;
  if (overBy <= 0) {
    return {
      ...base,
      detail: `Within guideline (${formatDuration(taken)} of ${formatDuration(maxAllowed)}).`,
    };
  }

  base.over_by_seconds = overBy;

  if (overBy <= grace) {
    return {
      ...base,
      status: 'grace',
      detail: `${formatDuration(overBy)} over guideline — within ${formatDuration(grace)} grace, no penalty.`,
    };
  }

  const beyondGrace = overBy - grace;
  let scorePenalty = 1;
  let status = 'moderate';
  if (beyondGrace > 300) {
    scorePenalty = 3;
    status = 'high';
  } else if (beyondGrace > 120) {
    scorePenalty = 2;
    status = 'moderate';
  }

  const flag = `Exceeded time guideline (+${formatDuration(beyondGrace)} beyond ${formatDuration(grace)} grace)`;

  return {
    ...base,
    beyond_grace_seconds: beyondGrace,
    status,
    exceeded_beyond_grace: true,
    score_penalty: scorePenalty,
    flag,
    detail: `Took ${formatDuration(taken)} vs ${formatDuration(maxAllowed)} guideline — ${flag}.`,
  };
}

/**
 * Enrich answer rows for recruiter UI with timing evaluation.
 */
export function enrichAnswersWithTiming(answers = [], rubricCategories = []) {
  const maxByCat = Object.fromEntries(
    rubricCategories.map((c) => [c.id, c.max_response_seconds || 300])
  );
  return answers.map((a) => ({
    ...a,
    timing: evaluateAnswerTiming(a.time_taken_seconds, maxByCat[a.category_id]),
  }));
}

/**
 * Build integrity-style flags from answer timing across an application.
 */
export function buildTimingFlags(answerMeta = []) {
  const flags = [];
  let risk = 0;
  for (const meta of answerMeta) {
    const timing = evaluateAnswerTiming(meta.time_taken_seconds, meta.max_seconds);
    if (!timing.exceeded_beyond_grace) continue;
    const q = (meta.sort_order ?? 0) + 1;
    flags.push(`Q${q}: ${timing.flag} (${formatDuration(meta.time_taken_seconds)} taken)`);
    risk += timing.score_penalty * 4;
  }
  return { flags, risk };
}
