/** Proctoring policy defaults and server-side evaluation of apply-session signals. */

export const DEFAULT_PROCTORING_POLICY = {
  enabled: true,
  mode: 'strict', // monitor | strict | fail
  block_copy_paste: true,
  block_selection: true,
  block_right_click: true,
  block_shortcuts: true,
  require_fullscreen: true,
  track_focus: true,
  fail_on_focus_loss: false,
  focus_loss_fail_threshold: 8,
  outside_boundary_fail: true,
  track_devtools: true,
  track_multi_monitor: true,
  no_backtrack: true,
  shuffle_questions: true,
  per_question_timer: false,
  keystroke_dynamics: true,
  track_ip_duplicates: true,
  ip_duplicate_window_hours: 24,
  audio_monitoring: false,
  camera_presence_monitoring: false,
};

export function parseProctoringPolicy(org) {
  if (!org) return { ...DEFAULT_PROCTORING_POLICY };
  let parsed = {};
  try {
    parsed = org.proctoring_policy_json ? JSON.parse(org.proctoring_policy_json) : {};
  } catch {
    parsed = {};
  }
  const legacyOn = org.track_session_integrity !== 0 && org.track_session_integrity !== false;
  const enabled = parsed.enabled !== undefined ? !!parsed.enabled : legacyOn;
  return { ...DEFAULT_PROCTORING_POLICY, ...parsed, enabled };
}

export function analyzeProctoring(proctoringData, policy = DEFAULT_PROCTORING_POLICY) {
  if (!proctoringData || !policy.enabled) {
    return {
      proctoring_score: 100,
      proctoring_verdict: 'Proctoring disabled',
      flags: [],
      critical_count: 0,
      failed: false,
    };
  }

  const flags = [];
  let score = 100;
  let critical = 0;

  const add = (msg, pts = 10, isCritical = false) => {
    flags.push(msg);
    score -= pts;
    if (isCritical) critical += 1;
  };

  const p = proctoringData;

  if ((p.paste_attempts || 0) > 0) add(`${p.paste_attempts} copy/paste attempt(s) blocked`, 15, p.paste_attempts >= 3);
  if ((p.copy_attempts || 0) > 0) add(`${p.copy_attempts} copy attempt(s)`, 8);
  if ((p.cut_attempts || 0) > 0) add(`${p.cut_attempts} cut attempt(s)`, 8);
  if ((p.selection_attempts || 0) > 0) add(`${p.selection_attempts} text selection attempt(s)`, 5);
  if ((p.right_click_attempts || 0) > 0) add(`${p.right_click_attempts} right-click attempt(s)`, 8, p.right_click_attempts >= 5);
  if ((p.shortcut_blocked_count || 0) > 0) add(`${p.shortcut_blocked_count} blocked shortcut(s)`, 12, p.shortcut_blocked_count >= 3);
  if ((p.print_screen_attempts || 0) > 0) add(`${p.print_screen_attempts} screenshot/print key attempt(s)`, 15, true);
  if ((p.devtools_detected_count || 0) > 0) add('Developer tools may have been opened', 25, true);
  if (p.multi_monitor_suspected) add('Multiple displays detected', 12, true);
  if ((p.fullscreen_exit_count || 0) > 0) add(`${p.fullscreen_exit_count} fullscreen exit(s)`, 20, true);
  if (!p.fullscreen_entered && policy.require_fullscreen) add('Fullscreen was not entered', 15, policy.mode === 'fail');

  const focusLoss = p.focus_loss_count || 0;
  const hiddenSec = p.hidden_time_seconds || 0;
  const totalSec = Math.max(p.total_time_seconds || 1, 1);
  if (focusLoss >= 3) add(`${focusLoss} tab/window blur events`, Math.min(20, focusLoss * 2), focusLoss >= policy.focus_loss_fail_threshold);
  if (hiddenSec / totalSec > 0.25) add(`Away from test ${Math.round((hiddenSec / totalSec) * 100)}% of session`, 15, hiddenSec / totalSec > 0.5);
  if ((p.outside_boundary_clicks || 0) > 0) {
    add(`${p.outside_boundary_clicks} click(s) outside test area`, 15, policy.outside_boundary_fail && p.outside_boundary_clicks >= 2);
  }
  if ((p.new_window_attempts || 0) > 0) add(`${p.new_window_attempts} new window/tab open attempt(s)`, 20, true);

  if (p.keystroke_anomaly) add('Keystroke pattern inconsistent with manual typing', 20, true);
  if ((p.audio_anomaly_score || 0) > 60) add('Background audio anomalies during recording', 15);

  if (p.ip_duplicate) add('Same IP submitted another application recently', 10, policy.mode === 'fail');

  if (p.auto_failed) {
    add(p.auto_fail_reason || 'Automatic proctoring fail', 50, true);
    critical += 1;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let failed = false;
  if (policy.mode === 'fail') {
    failed =
      critical >= 1 ||
      p.auto_failed === true ||
      (policy.fail_on_focus_loss && focusLoss >= policy.focus_loss_fail_threshold);
  } else if (policy.mode === 'strict') {
    failed = p.auto_failed === true;
  }

  let verdict = 'Session within proctoring guidelines';
  if (failed) verdict = 'Proctoring violation — session failed integrity requirements';
  else if (score < 50) verdict = 'High-risk proctoring signals';
  else if (score < 75) verdict = 'Review proctoring log';

  return {
    proctoring_score: score,
    proctoring_verdict: verdict,
    flags: [...new Set(flags)],
    critical_count: critical,
    failed,
  };
}

export function shouldRejectSubmission(proctoringResult, policy) {
  if (!policy?.enabled) return null;
  if (proctoringResult.failed) {
    return 'Unable to submit your application. Please refresh and try again.';
  }
  return null;
}

export function normalizeIntegrityPayload(integrity, appRow = {}) {
  if (!integrity) return null;
  const out = { ...integrity };
  if (integrity.proctoring) {
    out.proctoring_score = integrity.proctoring.proctoring_score;
    out.proctoring_verdict = integrity.proctoring.proctoring_verdict;
    out.proctoring_failed = integrity.proctoring.failed;
    out.proctoring_flags = integrity.proctoring.flags;
  }
  if (appRow.proctoring_failed) out.proctoring_failed = true;
  if (appRow.proctoring_score != null) out.proctoring_score = appRow.proctoring_score;
  if (appRow.authenticity_score != null) out.authenticity_score = appRow.authenticity_score;
  if (appRow.authenticity_verdict) out.authenticity_verdict = appRow.authenticity_verdict;
  return out;
}

export function checkIpDuplicate(db, jobId, ip, windowHours = 24) {
  if (!ip || ip === '::1' || ip === '127.0.0.1') return false;
  const row = db
    .prepare(
      `SELECT COUNT(*) as c FROM applications
       WHERE job_id = ? AND submitter_ip = ? AND (deleted_at IS NULL OR deleted_at = '')
       AND created_at > datetime('now', ?)`
    )
    .get(jobId, ip, `-${windowHours} hours`);
  return (row?.c || 0) > 0;
}
