import React from 'react';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

const LEVEL_ICON = {
  ok: ShieldCheck,
  warn: ShieldAlert,
  risk: Shield,
};

/**
 * @param {{ signals?: object }} props
 */
export function IntegritySignalsPanel({ signals }) {
  if (!signals) {
    return (
      <div className="dashWidget integritySignalsPanel">
        <div className="widgetHead">
          <h2>Assessment integrity signals</h2>
        </div>
        <p className="muted">No session integrity data recorded for this application.</p>
      </div>
    );
  }

  const Icon = LEVEL_ICON[signals.level] || Shield;
  const tone = signals.level === 'ok' ? 'green' : signals.level === 'warn' ? 'amber' : 'red';

  return (
    <div className={`dashWidget integritySignalsPanel integritySignalsPanel--${tone}`}>
      <div className="widgetHead">
        <h2>
          <Icon size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Assessment integrity signals
        </h2>
        <span className={`integrityLevelBadge integrityLevelBadge--${tone}`}>
          {signals.score}/100 · {signals.label}
        </span>
      </div>
      <p className="integritySignalsSummary">{signals.summary}</p>
      <ul className="integritySignalsList">
        {signals.signals?.map((s) => (
          <li key={s.id} className={`integritySignal integritySignal--${s.status}`}>
            <div>
              <b>{s.label}</b>
              <span className="integritySignalValue">{s.value}</span>
            </div>
            <small>{s.detail}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
