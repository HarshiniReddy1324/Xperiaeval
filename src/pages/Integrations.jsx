import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ConnectorHub } from '../components/integrations/ConnectorHub';
import { AtsPanel } from '../components/integrations/AtsPanel';
import { ApiKeysPanel } from '../components/integrations/ApiKeysPanel';
import { ActivityLog } from '../components/integrations/ActivityLog';
import { Card } from '../components/ui';
import {
  canAccessIntegrations,
  integrationAccess,
  normalizeIntegrationTab,
} from '../lib/integrationAccess';

export function Integrations() {
  const { user } = useAuth();
  const access = useMemo(() => integrationAccess(user), [user]);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [tab, setTab] = useState(() => normalizeIntegrationTab(tabParam || 'workflow', access));

  const [atsData, setAtsData] = useState(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsError, setAtsError] = useState('');
  const [apiKeys, setApiKeys] = useState([]);
  const [keysError, setKeysError] = useState('');

  useEffect(() => {
    const next = normalizeIntegrationTab(tabParam || tab, access);
    if (next !== tab) setTab(next);
  }, [tabParam, access, tab]);

  const selectTab = (id) => {
    setTab(id);
    setSearchParams(id === 'workflow' ? {} : { tab: id }, { replace: true });
  };

  const refreshAts = async () => {
    setAtsLoading(true);
    setAtsError('');
    try {
      setAtsData(await api('/integrations/ats'));
    } catch (e) {
      setAtsError(e.message);
      setAtsData(null);
    } finally {
      setAtsLoading(false);
    }
  };

  const refreshKeys = async () => {
    try {
      setApiKeys(await api('/intelligence/api-keys'));
      setKeysError('');
    } catch (e) {
      setApiKeys([]);
      setKeysError(e.message);
    }
  };

  useEffect(() => {
    if (tab === 'ats' && !access.upgradeBlocked) refreshAts();
    if (tab === 'api' && !access.upgradeBlocked) refreshKeys();
  }, [tab, access.upgradeBlocked]);

  if (!canAccessIntegrations(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <div className="pageHead">
        <h1>Integrations</h1>
        <p>
          <strong>Jira workflow</strong> is included on every plan, including pilot. ATS ingest, score writeback, and
          the evaluate API unlock on Team and Enterprise.
        </p>
      </div>

      <nav className="integrationsTabs" aria-label="Integration sections">
        {access.tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`integrationsTab${tab === t.id ? ' integrationsTab--active' : ''}`}
            onClick={() => selectTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {access.upgradeBlocked && access.isAdmin && (
        <Card className="pilotIntegrationsNotice integrationUpgradeBanner">
          <h2>Pilot limits</h2>
          <p className="muted">
            Your pilot includes Jira workflow ({user?.pilot?.limits?.max_positions ?? 3} positions,{' '}
            {user?.pilot?.limits?.max_candidates ?? 75} candidates). ATS ingest and the evaluate API are available on
            Team and Enterprise when you need them.
          </p>
          <Link to="/settings/pilot" className="btn">
            View pilot usage
          </Link>
        </Card>
      )}

      {tab === 'workflow' && <ConnectorHub canManage={access.canManage} />}

      {tab === 'ats' && !access.upgradeBlocked && (
        <AtsPanel
          data={atsData}
          loading={atsLoading}
          error={atsError}
          canManage={access.canManage}
          canCreateAts={access.canCreateAts}
          onRefresh={refreshAts}
        />
      )}

      {tab === 'api' && !access.upgradeBlocked && (
        <ApiKeysPanel
          apiKeys={apiKeys}
          keysError={keysError}
          canManage={access.canConfigureApiKeys}
          onRefresh={refreshKeys}
        />
      )}

      {tab === 'activity' && <ActivityLog />}

      <p className="muted" style={{ marginTop: 24 }}>
        Setup instructions: <Link to="/help#integrations">Help → Integrations</Link>
      </p>
    </>
  );
}
