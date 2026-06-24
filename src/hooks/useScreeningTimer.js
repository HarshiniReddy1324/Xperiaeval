import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Silently tracks time on a screening question — no min/max UI or auto-advance.
 * Recruiters configure limits server-side; applicants take as long as they need.
 */
export function useAnswerSessionMetrics(active) {
  const startedAt = useRef(null);
  const idleStart = useRef(null);
  const idleTotal = useRef(0);
  const focusLoss = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;
    startedAt.current = Date.now();
    idleTotal.current = 0;
    focusLoss.current = 0;

    const onVis = () => {
      if (document.hidden) {
        idleStart.current = Date.now();
        focusLoss.current += 1;
      } else if (idleStart.current) {
        idleTotal.current += Math.round((Date.now() - idleStart.current) / 1000);
        idleStart.current = null;
      }
    };
    const onBlur = () => {
      focusLoss.current += 1;
    };

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);

    const tick = setInterval(() => {
      setElapsed(Math.round((Date.now() - startedAt.current) / 1000));
    }, 1000);

    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
    };
  }, [active]);

  const getMetrics = useCallback(() => {
    if (idleStart.current) {
      idleTotal.current += Math.round((Date.now() - idleStart.current) / 1000);
      idleStart.current = null;
    }
    return {
      time_taken_seconds: Math.round((Date.now() - (startedAt.current || Date.now())) / 1000),
      idle_seconds: idleTotal.current,
      focus_loss_count: focusLoss.current,
    };
  }, []);

  return { elapsed, getMetrics, focusLossCount: focusLoss.current };
}

/** @deprecated Use useAnswerSessionMetrics — kept for imports during transition */
export function useScreeningTimer(_minSeconds, _maxSeconds, _onExpire, active) {
  return useAnswerSessionMetrics(active);
}
