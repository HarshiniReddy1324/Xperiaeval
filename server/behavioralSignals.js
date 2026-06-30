/**
 * Keystroke + behavioral signals for recruiter UI, derived from proctoring session data.
 */

function clamp(n, lo = 0, hi = 100) {
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function statusFromScore(score) {
  if (score >= 80) return 'pass';
  if (score >= 60) return 'warn';
  return 'fail';
}

function typingSpeedWpm(keystrokes, seconds, chars) {
  if (!seconds || seconds < 5) return null;
  const words = (chars || keystrokes / 5) / 5;
  return Math.round((words / seconds) * 60);
}

function intervalVariance(intervals = []) {
  if (intervals.length < 8) return null;
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((s, v) => s + (v - avg) ** 2, 0) / intervals.length;
  return Math.round(Math.sqrt(variance));
}

function intervalAvg(intervals = []) {
  if (!intervals.length) return null;
  return Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
}

function rhythmScore(intervals = []) {
  const std = intervalVariance(intervals);
  const avg = intervalAvg(intervals);
  if (std == null || avg == null) return null;
  if (std < 10 && intervals.length > 12) return 25;
  if (std < 18) return 55;
  return Math.min(100, 60 + Math.min(40, std));
}

/**
 * Build behavioral signals panel payload from integrity JSON + intelligence behavioral block.
 * @param {object} [opts]
 * @param {Record<string, string>} [opts.fieldLabels] - category_id → question label
 */
export function buildBehavioralSignals(integrity = {}, behavioral = {}, appRow = {}, opts = {}) {
  const fieldLabels = opts.fieldLabels || {};
  const fields = integrity?.fields || {};
  const perQuestion = behavioral?.per_question || [];
  const signals = [];
  let score = 92;

  const totalKeystrokes = Object.values(fields).reduce((s, f) => s + (f.keystrokes || 0), 0) || behavioral?.total_keystrokes || 0;

  const questionRows = [];

  if (totalKeystrokes > 0 || Object.keys(fields).length > 0) {
    let totalKeys = 0;
    let totalChars = 0;
    let totalFocusSec = 0;
    let anomalyFields = 0;

    for (const [fieldId, f] of Object.entries(fields)) {
      const keys = f.keystrokes || 0;
      const chars = f.chars_final || 0;
      const focusSec = f.focus_seconds || 0;
      const intervals = f.key_intervals_ms || [];
      totalKeys += keys;
      totalChars += chars;
      totalFocusSec += focusSec;

      let fieldAnomaly = false;
      if (chars > 50 && keys < chars * 0.45) fieldAnomaly = true;
      const std = intervalVariance(intervals);
      if (std != null && std < 8 && intervals.length > 12) fieldAnomaly = true;
      if (fieldAnomaly) anomalyFields += 1;

      const pq = perQuestion.find((p) => p.category_id === fieldId);
      const wpm = typingSpeedWpm(keys, pq?.time_taken_seconds || focusSec, chars);
      const avgMs = intervalAvg(intervals);
      const rhythm = rhythmScore(intervals);
      const keyRatio = chars > 0 ? Math.round((keys / chars) * 100) : null;
      questionRows.push({
        field_id: fieldId,
        label: fieldLabels[fieldId] || `Question ${questionRows.length + 1}`,
        keystrokes: keys,
        chars,
        key_ratio_pct: keyRatio,
        focus_seconds: focusSec,
        paste_blocked: f.paste_blocked || 0,
        typing_wpm: wpm,
        interval_avg_ms: avgMs,
        interval_std_ms: std,
        rhythm_score: rhythm,
        rhythm_bars: intervals.slice(0, 24).map((ms) => Math.min(100, Math.round((ms / 220) * 100))),
        keystroke_anomaly: fieldAnomaly,
        idle_seconds: pq?.idle_seconds || 0,
      });
    }

    const avgWpm =
      questionRows.filter((q) => q.typing_wpm).reduce((s, q) => s + q.typing_wpm, 0) /
        Math.max(1, questionRows.filter((q) => q.typing_wpm).length) || null;

    signals.push({
      id: 'keystroke_volume',
      label: 'Keystroke dynamics',
      value: `${totalKeys} keystrokes · ${totalChars} chars`,
      status: anomalyFields > 0 ? 'warn' : 'pass',
      detail:
        anomalyFields > 0
          ? `${anomalyFields} field(s) show paste-like or bot-like timing, review answer authenticity`
          : 'Natural typing rhythm across screening fields',
    });

    if (avgWpm != null) {
      const wpmStatus = avgWpm > 120 || avgWpm < 12 ? 'warn' : 'pass';
      signals.push({
        id: 'typing_speed',
        label: 'Typing speed',
        value: `~${avgWpm} WPM avg`,
        status: wpmStatus,
        detail: wpmStatus === 'warn' ? 'Unusually fast or slow, may indicate dictation or paste' : 'Within typical human range',
      });
      if (wpmStatus === 'warn') score -= 8;
    }

    if (anomalyFields > 0) score -= Math.min(20, anomalyFields * 8);

    if (integrity?.keystroke_anomaly) {
      signals.push({
        id: 'session_keystroke_anomaly',
        label: 'Session keystroke anomaly',
        value: 'Detected',
        status: 'fail',
        detail: 'Uniform inter-key intervals or low keystroke-to-character ratio',
      });
      score -= 15;
    }
  } else {
    signals.push({
      id: 'keystroke_volume',
      label: 'Keystroke dynamics',
      value: 'Not captured',
      status: 'review',
      detail: 'Proctoring keystroke tracking was off or applicant used audio/video only',
    });
    score -= 5;
  }

  const tabSwitches = integrity?.focus_loss_count ?? behavioral?.tab_switches ?? 0;
  if (tabSwitches > 0) {
    signals.push({
      id: 'focus_switches',
      label: 'Focus / tab switches',
      value: String(tabSwitches),
      status: tabSwitches >= 5 ? 'warn' : 'review',
      detail: `${integrity?.hidden_time_seconds || 0}s away from form, context only; not auto-reject`,
    });
    if (tabSwitches >= 5) score -= 6;
  }

  const paste = integrity?.paste_attempts ?? behavioral?.paste_events ?? 0;
  if (paste > 0) {
    signals.push({
      id: 'paste_events',
      label: 'Paste attempts',
      value: String(paste),
      status: paste >= 2 ? 'fail' : 'warn',
      detail: 'Blocked paste events during typed answers',
    });
    score -= Math.min(12, paste * 4);
  }

  const env = integrity?.environment;
  if (env) {
    if (env.vm_suspected) {
      signals.push({
        id: 'vm_heuristic',
        label: 'Virtual machine heuristic',
        value: 'Suspected',
        status: 'warn',
        detail: env.vm_reasons?.join('; ') || 'Automation or VM-like browser fingerprint',
      });
      score -= 10;
    }
    if (env.multi_monitor_suspected || env.unusual_display) {
      signals.push({
        id: 'display_env',
        label: 'Display environment',
        value: env.multi_monitor_suspected ? 'Multi-monitor suspected' : 'Unusual display',
        status: 'review',
        detail: `${env.screen_width}×${env.screen_height} screen · window ${env.window_width}×${env.window_height}`,
      });
    }
  }

  const gaze = integrity?.camera_presence;
  if (gaze?.gaze_tracking) {
    const gt = gaze.gaze_tracking;
    signals.push({
      id: 'gaze_tracking',
      label: 'Gaze / attention tracking',
      value: `${gt.attention_score ?? 'N/A'}% attention`,
      status: (gt.attention_score ?? 100) >= 75 ? 'pass' : (gt.attention_score ?? 0) >= 50 ? 'warn' : 'fail',
      detail: `${gt.look_away_pct ?? 0}% look-away · ${gt.off_center_pct ?? 0}% off-center, no video stored`,
    });
    if ((gt.attention_score ?? 100) < 60) score -= 8;
  }

  if (integrity?.multi_voice?.risk === 'high') {
    signals.push({
      id: 'multi_voice',
      label: 'Multi-voice detection',
      value: 'High risk',
      status: 'fail',
      detail: integrity.multi_voice.detail || 'Secondary voice patterns in audio response',
    });
    score -= 18;
  } else if (integrity?.multi_voice?.risk === 'medium') {
    signals.push({
      id: 'multi_voice',
      label: 'Multi-voice detection',
      value: 'Review',
      status: 'warn',
      detail: integrity.multi_voice.detail || 'Possible coaching or background speaker',
    });
    score -= 8;
  }

  score = clamp(score);

  const fieldOrder = opts.fieldOrder || [];
  if (fieldOrder.length && questionRows.length) {
    questionRows.sort(
      (a, b) => fieldOrder.indexOf(a.field_id) - fieldOrder.indexOf(b.field_id) || 0
    );
  }

  return {
    score,
    level: score >= 85 ? 'ok' : score >= 65 ? 'warn' : 'risk',
    label: score >= 85 ? 'Natural behavior' : score >= 65 ? 'Minor anomalies' : 'Review typing session',
    summary:
      score >= 85
        ? 'Keystroke and session behavior support authentic self-authored answers.'
        : score >= 65
          ? 'Some behavioral anomalies, correlate with answer quality and integrity flags.'
          : 'Significant behavioral signals, verify authorship before advancing.',
    signals,
    per_question: questionRows || [],
    metrics: {
      total_keystrokes: behavioral?.total_keystrokes,
      tab_switches: tabSwitches,
      paste_events: paste,
      hidden_time_pct: behavioral?.hidden_time_pct,
    },
  };
}
