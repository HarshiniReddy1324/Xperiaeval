import React, { useState } from 'react';
import { api } from '../../api/client';
import { apiUrl } from '../../api/base.js';
import { Button, Card } from '../ui';
import { PilotUpgradeHint } from '../PilotProgram';
import { IntegrationCopyField } from './IntegrationCopyField';

const SAMPLE_WEBHOOK_BODY = `{
  "candidate": {
    "id": "gh-12345",
    "name": "Alex Rivera",
    "email": "alex@example.com"
  },
  "job_id": "REQ-1001",
  "job_title": "Senior Software Engineer",
  "stage": "applied"
}`;

export function AtsPanel({ data, loading, error, canManage, canCreateAts, onRefresh }) {
  const [provider, setProvider] = useState('greenhouse');
  const [writebackUrl, setWritebackUrl] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [created, setCreated] = useState(null);

  const integration = data?.integrations?.[0];
  const health = data?.health?.ats;
  const isDemoWriteback = (url) =>
    !url || url.includes('writeback-receiver') || url.includes('127.0.0.1') || url.includes('localhost');

  React.useEffect(() => {
    if (integration?.writeback_url) setWritebackUrl(integration.writeback_url);
  }, [integration?.writeback_url]);

  const createAts = async () => {
    setBusy('create');
    setActionError('');
    setMessage('');
    try {
      const res = await api('/integrations/ats', {
        method: 'POST',
        body: JSON.stringify({ provider }),
      });
      setCreated(res);
      setMessage('ATS connection created. Copy the webhook secret now; it is only shown once.');
      onRefresh();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy('');
    }
  };

  const testWebhook = async () => {
    setBusy('test');
    setActionError('');
    setMessage('');
    if (!integration) {
      setActionError('Create an ATS connection first.');
      setBusy('');
      return;
    }
    try {
      const body = await api('/integrations/ats/test', { method: 'POST' });
      const appId = body.ingest?.application_id;
      setMessage(
        appId
          ? `Test passed: candidate ${appId} ingested. Open Candidates to review.`
          : 'Test passed: webhook received'
      );
      onRefresh();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy('');
    }
  };

  const saveWriteback = async () => {
    setBusy('writeback');
    setActionError('');
    try {
      await api(`/integrations/ats/${integration.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ writeback_url: writebackUrl }),
      });
      setMessage('Writeback URL saved');
      onRefresh();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy('');
    }
  };

  const useDemoWriteback = () => {
    setWritebackUrl(apiUrl('/api/integrations/ats/writeback-receiver'));
  };

  const processQueue = async () => {
    setBusy('queue');
    setActionError('');
    try {
      const result = await api('/integrations/ats/process-queue', { method: 'POST' });
      setMessage(`Processed ${result.processed ?? 0} writeback(s)`);
      onRefresh();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy('');
    }
  };

  if (loading) return <p className="muted">Loading ATS configuration…</p>;
  if (error) return <p className="error">{error}</p>;

  const webhookUrl =
    data?.webhook_url?.startsWith('http') ? data.webhook_url : apiUrl(data?.webhook_url || '/api/integrations/ats/webhook');

  return (
    <div className="atsPanel">
      <p className="muted integrationsTabLead">
        <strong>Inbound:</strong> your ATS sends new applicants to Xperieval. <strong>Outbound (writeback):</strong>{' '}
        after scoring, Xperieval POSTs the intelligence summary back to your ATS or middleware.
      </p>

      {health && (
        <div className="integrationHealthRow">
          <span className={health.connected ? 'healthOk' : 'healthWarn'}>
            {health.connected ? 'ATS connected' : 'No ATS connection'}
          </span>
          {health.last_ingested_at && (
            <span className="muted">Last ingest: {new Date(health.last_ingested_at).toLocaleString()}</span>
          )}
          {(health.pending_writebacks > 0 || health.failed_writebacks > 0) && (
            <span className="healthWarn">
              Writeback queue: {health.pending_writebacks} pending, {health.failed_writebacks} failed
            </span>
          )}
        </div>
      )}

      {actionError && <PilotUpgradeHint message={actionError} />}
      {message && <p className="success">{message}</p>}

      {!integration && canCreateAts && (
        <Card className="atsStepCard">
          <h2>Step 1: Create ATS connection</h2>
          <p className="muted">Admins create the connection once. Recruiters can test webhooks and process writebacks.</p>
          <label>
            Provider label
            <select value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="greenhouse">Greenhouse</option>
              <option value="lever">Lever</option>
              <option value="generic">Generic webhook</option>
            </select>
          </label>
          <Button onClick={createAts} disabled={!!busy}>
            {busy === 'create' ? 'Creating…' : 'Create ATS connection'}
          </Button>
        </Card>
      )}

      {!integration && canManage && !canCreateAts && (
        <Card className="atsStepCard">
          <p className="muted">Ask an admin to create the ATS connection for your organization.</p>
        </Card>
      )}

      {(integration || created) && (
        <Card className="atsStepCard" id="ats-webhook">
          <h2>Step 2: Inbound webhook (ATS → Xperieval)</h2>
          <p className="muted">
            Configure your ATS to POST new applications here. Include the secret header on every request.
          </p>
          <IntegrationCopyField label="Webhook URL" value={webhookUrl} />
          {created?.webhook_secret && (
            <IntegrationCopyField
              label="Webhook secret (copy now)"
              value={created.webhook_secret}
              hint="Store this in your ATS webhook settings. It is not shown again after you leave this page."
            />
          )}
          {integration?.has_webhook_secret && !created?.webhook_secret && (
            <p className="muted">Webhook secret is configured. It is not stored in the browser for security.</p>
          )}
          <IntegrationCopyField
            label="Sample JSON body"
            value={SAMPLE_WEBHOOK_BODY}
            hint="Field names can vary; map them in your ATS or middleware."
          />
          {canManage && (
            <Button variant="outline" onClick={testWebhook} disabled={!!busy || !integration}>
              {busy === 'test' ? 'Testing…' : 'Send test candidate'}
            </Button>
          )}
        </Card>
      )}

      {integration && (
        <section className="atsWritebackGrid" id="writeback-queue">
          <Card className="atsStepCard atsWritebackExplain">
            <h2>Step 3: Outbound writeback (Xperieval → ATS)</h2>
            <div className="atsWritebackCallout">
              <p>
                After a candidate is scored, Xperieval can POST a JSON payload with overall score, bucket, and
                recommendation, and key dimensions.
              </p>
            </div>
            <label>
              Writeback URL
              <input
                type="url"
                value={writebackUrl}
                onChange={(e) => setWritebackUrl(e.target.value)}
                placeholder="https://your-ats.com/webhooks/xperieval-scores"
              />
            </label>
            {canManage && (
              <div className="row">
                <Button onClick={saveWriteback} disabled={!!busy}>
                  {busy === 'writeback' ? 'Saving…' : 'Save writeback URL'}
                </Button>
                <Button variant="outline" onClick={useDemoWriteback} disabled={!!busy}>
                  Use demo receiver
                </Button>
              </div>
            )}
            {isDemoWriteback(writebackUrl) && (
              <p className="muted">Demo receiver logs writebacks locally for testing. Do not use in production.</p>
            )}
          </Card>

          <Card className="atsStepCard">
            <h2>Writeback queue</h2>
            <p className="muted">Pending and failed score deliveries to your ATS.</p>
            {canManage && (
              <Button variant="outline" onClick={processQueue} disabled={!!busy}>
                {busy === 'queue' ? 'Processing…' : 'Process queue now'}
              </Button>
            )}
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Status</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {(data?.writeback_queue || []).map((w) => (
                  <tr key={w.id}>
                    <td>{w.anonymized_code || w.application_id}</td>
                    <td>{w.status}</td>
                    <td>{w.created_at ? new Date(w.created_at).toLocaleString() : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}
    </div>
  );
}
