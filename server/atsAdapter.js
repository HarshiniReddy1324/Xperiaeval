import { v4 as uuid } from 'uuid';

/** Normalize ATS webhook payloads (Greenhouse, Lever, etc.); demo stub. */
export function normalizeAtsPayload(provider, body) {
  const candidate = body.candidate || body.applicant || body;
  return {
    provider: provider || body.provider || 'generic',
    external_id: candidate.id || candidate.external_id || body.id || uuid(),
    name: candidate.name || `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim(),
    email: candidate.email || candidate.email_addresses?.[0]?.value,
    job_external_id: body.job_id || body.requisition_id || candidate.job_id,
    source: candidate.source || body.source || body.application?.source,
    stage: body.stage || candidate.stage || 'applied',
    raw: body,
  };
}

export function buildWritebackPayload({ application, score, screening, experienceFit, behavioralSignals }) {
  return {
    external_application_id: application.id,
    tags: [
      score?.bucket && `xperieval-bucket-${score.bucket.toLowerCase()}`,
      screening?.screening_status && `xperieval-${screening.screening_status}`,
      experienceFit?.employment_mismatch && 'xperieval-experience-mismatch',
    ].filter(Boolean),
    custom_fields: {
      xperieval_application_score: score?.overall,
      xperieval_interview_score: null,
      xperieval_completion_pct: screening?.completion_pct,
      xperieval_recommendation: screening?.recommendation,
      xperieval_authenticity: application.authenticity_score,
      xperieval_experience_fit: experienceFit?.fit_score,
      xperieval_years_gap: experienceFit?.years_gap,
      xperieval_behavioral_score: behavioralSignals?.score,
    },
    note: [
      `Xperieval advisory: ${screening?.recommendation || score?.explanation || 'Scored'}`,
      experienceFit?.summary,
    ]
      .filter(Boolean)
      .join(' · '),
  };
}

/** Greenhouse Harvest-style custom field update body. */
export function buildGreenhouseWritebackBody(payload) {
  return {
    provider: 'greenhouse',
    action: 'update_candidate_score',
    application: {
      external_id: payload.external_application_id,
    },
    tags: payload.tags || [],
    custom_fields: Object.entries(payload.custom_fields || {}).map(([name, value]) => ({
      name,
      value: value != null ? String(value) : '',
    })),
    note: payload.note,
    sent_at: new Date().toISOString(),
  };
}
