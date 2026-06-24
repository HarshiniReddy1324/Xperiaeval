/**
 * Experience / seniority fit engine — compares resume tenure vs role requirements.
 * Fixes cases like 4 years applying to a 20-year executive role.
 */

import { extractYearsExperience, inferSeniority } from './applicantInsights.js';

const SENIORITY_RANK = { Entry: 0, Senior: 1, Manager: 2, Director: 3 };

const LEVEL_MIN_YEARS = {
  entry: 0,
  intern: 0,
  junior: 1,
  mid: 3,
  intermediate: 3,
  senior: 5,
  staff: 7,
  principal: 8,
  lead: 8,
  manager: 6,
  director: 12,
  vp: 15,
  executive: 15,
  all: 0,
};

const TITLE_SENIORITY = [
  { level: 'Director', patterns: [/\bdirector\b/i, /\bvp\b/i, /\bvice president\b/i, /\bchief\b/i, /\bexecutive\b/i] },
  { level: 'Manager', patterns: [/\bmanager\b/i, /\bhead of\b/i] },
  { level: 'Senior', patterns: [/\bsenior\b/i, /\bstaff\b/i, /\bprincipal\b/i, /\bsr\.?\b/i, /\blead engineer\b/i] },
  { level: 'Entry', patterns: [/\bintern\b/i, /\bjunior\b/i, /\bentry[\s-]?level\b/i, /\bgraduate\b/i] },
];

function clamp(n, lo = 0, hi = 100) {
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function inferJobSeniority(title = '') {
  for (const { level, patterns } of TITLE_SENIORITY) {
    if (patterns.some((p) => p.test(title))) return level;
  }
  return 'Senior';
}

function seniorityFromMinYears(years) {
  if (years == null) return null;
  if (years <= 1) return 'Entry';
  if (years <= 4) return 'Senior';
  if (years <= 9) return 'Manager';
  return 'Director';
}

/**
 * Parse minimum years required from job title, description, posting, and experience level hints.
 */
export function parseJobMinYears({ title = '', description = '', experienceLevel = '', posting = {} }) {
  const chunks = [
    title,
    description,
    posting?.summary,
    posting?.requirements,
    posting?.qualifications,
    experienceLevel,
  ]
    .filter(Boolean)
    .join('\n');

  const yearMatches = [];
  for (const m of chunks.matchAll(/(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+\w+){0,3}\s+experience/gi)) {
    yearMatches.push(parseInt(m[1], 10));
  }
  for (const m of chunks.matchAll(/(?:minimum|at least|min\.?)\s+(?:of\s+)?(\d+)\s+(?:years?|yrs?)/gi)) {
    yearMatches.push(parseInt(m[1], 10));
  }
  for (const m of chunks.matchAll(/(\d+)\s*[-–]\s*(\d+)\s+years?/gi)) {
    yearMatches.push(parseInt(m[1], 10));
  }

  let minYears = yearMatches.length ? Math.max(...yearMatches) : null;
  let source = yearMatches.length ? 'posting_text' : null;

  const levelKey = String(experienceLevel || '')
    .toLowerCase()
    .replace(/\s+/g, '');
  for (const [key, yrs] of Object.entries(LEVEL_MIN_YEARS)) {
    if (levelKey.includes(key)) {
      if (minYears == null || yrs > minYears) {
        minYears = yrs;
        source = 'experience_level';
      }
    }
  }

  const titleSeniority = inferJobSeniority(title);
  const titleFloor = { Entry: 0, Senior: 3, Manager: 6, Director: 12 }[titleSeniority] ?? 3;
  if (minYears == null || titleFloor > minYears) {
    minYears = titleFloor;
    source = source || 'title_seniority';
  }

  return {
    minYears,
    source,
    expectedSeniority: seniorityFromMinYears(minYears) || titleSeniority,
    titleSeniority,
  };
}

/**
 * Build experience fit assessment with scoring penalties and recruiter flags.
 */
export function buildExperienceFit({ resumeText = '', job = {}, posting = {} }) {
  const candidateYears = extractYearsExperience(resumeText);
  const candidateSeniority = inferSeniority(resumeText);
  const jobReq = parseJobMinYears({
    title: job?.title,
    description: job?.description,
    experienceLevel: job?.experience_level,
    posting,
  });

  const requiredMin = jobReq.minYears;
  const yearsGap =
    requiredMin != null && candidateYears != null && requiredMin > candidateYears
      ? requiredMin - candidateYears
      : 0;

  const seniorityGap =
    SENIORITY_RANK[jobReq.expectedSeniority] != null && SENIORITY_RANK[candidateSeniority] != null
      ? SENIORITY_RANK[jobReq.expectedSeniority] - SENIORITY_RANK[candidateSeniority]
      : 0;

  let fitScore = 100;
  let severity = 'ok';

  if (yearsGap > 0) {
    fitScore = clamp(100 - yearsGap * 6);
    if (yearsGap >= 12) severity = 'critical';
    else if (yearsGap >= 6) severity = 'high';
    else if (yearsGap >= 3) severity = 'moderate';
    else severity = 'low';
  } else if (seniorityGap >= 2) {
    fitScore = clamp(100 - seniorityGap * 18);
    severity = seniorityGap >= 3 ? 'high' : 'moderate';
  } else if (requiredMin != null && candidateYears == null) {
    fitScore = 55;
    severity = 'moderate';
  }

  const flags = [];
  if (yearsGap >= 3) {
    flags.push('experience_mismatch');
    flags.push(`years_gap_${yearsGap}`);
  }
  if (seniorityGap >= 2) flags.push('seniority_mismatch');

  const overallPenalty =
    yearsGap > 0 ? Math.min(40, Math.round(yearsGap * 2.2)) : seniorityGap >= 2 ? 12 : 0;

  const recommendationCap =
    severity === 'critical' ? 52 : severity === 'high' ? 62 : severity === 'moderate' ? 72 : null;

  const summary =
    yearsGap >= 3
      ? `Resume shows ~${candidateYears ?? '?'} years; role expects ~${requiredMin}+ years (${yearsGap}-year gap).`
      : seniorityGap >= 2
        ? `Inferred ${candidateSeniority} seniority vs ${jobReq.expectedSeniority} role expectations.`
        : fitScore >= 85
          ? 'Experience level aligns with role seniority requirements.'
          : 'Experience signals are borderline — confirm scope in interview.';

  return {
    fit_score: fitScore,
    severity,
    candidate_years: candidateYears,
    required_min_years: requiredMin,
    years_gap: yearsGap,
    candidate_seniority: candidateSeniority,
    required_seniority: jobReq.expectedSeniority,
    job_seniority_source: jobReq.source,
    flags,
    overall_penalty: overallPenalty,
    recommendation_cap: recommendationCap,
    employment_mismatch: yearsGap >= 3 || seniorityGap >= 2,
    summary,
    detail: {
      title_seniority: jobReq.titleSeniority,
      parsing_source: jobReq.source,
    },
  };
}

/**
 * Apply experience fit penalty to overall score and recommendation.
 */
export function applyExperienceFitToScore(overall, experienceFit, recommendation) {
  if (!experienceFit) return { overall, recommendation };
  let adjusted = clamp(overall - (experienceFit.overall_penalty || 0));
  if (experienceFit.recommendation_cap != null) {
    adjusted = Math.min(adjusted, experienceFit.recommendation_cap);
  }
  let rec = recommendation;
  if (experienceFit.severity === 'critical' && /advance|strong|interview/i.test(rec || '')) {
    rec = 'Not recommended — experience gap vs role requirements';
  } else if (experienceFit.severity === 'high' && /strong/i.test(rec || '')) {
    rec = 'Review carefully — significant experience gap';
  }
  return { overall: adjusted, recommendation: rec };
}
