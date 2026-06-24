import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Button, Card } from '../components/ui';
import { ScoringThresholdsEditor, mergeThresholds } from '../components/ScoringThresholdsEditor';
import { ProctoringSettingsEditor, mergeProctoringPolicy } from '../components/ProctoringSettingsEditor';

export function Settings() {
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
        setSettings(d);
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
        }),
      });
      setSettings(updated);
      setThresholds(mergeThresholds(updated.intelligence_thresholds));
      setProctoring(mergeProctoringPolicy(updated.proctoring_policy_json));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message);
    }
  };

  if (error && !settings) return <p className="error">{error}</p>;
  if (!settings) return <div className="loadingPage"><div className="spinner" /><p>Loading settings…</p></div>;

  const sections = [
    { id: 'general', label: 'General' },
    { id: 'thresholds', label: 'Scoring thresholds' },
    { id: 'notice', label: 'Candidate notice' },
    { id: 'retention', label: 'Retention' },
    { id: 'scheduling', label: 'Scheduling' },
    { id: 'proctoring', label: 'Proctoring' },
    { id: 'integrity', label: 'Apply integrity (legacy)' },
    { id: 'dei', label: 'DEI & blind review' },
  ];

  return (
    <div className="settingsPage">
      <div className="pageHead">
        <h1>Settings</h1>
        <p>Configure how your organization scores and routes candidates. Recruiters can adjust scoring thresholds; Admins control all sections.</p>
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
          {section === 'thresholds' && (
            <>
              <h2>Scoring thresholds</h2>
              <p className="lead">
                Not every company uses 80/100 as “strong.” Set what <strong>Green</strong>, tiers, and recommendations mean for your hiring bar.
                New jobs inherit these defaults; you can override per job on the job screen.
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
