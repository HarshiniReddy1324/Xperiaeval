/**
 * Hidden-gem / second-chance candidate detection, strong answers + authentic session
 * despite weaker resume fit or Amber bucket.
 */

export function buildHiddenGemAssessment({
  applicationScore,
  resumeValidation,
  integrity,
} = {}) {
  const auth =
    integrity?.authenticity_score != null ? integrity.authenticity_score : 100;
  const overall = applicationScore?.overall ?? 0;
  const mandatoryPts = applicationScore?.mandatory_points ?? 0;
  const mandatoryMax = applicationScore?.mandatory_max ?? 70;
  const mandatoryPct = mandatoryMax ? Math.round((mandatoryPts / mandatoryMax) * 100) : 0;
  const domainScore = resumeValidation?.domainMatch?.score ?? 50;
  const bucket = applicationScore?.bucket;
  const transferable = resumeValidation?.transferableSkills ?? [];

  const reasons = [];

  if (mandatoryPct >= 75 && domainScore < 55 && auth >= 70) {
    reasons.push('Strong screening answers despite limited resume overlap with role keywords');
  }
  if (bucket === 'Amber' && mandatoryPct >= 78 && auth >= 85) {
    reasons.push('High-integrity responses, worth a second-chance recruiter review');
  }
  if (overall >= 58 && overall < 80 && mandatoryPct >= 82 && auth >= 90) {
    reasons.push('Answer quality exceeds what resume alone suggests, hidden talent signal');
  }
  if (transferable.length >= 2 && mandatoryPct >= 70 && auth >= 75) {
    reasons.push(`Transferable strengths detected: ${transferable.slice(0, 3).join(', ')}`);
  }

  const isHiddenGem = reasons.length > 0 && auth >= 65 && mandatoryPct >= 70;

  return {
    isHiddenGem,
    label: isHiddenGem ? 'Hidden gem candidate' : null,
    reasons: [...new Set(reasons)],
    secondChance: isHiddenGem && bucket !== 'Green',
    mandatoryPct,
    domainScore,
    authenticity: auth,
  };
}
