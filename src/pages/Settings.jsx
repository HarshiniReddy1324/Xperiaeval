import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, Card } from '../components/ui';
import { mergeThresholds } from '../components/ScoringThresholdsEditor';
import { mergeProctoringPolicy } from '../components/ProctoringSettingsEditor';
import { normalizeProductMode } from '../lib/productMode';
import {
  getVisibleSettingsSections,
  settingsSectionById,
  settingsSectionLabel,
} from '../lib/settingsSections';
import { SettingsHub } from '../components/settings/SettingsHub';
import { SettingsSectionContent } from '../components/settings/SettingsSectionContent';

export function Settings() {
  const { section: sectionId } = useParams();
  const { refreshUser, user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [thresholds, setThresholds] = useState(mergeThresholds());
  const [proctoring, setProctoring] = useState(mergeProctoringPolicy());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pilot, setPilot] = useState(user?.pilot ?? null);

  const isAdmin = user?.role === 'Admin';
  const productMode = normalizeProductMode(settings?.product_mode || user?.productMode);
  const visibleSections = useMemo(
    () => getVisibleSettingsSections(productMode, { isAdmin }),
    [productMode, isAdmin]
  );
  const activeSection = sectionId ? settingsSectionById(sectionId) : null;
  const showHub = !sectionId;

  useEffect(() => {
    api('/settings')
      .then((d) => {
        setSettings(d);
        setThresholds(mergeThresholds(d.intelligence_thresholds));
        setProctoring(mergeProctoringPolicy(d.proctoring_policy_json));
      })
      .catch((e) => setError(e.message));
    api('/pilot')
      .then(setPilot)
      .catch(() => {});
  }, []);

  const save = async () => {
    setError('');
    setSaving(true);
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
        navigate('/dashboard', { replace: true });
      }
      if (nextMode === 'hiring' && p.startsWith('/integrations')) {
        navigate('/dashboard', { replace: true });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (sectionId && !activeSection) {
    return <Navigate to="/settings" replace />;
  }

  if (sectionId && !visibleSections.some((s) => s.id === sectionId)) {
    return <Navigate to="/settings" replace />;
  }

  if (error && !settings) {
    return (
      <div className="settingsPage">
        <Card className="settingsErrorCard">
          <h1>Settings</h1>
          <p className="error">{error}</p>
          {user?.role && user.role !== 'Admin' && user.role !== 'Recruiter' && (
            <p className="muted">Organization settings can only be changed by an Admin or Recruiter.</p>
          )}
        </Card>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="loadingPage">
        <div className="spinner" />
        <p>Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="settingsPage">
      <div className="pageHead">
        <h1>{showHub ? 'Settings' : settingsSectionLabel(sectionId)}</h1>
        <p>
          {showHub
            ? productMode === 'intelligence'
              ? 'Scoring defaults and compliance policies for your intelligence workspace.'
              : 'Organization policies for scoring, apply forms, and candidate review.'
            : activeSection?.description}
        </p>
      </div>

      {showHub ? (
        <SettingsHub productMode={productMode} isAdmin={isAdmin} />
      ) : (
        <Card className="settingsSectionCard">
          <SettingsSectionContent
            sectionId={sectionId}
            settings={settings}
            setSettings={setSettings}
            thresholds={thresholds}
            setThresholds={setThresholds}
            proctoring={proctoring}
            setProctoring={setProctoring}
            pilot={pilot}
          />
          {error && <p className="error settingsInlineError">{error}</p>}
          {saved && <p className="success settingsInlineSuccess">Settings saved.</p>}
          {sectionId !== 'pilot' && (
            <div className="settingsSaveBar">
              <Button onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
