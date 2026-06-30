/**
 * Candidate Intelligence Scoring Engine (HiredScore-style).
 * Multi-dimensional evaluation per answer + weighted overall report.
 */

import { mergeAnswerTextForScoring } from './audioTranscription.js';
import { parseKeywords, keywordMatchScore } from './screening.js';
import { analyzeAnswerQuality, zeroScoreReason } from './answerQuality.js';
import { inferCategoryType, CATEGORY_DIMENSION_FOCUS } from './intelligenceCategories.js';
import { llmConfigured, scoreIntelligenceWithLlm } from './llm.js';
import {
  tierFromScore,
  recommendationFromScore,
  bucketFromOverall,
  thresholdsFromJob,
} from './scoringThresholds.js';
import { buildExperienceFit, applyExperienceFitToScore } from './experienceFit.js';
import { scoreFollowUpAnswers } from './followUpQuestions.js';

export const DIMENSION_WEIGHTS = {
  technical_competency: 0.3,
  problem_solving: 0.2,
  communication: 0.1,
  project_ownership: 0.1,
  authenticity: 0.1,
  resume_consistency: 0.1,
  behavioral_confidence: 0.1,
};

const OWNERSHIP_STRONG = /\b(i designed|i implemented|i deployed|i debugged|i built|i led|i owned|i architected|i wrote|i created)\b/i;
const OWNERSHIP_WEAK = /\b(we |the team|assisted|helped with|participated|involved in)\b/i;
const PROBLEM_STRUCTURE = /\b(first|then|because|therefore|root cause|hypothesis|option|trade-off|result)\b/i;

function clamp(n, lo = 0, hi = 100) {
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function wordCount(t) {
  return (t || '').trim().split(/\s+/).filter(Boolean).length;
}

function interviewReadiness(overall, confidence) {
  if (overall >= 80 && confidence === 'High') return 'Ready for interview';
  if (overall >= 70) return 'Likely ready, confirm weak areas';
  if (overall >= 60) return 'Review before scheduling';
  return 'Not ready, significant gaps';
}

/** Per-answer dimension heuristics (0–100). */
export function scoreAnswerDimensions({ text, category, resumeText, jobContext }) {
  const t = text || '';
  const quality = analyzeAnswerQuality(t);
  if (!quality.valid && quality.reason !== 'media') {
    const note = zeroScoreReason(t) || 'Non-substantive answer';
    return {
      questionScore: 0,
      technicalAccuracy: 0,
      depthScore: 0,
      problemSolving: 0,
      communicationScore: 0,
      authenticityScore: 0,
      projectOwnership: 0,
      resumeConsistency: 0,
      rubricMatch: 0,
      confidenceScore: 0,
      strengths: [],
      concerns: [note],
    };
  }

  const wc = wordCount(t);
  const ideal = category?.ideal_answer || category?.expected_evidence || '';
  const keywords = parseKeywords(category?.keywords);
  const km = keywordMatchScore(t, keywords);
  const rubricMatch = clamp(km.score * 0.85 + expectationAlignment(t, ideal) * 0.15);

  let technicalAccuracy = rubricMatch;
  if (inferCategoryType(category) === 'Technical') {
    technicalAccuracy = clamp(rubricMatch * 0.6 + (/\b(api|sql|aws|k8s|terraform|python|java|react|pipeline|architecture)\b/i.test(t) ? 25 : 0));
  }

  let depthScore = 0;
  if (wc >= 20) depthScore += 35;
  if (wc >= 50) depthScore += 25;
  if (/\d+%|\$\d|million|billion|\d+ users/i.test(t)) depthScore += 20;
  if (/\b(for example|specifically|in practice)\b/i.test(t)) depthScore += 15;
  depthScore = clamp(depthScore);

  let problemSolving = 40;
  if (PROBLEM_STRUCTURE.test(t)) problemSolving += 25;
  if (/\b(debug|fix|resolve|mitigate|root cause|hypothesis)\b/i.test(t)) problemSolving += 20;
  if (wc >= 40) problemSolving += 15;
  problemSolving = clamp(problemSolving);

  let communication = 45;
  if (wc >= 30 && wc <= 400) communication += 20;
  if (/\n|first|second|finally|step/i.test(t)) communication += 15;
  if (!/\b(um|stuff|things|basically)\b/i.test(t)) communication += 15;
  communication = clamp(communication);

  let authenticity = 50;
  if (OWNERSHIP_STRONG.test(t)) authenticity += 25;
  if (/\b(in 20\d{2}|at [A-Z]|when i was)\b/i.test(t)) authenticity += 15;
  if (/\b(as an ai|chatgpt|language model|delve into)\b/i.test(t)) authenticity -= 40;
  if (wc < 15) authenticity -= 25;
  authenticity = clamp(authenticity);

  let projectOwnership = 40;
  if (OWNERSHIP_STRONG.test(t)) projectOwnership += 45;
  if (OWNERSHIP_WEAK.test(t) && !OWNERSHIP_STRONG.test(t)) projectOwnership -= 15;
  projectOwnership = clamp(projectOwnership);

  const resumeConsistency = scoreResumeConsistency(t, resumeText, jobContext);

  const questionScore = clamp(
    technicalAccuracy * 0.25 +
      depthScore * 0.2 +
      problemSolving * 0.15 +
      communication * 0.1 +
      authenticity * 0.15 +
      projectOwnership * 0.1 +
      resumeConsistency * 0.05
  );

  const strengths = [];
  const concerns = [];
  if (rubricMatch >= 75) strengths.push('Strong rubric alignment');
  if (depthScore >= 70) strengths.push('Good depth and specificity');
  if (projectOwnership >= 75) strengths.push('Clear personal ownership language');
  if (rubricMatch < 50) concerns.push('Weak alignment with expected evidence');
  if (authenticity < 55) concerns.push('Generic or low-ownership phrasing');
  if (resumeConsistency < 50) concerns.push('Possible resume/answer inconsistency');

  return {
    questionScore,
    technicalAccuracy,
    depthScore,
    problemSolving,
    communicationScore: communication,
    authenticityScore: authenticity,
    projectOwnership,
    resumeConsistency,
    rubricMatch,
    confidenceScore: clamp(72 + (wc > 25 ? 10 : 0) - (wc < 10 ? 20 : 0)),
    strengths,
    concerns,
  };
}

function expectationAlignment(text, expected) {
  if (!text?.trim() || !expected?.trim()) return 50;
  const tokens = expected.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
  if (!tokens.length) return 55;
  const t = text.toLowerCase();
  const hits = tokens.filter((tok) => t.includes(tok)).length;
  return clamp(40 + (hits / tokens.length) * 60);
}

function scoreResumeConsistency(answerText, resumeText, jobContext) {
  if (!resumeText?.trim() || !answerText?.trim()) return 70;
  const resume = resumeText.toLowerCase();
  const answer = answerText.toLowerCase();
  const tools = (jobContext?.requiredSkills || []).concat(jobContext?.preferredSkills || []);
  let supported = 0;
  let claimed = 0;
  for (const skill of tools.slice(0, 12)) {
    const s = skill.toLowerCase();
    if (answer.includes(s)) {
      claimed += 1;
      if (resume.includes(s)) supported += 1;
    }
  }
  if (!claimed) return 75;
  const ratio = supported / claimed;
  let score = clamp(50 + ratio * 50);
  if (/\b(10 years|senior architect|cto)\b/i.test(answer) && !/\b(senior|lead|architect|10\+|ten)\b/i.test(resume)) {
    score -= 20;
  }
  return clamp(score);
}

export function extractJobSkills(job, posting) {
  const required = [
    ...(posting?.requiredQualifications || []),
    ...(posting?.techStack || []),
  ];
  const preferred = [...(posting?.preferredQualifications || [])];
  return {
    requiredSkills: required.map(String),
    preferredSkills: preferred.map(String),
    description: job?.description || posting?.summary || '',
  };
}

export function buildBehavioralProfile({ integrity, answers, categories }) {
  const fields = integrity?.fields || {};
  let totalEdits = 0;
  let totalPaste = integrity?.paste_attempts || 0;
  let totalKeystrokes = 0;
  let totalChars = 0;
  const perQuestion = [];

  for (const cat of categories) {
    const f = fields[cat.id];
    const ans = answers.find((a) => a.category_id === cat.id);
    const edits = f ? Math.max(0, (f.keystrokes || 0) - (f.chars_final || 0) * 0.5) : 0;
    totalEdits += edits;
    totalKeystrokes += f?.keystrokes || 0;
    totalChars += f?.chars_final || 0;
    perQuestion.push({
      category_id: cat.id,
      time_taken_seconds: ans?.time_taken_seconds || 0,
      idle_seconds: ans?.idle_seconds || 0,
      focus_loss_count: ans?.focus_loss_count || 0,
      answer_length: (ans?.body || ans?.transcript_text || '').length,
      keystrokes: f?.keystrokes || 0,
      paste_events: f?.paste_blocked || 0,
    });
  }

  const tabSwitches = integrity?.focus_loss_count || 0;
  const hiddenPct = integrity?.total_time_seconds
    ? Math.round(((integrity?.hidden_time_seconds || 0) / integrity.total_time_seconds) * 100)
    : 0;

  /** Context-only, does not auto-reject. */
  let behavioralConfidence = 88;
  const observations = [];
  if (tabSwitches >= 5) {
    observations.push(`${tabSwitches} tab/focus changes during assessment (context only)`);
    behavioralConfidence -= Math.min(8, tabSwitches);
  } else if (tabSwitches > 0) {
    observations.push(`${tabSwitches} tab switch(es) noted; not penalized automatically`);
  }
  if (totalPaste > 0) {
    observations.push(`${totalPaste} paste event(s) recorded`);
    behavioralConfidence -= Math.min(6, totalPaste * 2);
  }
  if (hiddenPct > 40) {
    observations.push(`${hiddenPct}% session time away from form`);
    behavioralConfidence -= 5;
  }
  const avgTime =
    perQuestion.filter((p) => p.time_taken_seconds > 0).reduce((s, p) => s + p.time_taken_seconds, 0) /
      Math.max(1, perQuestion.filter((p) => p.time_taken_seconds > 0).length) || 0;
  if (avgTime > 0) observations.push(`Average ${Math.round(avgTime)}s per question`);

  return {
    behavioral_confidence: clamp(behavioralConfidence, 50, 100),
    total_assessment_seconds: integrity?.total_time_seconds || 0,
    tab_switches: tabSwitches,
    paste_events: totalPaste,
    hidden_time_pct: hiddenPct,
    total_keystrokes: totalKeystrokes,
    per_question: perQuestion,
    observations,
  };
}

export function aggregateDimensionScores(perQuestionScores, categories) {
  const sums = {
    technical_competency: 0,
    problem_solving: 0,
    communication: 0,
    project_ownership: 0,
    authenticity: 0,
    resume_consistency: 0,
    depth_of_knowledge: 0,
  };
  const weights = { ...sums };

  for (const pq of perQuestionScores) {
    const cat = categories.find((c) => c.id === pq.category_id);
    const type = inferCategoryType(cat);
    const focus = CATEGORY_DIMENSION_FOCUS[type] || CATEGORY_DIMENSION_FOCUS.General;
    const w = cat?.priority === 'optional' ? 0.7 : 1;

    sums.technical_competency += pq.technicalAccuracy * w;
    sums.problem_solving += pq.problemSolving * w;
    sums.communication += pq.communicationScore * w;
    sums.project_ownership += pq.projectOwnership * w;
    sums.authenticity += pq.authenticityScore * w;
    sums.resume_consistency += pq.resumeConsistency * w;
    sums.depth_of_knowledge += pq.depthScore * w;
    weights.technical_competency += w;
    weights.problem_solving += w;
    weights.communication += w;
    weights.project_ownership += w;
    weights.authenticity += w;
    weights.resume_consistency += w;
    weights.depth_of_knowledge += w;
  }

  const avg = (key, altKey) =>
    weights[key] ? clamp(sums[key] / weights[key]) : clamp(sums[altKey] / (weights[altKey] || 1));

  return {
    technical_competency: avg('technical_competency'),
    problem_solving: avg('problem_solving'),
    communication: avg('communication'),
    project_ownership: avg('project_ownership'),
    authenticity: avg('authenticity'),
    resume_consistency: avg('resume_consistency'),
    depth_of_knowledge: avg('depth_of_knowledge'),
  };
}

export function computeOverallScore(dimensions, behavioralConfidence, perQuestionScores = []) {
  const d = dimensions;
  const avgQuestion =
    perQuestionScores.length > 0
      ? perQuestionScores.reduce((s, p) => s + (p.questionScore || 0), 0) / perQuestionScores.length
      : 0;

  if (avgQuestion < 20) {
    return clamp(Math.round(avgQuestion));
  }

  const overall =
    d.technical_competency * DIMENSION_WEIGHTS.technical_competency +
    d.problem_solving * DIMENSION_WEIGHTS.problem_solving +
    d.communication * DIMENSION_WEIGHTS.communication +
    d.project_ownership * DIMENSION_WEIGHTS.project_ownership +
    d.authenticity * DIMENSION_WEIGHTS.authenticity +
    d.resume_consistency * DIMENSION_WEIGHTS.resume_consistency +
    behavioralConfidence * DIMENSION_WEIGHTS.behavioral_confidence;
  return clamp(overall);
}

function confidenceLevel(overall, behavioral, perQuestion) {
  const variance =
    perQuestion.length > 1
      ? Math.max(...perQuestion.map((p) => p.questionScore)) -
        Math.min(...perQuestion.map((p) => p.questionScore))
      : 0;
  if (overall >= 75 && behavioral >= 75 && variance < 35) return 'High';
  if (overall >= 60 && behavioral >= 60) return 'Medium';
  return 'Low';
}

export function generateInsights({ dimensions, perQuestion, behavioral, resumeText, jobTitle, experienceFit }) {
  const strengths = [];
  const concerns = [];
  if (dimensions.technical_competency >= 78) strengths.push('Strong technical competency across answers');
  if (dimensions.problem_solving >= 75) strengths.push('Structured problem-solving and reasoning');
  if (dimensions.project_ownership >= 75) strengths.push('Consistent ownership language (I designed/implemented/deployed)');
  if (dimensions.authenticity >= 72) strengths.push('Specific examples with personal accountability');
  if (dimensions.communication >= 72) strengths.push('Clear, organized communication');

  if (dimensions.technical_competency < 60) concerns.push('Technical depth below role expectations');
  if (dimensions.resume_consistency < 58) concerns.push('Some claims may not be supported by resume');
  if (experienceFit?.employment_mismatch) {
    concerns.push(
      `Experience gap: ~${experienceFit.candidate_years ?? '?'} yrs resume vs ~${experienceFit.required_min_years}+ yrs role requirement`
    );
  }
  if (dimensions.authenticity < 58) concerns.push('Answers lean generic, limited first-person evidence');
  if (dimensions.problem_solving < 58) concerns.push('Problem-solving narratives lack structure');

  const weakQuestions = perQuestion
    .filter((p) => p.questionScore < 55)
    .map((p) => p.question?.slice(0, 60) || p.category_id);
  const interview_focus_areas = weakQuestions.length
    ? weakQuestions.map((q) => `Clarify: ${q}…`)
    : dimensions.technical_competency < 70
      ? ['Validate hands-on technical depth in interview']
      : ['Confirm culture fit and motivation in interview'];

  const resume_findings = [];
  if (resumeText?.trim()) {
    resume_findings.push('Resume on file, cross-checked against assessment responses');
    if (dimensions.resume_consistency >= 75) resume_findings.push('High consistency between resume and answers');
    else if (dimensions.resume_consistency < 60)
      resume_findings.push('Some assessment claims need resume verification');
  } else {
    resume_findings.push('No resume text extracted, resume consistency scored conservatively');
  }

  const project_findings = [];
  if (dimensions.project_ownership >= 70) project_findings.push('Multiple answers show end-to-end ownership signals');
  else project_findings.push('Limited explicit ownership language, may be contributor vs owner');

  return {
    top_strengths: strengths.slice(0, 5),
    potential_concerns: concerns.slice(0, 5),
    resume_findings,
    project_findings,
    behavioral_observations: behavioral.observations || [],
    interview_focus_areas: interview_focus_areas.slice(0, 5),
    strength_summary: strengths[0] || 'Review full report for evidence',
    weakness_summary: concerns[0] || 'No major concerns flagged',
    job_title: jobTitle,
  };
}

const EXPLAIN_DIM_LABELS = {
  technical_competency: 'Technical',
  problem_solving: 'Problem solving',
  communication: 'Communication',
  project_ownership: 'Leadership / ownership',
  authenticity: 'Authenticity',
  resume_consistency: 'Resume match',
  behavioral_confidence: 'Integrity',
};

/** Structured “why this score?” payload for UI and audit. */
export function buildExplainability({
  overall,
  dimensions = {},
  dimensionWeights = DIMENSION_WEIGHTS,
  insights = {},
  experienceFit = null,
  integrity = null,
  behavioral = {},
  confidence_level,
}) {
  const because = Object.entries(dimensionWeights)
    .map(([key, weight]) => ({
      key,
      label: EXPLAIN_DIM_LABELS[key] || key,
      score: dimensions[key] ?? null,
      weight_pct: Math.round(weight * 100),
    }))
    .filter((d) => d.score != null);

  const positives = (insights.top_strengths || []).map((text) => ({ text, tone: 'positive' }));
  const gaps = (insights.potential_concerns || []).map((text) => ({ text, tone: 'gap' }));

  const risk = [];
  if (experienceFit?.employment_mismatch) {
    risk.push({
      label: 'Employment mismatch',
      status: 'flagged',
      detail: `Resume ~${experienceFit.candidate_years ?? '?'} yrs vs role ~${experienceFit.required_min_years ?? '?'}+ yrs`,
    });
  } else {
    risk.push({ label: 'No employment mismatch', status: 'clear', detail: 'Resume years align with role requirement' });
  }

  const aiPhrases = behavioral.ai_phrase_hits || integrity?.ai_phrase_hits;
  if (aiPhrases > 0) {
    risk.push({ label: 'AI-assisted content detected', status: 'flagged', detail: `${aiPhrases} AI-phrase signal(s) in answers` });
  } else {
    risk.push({ label: 'No AI-generated content flagged', status: 'clear', detail: 'No strong AI-phrase patterns in responses' });
  }

  if (integrity?.voice_verified === true) {
    risk.push({ label: 'Voice verified', status: 'clear', detail: 'Reference voice sample on file' });
  } else if (integrity?.voice_verified === false) {
    risk.push({ label: 'Voice not verified', status: 'review', detail: 'No matching voice reference yet' });
  }

  const paste = integrity?.paste_attempts ?? behavioral.paste_events;
  if (paste > 0) {
    risk.push({ label: 'Paste events during screening', status: 'review', detail: `${paste} paste event(s) logged` });
  }

  let confidencePct = null;
  if (confidence_level === 'High') confidencePct = 94;
  else if (confidence_level === 'Medium') confidencePct = 78;
  else if (confidence_level === 'Low') confidencePct = 62;

  return {
    overall,
    because,
    positives,
    gaps,
    risk,
    confidence_pct: confidencePct,
    ai_summary:
      insights.ai_summary ||
      insights.strength_summary ||
      (positives.length
        ? `Candidate demonstrates ${positives[0]?.text?.toLowerCase() || 'relevant experience signals'}.`
        : 'Review dimension scores and evidence below for hiring decision support.'),
    note: 'Scores combine rubric alignment, depth, ownership language, resume cross-check, experience fit, and session context. Tab switches are context-only.',
  };
}

/**
 * Build full Candidate Intelligence Report (sync heuristics + optional async LLM refine).
 */
export async function buildCandidateIntelligenceReport({
  application,
  job,
  categories,
  answers,
  integrity,
  posting,
  useAi = true,
  thresholds: thresholdsInput,
  org,
  followUpAnswers = null,
}) {
  const thresholds = thresholdsInput || thresholdsFromJob(job, org);
  const jobContext = extractJobSkills(job, posting);
  const resumeText = application?.resume_text || '';
  const experienceFit = buildExperienceFit({ resumeText, job, posting });
  const perQuestion = [];

  for (const cat of categories) {
    const answer = answers.find((a) => a.category_id === cat.id);
    const text = mergeAnswerTextForScoring(answer);
    const dims = scoreAnswerDimensions({
      text,
      category: { ...cat, ideal_answer: cat.ideal_answer || cat.expected_evidence },
      resumeText,
      jobContext,
    });
    perQuestion.push({
      category_id: cat.id,
      name: cat.name,
      question: cat.question,
      category_type: inferCategoryType(cat),
      priority: cat.priority || 'mandatory',
      response_type: answer?.response_type,
      has_media: Boolean(answer?.media_path),
      ...dims,
      technicalAccuracy: dims.technicalAccuracy,
      depthScore: dims.depthScore,
      communicationScore: dims.communicationScore,
    });
  }

  const behavioral = buildBehavioralProfile({ integrity, answers, categories });
  const dimensions = aggregateDimensionScores(perQuestion, categories);
  dimensions.behavioral_confidence = behavioral.behavioral_confidence;

  let overall = computeOverallScore(dimensions, behavioral.behavioral_confidence, perQuestion);
  let method = 'heuristic_v2';
  let aiNote = null;

  const heuristicAvg =
    perQuestion.length > 0
      ? perQuestion.reduce((s, p) => s + (p.questionScore || 0), 0) / perQuestion.length
      : 0;

  if (useAi && llmConfigured() && heuristicAvg >= 20) {
    const ai = await scoreIntelligenceWithLlm({
      job,
      posting,
      resumeText,
      perQuestion,
      dimensions,
      behavioral,
    });
    if (ai) {
      method = 'heuristic+ai';
      aiNote = ai.explanation;
      if (ai.per_question?.length) {
        for (const aq of ai.per_question) {
          const pq = perQuestion.find((p) => p.category_id === aq.category_id);
          if (pq && aq.questionScore != null) {
            pq.questionScore = clamp(aq.questionScore);
            if (aq.strengths?.length) pq.strengths = aq.strengths;
            if (aq.concerns?.length) pq.concerns = aq.concerns;
          }
        }
      }
      if (ai.dimensions) Object.assign(dimensions, ai.dimensions);
      if (ai.overall != null) {
        // AI overall is authoritative, do not overwrite with a second heuristic pass
        overall = clamp(ai.overall);
      } else {
        overall = computeOverallScore(dimensions, behavioral.behavioral_confidence, perQuestion);
      }
    }
  }

  const followUpScored =
    followUpAnswers?.answers?.length
      ? scoreFollowUpAnswers(followUpAnswers.questions || [], followUpAnswers.answers || [])
      : null;
  if (followUpScored?.score != null && followUpScored.score < 50) {
    overall = clamp(overall - Math.min(12, 60 - followUpScored.score));
  }

  let recommendation = recommendationFromScore(overall, thresholds);
  const adjusted = applyExperienceFitToScore(overall, experienceFit, recommendation);
  overall = adjusted.overall;
  recommendation = adjusted.recommendation || recommendationFromScore(overall, thresholds);

  const tier = tierFromScore(overall, thresholds);
  const confidence = confidenceLevel(overall, behavioral.behavioral_confidence, perQuestion);
  const insights = generateInsights({
    dimensions,
    perQuestion,
    behavioral,
    resumeText,
    jobTitle: job?.title,
    experienceFit,
  });

  if (aiNote) insights.ai_summary = aiNote;

  return {
    version: '2.0',
    policy_version: 'candidate-intelligence-v2',
    method,
    scored_at: new Date().toISOString(),
    candidate_name: application?.name,
    job_title: job?.title,
    overall,
    tier,
    recommendation,
    confidence_level: confidence,
    interview_readiness: interviewReadiness(overall, confidence),
    bucket: bucketFromOverall(overall, thresholds),
    thresholds_used: thresholds,
    dimensions: {
      technical_competency: dimensions.technical_competency,
      problem_solving: dimensions.problem_solving,
      communication: dimensions.communication,
      project_ownership: dimensions.project_ownership,
      authenticity: dimensions.authenticity,
      resume_consistency: dimensions.resume_consistency,
      behavioral_confidence: behavioral.behavioral_confidence,
    },
    dimension_weights: DIMENSION_WEIGHTS,
    per_question: perQuestion,
    behavioral,
    experience_fit: experienceFit,
    follow_up: followUpScored,
    insights,
    explainability: buildExplainability({
      overall,
      dimensions: {
        technical_competency: dimensions.technical_competency,
        problem_solving: dimensions.problem_solving,
        communication: dimensions.communication,
        project_ownership: dimensions.project_ownership,
        authenticity: dimensions.authenticity,
        resume_consistency: dimensions.resume_consistency,
        behavioral_confidence: behavioral.behavioral_confidence,
      },
      dimensionWeights: DIMENSION_WEIGHTS,
      insights,
      experienceFit,
      integrity: integrity
        ? {
            paste_attempts: integrity.paste_attempts,
            ai_phrase_hits: integrity.ai_phrase_hits,
            voice_verified: integrity.voice_verified,
          }
        : null,
      behavioral,
      confidence_level: confidence,
    }),
  };
}

export function parseIntelligenceReport(scoreRow) {
  if (!scoreRow?.intelligence_json) return null;
  try {
    const report =
      typeof scoreRow.intelligence_json === 'string'
        ? JSON.parse(scoreRow.intelligence_json)
        : { ...scoreRow.intelligence_json };
    // scores row is canonical, LLM re-score updates the row after the JSON blob is written
    if (scoreRow.overall != null) report.overall = scoreRow.overall;
    if (scoreRow.bucket) report.bucket = scoreRow.bucket;
    if (scoreRow.recommendation) report.recommendation = scoreRow.recommendation;
    if (scoreRow.confidence_level) report.confidence_level = scoreRow.confidence_level;
    if (scoreRow.tier) report.tier = scoreRow.tier;
    return report;
  } catch {
    return null;
  }
}

/** Keep intelligence_json headline fields aligned with scores table after LLM adjustments. */
export function patchIntelligenceJsonScores(intelligenceJson, patch) {
  if (!intelligenceJson) return null;
  try {
    const report = typeof intelligenceJson === 'string' ? JSON.parse(intelligenceJson) : { ...intelligenceJson };
    if (patch.overall != null) report.overall = patch.overall;
    if (patch.bucket) report.bucket = patch.bucket;
    if (patch.recommendation) report.recommendation = patch.recommendation;
    if (patch.confidence_level) report.confidence_level = patch.confidence_level;
    if (patch.tier) report.tier = patch.tier;
    return JSON.stringify(report);
  } catch {
    return null;
  }
}
