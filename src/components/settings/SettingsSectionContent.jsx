import React from 'react';
import { ScoringThresholdsEditor } from '../ScoringThresholdsEditor';
import { ProctoringSettingsEditor } from '../ProctoringSettingsEditor';
import { PRODUCT_LABELS, PRODUCT_MODES } from '../../lib/productMode';
import { PilotProgramPanel } from '../PilotProgram';

export function SettingsSectionContent({
  sectionId,
  settings,
  setSettings,
  thresholds,
  setThresholds,
  proctoring,
  setProctoring,
  pilot,
}) {
  switch (sectionId) {
    case 'pilot':
      return <PilotProgramPanel pilot={pilot} />;

    case 'general':
      return (
        <div className="settingsForm">
          <div className="settingsField">
            <label htmlFor="org-name">Company name</label>
            <p className="muted">Shown on apply forms, careers pages, and candidate emails.</p>
            <input
              id="org-name"
              className="formInput"
              value={settings.name || ''}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
            />
          </div>
        </div>
      );

    case 'thresholds':
      return (
        <div className="settingsForm">
          <p className="settingsLead">
            Set what <strong>Green</strong>, tiers, and recommendations mean for your hiring bar. New positions inherit
            these defaults; override per position on the position screen.
          </p>
          <ScoringThresholdsEditor thresholds={thresholds} onChange={setThresholds} />
        </div>
      );

    case 'notice':
      return (
        <div className="settingsForm">
          <div className="settingsField">
            <label htmlFor="candidate-notice">Notice text</label>
            <p className="muted">Displayed on every public apply form before submission.</p>
            <textarea
              id="candidate-notice"
              rows={8}
              className="formTextarea"
              value={settings.candidate_notice || ''}
              onChange={(e) => setSettings({ ...settings, candidate_notice: e.target.value })}
            />
          </div>
        </div>
      );

    case 'retention':
      return (
        <div className="settingsForm">
          <div className="settingsField">
            <label htmlFor="retention-policy">Retention policy</label>
            <p className="muted">Describe how long you retain applications and when data is deleted.</p>
            <textarea
              id="retention-policy"
              rows={8}
              className="formTextarea"
              value={settings.retention_policy || ''}
              onChange={(e) => setSettings({ ...settings, retention_policy: e.target.value })}
            />
          </div>
        </div>
      );

    case 'scheduling':
      return (
        <div className="settingsForm">
          <label className="settingsCheckRow">
            <input
              type="checkbox"
              checked={!!settings.scheduling_enabled}
              onChange={(e) => setSettings({ ...settings, scheduling_enabled: e.target.checked ? 1 : 0 })}
            />
            <span>
              <strong>Enable scheduling link</strong>
              <small>Show a booking link on candidate communications</small>
            </span>
          </label>
          <div className="settingsField">
            <label htmlFor="scheduling-url">Scheduling URL</label>
            <input
              id="scheduling-url"
              className="formInput"
              placeholder="https://calendly.com/your-team/interview"
              value={settings.scheduling_url || ''}
              onChange={(e) => setSettings({ ...settings, scheduling_url: e.target.value })}
            />
          </div>
        </div>
      );

    case 'proctoring':
      return (
        <div className="settingsForm">
          <p className="settingsLead">
            Controls the public apply experience: clipboard blocking, fullscreen, focus tracking, question shuffle,
            timers, and server-side rejection in <strong>fail</strong> mode.
          </p>
          <ProctoringSettingsEditor policy={proctoring} onChange={setProctoring} />
          <details className="settingsDetails">
            <summary>Legacy integrity toggles</summary>
            <p className="muted">These sync automatically when you save proctoring settings above.</p>
            <label className="settingsCheckRow">
              <input
                type="checkbox"
                checked={!!settings.require_typed_answers}
                onChange={(e) => setSettings({ ...settings, require_typed_answers: e.target.checked ? 1 : 0 })}
              />
              <span>
                <strong>Require manually typed answers</strong>
                <small>Discourage paste from clipboard</small>
              </span>
            </label>
            <label className="settingsCheckRow">
              <input
                type="checkbox"
                checked={!!settings.track_session_integrity}
                onChange={(e) => setSettings({ ...settings, track_session_integrity: e.target.checked ? 1 : 0 })}
              />
              <span>
                <strong>Track session integrity</strong>
                <small>Log focus loss and tab switches</small>
              </span>
            </label>
          </details>
        </div>
      );

    case 'dei':
      return (
        <div className="settingsForm">
          <p className="settingsLead">
            Reviewers see scores and dimension breakdowns without name, email, or resume until the candidate is
            shortlisted. Identity unlocks at shortlist or when an admin reveals early.
          </p>
          <label className="settingsCheckRow">
            <input
              type="checkbox"
              checked={settings.anonymize_screening !== 0 && settings.anonymize_screening !== false}
              onChange={(e) => setSettings({ ...settings, anonymize_screening: e.target.checked ? 1 : 0 })}
            />
            <span>
              <strong>Blind screening</strong>
              <small>Hide PII during initial review</small>
            </span>
          </label>
          <label className="settingsCheckRow">
            <input
              type="checkbox"
              checked={settings.dei_blind_until_shortlist !== 0 && settings.dei_blind_until_shortlist !== false}
              onChange={(e) => setSettings({ ...settings, dei_blind_until_shortlist: e.target.checked ? 1 : 0 })}
            />
            <span>
              <strong>DEI-safe mode</strong>
              <small>Keep identity hidden until shortlist (recommended)</small>
            </span>
          </label>
        </div>
      );

    case 'workspace':
      return (
        <div className="settingsForm">
          <p className="settingsLead">
            Controls which areas appear in the sidebar. Most teams use <strong>Hiring + Intelligence</strong> (full
            portal). Intelligence-only is for API/ATS scoring without positions and screening.
          </p>
          <div className="settingsProductModes">
            {PRODUCT_MODES.map((mode) => (
              <label
                key={mode}
                className={`settingsProductMode${settings.product_mode === mode ? ' settingsProductMode--active' : ''}`}
              >
                <input
                  type="radio"
                  name="product_mode"
                  checked={settings.product_mode === mode}
                  onChange={() => setSettings({ ...settings, product_mode: mode })}
                />
                <strong>{PRODUCT_LABELS[mode]}</strong>
                <small>
                  {mode === 'hiring' && 'Positions, screening, pipeline: no Integrations API tab'}
                  {mode === 'intelligence' && 'Candidates + analytics + Integrations: no Positions or Screening'}
                  {mode === 'both' && 'Full portal (recommended for demo and most customers)'}
                </small>
              </label>
            ))}
          </div>
          <details className="settingsDetails">
            <summary>Embedded apply widget (advanced)</summary>
            <div className="settingsEmbedHelp">
              <p>
                <strong>You can skip this.</strong> Most customers send candidates to the normal apply link on Xperieval
                or your careers page: no iframe needed.
              </p>
              <p>
                This setting is only for putting the screening form <em>inside another website</em> using an HTML iframe,
                for example on a custom careers site or inside an ATS page. The embed URL looks like{' '}
                <code>https://your-portal/embed/apply/your-job-slug</code>: a stripped-down apply flow without the full
                portal chrome.
              </p>
              <p className="muted">
                <strong>Allowed embed origins</strong> is a security allowlist: which parent sites may iframe that URL.
                Example: <code>https://careers.yourcompany.com</code>. Separate multiple sites with commas.{' '}
                <code>*</code> allows any site (fine for demos; use real domains in production).
              </p>
            </div>
            <div className="settingsField">
              <label htmlFor="embed-origins">Allowed embed origins</label>
              <input
                id="embed-origins"
                className="formInput"
                value={settings.embed_allowed_origins || '*'}
                onChange={(e) => setSettings({ ...settings, embed_allowed_origins: e.target.value })}
                placeholder="https://careers.yourcompany.com"
              />
            </div>
          </details>
        </div>
      );

    default:
      return <p className="muted">This settings section is not available.</p>;
  }
}
