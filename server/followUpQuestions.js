/**
 * Dynamic follow-up questions when resume fit or dimension preview is low.
 */

const FOLLOW_UP_BANK = {
  experience_gap: (ctx) => ({
    id: 'experience_gap',
    trigger: 'experience_mismatch',
    question: `This role typically requires ${ctx.requiredMin ?? 'significant'}+ years of experience. Your resume suggests ~${ctx.candidateYears ?? 'limited'} years. Walk us through the scope, ownership, and outcomes from your most relevant role that qualify you at this seniority.`,
    min_chars: 120,
    placeholder: 'Be specific: team size, budget, systems scale, and metrics you owned…',
  }),
  seniority_gap: (ctx) => ({
    id: 'seniority_gap',
    trigger: 'seniority_mismatch',
    question: `We inferred ${ctx.candidateSeniority ?? 'entry/mid'} seniority from your resume for a ${ctx.requiredSeniority ?? 'senior'} role. Describe leadership scope, decision authority, and examples where you operated above your title.`,
    min_chars: 100,
  }),
  domain_gap: (ctx) => ({
    id: 'domain_gap',
    trigger: 'low_domain_fit',
    question: `Your resume shows limited overlap with core ${ctx.department ?? 'role'} signals (${ctx.gaps?.slice(0, 3).join(', ') || 'key competencies'}). How have you built equivalent expertise, and what results prove it?`,
    min_chars: 100,
  }),
  weak_dimension: (ctx) => ({
    id: 'weak_dimension',
    trigger: 'low_dimension',
    question: `We need more evidence on ${ctx.dimensionLabel ?? 'technical depth'}. Provide a concrete example with tools, constraints, trade-offs, and measurable impact.`,
    min_chars: 80,
  }),
};

/**
 * @param {object} opts
 * @param {object} [opts.experienceFit]
 * @param {object} [opts.domainMatrix]
 * @param {object} [opts.resumeValidation]
 * @param {object} [opts.dimensions]
 */
export function buildFollowUpQuestions({
  experienceFit,
  domainMatrix,
  resumeValidation,
  dimensions,
  maxQuestions = 2,
}) {
  const out = [];
  const ctx = {
    requiredMin: experienceFit?.required_min_years,
    candidateYears: experienceFit?.candidate_years,
    candidateSeniority: experienceFit?.candidate_seniority,
    requiredSeniority: experienceFit?.required_seniority,
    department: domainMatrix?.department,
    gaps: domainMatrix?.gaps,
  };

  if (experienceFit?.years_gap >= 3) {
    out.push(FOLLOW_UP_BANK.experience_gap(ctx));
  } else if (experienceFit?.severity === 'high' || experienceFit?.severity === 'critical') {
    out.push(FOLLOW_UP_BANK.experience_gap(ctx));
  }

  if (
    out.length < maxQuestions &&
    experienceFit?.flags?.includes('seniority_mismatch') &&
    !out.some((q) => q.id === 'experience_gap')
  ) {
    out.push(FOLLOW_UP_BANK.seniority_gap(ctx));
  }

  if (
    out.length < maxQuestions &&
    (domainMatrix?.coverage_score < 45 || resumeValidation?.domainMatch?.score < 40)
  ) {
    out.push(FOLLOW_UP_BANK.domain_gap(ctx));
  }

  if (out.length < maxQuestions && dimensions) {
    const weak = Object.entries(dimensions)
      .filter(([k, v]) => typeof v === 'number' && v < 55 && k !== 'behavioral_confidence')
      .sort((a, b) => a[1] - b[1])[0];
    if (weak) {
      const labels = {
        technical_competency: 'technical competency',
        problem_solving: 'problem solving',
        communication: 'communication',
        project_ownership: 'project ownership',
        authenticity: 'authenticity',
        resume_consistency: 'resume consistency',
      };
      out.push(
        FOLLOW_UP_BANK.weak_dimension({
          dimensionLabel: labels[weak[0]] || weak[0],
        })
      );
    }
  }

  return out.slice(0, maxQuestions);
}

/**
 * Score follow-up answers for storage in intelligence report.
 */
export function scoreFollowUpAnswers(questions = [], answers = []) {
  if (!questions.length) return { score: null, items: [] };
  const items = questions.map((q) => {
    const a = answers.find((x) => x.id === q.id);
    const body = (a?.body || '').trim();
    const len = body.length;
    const min = q.min_chars || 60;
    let score = 0;
    if (len >= min) score += 50;
    if (len >= min * 1.5) score += 25;
    if (/\b(i |my |we built|i led|i designed)\b/i.test(body)) score += 15;
    if (/\d+%|\$\d|\d+ users|\d+ years/i.test(body)) score += 10;
    return {
      id: q.id,
      question: q.question,
      body,
      score: Math.min(100, score),
      adequate: len >= min,
    };
  });
  const avg = items.length ? Math.round(items.reduce((s, i) => s + i.score, 0) / items.length) : null;
  return { score: avg, items };
}
