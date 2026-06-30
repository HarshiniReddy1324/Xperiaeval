import { analyzeIntegrity } from './integrity.js';

function wordCount(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function hasMetrics(text) {
  return /\d+%|\$\d+|\d+\s*(users|customers|revenue|million|billion)/i.test(text || '');
}

function specificityScore(text) {
  const t = text || '';
  let s = 40;
  if (hasMetrics(t)) s += 25;
  if (/\b(I|we|my|our)\b/i.test(t)) s += 15;
  if (/\b(because|therefore|for example|specifically|when I)\b/i.test(t)) s += 15;
  if (wordCount(t) >= 60) s += 15;
  if (wordCount(t) < 15) s -= 20;
  return Math.max(0, Math.min(100, s));
}

function aiPhraseCount(text) {
  const phrases = [
    'furthermore', 'moreover', 'in conclusion', 'leverage', 'synergy', 'holistic',
    'paradigm', 'delve', 'landscape', 'robust', 'utilize', 'facilitate', 'dynamic environment',
  ];
  const t = (text || '').toLowerCase();
  return phrases.filter((p) => t.includes(p)).length;
}

function depthScore(responses) {
  if (!responses?.length) return 35;
  const avg = responses.reduce((s, r) => s + specificityScore(r.body), 0) / responses.length;
  const longAnswers = responses.filter((r) => wordCount(r.body) >= 50).length;
  return Math.min(100, Math.round(avg + longAnswers * 5));
}

function relevanceScore(responses, jobTitle) {
  const combined = responses.map((r) => r.body).join(' ').toLowerCase();
  const tokens = (jobTitle || '').toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  if (!tokens.length) return 60;
  const hits = tokens.filter((t) => combined.includes(t)).length;
  return Math.min(100, Math.round((hits / tokens.length) * 80 + 20));
}

function genuinenessScore(responses, applicationText) {
  const interviewText = responses.map((r) => r.body).join('\n');
  let score = 85;
  const aiHits = aiPhraseCount(interviewText);
  score -= aiHits * 12;
  if (applicationText) {
    const appTokens = applicationText.toLowerCase().slice(0, 500);
    const overlap = interviewText.toLowerCase().includes(appTokens.slice(0, 80)) ? 10 : 0;
    score += Math.min(10, overlap);
  }
  const avgLen = responses.reduce((s, r) => s + wordCount(r.body), 0) / Math.max(responses.length, 1);
  if (avgLen > 0 && avgLen < 20) score -= 15;
  return Math.max(0, Math.min(100, score));
}

function communicationScore(responses) {
  if (!responses?.length) return 40;
  const avg = responses.reduce((s, r) => s + wordCount(r.body), 0) / responses.length;
  let s = 55;
  if (avg >= 40 && avg <= 180) s += 30;
  else if (avg >= 25) s += 15;
  const structured = responses.some((r) => /\n|•|first|second|then/i.test(r.body || ''));
  if (structured) s += 15;
  return Math.min(100, s);
}

function bucketFor(overall, green = 80, amber = 60) {
  if (overall >= green) return 'Green';
  if (overall >= amber) return 'Amber';
  return 'Red';
}

export function scoreInterview({ responses, jobTitle, applicationText, greenThreshold = 80, amberThreshold = 60 }) {
  const depth = depthScore(responses);
  const relevance = relevanceScore(responses, jobTitle);
  const genuineness = genuinenessScore(responses, applicationText);
  const communication = communicationScore(responses);

  const overall = Math.round(depth * 0.3 + relevance * 0.25 + genuineness * 0.3 + communication * 0.15);
  const bucket = bucketFor(overall, greenThreshold, amberThreshold);

  const combinedText = responses.map((r) => r.body).join('\n');
  const aiHits = aiPhraseCount(combinedText);
  const authenticity = analyzeIntegrity(
    { paste_attempts: 0, focus_loss_count: 0, fields: {} },
    [combinedText]
  );
  let authScore = genuineness;
  if (aiHits >= 2) authScore = Math.max(0, authScore - 20);

  let explanation = '';
  if (bucket === 'Green') {
    explanation =
      'Interview responses show depth, role relevance, and natural delivery. Candidate appears consistent with application materials.';
  } else if (bucket === 'Amber') {
    explanation =
      'Mixed interview performance, some answers lack depth or sound rehearsed. Recommend debrief with hiring team before final decision.';
  } else {
    explanation =
      'Interview answers were thin, off-topic, or showed AI-like phrasing. Human review required; compare with application score before deciding.';
  }

  return {
    overall,
    bucket,
    depth,
    relevance,
    genuineness,
    communication,
    authenticity_score: authScore,
    authenticity_verdict:
      authScore >= 75
        ? 'Likely genuine in interview'
        : authScore >= 50
          ? 'Review interview authenticity'
          : 'High risk, rehearsed or AI-assisted responses',
    ai_phrase_flags: aiHits,
    explanation,
    breakdown: [
      { dimension: 'Depth & examples', score: depth, weight: '30%' },
      { dimension: 'Role relevance', score: relevance, weight: '25%' },
      { dimension: 'Genuineness', score: genuineness, weight: '30%' },
      { dimension: 'Communication', score: communication, weight: '15%' },
    ],
  };
}
