const AI_PHRASES = [
  'furthermore',
  'moreover',
  'in conclusion',
  "it's worth noting",
  'it is worth noting',
  'delve',
  'landscape',
  'leverage',
  'robust',
  'streamline',
  'synergy',
  'holistic',
  'paradigm',
  'utilize',
  'facilitate',
  'comprehensive approach',
  'in today\'s',
  'i am excited to',
  'i believe i would be',
  'perfect fit',
  'dynamic environment',
];

export function analyzeIntegrity(integrityData, answerBodies = []) {
  if (!integrityData) {
    return {
      authenticity_score: null,
      authenticity_verdict: 'No session data',
      flags: [],
    };
  }

  const flags = [];
  let score = 100;

  const pasteAttempts = integrityData.paste_attempts || 0;
  const focusLoss = integrityData.focus_loss_count || 0;
  const hiddenTime = integrityData.hidden_time_seconds || 0;
  const totalTime = Math.max(integrityData.total_time_seconds || 1, 1);

  if (pasteAttempts > 0) {
    flags.push(`${pasteAttempts} paste attempt(s) blocked`);
    score -= Math.min(40, pasteAttempts * 20);
  }

  if (focusLoss >= 3) {
    flags.push(`${focusLoss} tab/window switches during application`);
    score -= Math.min(25, (focusLoss - 2) * 4);
  }

  if (hiddenTime / totalTime > 0.35) {
    flags.push(`Away from form ${Math.round((hiddenTime / totalTime) * 100)}% of session time`);
    score -= 15;
  }

  if (totalTime < 60 && answerBodies.join(' ').length > 400) {
    flags.push('Long answers completed very quickly');
    score -= 20;
  }

  for (const [fieldId, field] of Object.entries(integrityData.fields || {})) {
    const chars = field.chars_final || 0;
    const keys = field.keystrokes || 0;
    if (chars > 40 && keys < chars * 0.6) {
      flags.push(`Answer field ${fieldId}: keystrokes do not match typed length`);
      score -= 15;
    }
    if (field.paste_blocked > 0) {
      score -= field.paste_blocked * 10;
    }
    const focusSec = field.focus_seconds || 0;
    if (chars > 80 && focusSec < 15) {
      flags.push(`Answer field ${fieldId}: very fast completion`);
      score -= 10;
    }
  }

  const combined = answerBodies.join(' ').toLowerCase();
  const phraseHits = AI_PHRASES.filter((p) => combined.includes(p));
  if (phraseHits.length >= 2) {
    flags.push(`AI-style phrasing detected (${phraseHits.length} signals)`);
    score -= Math.min(25, phraseHits.length * 8);
  }

  if (integrityData.right_click_attempts > 2) {
    flags.push('Repeated right-click attempts on answer fields');
    score -= 10;
  }

  if (integrityData.proctoring_score != null) {
    score = Math.round((score + integrityData.proctoring_score) / 2);
    if (integrityData.proctoring_failed) {
      flags.push('Proctoring session failed integrity requirements');
      score = Math.min(score, 40);
    }
    (integrityData.proctoring_flags || []).forEach((f) => flags.push(f));
  }

  if (integrityData.keystroke_anomaly) {
    flags.push('Keystroke dynamics inconsistent with manual typing');
    score -= 15;
  }

  const cam = integrityData.camera_presence;
  if (cam) {
    if (cam.consent_denied) {
      flags.push('Camera presence monitoring was declined');
      score -= 25;
    } else if (cam.consent_granted) {
      if (cam.presence_pct != null && cam.presence_pct < 55) {
        flags.push(`Low on-camera presence (${cam.presence_pct}% of samples)`);
        score -= 20;
      }
      if (cam.look_away_samples >= 5) {
        flags.push('Repeated looking away from screen during screening');
        score -= 15;
      }
      if (cam.multiple_face_samples >= 2) {
        flags.push('Multiple faces detected during screening');
        score -= 25;
      }
      if (cam.face_absent_samples >= 4) {
        flags.push('Candidate left camera frame during screening');
        score -= 20;
      }
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let verdict = 'Likely genuine, typed answers with normal session behavior';
  if (score < 50) verdict = 'High risk, possible external AI assistance';
  else if (score < 75) verdict = 'Review needed, suspicious session patterns';

  return {
    authenticity_score: score,
    authenticity_verdict: verdict,
    flags: [...new Set(flags)],
  };
}
