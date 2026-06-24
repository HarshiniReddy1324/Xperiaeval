import { useCallback, useEffect, useRef } from 'react';

/** Track session signals silently for recruiters. Set blockPaste=true to disable copy/paste (not used on apply form). */
export function useApplyIntegrity(enabled = true, blockPaste = false) {
  const sessionRef = useRef({
    started_at: Date.now(),
    focus_loss_count: 0,
    hidden_time_seconds: 0,
    paste_attempts: 0,
    right_click_attempts: 0,
    fields: {},
  });
  const hiddenStartRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const onVisibility = () => {
      if (document.hidden) {
        hiddenStartRef.current = Date.now();
        sessionRef.current.focus_loss_count += 1;
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
  }, [enabled]);

  const ensureField = useCallback((fieldId) => {
    if (!sessionRef.current.fields[fieldId]) {
      sessionRef.current.fields[fieldId] = {
        keystrokes: 0,
        chars_final: 0,
        focus_seconds: 0,
        paste_blocked: 0,
        focus_started: null,
      };
    }
    return sessionRef.current.fields[fieldId];
  }, []);

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

  const onFieldKeyDown = useCallback(
    (fieldId, e) => {
      if (!enabled) return;
      const f = ensureField(fieldId);
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') {
        f.keystrokes += 1;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        sessionRef.current.paste_attempts += 1;
        if (blockPaste) {
          e.preventDefault();
          f.paste_blocked += 1;
        }
      }
      if (blockPaste && (e.ctrlKey || e.metaKey) && ['c', 'x', 'a'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    },
    [enabled, ensureField]
  );

  const onFieldBeforeInput = useCallback(
    (fieldId, e) => {
      if (!enabled) return;
      if (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop') {
        sessionRef.current.paste_attempts += 1;
        if (blockPaste) {
          e.preventDefault();
          ensureField(fieldId).paste_blocked += 1;
        }
      }
    },
    [enabled, ensureField]
  );

  const onFieldChange = useCallback(
    (fieldId, value) => {
      if (!enabled) return;
      ensureField(fieldId).chars_final = value.length;
    },
    [enabled, ensureField]
  );

  const onFieldContextMenu = useCallback(() => {
    if (!enabled) return;
    sessionRef.current.right_click_attempts += 1;
  }, [enabled]);

  const blockClipboard = useCallback(
    (e) => {
      sessionRef.current.paste_attempts += 1;
      if (blockPaste) e.preventDefault();
    },
    [blockPaste]
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
    return {
      ...s,
      total_time_seconds: Math.round((Date.now() - s.started_at) / 1000),
      fields: { ...s.fields },
    };
  }, []);

  const elapsedSeconds = useCallback(
    () => Math.round((Date.now() - sessionRef.current.started_at) / 1000),
    []
  );

  return {
    onFieldFocus,
    onFieldBlur,
    onFieldKeyDown,
    onFieldBeforeInput,
    onFieldChange,
    onFieldContextMenu,
    blockClipboard,
    getSnapshot,
    elapsedSeconds,
    sessionRef,
  };
}
