import { useCallback, useEffect, useRef, useState } from 'react';

const SAMPLE_MS = 1500;

/**
 * Camera presence monitoring: face in frame & look-away signals only. No video is stored or uploaded.
 */
export function useCameraPresence(enabled) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const intervalRef = useRef(null);
  const metricsRef = useRef({
    consent_granted: false,
    consent_denied: false,
    detector_available: false,
    samples: 0,
    face_present_samples: 0,
    face_absent_samples: 0,
    look_away_samples: 0,
    multiple_face_samples: 0,
    stream_interrupted: 0,
  });

  const [consentState, setConsentState] = useState('pending');

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const runSample = useCallback(async () => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || video.readyState < 2) return;

    const m = metricsRef.current;
    m.samples += 1;

    if (!detector) {
      m.face_present_samples += 1;
      return;
    }

    try {
      const bitmap = await createImageBitmap(video);
      const faces = await detector.detect(bitmap);
      bitmap.close();
      const vw = video.videoWidth || 1;
      const vh = video.videoHeight || 1;

      if (!faces.length) {
        m.face_absent_samples += 1;
        return;
      }

      m.face_present_samples += 1;
      if (faces.length > 1) m.multiple_face_samples += 1;

      const box = faces[0].boundingBox;
      const cx = (box.x + box.width / 2) / vw;
      const cy = (box.y + box.height / 2) / vh;
      const offCenter = cx < 0.3 || cx > 0.7 || cy < 0.22 || cy > 0.78;
      const tooSmall = box.width / vw < 0.12;
      if (offCenter || tooSmall) m.look_away_samples += 1;
    } catch {
      m.stream_interrupted += 1;
    }
  }, []);

  const grantConsent = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
      }

      if (typeof window !== 'undefined' && 'FaceDetector' in window) {
        detectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 2 });
        metricsRef.current.detector_available = true;
      }

      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        metricsRef.current.stream_interrupted += 1;
      });

      metricsRef.current.consent_granted = true;
      setConsentState('granted');

      intervalRef.current = setInterval(runSample, SAMPLE_MS);
      return 'granted';
    } catch {
      metricsRef.current.consent_denied = true;
      setConsentState('denied');
      return 'denied';
    }
  }, [runSample]);

  const denyConsent = useCallback(() => {
    metricsRef.current.consent_denied = true;
    setConsentState('denied');
  }, []);

  const getMetrics = useCallback(() => {
    const m = metricsRef.current;
    const presencePct = m.samples
      ? Math.round((m.face_present_samples / m.samples) * 100)
      : m.consent_granted
        ? 100
        : 0;
    const lookAwayPct = m.samples ? Math.round((m.look_away_samples / m.samples) * 100) : 0;
    const offCenterPct = m.samples ? Math.round((m.look_away_samples / m.samples) * 100) : 0;
    const attentionScore = Math.max(0, Math.round(presencePct - lookAwayPct * 0.6));
    return {
      ...m,
      presence_pct: presencePct,
      look_away_samples: m.look_away_samples,
      look_away_pct: lookAwayPct,
      gaze_tracking: {
        attention_score: attentionScore,
        look_away_pct: lookAwayPct,
        off_center_pct: offCenterPct,
        face_absent_pct: m.samples ? Math.round((m.face_absent_samples / m.samples) * 100) : 0,
        multiple_face_pct: m.samples ? Math.round((m.multiple_face_samples / m.samples) * 100) : 0,
        detector_available: m.detector_available,
        method: 'face_detector_heuristic',
      },
    };
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    return () => stop();
  }, [enabled, stop]);

  return {
    videoRef,
    consentState,
    grantConsent,
    denyConsent,
    getMetrics,
    stop,
    isActive: consentState === 'granted',
  };
}
