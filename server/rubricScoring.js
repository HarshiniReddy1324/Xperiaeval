import { parseKeywords, keywordMatchScore } from './screening.js';
import { evaluateAnswerTiming } from './responseTiming.js';
import { mergeAnswerTextForScoring } from './audioTranscription.js';
import { analyzeAnswerQuality, zeroScoreReason } from './answerQuality.js';
import { rubricScoreCaps, weightedQuestionPoints } from './rubricWeights.js';

function wordCount(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function parseKeywordsList(cat) {
  return parseKeywords(cat.keywords);
}

/** Heuristic alignment to hidden interviewer expectations (0–3). */
function expectationFit(text, expectedEvidence) {
  const t = (text || '').toLowerCase();
  const ev = (expectedEvidence || '').toLowerCase();
  if (!t.trim() || !analyzeAnswerQuality(text).valid) return 0;
  let score = 0;
  if (wordCount(t) >= 40) score += 1;
  if (wordCount(t) >= 80) score += 1;
  const evTokens = ev.split(/\W+/).filter((w) => w.length > 4);
  const hits = evTokens.filter((tok) => t.includes(tok)).length;
  if (hits >= 2) score += 1;
  if (/\d+%|\$\d|\d+\s*(users|customers|revenue|million|billion)/i.test(t)) score += 1;
  return Math.min(3, score);
}

/** Answer substance and genuineness signals (0–4). */
function substanceScore(text) {
  const t = text || '';
  if (!t.trim() || /^\[(audio|video).*recorded/i.test(t)) return 0;
  if (!analyzeAnswerQuality(t).valid) return 0;
  let score = 0;
  if (wordCount(t) >= 25) score += 1;
  if (wordCount(t) >= 50) score += 1;
  if (/\b(I|my|we)\b/i.test(t) && /\b(because|therefore|result|outcome)\b/i.test(t)) score += 1;
  if (!/\b(as an ai|chatgpt|language model|delve|tapestry|landscape)\b/i.test(t.toLowerCase())) score += 1;
  return Math.min(4, score);
}

/** Score one answer 0–10 using hidden rubric criteria (recruiters only see breakdown). */
export function scoreQuestionAnswer({ answer, category, timing: timingIn }) {
  const text = mergeAnswerTextForScoring(answer);
  const max = 10;
  const hasMedia = Boolean(answer?.media_path);
  const timing =
    timingIn ||
    evaluateAnswerTiming(answer?.time_taken_seconds, category?.max_response_seconds);
  if (!text || text.length < 8) {
    return {
      points: 0,
      max,
      keyword_hits: 0,
      notes: hasMedia
        ? 'Audio/video saved — no transcript for auto-score (listen in candidate profile or add GROQ_API_KEY)'
        : 'No substantive answer',
      has_media: hasMedia,
    };
  }

  const quality = analyzeAnswerQuality(text);
  if (!quality.valid) {
    return {
      points: 0,
      max,
      keyword_hits: 0,
      notes: zeroScoreReason(text) || 'Non-substantive answer',
      has_media: hasMedia,
    };
  }

  const keywords = parseKeywordsList(category);
  const km = keywordMatchScore(text, keywords);
  const keywordPts = Math.round((km.score / 100) * 3);
  const expectPts = expectationFit(text, category.ideal_answer || category.expected_evidence);
  const substance = substanceScore(text);

  let points = substance + keywordPts + expectPts;
  if (km.score < 40 && wordCount(text) < 30) points = Math.max(0, points - 2);
  if (timing?.score_penalty) points = Math.max(0, points - timing.score_penalty);
  points = Math.min(max, Math.max(0, points));

  const notes = [];
  if (km.matched) notes.push(`${km.matched} evaluation signals matched`);
  if (substance < 2) notes.push('Thin or generic response');
  if (expectPts >= 2) notes.push('Aligns with expected evidence patterns');
  if (timing?.exceeded_beyond_grace) notes.push(timing.flag);
  else if (timing?.status === 'grace') notes.push('Slightly over internal time guideline (within grace)');

  return {
    points,
    max,
    keyword_hits: km.matched,
    keyword_score: km.score,
    notes: notes.join(' · ') || 'Scored against hidden rubric criteria',
    timing_status: timing?.status,
    time_penalty: timing?.score_penalty || 0,
  };
}

export function scoreApplication({ answers, categories, greenThreshold = 80, amberThreshold = 60 }) {
  const perQuestion = [];
  let mandatoryPoints = 0;
  let optionalPoints = 0;
  const caps = rubricScoreCaps(categories);

  for (const cat of categories) {
    const answer = answers.find((a) => a.category_id === cat.id);
    const scored = scoreQuestionAnswer({ answer, category: cat });
    const isOptional = cat.priority === 'optional';
    const weight = Number(cat.weight) || 0;
    const points = weightedQuestionPoints(scored.points, scored.max, weight);
    perQuestion.push({
      category_id: cat.id,
      name: cat.name,
      priority: cat.priority || 'mandatory',
      question: cat.question,
      weight,
      ...scored,
      points,
      max: weight,
    });
    if (isOptional) optionalPoints += points;
    else mandatoryPoints += points;
  }

  const overall = Math.round((mandatoryPoints + optionalPoints) * 10) / 10;
  const bucket =
    overall >= greenThreshold ? 'Green' : overall >= amberThreshold ? 'Amber' : 'Red';

  let explanation = '';
  if (bucket === 'Green') {
    explanation = `Strong application score (${mandatoryPoints}/${caps.mandatory_max} required, ${optionalPoints}/${caps.optional_max} optional). Answers show specific evidence aligned with role expectations.`;
  } else if (bucket === 'Amber') {
    explanation = `Mixed fit (${mandatoryPoints}/${caps.mandatory_max} required, ${optionalPoints}/${caps.optional_max} optional). Human review recommended before advancing.`;
  } else {
    explanation = `Below threshold (${mandatoryPoints}/${caps.mandatory_max} required, ${optionalPoints}/${caps.optional_max} optional). Still visible for human review — scores are advisory.`;
  }

  const mandatoryCount = categories.filter((c) => (c.priority || 'mandatory') !== 'optional').length;
  const optionalCount = categories.filter((c) => c.priority === 'optional').length;

  return {
    overall,
    bucket,
    tier: bucket === 'Green' ? 'Top Tier' : bucket === 'Amber' ? 'Second Tier' : 'Low Match',
    mandatory_points: Math.round(mandatoryPoints * 10) / 10,
    optional_points: Math.round(optionalPoints * 10) / 10,
    mandatory_max: caps.mandatory_max,
    optional_max: caps.optional_max,
    per_question: perQuestion,
    explanation,
    risk: overall >= 80 ? 'Low' : overall >= 60 ? 'Medium' : 'High',
    status: bucket === 'Green' ? 'Ready for hiring team' : bucket === 'Amber' ? 'Needs reviewer note' : 'Do not auto-reject',
    breakdown: [
      {
        dimension: 'Required questions',
        score: Math.round(mandatoryPoints * 10) / 10,
        weight: `${caps.mandatory_max} pts`,
        formula: `${mandatoryCount} question${mandatoryCount === 1 ? '' : 's'}`,
      },
      {
        dimension: 'Optional questions',
        score: Math.round(optionalPoints * 10) / 10,
        weight: `${caps.optional_max} pts`,
        formula: `${optionalCount} question${optionalCount === 1 ? '' : 's'}`,
      },
    ],
    thresholds: { green: greenThreshold, amber: amberThreshold },
  };
}

export function getMethodology() {
  return {
    product: 'Xperieval Candidate Intelligence',
    scale: '0–100',
    formula:
      'Weighted dimensions: Technical 30%, Problem Solving 20%, Communication 10%, Ownership 10%, Authenticity 10%, Resume Consistency 10%, Behavioral Confidence 10%',
    legacy_formula: 'Required + optional question points totaling 100 (weight split across configured questions)',
    scoring_note:
      'Multi-dimensional evaluation per answer (not correct/incorrect). Groq AI refines scores when GROQ_API_KEY is set. Tab switches are context-only.',
    buckets: {
      Green: '≥ 80 — strong fit for human review',
      Amber: '60–79 — mixed; reviewer decision',
      Red: '< 60 — low fit; still visible to humans',
    },
    integrity: {
      description: 'Tab switches and session signals tracked silently — visible to recruiters and hiring managers only',
    },
  };
}
