/**
 * Applicant Insights — resume-derived analytics for the Analytics page.
 * @typedef {Object} DistributionItem
 * @property {string} label
 * @property {number} count
 * @property {number} pct
 *
 * @typedef {Object} SkillItem
 * @property {string} skill
 * @property {number} count
 * @property {number} pct
 *
 * @typedef {Object} InsightItem
 * @property {string} type - 'positive' | 'neutral' | 'alert'
 * @property {string} text
 */

const SENIORITY_ORDER = ['Director', 'Manager', 'Senior', 'Entry'];

const SENIORITY_PATTERNS = [
  { level: 'Director', patterns: [/\bdirector\b/i, /\bvp\b/i, /\bvice president\b/i, /\bchief\b/i, /\bexecutive\b/i] },
  { level: 'Manager', patterns: [/\bmanager\b/i, /\bhead of\b/i, /\bteam lead\b/i] },
  { level: 'Senior', patterns: [/\bsenior\b/i, /\bstaff\b/i, /\bprincipal\b/i, /\bsr\.?\b/i, /\blead\b/i] },
  { level: 'Entry', patterns: [/\bintern\b/i, /\bstudent\b/i, /\bgraduate\b/i, /\bentry[\s-]?level\b/i, /\bjunior\b/i] },
];

const EDUCATION_ORDER = ["Master's Degree", 'MBA', "Bachelor's Degree", 'PhD', 'Other'];

const SKILL_KEYWORDS = [
  'SQL',
  'Python',
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'Java',
  'AWS',
  'Figma',
  'Jira',
  'Amplitude',
  'Tableau',
  'dbt',
  'Kafka',
  'Snowflake',
  'Product',
  'Analytics',
  'Agile',
  'Communication',
  'Leadership',
];

export function extractYearsExperience(text = '') {
  const t = String(text);
  const explicit = [...t.matchAll(/(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+(?:of\s+)?)?(?:experience|exp)?/gi)]
    .map((m) => parseInt(m[1], 10))
    .filter((n) => n > 0 && n <= 50);
  const fromExplicit = explicit.length ? Math.max(...explicit) : null;

  const fromDates = yearsFromEmploymentDates(t);
  if (fromExplicit != null && fromDates != null) return Math.max(fromExplicit, fromDates);
  return fromExplicit ?? fromDates;
}

const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseMonthYear(token = '') {
  const s = token.trim().toLowerCase();
  const present = /present|current|now/i.test(s);
  if (present) return { year: new Date().getFullYear(), month: new Date().getMonth() };
  const ym = s.match(/^(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+)?(20\d{2}|19\d{2})$/i);
  if (ym) {
    const month = ym[1] ? MONTH_MAP[ym[1].slice(0, 3)] ?? 0 : 0;
    return { year: parseInt(ym[2], 10), month };
  }
  const yOnly = s.match(/^(20\d{2}|19\d{2})$/);
  if (yOnly) return { year: parseInt(yOnly[1], 10), month: 0 };
  return null;
}

function monthsBetween(start, end) {
  return Math.max(0, (end.year - start.year) * 12 + (end.month - start.month));
}

function mergeRanges(ranges) {
  if (!ranges.length) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const cur = sorted[i];
    if (cur.start <= last.end + 1) last.end = Math.max(last.end, cur.end);
    else merged.push(cur);
  }
  return merged;
}

/** Sum non-overlapping employment spans from date ranges in resume text. */
export function yearsFromEmploymentDates(text = '') {
  const t = String(text);
  const rangeRe =
    /(?:(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?(20\d{2}|19\d{2})\s*[-–—to]+\s*(?:(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?(20\d{2}|19\d{2}|Present|Current|Now)/gi;

  const monthSpans = [];
  let m;
  while ((m = rangeRe.exec(t)) !== null) {
    const startTok = `${m[1] ? m[1] + ' ' : ''}${m[2]}`;
    const endTok = `${m[3] ? m[3] + ' ' : ''}${m[4]}`;
    const start = parseMonthYear(startTok);
    const end = parseMonthYear(endTok);
    if (!start || !end) continue;
    const startIdx = start.year * 12 + start.month;
    const endIdx = end.year * 12 + end.month;
    if (endIdx >= startIdx) monthSpans.push({ start: startIdx, end: endIdx });
  }

  if (!monthSpans.length) {
    const years = [...t.matchAll(/\b(19|20)\d{2}\b/g)].map((x) => parseInt(x[0], 10));
    if (years.length >= 2) {
      const min = Math.min(...years);
      const max = Math.max(...years);
      if (max - min <= 45) return Math.max(0, max - min);
    }
    return null;
  }

  const merged = mergeRanges(monthSpans);
  const totalMonths = merged.reduce((s, r) => s + (r.end - r.start + 1), 0);
  return Math.round((totalMonths / 12) * 10) / 10;
}

export function inferEducation(resumeText = '') {
  const text = String(resumeText);
  const section = extractEducationSection(text);
  const src = section || text;

  if (/\bmba\b|master of business administration/i.test(src)) return 'MBA';
  if (/\bph\.?\s*d\.?\b|phd\b|doctor of philosophy|doctorate/i.test(src)) return 'PhD';
  if (
    /\bm\.?\s*s\.?\b|\bm\.?\s*a\.?\b|\bmaster(?:'s)?\s+(?:of\s+)?(?:science|arts|engineering)/i.test(src) ||
    /\bmaster'?s\s+degree/i.test(src)
  ) {
    return "Master's Degree";
  }
  if (
    /\bb\.?\s*s\.?\b|\bb\.?\s*a\.?\b|\bb\.?\s*e\.?\b|\bbachelor(?:'s)?\s+(?:of\s+)?(?:science|arts|engineering)/i.test(src) ||
    /\bbachelor'?s\s+degree/i.test(src) ||
    /\bundergraduate\b/i.test(src)
  ) {
    return "Bachelor's Degree";
  }
  if (/\bassociate(?:'s)?\s+(?:of\s+)?(?:arts|science)|\ba\.?\s*a\.?\b|\ba\.?\s*s\.?\b/i.test(src)) {
    return "Associate's Degree";
  }
  if (/\bhigh school|ged\b/i.test(src)) return 'High School / GED';
  return 'Other';
}

function extractEducationSection(text = '') {
  const match = text.match(
    /(?:^|\n)\s*education\s*\n([\s\S]*?)(?=\n\s*(?:experience|employment|work history|skills|projects|certifications|summary)\b|\n\n|$)/i
  );
  return match?.[1]?.trim() || '';
}

export function inferSeniority(resumeText = '') {
  const text = String(resumeText);
  for (const { level, patterns } of SENIORITY_PATTERNS) {
    if (patterns.some((p) => p.test(text))) return level;
  }
  const years = extractYearsExperience(text);
  if (years != null) {
    if (years <= 2) return 'Entry';
    if (years >= 10) return 'Senior';
    if (years >= 5) return 'Manager';
    return 'Senior';
  }
  if (/associate|high school|ged|undergraduate|student|intern/i.test(text)) return 'Entry';
  if (/B\.S\.|B\.A\.|Bachelor|undergraduate/i.test(text) && /\(20[2-9][0-9]\)/.test(text)) return 'Entry';
  return 'Not detected';
}

export function extractSkillsFromResume(resumeText = '') {
  const text = String(resumeText);
  const found = new Set();

  const section = text.match(/Skills?:?\s*([^.\n]+)/i);
  if (section?.[1]) {
    section[1]
      .split(/[,;|·]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 40)
      .forEach((s) => found.add(normalizeSkill(s)));
  }

  for (const kw of SKILL_KEYWORDS) {
    const re = new RegExp(`\\b${escapeRegex(kw)}\\b`, 'i');
    if (re.test(text)) found.add(kw);
  }

  return [...found];
}

function normalizeSkill(raw) {
  const s = raw.trim();
  const hit = SKILL_KEYWORDS.find((k) => k.toLowerCase() === s.toLowerCase());
  return hit || (s.charAt(0).toUpperCase() + s.slice(1));
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toDistribution(counts, order) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const labels = order || [...new Set(Object.keys(counts))];
  return labels
    .filter((label) => counts[label] != null)
    .map((label) => ({
      label,
      count: counts[label] || 0,
      pct: Math.round(((counts[label] || 0) / total) * 100),
    }))
    .sort((a, b) => b.pct - a.pct);
}

function generateInsights({ total, last24Hours, avgResumeScore, seniority, education, greenPct, last7Days }) {
  /** @type {InsightItem[]} */
  const insights = [];

  if (last24Hours >= 2) {
    insights.push({ type: 'positive', text: 'Strong candidate pool activity in the last 24 hours' });
  } else if (last24Hours === 1) {
    insights.push({ type: 'neutral', text: '1 new applicant in the last 24 hours' });
  }

  if (avgResumeScore >= 78) {
    insights.push({ type: 'positive', text: 'Top 10% match — above-average resume scores in this pool' });
  } else if (avgResumeScore >= 65) {
    insights.push({ type: 'neutral', text: 'Solid applicant quality — scores trending competitive' });
  } else if (avgResumeScore > 0 && avgResumeScore < 50) {
    insights.push({ type: 'alert', text: 'Below-average match scores — consider refining job requirements' });
  }

  const topSeniority = seniority[0];
  if (topSeniority && topSeniority.pct >= 35) {
    insights.push({
      type: 'neutral',
      text: `${topSeniority.pct}% ${topSeniority.label.toLowerCase()}-level candidates in this pool`,
    });
  }

  const mba = education.find((e) => e.label === 'MBA');
  const masters = education.find((e) => e.label === "Master's Degree");
  if ((mba?.pct || 0) + (masters?.pct || 0) >= 30) {
    insights.push({ type: 'positive', text: 'High advanced-degree representation among applicants' });
  }

  if (greenPct >= 40) {
    insights.push({ type: 'positive', text: 'Strong fit rate — many Green-bucket candidates' });
  }

  if (last7Days >= 5 && total >= 8) {
    insights.push({ type: 'positive', text: 'Strong candidate pool this week' });
  }

  if (!insights.length) {
    insights.push({ type: 'neutral', text: 'Insights will sharpen as more candidates apply' });
  }

  return insights.slice(0, 4);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} orgId
 * @param {string} [jobId]
 */
export function buildApplicantInsights(db, orgId, jobId) {
  const jobs = db
    .prepare(
      `SELECT j.id, j.title, j.team,
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.deleted_at IS NULL) as applicants
       FROM jobs j
       WHERE j.org_id = ? AND j.deleted_at IS NULL
       ORDER BY j.title`
    )
    .all(orgId);

  const selectedJobId = jobId || jobs[0]?.id || null;

  if (!selectedJobId) {
    return {
      jobId: null,
      jobTitle: null,
      jobs,
      total: 0,
      last24Hours: 0,
      last7Days: 0,
      avgYearsExperience: null,
      avgResumeScore: null,
      seniority: [],
      education: [],
      topSkills: [],
      insights: [{ type: 'neutral', text: 'Create a job posting to start collecting applicant insights' }],
      greenPct: 0,
    };
  }

  const apps = db
    .prepare(
      `SELECT a.id, a.resume_text, a.created_at, s.overall, s.bucket
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       LEFT JOIN scores s ON s.application_id = a.id
       WHERE j.org_id = ? AND j.deleted_at IS NULL AND a.deleted_at IS NULL AND a.job_id = ?`
    )
    .all(orgId, selectedJobId);

  const job = jobs.find((j) => j.id === selectedJobId);
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const last24Hours = apps.filter((a) => now - new Date(a.created_at).getTime() < dayMs).length;
  const last7Days = apps.filter((a) => now - new Date(a.created_at).getTime() < 7 * dayMs).length;

  const seniorityCounts = Object.fromEntries(SENIORITY_ORDER.map((l) => [l, 0]));
  const educationCounts = Object.fromEntries(EDUCATION_ORDER.map((l) => [l, 0]));
  const skillCounts = {};
  let yearsSum = 0;
  let yearsCount = 0;
  let scoreSum = 0;
  let scoreCount = 0;
  let greenCount = 0;

  for (const app of apps) {
    const seniority = inferSeniority(app.resume_text);
    seniorityCounts[seniority] = (seniorityCounts[seniority] || 0) + 1;

    const edu = inferEducation(app.resume_text);
    educationCounts[edu] = (educationCounts[edu] || 0) + 1;

    const years = extractYearsExperience(app.resume_text);
    if (years != null) {
      yearsSum += years;
      yearsCount += 1;
    }

    if (app.overall != null) {
      scoreSum += app.overall;
      scoreCount += 1;
    }
    if (app.bucket === 'Green') greenCount += 1;

    for (const skill of extractSkillsFromResume(app.resume_text)) {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    }
  }

  const total = apps.length;
  const seniority = toDistribution(seniorityCounts, SENIORITY_ORDER).filter((d) => d.count > 0);
  const education = toDistribution(educationCounts, EDUCATION_ORDER).filter((d) => d.count > 0);

  const topSkills = Object.entries(skillCounts)
    .map(([skill, count]) => ({
      skill,
      count,
      pct: total ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const avgResumeScore = scoreCount ? Math.round((scoreSum / scoreCount) * 10) / 10 : null;
  const avgYearsExperience = yearsCount ? Math.round((yearsSum / yearsCount) * 10) / 10 : null;
  const greenPct = total ? Math.round((greenCount / total) * 100) : 0;

  const insights = generateInsights({
    total,
    last24Hours,
    avgResumeScore: avgResumeScore || 0,
    seniority,
    education,
    greenPct,
    last7Days,
  });

  return {
    jobId: selectedJobId,
    jobTitle: job?.title || selectedJobId,
    jobs,
    total,
    last24Hours,
    last7Days,
    avgYearsExperience,
    avgResumeScore,
    seniority,
    education,
    topSkills,
    insights,
    greenPct,
  };
}
