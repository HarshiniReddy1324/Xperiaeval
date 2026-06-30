import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, Card } from '../components/ui';
import { ScoringThresholdsEditor, mergeThresholds } from '../components/ScoringThresholdsEditor';
import { ProctoringSettingsEditor, mergeProctoringPolicy } from '../components/ProctoringSettingsEditor';
import { PRODUCT_LABELS, PRODUCT_MODES, normalizeProductMode, hasHiringFeatures } from '../lib/productMode';

export function Settings() {
  const { refreshUser, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section') || 'general';
  const [settings, setSettings] = useState(null);
  const [thresholds, setThresholds] = useState(mergeThresholds());
  const [proctoring, setProctoring] = useState(mergeProctoringPolicy());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/settings')
      .then((d) => {
        setSettings({ ...d, product_mode: d.product_mode || 'both', embed_allowed_origins: d.embed_allowed_origins || '*' });
        setThresholds(mergeThresholds(d.intelligence_thresholds));
        setProctoring(mergeProctoringPolicy(d.proctoring_policy_json));
      })
      .catch((e) => setError(e.message));
  }, []);

  const save = async () => {
    setError('');
    try {
      const updated = await api('/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          name: settings.name,
          candidate_notice: settings.candidate_notice,
          retention_policy: settings.retention_policy,
          scheduling_enabled: settings.scheduling_enabled ? 1 : 0,
          scheduling_url: settings.scheduling_url,
          intelligence_thresholds: thresholds,
          scoring_policy: settings.scoring_policy,
          require_typed_answers: proctoring.block_copy_paste ? 1 : settings.require_typed_answers ? 1 : 0,
          track_session_integrity: proctoring.enabled ? 1 : 0,
          proctoring_policy_json: JSON.stringify(proctoring),
          dei_blind_until_shortlist: settings.dei_blind_until_shortlist ? 1 : 0,
          anonymize_screening: settings.anonymize_screening ? 1 : 0,
          product_mode: settings.product_mode,
          embed_allowed_origins: settings.embed_allowed_origins,
        }),
      });
      setSettings(updated);
      setThresholds(mergeThresholds(updated.intelligence_thresholds));
      setProctoring(mergeProctoringPolicy(updated.proctoring_policy_json));
      if (refreshUser) await refreshUser();
      const nextMode = normalizeProductMode(updated.product_mode);
      const p = window.location.pathname;
      if (nextMode === 'intelligence' && (p.startsWith('/jobs') || p.startsWith('/rubrics') || p === '/trash')) {
        navigate('/', { replace: true });
      }
      if (nextMode === 'hiring' && p.startsWith('/integrations')) {
        navigate('/', { replace: true });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message);
    }
  };

  if (error && !settings) {
    return (
      <div className="settingsPage">
        <Card>
          <h1>Settings</h1>
          <p className="error">{error}</p>
          {user?.role && user.role !== 'Admin' && user.role !== 'Recruiter' && (
            <p className="muted">Organization settings can only be changed by an Admin or Recruiter.</p>
          )}
        </Card>
      </div>
    );
  }
  if (!settings) return <div className="loadingPage"><div className="spinner" /><p>Loading settings…</p></div>;

  const mode = normalizeProductMode(settings.product_mode);
  const hiringOnly = hasHiringFeatures(mode);

  const allSections = [
    { id: 'general', label: 'General', modes: ['hiring', 'intelligence', 'both'] },
    { id: 'product', label: 'Product mode', modes: ['hiring', 'intelligence', 'both'] },
    { id: 'thresholds', label: 'Scoring thresholds', modes: ['hiring', 'intelligence', 'both'] },
    { id: 'notice', label: 'Candidate notice', modes: ['hiring', 'both'] },
    { id: 'retention', label: 'Retention', modes: ['hiring', 'intelligence', 'both'] },
    { id: 'scheduling', label: 'Scheduling', modes: ['hiring', 'both'] },
    { id: 'proctoring', label: 'Proctoring', modes: ['hiring', 'both'] },
    { id: 'integrity', label: 'Apply integrity (legacy)', modes: ['hiring', 'both'] },
    { id: 'dei', label: 'DEI & blind review', modes: ['hiring', 'both'] },
  ];
  const sections = allSections.filter((s) => s.modes.includes(mode));

  return (
    <div className="settingsPage">
      <div className="pageHead">
        <h1>Settings</h1>
        <p>
          {mode === 'intelligence'
            ? 'Configure scoring thresholds, API embed origins, and organization defaults for Xperieval Intelligence.'
            : 'Configure how your organization scores and routes candidates.'}
        </p>
      </div>
      <div className="settingsLayout">
        <Card className="settingsNav">
          {sections.map((s) => (
            <Link key={s.id} to={`/settings?section=${s.id}`} className={section === s.id ? 'active' : ''}>
              {s.label}
            </Link>
          ))}
        </Card>
        <Card className="settingsContent">
          {section === 'general' && (
            <>
              <h2>Organization</h2>
              <label>Company name</label>
              <input className="formInput" value={settings.name || ''} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
            </>
          )}
          {section === 'product' && (
            <>
              <h2>Product mode</h2>
              <p className="lead">
                Choose which Xperieval products this organization uses. <strong>Xperieval Hiring</strong> is the full
                portal (positions, screening, pipeline). <strong>Xperieval Intelligence</strong> is the API and ATS plugin
                for experience scoring without running the full hiring workflow.
              </p>
              <div className="productModePicker">
                {PRODUCT_MODES.map((mode) => (
                  <label key={mode} className={`productModeOption${settings.product_mode === mode ? ' active' : ''}`}>
                    <input
                      type="radio"
                      name="product_mode"
                      checked={settings.product_mode === mode}
                      onChange={() => setSettings({ ...settings, product_mode: mode })}
                    />
                    <strong>{PRODUCT_LABELS[mode]}</strong>
                    <span>
                      {mode === 'hiring' && 'Positions, screening, interviews, pipeline'}
                      {mode === 'intelligence' && 'API evaluate, ATS webhooks, analytics'}
                      {mode === 'both' && 'Full hiring portal plus Intelligence API'}
                    </span>
                  </label>
                ))}
              </div>
              <h3 style={{ marginTop: 24 }}>Embed apply origins</h3>
              <p className="muted">
                {hiringOnly
                  ? 'Comma-separated origins allowed to iframe embed apply flows (use * for demo).'
                  : 'Only relevant when using embedded apply widgets with Xperieval Hiring.'}
              </p>
              <input
                className="formInput"
                value={settings.embed_allowed_origins || '*'}
                onChange={(e) => setSettings({ ...settings, embed_allowed_origins: e.target.value })}
                placeholder="https://boards.greenhouse.io, https://jobs.lever.co"
              />
            </>
          )}
          {section === 'thresholds' && (
            <>
              <h2>Scoring thresholds</h2>
              <p className="lead">
                Not every company uses 80/100 as “strong.” Set what <strong>Green</strong>, tiers, and recommendations mean for your hiring bar.
                New positions inherit these defaults; you can override per position on the position screen.
              </p>
              <ScoringThresholdsEditor thresholds={thresholds} onChange={setThresholds} />
            </>
          )}
          {section === 'notice' && (
            <>
              <h2>Candidate notice</h2>
              <p className="muted">Shown on every public apply form before submission.</p>
              <textarea rows={6} className="formTextarea" value={settings.candidate_notice || ''} onChange={(e) => setSettings({ ...settings, candidate_notice: e.target.value })} />
            </>
          )}
          {section === 'retention' && (
            <>
              <h2>Retention policy</h2>
              <textarea rows={6} className="formTextarea" value={settings.retention_policy || ''} onChange={(e) => setSettings({ ...settings, retention_policy: e.target.value })} />
            </>
          )}
          {section === 'scheduling' && (
            <>
              <h2>Interview scheduling</h2>
              <label className="checkRow">
                <input type="checkbox" checked={!!settings.scheduling_enabled} onChange={(e) => setSettings({ ...settings, scheduling_enabled: e.target.checked ? 1 : 0 })} />
                Enable scheduling link on candidate communications
              </label>
              <label>Scheduling URL</label>
              <input className="formInput" value={settings.scheduling_url || ''} onChange={(e) => setSettings({ ...settings, scheduling_url: e.target.value })} />
            </>
          )}
          {section === 'proctoring' && (
            <>
              <h2>Apply proctoring</h2>
              <p className="lead">
                Controls the public apply experience: clipboard blocking, fullscreen, focus tracking, question shuffle,
                timers, and server-side rejection in <strong>fail</strong> mode.
              </p>
              <ProctoringSettingsEditor policy={proctoring} onChange={setProctoring} />
            </>
          )}
          {section === 'integrity' && (
            <>
              <h2>Legacy integrity toggles</h2>
              <p className="muted">Prefer <Link to="/settings?section=proctoring">Proctoring</Link> for full controls. These sync when you save proctoring.</p>
              <label className="checkRow">
                <input type="checkbox" checked={!!settings.require_typed_answers} onChange={(e) => setSettings({ ...settings, require_typed_answers: e.target.checked ? 1 : 0 })} />
                Require manually typed answers
              </label>
              <label className="checkRow">
                <input type="checkbox" checked={!!settings.track_session_integrity} onChange={(e) => setSettings({ ...settings, track_session_integrity: e.target.checked ? 1 : 0 })} />
                Track session integrity
              </label>
            </>
          )}
          {section === 'dei' && (
            <>
              <h2>DEI-safe blind review</h2>
              <p className="lead">
                Reviewers see scores and dimension breakdowns without name, email, or resume until the candidate is
                shortlisted for interview. Identity unlocks automatically at shortlist (or when an admin reveals early).
              </p>
              <label className="checkRow">
                <input
                  type="checkbox"
                  checked={settings.anonymize_screening !== 0 && settings.anonymize_screening !== false}
                  onChange={(e) => setSettings({ ...settings, anonymize_screening: e.target.checked ? 1 : 0 })}
                />
                Enable blind screening (hide PII during initial review)
              </label>
              <label className="checkRow">
                <input
                  type="checkbox"
                  checked={settings.dei_blind_until_shortlist !== 0 && settings.dei_blind_until_shortlist !== false}
                  onChange={(e) => setSettings({ ...settings, dei_blind_until_shortlist: e.target.checked ? 1 : 0 })}
                />
                DEI-safe mode — keep identity hidden until shortlist (recommended)
              </label>
              <p className="muted">
                When DEI mode is on, hiring managers still see advisory scores and radar-style dimensions; contact details
                appear only after pipeline moves to &quot;Shortlisted for interview&quot; or later.
              </p>
            </>
          )}
          {error && <p className="error">{error}</p>}
          {saved && <p className="success">Settings saved.</p>}
          <div className="settingsFooter">
            <Button onClick={save}>Save settings</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
