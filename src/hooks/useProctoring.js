import { useCallback, useEffect, useRef, useState } from 'react';

const BLOCKED_SHORTCUTS = [
  { key: 'F12', label: 'DevTools' },
  { key: 'PrintScreen', label: 'PrintScreen' },
  { key: 'c', ctrl: true, label: 'Copy' },
  { key: 'v', ctrl: true, label: 'Paste' },
  { key: 'x', ctrl: true, label: 'Cut' },
  { key: 'a', ctrl: true, label: 'Select all' },
  { key: 'u', ctrl: true, label: 'View source' },
  { key: 's', ctrl: true, label: 'Save' },
  { key: 'p', ctrl: true, label: 'Print' },
  { key: 'i', ctrl: true, shift: true, label: 'Inspector' },
  { key: 'j', ctrl: true, shift: true, label: 'Console' },
  { key: 'Tab', alt: true, label: 'Alt+Tab' },
  { key: 'Tab', meta: true, label: 'Cmd+Tab' },
];

function matchesShortcut(e, spec) {
  if (e.key !== spec.key && e.code !== spec.key) return false;
  const ctrl = e.ctrlKey || e.metaKey;
  if (spec.ctrl && !ctrl) return false;
  if (spec.alt && !e.altKey) return false;
  if (spec.meta && !e.metaKey) return false;
  if (spec.shift && !e.shiftKey) return false;
  if (!spec.ctrl && !spec.alt && !spec.meta && (e.ctrlKey || e.metaKey) && spec.key.length === 1) return false;
  return true;
}

/**
 * Full apply-session proctoring: clipboard, focus, fullscreen, devtools, boundary, keystroke dynamics.
 */
export function useProctoring(policy, boundaryRef) {
  const enabled = !!policy?.enabled;
  const blockPaste = enabled && policy.block_copy_paste;
  const blockSelection = enabled && policy.block_selection;
  const blockRightClick = enabled && policy.block_right_click;
  const blockShortcuts = enabled && policy.block_shortcuts;

  const sessionRef = useRef({
    started_at: Date.now(),
    focus_loss_count: 0,
    hidden_time_seconds: 0,
    paste_attempts: 0,
    copy_attempts: 0,
    cut_attempts: 0,
    selection_attempts: 0,
    right_click_attempts: 0,
    shortcut_blocked_count: 0,
    print_screen_attempts: 0,
    devtools_detected_count: 0,
    fullscreen_exit_count: 0,
    fullscreen_entered: false,
    outside_boundary_clicks: 0,
    new_window_attempts: 0,
    multi_monitor_suspected: false,
    keystroke_intervals: [],
    fields: {},
    auto_failed: false,
    auto_fail_reason: null,
  });

  const hiddenStartRef = useRef(null);
  const lastKeyTimeRef = useRef(null);
  const [warnings, setWarnings] = useState([]);
  const [autoFailed, setAutoFailed] = useState(false);

  const addWarning = useCallback((msg) => {
    setWarnings((w) => (w.includes(msg) ? w : [...w.slice(-4), msg]));
  }, []);

  const triggerAutoFail = useCallback(
    (reason) => {
      sessionRef.current.auto_failed = true;
      sessionRef.current.auto_fail_reason = reason;
      setAutoFailed(true);
      addWarning(reason);
    },
    [addWarning]
  );

  const recordShortcut = useCallback(
    (label) => {
      sessionRef.current.shortcut_blocked_count += 1;
      addWarning(`Blocked shortcut: ${label}`);
      if (policy.outside_boundary_fail && sessionRef.current.shortcut_blocked_count >= 5) {
        triggerAutoFail('Too many blocked keyboard shortcuts');
      }
    },
    [addWarning, policy, triggerAutoFail]
  );

  useEffect(() => {
    if (!enabled) return;

    const onVisibility = () => {
      if (document.hidden) {
        hiddenStartRef.current = Date.now();
        sessionRef.current.focus_loss_count += 1;
        addWarning('Tab or window switched: stay on this application');
        if (policy.fail_on_focus_loss && sessionRef.current.focus_loss_count >= policy.focus_loss_fail_threshold) {
          triggerAutoFail('Exceeded allowed tab/window switches');
        }
      } else if (hiddenStartRef.current) {
        sessionRef.current.hidden_time_seconds += Math.round((Date.now() - hiddenStartRef.current) / 1000);
        hiddenStartRef.current = null;
      }
    };

    const onBlur = () => {
      sessionRef.current.focus_loss_count += 1;
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, [enabled, policy, addWarning, triggerAutoFail]);

  useEffect(() => {
    if (!enabled || !blockShortcuts) return;

    const onKeyDown = (e) => {
      for (const spec of BLOCKED_SHORTCUTS) {
        if (matchesShortcut(e, spec)) {
          e.preventDefault();
          e.stopPropagation();
          recordShortcut(spec.label);
          if (spec.key === 'PrintScreen') sessionRef.current.print_screen_attempts += 1;
          return;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [enabled, blockShortcuts, recordShortcut]);

  useEffect(() => {
    if (!enabled || !policy.track_devtools) return;

    const check = () => {
      const w = window.outerWidth - window.innerWidth;
      const h = window.outerHeight - window.innerHeight;
      if (w > 160 || h > 160) {
        sessionRef.current.devtools_detected_count += 1;
        addWarning('Please close developer tools');
      }
    };
    const id = setInterval(check, 1500);
    return () => clearInterval(id);
  }, [enabled, policy.track_devtools, addWarning]);

  useEffect(() => {
    if (!enabled || !policy.track_multi_monitor) return;

    const detect = async () => {
      try {
        if (window.screen?.isExtended) {
          sessionRef.current.multi_monitor_suspected = true;
          addWarning('Multiple displays detected');
        }
        if (window.getScreenDetails) {
          const details = await window.getScreenDetails();
          if (details.screens?.length > 1) {
            sessionRef.current.multi_monitor_suspected = true;
          }
        }
      } catch {
        if (window.screen && window.screen.width > window.innerWidth + 100) {
          sessionRef.current.multi_monitor_suspected = true;
        }
      }
    };
    detect();
  }, [enabled, policy.track_multi_monitor, addWarning]);

  useEffect(() => {
    if (!enabled || !policy.require_fullscreen) return;

    const onFs = () => {
      if (!document.fullscreenElement) {
        sessionRef.current.fullscreen_exit_count += 1;
        addWarning('Return to fullscreen to continue');
        if (policy.mode === 'fail' && sessionRef.current.fullscreen_exit_count >= 2) {
          triggerAutoFail('Exited fullscreen mode');
        }
      } else {
        sessionRef.current.fullscreen_entered = true;
      }
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, [enabled, policy, addWarning, triggerAutoFail]);

  useEffect(() => {
    if (!enabled || !policy.outside_boundary_fail) return;

    const onPointerDown = (e) => {
      const el = boundaryRef?.current;
      if (!el || el.contains(e.target)) return;
      sessionRef.current.outside_boundary_clicks += 1;
      addWarning('Click detected outside the test area');
      if (sessionRef.current.outside_boundary_clicks >= 3) {
        triggerAutoFail('Clicked outside the test boundary too many times');
      }
    };
    document.addEventListener('mousedown', onPointerDown, true);
    return () => document.removeEventListener('mousedown', onPointerDown, true);
  }, [enabled, policy, boundaryRef, addWarning, triggerAutoFail]);

  useEffect(() => {
    if (!enabled) return;
    const origOpen = window.open;
    window.open = (...args) => {
      sessionRef.current.new_window_attempts += 1;
      addWarning('Opening new windows is not allowed');
      return null;
    };
    return () => {
      window.open = origOpen;
    };
  }, [enabled, addWarning]);

  const requestFullscreen = useCallback(async () => {
    if (!policy.require_fullscreen) return;
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      sessionRef.current.fullscreen_entered = true;
    } catch {
      addWarning('Fullscreen could not be enabled: continue in maximized window');
    }
  }, [policy.require_fullscreen, addWarning]);

  const ensureField = useCallback((fieldId) => {
    if (!sessionRef.current.fields[fieldId]) {
      sessionRef.current.fields[fieldId] = {
        keystrokes: 0,
        chars_final: 0,
        focus_seconds: 0,
        paste_blocked: 0,
        focus_started: null,
        key_intervals_ms: [],
      };
    }
    return sessionRef.current.fields[fieldId];
  }, []);

  const onFieldKeyDown = useCallback(
    (fieldId, e) => {
      if (!enabled) return;
      const f = ensureField(fieldId);
      const now = Date.now();
      if (policy.keystroke_dynamics && lastKeyTimeRef.current && e.key.length === 1) {
        const delta = now - lastKeyTimeRef.current;
        f.key_intervals_ms.push(delta);
        sessionRef.current.keystroke_intervals.push(delta);
        if (f.key_intervals_ms.length > 200) f.key_intervals_ms.shift();
      }
      if (e.key.length === 1) lastKeyTimeRef.current = now;

      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') f.keystrokes += 1;

      if (blockPaste && (e.ctrlKey || e.metaKey) && ['v', 'c', 'x', 'a'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        sessionRef.current.paste_attempts += e.key.toLowerCase() === 'v' ? 1 : 0;
        sessionRef.current.copy_attempts += e.key.toLowerCase() === 'c' ? 1 : 0;
        sessionRef.current.cut_attempts += e.key.toLowerCase() === 'x' ? 1 : 0;
        f.paste_blocked += 1;
      }
    },
    [enabled, ensureField, blockPaste, policy.keystroke_dynamics]
  );

  const onFieldBeforeInput = useCallback(
    (fieldId, e) => {
      if (!enabled || !blockPaste) return;
      if (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop') {
        e.preventDefault();
        sessionRef.current.paste_attempts += 1;
        ensureField(fieldId).paste_blocked += 1;
      }
    },
    [enabled, blockPaste, ensureField]
  );

  const onFieldChange = useCallback(
    (fieldId, value) => {
      if (!enabled) return;
      ensureField(fieldId).chars_final = value.length;
    },
    [enabled, ensureField]
  );

  const onFieldFocus = useCallback(
    (fieldId) => {
      if (!enabled) return;
      const f = ensureField(fieldId);
      f.focus_started = Date.now();
    },
    [enabled, ensureField]
  );

  const onFieldBlur = useCallback(
    (fieldId) => {
      if (!enabled) return;
      const f = ensureField(fieldId);
      if (f.focus_started) {
        f.focus_seconds += Math.round((Date.now() - f.focus_started) / 1000);
        f.focus_started = null;
      }
    },
    [enabled, ensureField]
  );

  const onFieldContextMenu = useCallback(
    (e) => {
      if (!enabled) return;
      sessionRef.current.right_click_attempts += 1;
      if (blockRightClick) {
        e.preventDefault();
        addWarning('Right-click is disabled during screening');
      }
    },
    [enabled, blockRightClick, addWarning]
  );

  const onSelectStart = useCallback(
    (e) => {
      if (!enabled || !blockSelection) return;
      sessionRef.current.selection_attempts += 1;
      e.preventDefault();
    },
    [enabled, blockSelection]
  );

  const blockClipboard = useCallback(
    (e) => {
      if (!enabled) return;
      const t = e.type;
      if (t === 'copy') sessionRef.current.copy_attempts += 1;
      if (t === 'cut') sessionRef.current.cut_attempts += 1;
      if (t === 'paste') sessionRef.current.paste_attempts += 1;
      if (blockPaste) e.preventDefault();
    },
    [enabled, blockPaste]
  );

  const getSnapshot = useCallback(() => {
    const s = sessionRef.current;
    Object.keys(s.fields).forEach((id) => {
      const f = s.fields[id];
      if (f.focus_started) {
        f.focus_seconds += Math.round((Date.now() - f.focus_started) / 1000);
        f.focus_started = null;
      }
    });

    let keystroke_anomaly = false;
    if (policy.keystroke_dynamics) {
      for (const f of Object.values(s.fields)) {
        const chars = f.chars_final || 0;
        const keys = f.keystrokes || 0;
        if (chars > 50 && keys < chars * 0.45) keystroke_anomaly = true;
        const intervals = f.key_intervals_ms || [];
        if (intervals.length > 10) {
          const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          const same = intervals.filter((i) => Math.abs(i - avg) < 5).length;
          if (same / intervals.length > 0.85) keystroke_anomaly = true;
        }
      }
    }

    return {
      ...s,
      total_time_seconds: Math.round((Date.now() - s.started_at) / 1000),
      keystroke_anomaly,
      fields: { ...s.fields },
      policy_mode: policy.mode,
      environment:
        typeof window !== 'undefined'
          ? {
              screen_width: window.screen?.width,
              screen_height: window.screen?.height,
              window_width: window.innerWidth,
              window_height: window.innerHeight,
              hardware_concurrency: navigator.hardwareConcurrency,
              device_memory: navigator.deviceMemory,
              webdriver: !!navigator.webdriver,
              headless_ua: /HeadlessChrome/i.test(navigator.userAgent),
              plugins_count: navigator.plugins?.length ?? 0,
              mobile: /Mobi|Android/i.test(navigator.userAgent),
              multi_monitor_suspected:
                s.multi_monitor_suspected ||
                (window.screen?.width > 0 && window.innerWidth < window.screen.width * 0.4),
              unusual_display: window.screen?.width >= 3840 || window.screen?.availWidth < 720,
            }
          : null,
    };
  }, [policy]);

  return {
    enabled,
    warnings,
    autoFailed,
    requestFullscreen,
    onFieldFocus,
    onFieldBlur,
    onFieldKeyDown,
    onFieldBeforeInput,
    onFieldChange,
    onFieldContextMenu,
    onSelectStart,
    blockClipboard,
    getSnapshot,
    triggerAutoFail,
    sessionRef,
  };
}

/** Fisher–Yates shuffle question order (client-side per session). */
export function shuffleCategories(categories) {
  const arr = [...categories];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
