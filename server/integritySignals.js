/**
 * Structured integrity / session signals for recruiter review.
 */

function levelFromScore(score) {
  if (score >= 85) return { level: 'ok', label: 'Clean session' };
  if (score >= 65) return { level: 'warn', label: 'Minor flags' };
  return { level: 'risk', label: 'Review required' };
}

export function buildIntegritySignals(integrity, appRow = {}) {
  const auth = appRow.authenticity_score ?? integrity?.authenticity_score;
  const paste = integrity?.paste_attempts ?? 0;
  const copy = integrity?.copy_attempts ?? 0;
  const tabs = integrity?.focus_loss_count ?? 0;
  const devtools = integrity?.devtools_detected_count ?? 0;
  const fullscreenExit = integrity?.fullscreen_exit_count ?? 0;
  const outside = integrity?.outside_boundary_clicks ?? 0;
  const camera = integrity?.camera_presence;
  const flags = integrity?.flags || [];
  const proctorFailed = integrity?.proctoring_failed || appRow.proctoring_failed;
  const aiUsed = appRow.screening_status === 'ai_used';

  let score = auth != null ? auth : 100;
  if (paste > 2) score -= 8;
  if (copy > 2) score -= 6;
  if (tabs >= 3) score -= 12;
  if (devtools > 0) score -= 15;
  if (proctorFailed) score -= 25;
  if (aiUsed) score -= 20;
  score = Math.max(0, Math.min(100, score));

  const signals = [];

  signals.push({
    id: 'authenticity',
    label: 'Session authenticity',
    value: auth != null ? `${auth}/100` : '—',
    status: auth == null ? 'review' : auth >= 75 ? 'pass' : auth >= 50 ? 'warn' : 'fail',
    detail: integrity?.authenticity_verdict || appRow.authenticity_verdict || 'No session data',
  });

  if (tabs > 0) {
    signals.push({
      id: 'focus',
      label: 'Tab / window switches',
      value: String(tabs),
      status: tabs >= 3 ? 'fail' : tabs >= 1 ? 'warn' : 'pass',
      detail: tabs >= 3 ? 'Frequent focus loss — possible external lookup' : 'Tracked for context only',
    });
  }

  if (paste > 0 || copy > 0) {
    signals.push({
      id: 'clipboard',
      label: 'Clipboard activity',
      value: `${paste} paste · ${copy} copy`,
      status: paste + copy >= 3 ? 'warn' : 'review',
      detail: 'Paste/copy attempts logged during screening',
    });
  }

  if (camera?.presence_pct != null) {
    signals.push({
      id: 'camera',
      label: 'Camera presence',
      value: `${camera.presence_pct}%`,
      status: camera.presence_pct >= 80 ? 'pass' : camera.presence_pct >= 50 ? 'warn' : 'fail',
      detail:
        camera.look_away_samples > 0
          ? `${camera.look_away_samples} look-away signal(s) — no video stored`
          : 'Face presence verified — no video stored',
    });
  }

  if (integrity?.total_time_seconds != null) {
    signals.push({
      id: 'duration',
      label: 'Time on application',
      value: `${Math.round(integrity.total_time_seconds / 60)}m`,
      status: 'pass',
      detail: 'Total active screening duration',
    });
  }

  if (aiUsed) {
    signals.push({
      id: 'ai_used',
      label: 'AI assistance',
      value: 'Flagged',
      status: 'fail',
      detail: 'Response patterns suggest AI-generated content',
    });
  }

  for (const f of flags.slice(0, 6)) {
    signals.push({
      id: `flag_${f}`,
      label: 'Integrity flag',
      value: f,
      status: 'warn',
      detail: 'Automated integrity signal',
    });
  }

  if (proctorFailed) {
    signals.push({
      id: 'proctor_fail',
      label: 'Proctoring',
      value: 'Failed',
      status: 'fail',
      detail: integrity?.proctoring_verdict || 'Session policy violation',
    });
  }

  const { level, label } = levelFromScore(score);

  return {
    score,
    level,
    label,
    signals,
    summary:
      level === 'ok'
        ? 'Session integrity supports trusting the submitted answers.'
        : level === 'warn'
          ? 'Minor integrity signals — review alongside answer quality.'
          : 'Significant integrity concerns — verify before advancing.',
  };
}
