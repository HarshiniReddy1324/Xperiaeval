import React from 'react';

const TOGGLES = [
  { key: 'enabled', label: 'Enable proctoring on apply form' },
  { key: 'block_copy_paste', label: 'Block copy, cut, and paste' },
  { key: 'block_selection', label: 'Block text selection / highlight' },
  { key: 'block_right_click', label: 'Disable right-click (context menu)' },
  { key: 'block_shortcuts', label: 'Block shortcuts (Ctrl+C, F12, PrintScreen, etc.)' },
  { key: 'require_fullscreen', label: 'Require fullscreen during questions' },
  { key: 'track_focus', label: 'Track blur, focus loss, and tab switches' },
  { key: 'fail_on_focus_loss', label: 'Auto-fail after too many tab switches (fail mode)' },
  { key: 'outside_boundary_fail', label: 'Fail if clicking outside test area repeatedly' },
  { key: 'no_backtrack', label: 'No backtrack: cannot return to previous questions' },
  { key: 'shuffle_questions', label: 'Shuffle question order per candidate' },
  { key: 'keystroke_dynamics', label: 'Keystroke dynamics: flag non-human typing patterns' },
  { key: 'track_ip_duplicates', label: 'Flag duplicate submissions from same IP' },
  {
    key: 'track_devtools',
    label: 'Detect developer tools',
    comingSoon: true,
    hint: 'Heuristic detection only: not reliable enough to ship yet.',
  },
  {
    key: 'track_multi_monitor',
    label: 'Detect multiple monitors (when browser allows)',
    comingSoon: true,
    hint: 'Depends on browser APIs; coverage is limited today.',
  },
  {
    key: 'per_question_timer',
    label: 'Enforce per-question time limits from rubric',
    comingSoon: true,
    hint: 'We record time today; auto-enforce limits is not wired yet.',
  },
  {
    key: 'audio_monitoring',
    label: 'Audio level monitoring during recording',
    comingSoon: true,
    hint: 'No client audio capture yet.',
  },
  {
    key: 'camera_presence_monitoring',
    label: 'Camera presence & gaze monitoring (no video stored)',
    comingSoon: true,
    hint: 'Experimental FaceDetector support: Chrome only, off until we finish rollout.',
  },
];

export function mergeProctoringPolicy(raw) {
  const defaults = {
    enabled: true,
    mode: 'strict',
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
    per_question_timer: true,
    keystroke_dynamics: true,
    track_ip_duplicates: true,
    ip_duplicate_window_hours: 24,
    audio_monitoring: false,
    camera_presence_monitoring: false,
  };
  if (!raw) return defaults;
  if (typeof raw === 'string') {
    try {
      return { ...defaults, ...JSON.parse(raw) };
    } catch {
      return defaults;
    }
  }
  return { ...defaults, ...raw };
}

export function ProctoringSettingsEditor({ policy, onChange }) {
  const set = (key, val) => onChange({ ...policy, [key]: val });

  return (
    <div className="proctorSettings">
      <label className="proctorMode">
        Enforcement mode
        <select value={policy.mode || 'strict'} onChange={(e) => set('mode', e.target.value)}>
          <option value="monitor">Monitor only: log signals, always accept submit</option>
          <option value="strict">Strict: heavy penalties + fail on critical violations</option>
          <option value="fail">Fail: reject submission on critical proctoring violations</option>
        </select>
      </label>
      <p className="muted">
        Browsers cannot block OS shortcuts (Alt+Tab) globally: we detect and flag them. Full enforcement works for
        copy/paste, selection, right-click, fullscreen, and in-page boundaries.
      </p>
      <div className="proctorToggleGrid">
        {TOGGLES.map(({ key, label, comingSoon, hint }) => (
          <label
            key={key}
            className={`checkRow${comingSoon ? ' checkRow--comingSoon' : ''}`}
            title={hint || undefined}
          >
            <input
              type="checkbox"
              checked={!!policy[key]}
              disabled={comingSoon}
              onChange={(e) => set(key, e.target.checked)}
            />
            <span className="checkRowText">
              {label}
              {comingSoon && <span className="proctorComingSoonBadge">Coming soon</span>}
            </span>
          </label>
        ))}
      </div>
      <label className="proctorMode">
        Tab-switch fail threshold
        <input
          type="number"
          min={3}
          max={20}
          value={policy.focus_loss_fail_threshold ?? 8}
          onChange={(e) => set('focus_loss_fail_threshold', Number(e.target.value))}
        />
      </label>
    </div>
  );
}
