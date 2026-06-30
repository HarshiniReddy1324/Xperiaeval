import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Plug, Unplug } from 'lucide-react';
import { api } from '../../api/client';
import { Button, Card } from '../ui';
import { PilotUpgradeHint } from '../PilotProgram';

const STATUS_LABELS = {
  connected: 'Connected',
  error: 'Connection error',
  not_configured: 'Not connected',
};

function ConnectorForm({ connector, values, onChange, disabled }) {
  return (
    <div className="connectorForm">
      {connector.fields.map((field) => (
        <label key={field.key} className="connectorField">
          <span>
            {field.label}
            {field.required ? ' *' : ''}
          </span>
          <input
            type={field.type || 'text'}
            value={values[field.key] || ''}
            placeholder={field.placeholder || ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            disabled={disabled}
            autoComplete="off"
          />
        </label>
      ))}
    </div>
  );
}

function ConnectorCard({ connector, canManage, onSaved }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const status = connector.status || 'not_configured';
  const isConnected = connector.connected;
  const blocked = connector.blocked_reason;

  useEffect(() => {
    if (!open || !isConnected) return;
    api(`/connectors/${connector.id}`)
      .then((row) => setValues((v) => ({ ...v, ...row.config })))
      .catch(() => {});
  }, [open, isConnected, connector.id]);

  const setField = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  const connect = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await api(`/connectors/${connector.id}`, {
        method: 'PUT',
        body: JSON.stringify({ config: values }),
      });
      setMessage(`Connected · ${res.credential_hint || connector.name}`);
      setOpen(false);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const testOnly = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api(`/connectors/${connector.id}/test`, {
        method: 'POST',
        body: JSON.stringify({ config: values }),
      });
      setMessage('Connection test passed');
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm(`Disconnect ${connector.name}?`)) return;
    setBusy(true);
    setError('');
    try {
      await api(`/connectors/${connector.id}`, { method: 'DELETE' });
      setValues({});
      setOpen(false);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const isAccount = connector.id === 'atlassian';

  return (
    <article className={`connectorCard connectorCard--${status}${isAccount ? ' connectorCard--account' : ''}`}>
      <div className="connectorCardHead">
        <div>
          <span className="connectorCategory">{connector.category}</span>
          <h3>{connector.name}</h3>
          <p className="muted">{connector.tagline}</p>
        </div>
        <span className={`connectorStatus connectorStatus--${status}`}>{STATUS_LABELS[status] || status}</span>
      </div>

      <p className="connectorPilotNote">{connector.pilotNote}</p>

      {blocked && !isConnected && <p className="connectorBlocked">{blocked}</p>}

      {isConnected && connector.credential_hint && (
        <p className="connectorHint">
          <Plug size={14} /> {connector.credential_hint}
          {connector.last_tested_at && (
            <span className="muted"> · tested {new Date(connector.last_tested_at).toLocaleString()}</span>
          )}
        </p>
      )}

      {connector.last_error && status === 'error' && (
        <p className="error connectorInlineError">{connector.last_error}</p>
      )}

      <ul className="connectorCapabilities">
        {connector.capabilities?.map((cap) => (
          <li key={cap}>{cap}</li>
        ))}
      </ul>

      <div className="connectorCardActions">
        {connector.docsUrl && (
          <a href={connector.docsUrl} target="_blank" rel="noreferrer" className="connectorDocsLink">
            Setup guide <ExternalLink size={14} />
          </a>
        )}
        {canManage && !blocked && (
          <Button variant="outline" onClick={() => setOpen((o) => !o)}>
            {open ? 'Close' : isConnected ? 'Edit' : 'Connect'}
          </Button>
        )}
      </div>

      {open && canManage && !blocked && (
        <div className="connectorConfigure">
          <ConnectorForm connector={connector} values={values} onChange={setField} disabled={busy} />
          {error && <PilotUpgradeHint message={error} />}
          {message && <p className="success">{message}</p>}
          <div className="row">
            <Button onClick={connect} disabled={busy}>
              {busy ? 'Connecting…' : isConnected ? 'Save and test' : 'Connect and test'}
            </Button>
            {isConnected && (
              <Button variant="outline" onClick={testOnly} disabled={busy}>
                Test connection
              </Button>
            )}
            {isConnected && (
              <Button variant="outline" onClick={disconnect} disabled={busy}>
                <Unplug size={14} /> Disconnect
              </Button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export function ConnectorHub({ canManage }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api('/connectors'));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const connectedCount = useMemo(
    () => data?.connectors?.filter((c) => c.connected).length ?? 0,
    [data]
  );

  if (loading) return <p className="muted">Loading workflow connectors…</p>;
  if (error) {
    const needsDeploy = /not found/i.test(error);
    return (
      <Card>
        <p className="error">{error}</p>
        {needsDeploy ? (
          <p className="muted">
            The Workflow tab needs the latest API running (route <code>/api/connectors</code>). If you use
            Vercel for the UI, restart or redeploy the API server with the newest code, then hard-refresh this page.
            For local dev, run <code>npm run dev</code> in the project folder and open{' '}
            <code>http://localhost:5173</code>.
          </p>
        ) : null}
      </Card>
    );
  }

  const account = data?.connectors?.find((c) => c.id === 'atlassian');
  const workflow = data?.connectors?.filter((c) => c.id !== 'atlassian') ?? [];

  return (
    <>
      <p className="muted integrationsTabLead">
        Connect your Atlassian account, then Jira. Issues are created automatically when you shortlist (if enabled), or
        manually from each candidate profile. Included on every plan, including pilot.
      </p>
      <p className="connectorHubStats">
        <strong>{connectedCount}</strong> of {data?.connectors?.length ?? 0} connections active
      </p>

      <div className="connectorGrid connectorGrid--accountRow">
        {account && <ConnectorCard connector={account} canManage={canManage} onSaved={refresh} />}
        {workflow.map((connector) => (
          <ConnectorCard key={connector.id} connector={connector} canManage={canManage} onSaved={refresh} />
        ))}
      </div>
    </>
  );
}
