import React from 'react';
import { ShieldAlert, Maximize2 } from 'lucide-react';
import { Button } from './ui';

export function ProctoringBanner({ warnings, autoFailed, onEnterFullscreen, requireFullscreen }) {
  if (!warnings?.length && !autoFailed && !requireFullscreen) return null;

  return (
    <div className={`proctorBanner${autoFailed ? ' failed' : ''}`}>
      <ShieldAlert size={18} />
      <div className="proctorBannerBody">
        {autoFailed ? (
          <strong>Session integrity failed</strong>
        ) : (
          <strong>Proctored session — stay in this window</strong>
        )}
        {warnings?.length > 0 && (
          <ul>
            {warnings.slice(-3).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
        {requireFullscreen && !autoFailed && (
          <Button type="button" className="small" onClick={onEnterFullscreen}>
            <Maximize2 size={14} /> Enter fullscreen
          </Button>
        )}
      </div>
    </div>
  );
}
