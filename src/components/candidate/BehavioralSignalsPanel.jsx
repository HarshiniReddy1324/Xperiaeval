import React from 'react';
import { Activity, Keyboard, Mic } from 'lucide-react';

function RhythmBars({ bars = [] }) {
  if (!bars.length) return <span className="muted">—</span>;
  return (
    <div className="keystrokeRhythm" title="Inter-key timing rhythm (taller = slower)">
      {bars.map((h, i) => (
        <span key={i} className="keystrokeRhythmBar" style={{ height: `${Math.max(18, h)}%` }} />
      ))}
    </div>
  );
}

/**
 * Keystroke + behavioral signals — recruiter-facing panel from session integrity data.
 */
export function BehavioralSignalsPanel({ behavioral }) {
  if (!behavioral) {
    return (
      <div className="dashWidget behavioralSignalsPanel">
        <div className="widgetHead">
          <h2>
            <Keyboard size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Keystroke &amp; behavioral signals
          </h2>
        </div>
        <p className="muted">No behavioral telemetry captured for this application.</p>
      </div>
    );
  }

  const tone = behavioral.level === 'ok' ? 'green' : behavioral.level === 'warn' ? 'amber' : 'red';
  const hasKeystrokes = behavioral.per_question?.length > 0;

  return (
    <div className={`dashWidget behavioralSignalsPanel behavioralSignalsPanel--${tone}`}>
      <div className="widgetHead">
        <h2>
          <Activity size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Keystroke &amp; behavioral signals
        </h2>
        <span className={`integrityLevelBadge integrityLevelBadge--${tone}`}>
          {behavioral.score}/100 · {behavioral.label}
        </span>
      </div>
      <p className="integritySignalsSummary">{behavioral.summary}</p>

      <ul className="integritySignalsList">
        {behavioral.signals?.map((s) => (
          <li key={s.id} className={`integritySignal integritySignal--${s.status}`}>
            <div>
              <b>{s.label}</b>
              <span className="integritySignalValue">{s.value}</span>
            </div>
            <small>{s.detail}</small>
          </li>
        ))}
      </ul>

      {hasKeystrokes && (
        <div className="behavioralPerQuestion">
          <h4>Per-question keystroke profile</h4>
          <p className="muted behavioralPerQuestionHint">
            Keystrokes vs characters, typing speed, and inter-key rhythm — paste and bot-like timing are flagged.
          </p>
          <table className="behavioralTable">
            <thead>
              <tr>
                <th>Question</th>
                <th>Keys</th>
                <th>Ratio</th>
                <th>WPM</th>
                <th>Avg gap</th>
                <th>Rhythm</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {behavioral.per_question.map((q) => (
                <tr key={q.field_id} className={q.keystroke_anomaly ? 'behavioralRow--warn' : ''}>
                  <td className="behavioralQLabel" title={q.label}>
                    {q.label}
                  </td>
                  <td>
                    {q.keystrokes}
                    <small className="behavioralSub">{q.chars} chars</small>
                  </td>
                  <td>{q.key_ratio_pct != null ? `${q.key_ratio_pct}%` : '—'}</td>
                  <td>{q.typing_wpm ?? '—'}</td>
                  <td>{q.interval_avg_ms != null ? `${q.interval_avg_ms}ms` : '—'}</td>
                  <td>
                    <RhythmBars bars={q.rhythm_bars} />
                  </td>
                  <td>
                    {q.keystroke_anomaly && <span className="behavioralFlag">Anomaly</span>}
                    {q.paste_blocked > 0 && <span className="behavioralFlag">Paste</span>}
                    {!q.keystroke_anomaly && !q.paste_blocked && '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {behavioral.signals?.some((s) => s.id === 'multi_voice') && (
        <p className="behavioralFootnote">
          <Mic size={14} /> Multi-voice analysis applies to audio/video responses only.
        </p>
      )}
    </div>
  );
}
