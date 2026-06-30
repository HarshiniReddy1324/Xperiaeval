import React from 'react';
import { Camera, ShieldCheck } from 'lucide-react';
import { Button } from './ui';

/**
 * One-time camera consent before screening: presence & gaze monitoring only (no video stored).
 */
export function CameraConsentStep({ onAccept, onDecline, loading }) {
  return (
    <div className="applyFormCard cameraConsentCard">
      <div className="cameraConsentIcon">
        <Camera size={28} />
      </div>
      <h2>Enable presence monitoring</h2>
      <p className="muted">
        This application uses your camera <strong>only during screening</strong> to confirm you are present and
        focused on the questions. We analyze face position and attention signals in real time.{' '}
        <strong>we do not record or store video</strong> of you.
      </p>
      <ul className="cameraConsentList">
        <li>
          <ShieldCheck size={16} /> Detect if you leave the application window
        </li>
        <li>
          <ShieldCheck size={16} /> Monitor whether you remain in front of the screen
        </li>
        <li>
          <ShieldCheck size={16} /> Flag looking away or multiple people in frame
        </li>
      </ul>
      <div className="row" style={{ marginTop: 20 }}>
        <Button type="button" onClick={onAccept} disabled={loading}>
          {loading ? 'Starting camera…' : 'I agree: enable monitoring'}
        </Button>
        <Button type="button" variant="outline" onClick={onDecline}>
          Decline
        </Button>
      </div>
    </div>
  );
}

/** Small live indicator while monitoring (preview is local-only, not uploaded). */
export function CameraPresenceIndicator({ videoRef, presencePct }) {
  return (
    <div className="cameraPresenceIndicator" title="Presence monitoring active: video not stored">
      <video ref={videoRef} className="cameraPresencePreview" muted playsInline aria-hidden="true" />
      <span>
        <span className="cameraPresenceDot" />
        Present {presencePct != null ? `${presencePct}%` : 'N/A'}
      </span>
    </div>
  );
}
