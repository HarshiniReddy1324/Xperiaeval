import { extractYearsExperience, inferEducation, inferSeniority } from './applicantInsights.js';
import { parseKeywords, keywordMatchScore } from './screening.js';
import { buildExperienceFit } from './experienceFit.js';
import { runDomainValidationMatrix } from './domainValidationMatrix.js';

const CERT_PATTERNS =
  /\b(AWS|Azure|GCP|PMP|CSM|Scrum Master|CPA|CFA|Six Sigma|ITIL|CompTIA|Kubernetes|CKA)\b/gi;
const WORK_AUTH_PATTERNS =
  /\b(authorized to work|work authorization|US citizen|permanent resident|green card|visa sponsorship|h1b|opt|cpt|eligible to work)\b/i;
const LEADERSHIP_PATTERNS =
  /\b(led team|managed team|direct reports|people manager|cross-functional|stakeholder|executive|director|head of)\b/i;

function extractSkills(text) {
  const known = [
    'SQL',
    'Python',
    'JavaScript',
    'React',
    'Node',
    'AWS',
    'Azure',
    'Figma',
    'Jira',
    'Amplitude',
    'Product management',
    'Agile',
    'Scrum',
    'Data analysis',
    'Machine learning',
    'API',
    'REST',
    'TypeScript',
    'Excel',
    'Tableau',
    'Looker',
    'dbt',
  ];
  const lower = text.toLowerCase();
  return known.filter((s) => lower.includes(s.toLowerCase()));
}

function extractTransferableSkills(text, jobKeywords) {
  const soft = ['communication', 'stakeholder', 'analytics', 'problem solving', 'leadership', 'collaboration'];
  const found = soft.filter((s) => text.toLowerCase().includes(s));
  const domainHits = parseKeywords(jobKeywords).filter((k) => text.toLowerCase().includes(k.toLowerCase()));
  return [...new Set([...found, ...domainHits.map((k) => k.replace(/_/g, ' '))])].slice(0, 6);
}

function extractGraduationYear(text = '') {
  const m = String(text).match(/\((20\d{2})\)/);
  return m ? parseInt(m[1], 10) : null;
}

function extractYearSpans(text = '') {
  return [...String(text).matchAll(/\b(19|20)\d{2}\b/g)].map((m) => parseInt(m[0], 10));
}

/**
 * Resume intelligence validation, advisory signals from resume text + job context.
 */
export function buildResumeValidation({
  resumeText = '',
  jobTitle = '',
  jobKeywords = [],
  job = null,
  posting = null,
}) {
  const text = String(resumeText || '');
  const years = extractYearsExperience(text);
  const education = inferEducation(text);
  const seniority = inferSeniority(text);

  const gradYear = extractGraduationYear(text);
  const yearSpans = extractYearSpans(text);
  const currentYear = new Date().getFullYear();

  /** @type {{ id: string, label: string, status: 'pass' | 'review' | 'fail', detail: string }[]} */
  const checks = [];

  if (!text.trim() || text.length < 40 || /^Resume uploaded:/i.test(text)) {
    checks.push({
      id: 'parse_quality',
      label: 'Resume text extraction',
      status: 'fail',
      detail:
        'Could not read enough text from the uploaded file. Use PDF, DOCX, or TXT with selectable text.',
    });
  } else {
    checks.push({
      id: 'parse_quality',
      label: 'Resume text extraction',
      status: 'pass',
      detail: `${text.length.toLocaleString()} characters parsed from resume file.`,
    });
  }

  if (gradYear && years != null) {
    const yearsSinceGrad = currentYear - gradYear;
    const maxPlausible = Math.max(0, yearsSinceGrad + 2);
    const ok = years <= maxPlausible;
    checks.push({
      id: 'timeline_experience',
      label: 'Years of experience vs education timeline',
      status: ok ? 'pass' : 'review',
      detail: ok
        ? `Claimed ${years} years aligns with graduation year (${gradYear}).`
        : `Claims ${years} years experience but graduated ~${gradYear}, verify employment timeline.`,
    });
  } else if (years != null) {
    checks.push({
      id: 'timeline_experience',
      label: 'Years of experience',
      status: 'pass',
      detail: `${years} years of experience referenced in resume.`,
    });
  }

  if (yearSpans.length >= 2) {
    const gaps = [];
    const sorted = [...new Set(yearSpans)].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] > 8) gaps.push(`${sorted[i - 1]}–${sorted[i]}`);
    }
    checks.push({
      id: 'timeline_gaps',
      label: 'Timeline continuity',
      status: gaps.length ? 'review' : 'pass',
      detail: gaps.length
        ? `Large gaps between referenced years (${gaps.join(', ')}), confirm career history.`
        : 'Employment years appear reasonably continuous.',
    });
  }

  checks.push({
    id: 'education',
    label: 'Education validation',
    status: education === 'Other' ? 'review' : 'pass',
    detail:
      education === 'Other'
        ? 'No standard degree pattern detected, manual qualification review recommended.'
        : `${education} credentials referenced in resume materials.`,
  });

  const domainKeywords = [
    ...parseKeywords(jobKeywords),
    ...(jobTitle || '').toLowerCase().split(/\s+/).filter((w) => w.length > 3),
  ];
  const domain = keywordMatchScore(text, domainKeywords);
  checks.push({
    id: 'domain_fit',
    label: 'Domain / role alignment',
    status: domain.score >= 60 ? 'pass' : domain.score >= 35 ? 'review' : 'fail',
    detail:
      domain.hits.length > 0
        ? `Matched role signals: ${domain.hits.slice(0, 6).join(', ')}.`
        : 'Limited overlap between resume and role keywords, review fit carefully.',
  });

  const experienceFit = buildExperienceFit({
    resumeText: text,
    job: job || { title: jobTitle },
    posting: posting || {},
  });

  const domainMatrix = runDomainValidationMatrix({
    resumeText: text,
    jobTitle: job?.title || jobTitle,
    team: job?.team,
    minYears: experienceFit.required_min_years,
    jobKeywords: domainKeywords,
  });

  checks.push({
    id: 'experience_fit',
    label: 'Experience / seniority fit',
    status:
      experienceFit.severity === 'critical' || experienceFit.severity === 'high'
        ? 'fail'
        : experienceFit.severity === 'moderate'
          ? 'review'
          : 'pass',
    detail: experienceFit.summary,
  });

  checks.push({
    id: 'domain_matrix',
    label: 'Domain competency matrix',
    status: domainMatrix.coverage_score >= 60 ? 'pass' : domainMatrix.coverage_score >= 35 ? 'review' : 'fail',
    detail: `${domainMatrix.hits_count}/${domainMatrix.total_signals} ${domainMatrix.department} signals (${domainMatrix.tier} tier), ${domainMatrix.coverage_score}% coverage`,
  });

  const certs = [...new Set((text.match(CERT_PATTERNS) || []).map((c) => c.toUpperCase()))];
  checks.push({
    id: 'certifications',
    label: 'Certifications validation',
    status: certs.length ? 'pass' : 'review',
    detail: certs.length
      ? `Credentials referenced: ${certs.slice(0, 5).join(', ')}.`
      : 'No standard certifications detected, verify if role requires them.',
  });

  const workAuth = WORK_AUTH_PATTERNS.test(text);
  checks.push({
    id: 'work_authorization',
    label: 'Work authorization signals',
    status: workAuth ? 'pass' : 'review',
    detail: workAuth
      ? 'Work authorization language found in resume materials.'
      : 'No work authorization statement, confirm eligibility during screening.',
  });

  const leadership = LEADERSHIP_PATTERNS.test(text);
  checks.push({
    id: 'leadership',
    label: 'Leadership & ownership signals',
    status: leadership ? 'pass' : 'review',
    detail: leadership
      ? 'Resume references team leadership or cross-functional ownership.'
      : 'Limited leadership language, appropriate for some individual-contributor roles.',
  });

  const skills = extractSkills(text);
  const transferableSkills = extractTransferableSkills(text, domainKeywords);

  const pass = checks.filter((c) => c.status === 'pass').length;
  const review = checks.filter((c) => c.status === 'review').length;
  const fail = checks.filter((c) => c.status === 'fail').length;
  const confidence = Math.round(((pass * 1 + review * 0.5) / Math.max(checks.length, 1)) * 100);

  const recommendations = [];
  if (review || fail) recommendations.push('Needs validation, verify timeline and qualifications in interview');
  if (domain.score >= 60) recommendations.push('Strong match, recommend advancing to structured screening review');
  if (confidence >= 80) recommendations.push('Fast-track candidate, resume signals align with role requirements');
  if (domain.score < 50 && transferableSkills.length >= 2) {
    recommendations.push(
      `Hidden talent potential, transferable skills (${transferableSkills.slice(0, 3).join(', ')}) may outweigh resume gap`
    );
  }
  if (!recommendations.length) recommendations.push('Standard review, no major resume flags detected');
  if (experienceFit.years_gap >= 3) {
    recommendations.unshift(
      `Experience gap: resume ~${experienceFit.candidate_years ?? '?'} yrs vs role ~${experienceFit.required_min_years}+ yrs, verify before advancing`
    );
  }

  return {
    confidence,
    seniority,
    education,
    yearsExperience: years,
    domainMatch: domain,
    domainMatrix,
    experienceFit,
    skills,
    transferableSkills,
    certifications: certs,
    checks,
    recommendations,
    pillars: {
      resumeIntelligence: confidence,
      experienceValidation: experienceFit.fit_score,
      assessmentIntegrity: null,
      candidatePotential: Math.round((domain.score + domainMatrix.coverage_score + transferableSkills.length * 8) / 2.2),
    },
  };
}
