import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Button } from './ui';

function UsageMeter({ label, used, max }) {
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const warn = max && used >= max * 0.85;
  return (
    <div className="pilotMeter">
      <div className="pilotMeterHead">
        <span>{label}</span>
        <strong>
          {used} / {max}
        </strong>
      </div>
      <div className="pilotMeterTrack">
        <div className={`pilotMeterFill${warn ? ' pilotMeterFill--warn' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function PilotUpgradeHint({ message, showLink }) {
  if (!message) return null;
  const isPilot =
    showLink ?? /pilot|upgrade|Team and Enterprise/i.test(message);
  return (
    <p className="pilotLimitCallout">
      {message}
      {isPilot ? (
        <>
          {' '}
          <Link to="/settings/pilot">View pilot program</Link>
        </>
      ) : null}
    </p>
  );
}

export function PilotBanner({ pilot }) {
  if (!pilot?.is_pilot || !pilot.started_at) return null;

  const { usage, limits, days_remaining, expired } = pilot;
  const nearLimit =
    limits &&
    (usage.positions >= limits.max_positions ||
      usage.candidates >= limits.max_candidates ||
      usage.users >= limits.max_team_users);

  return (
    <div className={`pilotBanner${expired ? ' pilotBanner--expired' : nearLimit ? ' pilotBanner--warn' : ''}`}>
      <div className="pilotBannerText">
        <strong>Pilot program</strong>
        {expired ? (
          <span> Your 90-day pilot has ended. Request an upgrade to add positions and candidates.</span>
        ) : (
          <span>
            {' '}
            {days_remaining != null ? `${days_remaining} days left` : 'Active pilot'} · {usage.positions}/
            {limits?.max_positions} positions · {usage.candidates}/{limits?.max_candidates} candidates
          </span>
        )}
      </div>
      <Link to="/settings/pilot" className="pilotBannerLink">
        View pilot
      </Link>
    </div>
  );
}

export function PilotProgramPanel({ pilot: initialPilot }) {
  const [pilot, setPilot] = useState(initialPilot);
  const [targetPlan, setTargetPlan] = useState('team');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  if (!pilot) {
    return <p className="muted">Loading pilot status…</p>;
  }

  if (!pilot.is_pilot) {
    return (
      <div className="settingsForm">
        <p className="settingsLead">
          Your workspace is on the <strong>{pilot.plan_tier}</strong> plan. Contact us if you need to change limits or
          billing.
        </p>
      </div>
    );
  }

  const { limits, usage, started_at, ends_at, days_remaining, expired, features } = pilot;

  const requestUpgrade = async () => {
    setLoading(true);
    setStatus('');
    try {
      const res = await api('/pilot/request-upgrade', {
        method: 'POST',
        body: JSON.stringify({ target_plan: targetPlan, message }),
      });
      setStatus(res.message);
    } catch (e) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    api('/pilot')
      .then(setPilot)
      .catch(() => {});
  };

  return (
    <div className="settingsForm pilotProgramPanel">
      <p className="settingsLead">
        Every new workspace starts on a <strong>90-day free pilot</strong> with positions, intelligence scoring,
        proctoring, analytics, and <strong>Jira workflow</strong>; no credit card required.
      </p>

      {expired && (
        <p className="pilotExpiredNotice">
          Your pilot period has ended. You can still review existing data, but new positions and candidates require an
          upgrade.
        </p>
      )}

      <div className="pilotMetaGrid">
        <div>
          <span className="pilotMetaLabel">Started</span>
          <strong>{started_at ? new Date(started_at).toLocaleDateString() : 'N/A'}</strong>
        </div>
        <div>
          <span className="pilotMetaLabel">Ends</span>
          <strong>{ends_at ? new Date(ends_at).toLocaleDateString() : 'N/A'}</strong>
        </div>
        <div>
          <span className="pilotMetaLabel">Days remaining</span>
          <strong>{expired ? '0' : days_remaining ?? 'N/A'}</strong>
        </div>
      </div>

      {limits && (
        <div className="pilotMeters">
          <UsageMeter label="Active positions" used={usage.positions} max={limits.max_positions} />
          <UsageMeter label="Candidates screened" used={usage.candidates} max={limits.max_candidates} />
          <UsageMeter label="Team members" used={usage.users} max={limits.max_team_users} />
        </div>
      )}

      <div className="pilotFeatureList">
        <h3>Included in your free pilot</h3>
        <ul>
          <li>Up to {limits?.max_positions ?? 3} positions and {limits?.max_candidates ?? 75} candidates</li>
          <li>Intelligence scorecards (0–100) with explainable dimensions</li>
          <li>Screening, proctoring, blind review, and audit log</li>
          <li>Jira workflow: auto-create issues when you shortlist</li>
        </ul>
        {(!features.integrations || !features.api_keys) && (
          <>
            <h3>Not on the free pilot (optional later)</h3>
            <ul>
              <li>ATS webhook ingest and automatic score writeback</li>
              <li>Evaluate API keys for custom integrations</li>
              <li>Higher position, candidate, and team limits</li>
            </ul>
          </>
        )}
      </div>

      <div className="pilotUpgradeBox">
        <h3>Request upgrade</h3>
        <p className="muted">We will follow up within one business day.</p>
        <label className="settingsField">
          Target plan
          <select value={targetPlan} onChange={(e) => setTargetPlan(e.target.value)}>
            <option value="team">Team</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </label>
        <label className="settingsField">
          Message (optional)
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us about your hiring volume and ATS…"
          />
        </label>
        <div className="row">
          <Button onClick={requestUpgrade} disabled={loading}>
            {loading ? 'Sending…' : 'Request upgrade'}
          </Button>
          <Button variant="outline" onClick={refresh}>
            Refresh usage
          </Button>
        </div>
        {status && <p className="success">{status}</p>}
      </div>
    </div>
  );
}
