import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { apiUrl } from '../api/base.js';
import { useAuth } from '../context/AuthContext';
import { Button, Card } from '../components/ui';

export function Integrations() {
  const { user } = useAuth();
  const canManage = user?.role === 'Admin' || user?.role === 'Recruiter';
  const [data, setData] = useState(null);
  const [atsError, setAtsError] = useState('');
  const [atsLoading, setAtsLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState([]);
  const [keysError, setKeysError] = useState('');
  const [newKeyName, setNewKeyName] = useState('Production');
  const [createdKey, setCreatedKey] = useState(null);
  const [actionError, setActionError] = useState('');
  const [webhookResult, setWebhookResult] = useState(null);
  const [queueResult, setQueueResult] = useState(null);
  const [writebackUrl, setWritebackUrl] = useState('');

  const refresh = async () => {
    setAtsLoading(true);
    setAtsError('');
    try {
      const ats = await api('/integrations/ats');
      setData(ats);
    } catch (e) {
      setAtsError(e.message);
      setData(null);
    } finally {
      setAtsLoading(false);
    }
    try {
      const keys = await api('/intelligence/api-keys');
      setApiKeys(keys);
      setKeysError('');
    } catch (e) {
      setApiKeys([]);
      setKeysError(e.message);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (data?.integrations?.[0]?.writeback_url) {
      setWritebackUrl(data.integrations[0].writeback_url);
    }
  }, [data]);

  const integration = data?.integrations?.[0];
  const webhookSecret = integration?.webhook_secret;

  const testWebhook = async () => {
    setActionError('');
    if (!webhookSecret) {
      setActionError('No ATS integration configured — seed or create an integration with a webhook secret first.');
      return;
    }
    const res = await fetch(apiUrl('/api/integrations/ats/webhook'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': webhookSecret,
        'X-Ats-Provider': integration?.provider || 'greenhouse',
      },
      body: JSON.stringify({
        candidate: { id: `gh-test-${Date.now()}`, name: 'Test Candidate', email: 'test@example.com' },
        job_id: 'REQ-1001',
        job_title: 'Senior Software Engineer',
        stage: 'applied',
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setActionError(body.error || 'Webhook test failed');
      return;
    }
    setWebhookResult(body);
    refresh();
  };

  const processQueue = async () => {
    setActionError('');
    try {
      const result = await api('/integrations/ats/process-queue', { method: 'POST' });
      setQueueResult(result);
      refresh();
    } catch (e) {
      setActionError(e.message);
    }
  };

  const saveWritebackUrl = async () => {
    setActionError('');
    if (!integration) {
      setActionError('No ATS integration found for this organization.');
      return;
    }
    if (!canManage) {
      setActionError('Only Admins can update writeback settings.');
      return;
    }
    try {
      await api(`/integrations/ats/${integration.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ writeback_url: writebackUrl }),
      });
      refresh();
    } catch (e) {
      setActionError(e.message);
    }
  };

  const createApiKey = async () => {
    setActionError('');
    if (!canManage) return;
    try {
      const created = await api('/intelligence/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName }),
      });
      setCreatedKey(created);
      refresh();
    } catch (e) {
      setActionError(e.message);
    }
  };

  const revokeKey = async (id) => {
    setActionError('');
    if (!canManage) return;
    try {
      await api(`/intelligence/api-keys/${id}`, { method: 'DELETE' });
      refresh();
    } catch (e) {
      setActionError(e.message);
    }
  };

  return (
    <>
      <div className="pageHead">
        <h1>Integrations</h1>
        <p>Connect your ATS, manage API keys, and configure score writeback to your system of record.</p>
      </div>

      {actionError && <p className="error">{actionError}</p>}

      <Card>
        <h2>Xperieval Intelligence API</h2>
        <p className="muted">
          Evaluate candidates programmatically. Keys start with <code>xpi_</code> and authenticate{' '}
          <code>POST {apiUrl('/api/v1/evaluate')}</code>.
        </p>
        {keysError && <p className="error">{keysError}</p>}
        {canManage ? (
          <div className="row" style={{ marginBottom: 12 }}>
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name"
              style={{ flex: 1 }}
            />
            <Button onClick={createApiKey}>Create API key</Button>
          </div>
        ) : (
          <p className="muted">Ask an Admin or Recruiter to create API keys.</p>
        )}
        {createdKey?.api_key && (
          <div className="apiKeyReveal">
            <p>
              <strong>Copy this key now — it won&apos;t be shown again.</strong>
            </p>
            <code>{createdKey.api_key}</code>
          </div>
        )}
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Prefix</th>
              <th>Created</th>
              <th>Last used</th>
              {canManage && <th />}
            </tr>
          </thead>
          <tbody>
            {apiKeys.map((k) => (
              <tr key={k.id}>
                <td>{k.name}</td>
                <td>
                  <code>{k.key_prefix}…</code>
                </td>
                <td>{k.created_at}</td>
                <td>{k.last_used_at || '—'}</td>
                {canManage && (
                  <td>
                    {k.active && (
                      <Button variant="outline" onClick={() => revokeKey(k.id)}>
                        Revoke
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!apiKeys.length && (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="empty">
                  No API keys yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {atsLoading && <p>Loading ATS configuration…</p>}
      {atsError && (
        <Card>
          <p className="error">{atsError}</p>
          <p className="muted">You may not have permission to view ATS settings. Contact an Admin or Recruiter.</p>
        </Card>
      )}

      {data && (
        <>
          <Card>
            <h2>Architecture flow</h2>
            <ol className="archFlow">
              {data.architecture.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </Card>

          <section className="grid two">
            <Card id="ats-connected">
              <h2>Connected systems</h2>
              {!data.integrations.length && (
                <p className="muted">No ATS integration configured for this organization yet.</p>
              )}
              {data.integrations.map((i) => (
                <div className="integrationRow" key={i.id}>
                  <b>{i.provider}</b>
                  <span>{i.enabled ? 'Enabled' : 'Disabled'}</span>
                  <small>Webhook secret: {i.webhook_secret ? `${i.webhook_secret.slice(0, 8)}…` : 'Not set'}</small>
                  <small>Writeback: {i.writeback_url || 'Not configured'}</small>
                </div>
              ))}
              {canManage ? (
                <>
                  <label>Writeback URL (Greenhouse or custom receiver)</label>
                  <input
                    value={writebackUrl}
                    onChange={(e) => setWritebackUrl(e.target.value)}
                    placeholder="https://harvest.greenhouse.io/v1/..."
                    disabled={!integration}
                  />
                  <div className="row" style={{ marginTop: 12 }}>
                    <Button variant="outline" onClick={saveWritebackUrl} disabled={!integration}>
                      Save writeback URL
                    </Button>
                    <Button variant="outline" onClick={testWebhook} disabled={!webhookSecret}>
                      Test webhook ingest
                    </Button>
                    <Button onClick={processQueue}>Process writeback queue</Button>
                  </div>
                </>
              ) : (
                <p className="muted">Webhook and writeback configuration requires Admin or Recruiter access.</p>
              )}
              {webhookResult && (
                <pre className="webhookResult">{JSON.stringify(webhookResult, null, 2)}</pre>
              )}
              {queueResult && (
                <pre className="webhookResult">{JSON.stringify(queueResult, null, 2)}</pre>
              )}
            </Card>

            <Card id="writeback-queue">
              <h2>Writeback queue</h2>
              <p className="muted">Scores, tags, and experience fit posted via HTTP after evaluation.</p>
              <table>
                <thead>
                  <tr>
                    <th>Application</th>
                    <th>Status</th>
                    <th>Attempts</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {data.writeback_queue.map((w) => (
                    <tr key={w.id}>
                      <td>{w.anonymized_code || w.application_id}</td>
                      <td title={w.last_error || ''}>{w.status}</td>
                      <td>{w.attempts ?? 0}</td>
                      <td>{w.sent_at || w.created_at}</td>
                    </tr>
                  ))}
                  {!data.writeback_queue.length && (
                    <tr>
                      <td colSpan={4} className="empty">
                        No writebacks yet — score a candidate to queue one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </section>

          <Card>
            <h2>Recent webhook events</h2>
            <table>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Event</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_events.map((e) => (
                  <tr key={e.id}>
                    <td>{e.provider}</td>
                    <td>{e.event_type}</td>
                    <td>{e.status}</td>
                    <td>{e.created_at}</td>
                  </tr>
                ))}
                {!data.recent_events.length && (
                  <tr>
                    <td colSpan={4} className="empty">
                      No webhook events yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <p className="muted">
        Need help wiring Greenhouse or Lever? See <Link to="/help">Help</Link> for setup steps.
      </p>
    </>
  );
}
