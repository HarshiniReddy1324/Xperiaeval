/**
 * Multi-voice heuristic for audio answers, coaching / secondary speaker detection.
 * Browser may pass client-side audio analysis; server applies transcript heuristics.
 */

const COACHING_PATTERNS = [
  /\b(as (?:he|she|they) said|my colleague|my coach|read this|say something like)\b/i,
  /\b(speaker\s*[12]|person\s*[12])\b/i,
  /\?\s*yes\.?\s*okay/i,
];

/**
 * @param {object} opts
 * @param {string} [opts.transcript]
 * @param {object} [opts.clientAnalysis]
 */
export function analyzeMultiVoice({ transcript = '', clientAnalysis = null }) {
  if (clientAnalysis?.secondary_voice_peaks >= 3) {
    return {
      risk: 'high',
      confidence: Math.min(95, 60 + clientAnalysis.secondary_voice_peaks * 8),
      detail: `${clientAnalysis.secondary_voice_peaks} secondary voice activity peaks during recording`,
      method: 'client_audio',
    };
  }

  if (clientAnalysis?.secondary_voice_peaks >= 1) {
    return {
      risk: 'medium',
      confidence: 55,
      detail: 'Possible background speaker during audio response',
      method: 'client_audio',
    };
  }

  const t = transcript || '';
  for (const p of COACHING_PATTERNS) {
    if (p.test(t)) {
      return {
        risk: 'medium',
        confidence: 50,
        detail: 'Transcript contains coaching or multi-party dialogue patterns',
        method: 'transcript',
      };
    }
  }

  return { risk: 'low', confidence: 85, detail: 'No multi-voice signals detected', method: 'none' };
}
