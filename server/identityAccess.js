/** Blind screening + staged identity reveal policy */

const FINAL_STAGES = new Set(['interview_scheduled', 'interview_completed', 'final_review']);
const SHORTLIST_PLUS_STAGES = new Set([
  'shortlisted_interview',
  'interview_scheduled',
  'interview_completed',
  'final_review',
]);
const REVEAL_ELIGIBLE_STAGES = SHORTLIST_PLUS_STAGES;

/** DEI-safe: identity hidden until candidate is shortlisted (or manually revealed). */
export function isDeiBlindMode(org) {
  return org.dei_blind_until_shortlist !== 0 && org.dei_blind_until_shortlist !== false;
}

export function getIdentityPolicy(user, application, org = {}) {
  const anonymizeEnabled = org.anonymize_screening !== 0 && org.anonymize_screening !== false;
  const deiBlind = isDeiBlindMode(org);
  const pipeline = application.pipeline_stage || 'application_review';
  const explicitlyRevealed = !!application.identity_revealed;
  const role = user?.role || '';
  const shortlisted = SHORTLIST_PLUS_STAGES.has(pipeline);

  if (!anonymizeEnabled || explicitlyRevealed) {
    return {
      anonymized: false,
      canReveal: false,
      autoRevealed: explicitlyRevealed,
      reason: explicitlyRevealed ? 'Identity unlocked for this candidate' : 'Anonymization disabled in settings',
      stage: pipeline,
    };
  }

  if (role === 'Compliance Auditor') {
    return {
      anonymized: true,
      canReveal: false,
      reason: 'Compliance role — anonymized view only (audit without bias)',
      stage: pipeline,
    };
  }

  if (deiBlind && shortlisted) {
    return {
      anonymized: false,
      canReveal: false,
      autoRevealed: true,
      reason: 'DEI-safe mode — identity revealed after shortlist for interview stage',
      stage: pipeline,
      deiMode: true,
    };
  }

  if (role === 'Hiring Manager' || role === 'Admin') {
    if (!deiBlind && FINAL_STAGES.has(pipeline)) {
      return {
        anonymized: false,
        canReveal: false,
        autoRevealed: true,
        reason: 'Final hiring stage — identity visible to hiring decision-makers',
        stage: pipeline,
      };
    }
    const canReveal =
      role === 'Admin' ||
      (role === 'Hiring Manager' && REVEAL_ELIGIBLE_STAGES.has(pipeline)) ||
      (deiBlind && role === 'Admin');
    const anonymized = deiBlind ? !shortlisted : true;
    return {
      anonymized,
      canReveal: deiBlind ? canReveal && !shortlisted : canReveal,
      autoRevealed: false,
      reason: deiBlind
        ? shortlisted
          ? 'DEI-safe — shortlisted; identity now visible'
          : 'DEI-safe blind review — scores visible, identity hidden until shortlist'
        : canReveal
          ? 'Blind screening — reveal when ready to contact candidate'
          : 'Complete screening review first — identity unlocks at shortlist',
      stage: pipeline,
      deiMode: deiBlind,
    };
  }

  return {
    anonymized: true,
    canReveal: false,
    reason: deiBlind
      ? 'DEI-safe blind review — identity unlocks when candidate is shortlisted'
      : 'Recruiters see anonymized profiles until hiring team unlocks identity',
    stage: pipeline,
    deiMode: deiBlind,
  };
}

export function applyIdentityView(user, application, org) {
  const policy = getIdentityPolicy(user, application, org);
  if (!policy.anonymized) {
    return {
      ...application,
      display_name: application.name,
      anonymized: false,
      identityPolicy: policy,
    };
  }
  return {
    ...application,
    display_name: application.anonymized_code || application.id,
    name_hidden: true,
    email_hidden: true,
    phone_hidden: true,
    resume_hidden: true,
    anonymized: true,
    identityPolicy: policy,
  };
}

export function shouldMaskMaterials(user, application, org) {
  const policy = getIdentityPolicy(user, application, org);
  return policy.anonymized;
}
