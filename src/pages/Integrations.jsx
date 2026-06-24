import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { apiUrl } from '../api/base.js';
import { Button, Card } from '../components/ui';

export function Integrations() {
  const [data, setData] = useState(null);
  const [webhookResult, setWebhookResult] = useState(null);
  const [queueResult, setQueueResult] = useState(null);
  const [writebackUrl, setWritebackUrl] = useState('');

  const refresh = () => api('/integrations/ats').then(setData).catch(console.error);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (data?.integrations?.[0]?.writeback_url) {
      setWritebackUrl(data.integrations[0].writeback_url);
    }
  }, [data]);

  const testWebhook = async () => {
    const res = await fetch(apiUrl('/api/integrations/ats/webhook'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': 'demo-webhook-secret',
        'X-Ats-Provider': 'greenhouse',
      },
      body: JSON.stringify({
        candidate: { id: 'gh-999', name: 'Test Candidate', email: 'test@example.com' },
        job_id: 'REQ-1001',
        stage: 'applied',
      }),
    });
    setWebhookResult(await res.json());
    refresh();
  };

  const processQueue = async () => {
    const result = await api('/integrations/ats/process-queue', { method: 'POST' });
    setQueueResult(result);
    refresh();
  };

  const saveWritebackUrl = async () => {
    const integration = data?.integrations?.[0];
    if (!integration) return;
    await api(`/integrations/ats/${integration.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ writeback_url: writebackUrl }),
    });
    refresh();
  };

  if (!data) return <p>Loading…</p>;

  return (
    <>
      <div className="pageHead">
        <h1>ATS integrations</h1>
        <p>Webhook ingestion and HTTP egress writeback to Greenhouse (or any JSON endpoint).</p>
      </div>

      <Card>
        <h2>Architecture flow</h2>
        <ol className="archFlow">
          {data.architecture.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </Card>

      <section className="grid two">
        <Card>
          <h2>Connected systems</h2>
          {data.integrations.map((i) => (
            <div className="integrationRow" key={i.id}>
              <b>{i.provider}</b>
              <span>{i.enabled ? 'Enabled' : 'Disabled'}</span>
              <small>API: {i.api_key_hint}</small>
              <small>Writeback: {i.writeback_url || 'Not configured'}</small>
            </div>
          ))}
          <label>Writeback URL (Greenhouse or custom receiver)</label>
          <input
            value={writebackUrl}
            onChange={(e) => setWritebackUrl(e.target.value)}
            placeholder="https://harvest.greenhouse.io/v1/..."
          />
          <div className="row" style={{ marginTop: 12 }}>
            <Button variant="outline" onClick={saveWritebackUrl}>
              Save writeback URL
            </Button>
            <Button variant="outline" onClick={testWebhook}>
              Test webhook ingest
            </Button>
            <Button onClick={processQueue}>Process writeback queue</Button>
          </div>
          {webhookResult && (
            <pre className="webhookResult">{JSON.stringify(webhookResult, null, 2)}</pre>
          )}
          {queueResult && (
            <pre className="webhookResult">{JSON.stringify(queueResult, null, 2)}</pre>
          )}
        </Card>

        <Card>
          <h2>Writeback queue (egress)</h2>
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
                    No writebacks yet — score an application to queue one.
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
          </tbody>
        </table>
      </Card>
    </>
  );
}
