/**
 * Detect non-answers: keyboard mash, symbol spam, random digits, no real words.
 * Used by rubric + intelligence scoring before any points are awarded.
 */

const MEDIA_PLACEHOLDER = /^\[(audio|video).*recorded/i;

function meaningfulWordCount(text) {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  return words.filter((w) => {
    const letters = w.replace(/[^a-zA-Z']/g, '');
    if (letters.length < 2) return false;
    return /[aeiouAEIOU]/.test(letters);
  }).length;
}

function vowelRatio(text) {
  const letters = (text.match(/[a-zA-Z]/g) || []).length;
  if (!letters) return 0;
  return (text.match(/[aeiouAEIOU]/g) || []).length / letters;
}

function looksLikeSymbolOrDigitSpam(text) {
  const compact = text.replace(/\s/g, '');
  if (compact.length < 8) return false;
  const nonAlnum = compact.replace(/[a-zA-Z0-9]/g, '').length;
  if (nonAlnum / compact.length > 0.12) return true;
  const digits = (compact.match(/\d/g) || []).length;
  if (digits / compact.length > 0.35 && meaningfulWordCount(text) < 2) return true;
  return false;
}

function looksLikeKeyboardMash(text) {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const letters = token.replace(/[^a-zA-Z]/g, '');
    if (letters.length < 10) continue;
    if (vowelRatio(letters) < 0.22) return true;
    if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(letters)) return true;
  }
  if (tokens.length <= 2 && text.replace(/\s/g, '').length >= 18 && meaningfulWordCount(text) < 2) {
    return true;
  }
  return false;
}

function hasSentenceStructure(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 4 && meaningfulWordCount(text) >= 3) return true;
  if (/[.!?]\s+[A-Z]/.test(text)) return true;
  return false;
}

/**
 * @returns {{ valid: boolean, reason: string, meaningful_words: number }}
 */
export function analyzeAnswerQuality(text) {
  const t = (text || '').trim();

  if (!t) return { valid: false, reason: 'empty', meaningful_words: 0 };
  if (MEDIA_PLACEHOLDER.test(t)) return { valid: true, reason: 'media', meaningful_words: 0 };
  if (t.length < 8) return { valid: false, reason: 'too_short', meaningful_words: 0 };

  const meaningful = meaningfulWordCount(t);

  if (/(.)\1{6,}/.test(t)) {
    return { valid: false, reason: 'repeated_characters', meaningful_words: meaningful };
  }

  if (looksLikeSymbolOrDigitSpam(t)) {
    return { valid: false, reason: 'symbol_or_digit_spam', meaningful_words: meaningful };
  }

  if (looksLikeKeyboardMash(t)) {
    return { valid: false, reason: 'keyboard_mash', meaningful_words: meaningful };
  }

  if (meaningful === 0) {
    return { valid: false, reason: 'no_meaningful_words', meaningful_words: 0 };
  }

  if (meaningful < 2 && !hasSentenceStructure(t)) {
    return { valid: false, reason: 'insufficient_substance', meaningful_words: meaningful };
  }

  return { valid: true, reason: 'ok', meaningful_words: meaningful };
}

export function isSubstantiveAnswer(text) {
  return analyzeAnswerQuality(text).valid;
}

export function zeroScoreReason(text) {
  const q = analyzeAnswerQuality(text);
  if (q.valid) return null;
  const labels = {
    empty: 'No answer provided',
    too_short: 'Answer too short to evaluate',
    repeated_characters: 'Repeated-character spam detected',
    symbol_or_digit_spam: 'Non-substantive symbols or digits only',
    keyboard_mash: 'Random or keyboard-mash text detected',
    no_meaningful_words: 'No recognizable words in answer',
    insufficient_substance: 'Answer lacks enough meaningful content',
  };
  return labels[q.reason] || 'Answer lacks meaningful content';
}
