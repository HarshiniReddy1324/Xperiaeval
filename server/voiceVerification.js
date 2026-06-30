import { createHash } from 'crypto';

/** Demo voice fingerprint; not production biometrics; stores hash of audio buffer metadata. */
export function fingerprintAudio(buffer, mimeType = 'audio/webm') {
  if (!buffer || !buffer.length) return null;
  const hash = createHash('sha256')
    .update(Buffer.from(buffer))
    .update(mimeType)
    .digest('hex')
    .slice(0, 32);
  return { fingerprint: hash, sample_bytes: buffer.length, mime_type: mimeType };
}

export function compareFingerprints(a, b) {
  if (!a || !b) return { match_score: 0, verdict: 'No voice sample on file' };
  const hashA = typeof a === 'string' ? a : a.fingerprint;
  const hashB = typeof b === 'string' ? b : b.fingerprint;
  if (hashA === hashB) return { match_score: 100, verdict: 'Voice pattern match' };
  const lenDiff = Math.abs((a.sample_bytes || 0) - (b.sample_bytes || 0));
  const hashPrefixMatch = hashA?.slice(0, 8) === hashB?.slice(0, 8);
  let score = hashPrefixMatch ? 72 : 45;
  if (lenDiff > 50000) score -= 20;
  score = Math.max(0, Math.min(100, score));
  return {
    match_score: score,
    verdict:
      score >= 80
        ? 'Likely same speaker'
        : score >= 55
          ? 'Review recommended, voice variance detected'
          : 'Potential mismatch, possible proxy interview',
  };
}

export function fingerprintFromStored(storedJson) {
  if (!storedJson) return null;
  try {
    return typeof storedJson === 'string' ? JSON.parse(storedJson) : storedJson;
  } catch {
    return null;
  }
}
