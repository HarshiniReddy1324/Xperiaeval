/** Simulated employment & identity verification (MVP — no paid Equifax/Checkr API) */

function extractYears(text) {
  const years = [...(text || '').matchAll(/\b(19|20)\d{2}\b/g)].map((m) => parseInt(m[0], 10));
  return [...new Set(years)].sort();
}

function nameInText(name, text) {
  if (!name || !text) return false;
  const parts = name.toLowerCase().split(/\s+/).filter((p) => p.length > 2);
  const t = text.toLowerCase();
  return parts.filter((p) => t.includes(p)).length >= Math.min(2, parts.length);
}

export function runBackgroundCheck({ application, answers, job }) {
  const resumeText = application.resume_text || '';
  const answerText = (answers || []).map((a) => a.body).join('\n');
  const combined = `${resumeText}\n${answerText}`;
  const checks = [];

  const identityMatch = nameInText(application.name, combined);
  checks.push({
    id: 'identity',
    label: 'Identity consistency',
    status: identityMatch ? 'pass' : 'review',
    detail: identityMatch
      ? 'Candidate name appears consistently across resume and application answers.'
      : 'Name on application does not clearly match resume/answer content — manual verification recommended.',
  });

  const emailDomain = (application.email || '').split('@')[1] || '';
  const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
  const emailOk = emailDomain && application.email.includes('@');
  checks.push({
    id: 'email',
    label: 'Contact verification',
    status: emailOk ? 'pass' : 'fail',
    detail: emailOk
      ? `Valid email format (${application.email}). ${personalDomains.includes(emailDomain) ? 'Personal email domain — confirm employment contact separately.' : 'Organizational or custom domain detected.'}`
      : 'Invalid or missing email address.',
  });

  const hasEmploymentSignals = /\b(employed|worked|company|manager|director|engineer|analyst|led|years of)\b/i.test(combined);
  const years = extractYears(combined);
  const timelineOk = years.length >= 1 || hasEmploymentSignals;
  checks.push({
    id: 'employment',
    label: 'Employment history signals',
    status: timelineOk ? 'pass' : 'review',
    detail: timelineOk
      ? years.length
        ? `Work history references detected (${years.join(', ')}). Cross-check dates with resume and LinkedIn.`
        : 'Employment-related language found in materials; dates not explicitly listed.'
      : 'Limited employment history evidence in submitted materials.',
  });

  const resumeHasRole = job?.title
    ? combined.toLowerCase().includes(job.title.toLowerCase().split(' ')[0])
    : true;
  checks.push({
    id: 'role_alignment',
    label: 'Role & resume alignment',
    status: resumeHasRole ? 'pass' : 'review',
    detail: resumeHasRole
      ? `Resume/answers reference role-relevant terms for "${job?.title || 'this position'}".`
      : 'Submitted materials may not align with the target role title — verify experience claims.',
  });

  const metricsInResume = /\d+%|\$\d+|\d+\s*(years|users|customers)/i.test(resumeText);
  const metricsInAnswers = /\d+%|\$\d+|\d+\s*(users|customers|revenue)/i.test(answerText);
  checks.push({
    id: 'claims',
    label: 'Quantified claims check',
    status: metricsInResume || metricsInAnswers ? 'pass' : 'review',
    detail:
      metricsInResume && metricsInAnswers
        ? 'Measurable outcomes appear in both resume and written answers — supports credibility.'
        : metricsInResume
          ? 'Metrics found in resume; answers could include more quantified outcomes.'
          : metricsInAnswers
            ? 'Metrics in answers; resume lacks matching quantified claims.'
            : 'Few quantified outcomes — verify achievement claims during reference checks.',
  });

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const reviewCount = checks.filter((c) => c.status === 'review').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;

  let overall_status = 'clear';
  let summary = 'Preliminary verification clear — proceed with standard reference checks before offer.';
  if (failCount > 0 || passCount < 3) {
    overall_status = 'review';
    summary = 'Some verification items need human review before extending an offer.';
  }
  if (failCount >= 2 || passCount <= 2) {
    overall_status = 'fail';
    summary = 'Multiple verification flags — do not proceed without manual investigation.';
  }

  const confidence = Math.round((passCount / checks.length) * 100);

  return {
    overall_status,
    confidence,
    summary,
    checks,
    disclaimer:
      'This is a simulated pre-employment screening report for demo purposes. It does not replace official background checks (e.g. criminal, credit, or third-party employment verification via providers like Equifax Workforce Solutions).',
    verified_at: new Date().toISOString(),
  };
}
