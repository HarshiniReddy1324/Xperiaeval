import React, { useState } from 'react';
import { api } from '../../api/client';
import { apiUrl } from '../../api/base.js';
import { Button, Card } from '../ui';
import { PilotUpgradeHint } from '../PilotProgram';
import { IntegrationCopyField } from './IntegrationCopyField';

const SAMPLE_EVALUATE_BODY = `{
  "candidate_name": "Alex Rivera",
  "candidate_email": "alex@example.com",
  "external_id": "gh-12345",
  "job_title": "Senior Software Engineer",
  "job_description": "Own product analytics and experimentation.",
  "resume_text": "Optional resume text for consistency checks.",
  "questions": [
    {
      "id": "q1",
      "name": "Technical depth",
      "question": "Describe a complex system you designed.",
      "ideal_answer": "Clear architecture, trade-offs, metrics."
    }
  ],
  "answers": [
    { "question_id": "q1", "answer": "I designed a pipeline that…" }
  ]
}`;

export function ApiKeysPanel({ apiKeys, keysError, canManage, onRefresh }) {
  const [newKeyName, setNewKeyName] = useState('Production');
  const [createdKey, setCreatedKey] = useState(null);
  const [actionError, setActionError] = useState('');

  const endpoint = apiUrl('/api/v1/evaluate');
  const curlExample = `curl -X POST '${endpoint}' \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d @payload.json`;

  const createApiKey = async () => {
    setActionError('');
    if (!canManage) return;
    try {
      const created = await api('/intelligence/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName }),
      });
      setCreatedKey(created);
      onRefresh();
    } catch (e) {
      setActionError(e.message);
    }
  };

  const revokeKey = async (id) => {
    setActionError('');
    try {
      await api(`/intelligence/api-keys/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (e) {
      setActionError(e.message);
    }
  };

  return (
    <>
      <p className="muted integrationsTabLead">
        Score candidates from your own systems without using the portal UI. Each key authenticates{' '}
        <code>POST /api/v1/evaluate</code> and returns the full intelligence report JSON.
      </p>

      <Card>
        <h2>Evaluate API</h2>
        <IntegrationCopyField label="Endpoint" value={endpoint} />
        <IntegrationCopyField
          label="Authorization header"
          value="Authorization: Bearer xpi_your_key_here"
          hint="Replace with a key you create below. Keys are shown once at creation."
        />
        <IntegrationCopyField label="Sample request body" value={SAMPLE_EVALUATE_BODY} />
        <IntegrationCopyField label="Sample curl" value={curlExample} />

        {keysError && <p className="error">{keysError}</p>}
        {actionError && <PilotUpgradeHint message={actionError} />}

        {canManage && (
          <div className="row" style={{ marginBottom: 12 }}>
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. Production)"
              style={{ flex: 1 }}
            />
            <Button onClick={createApiKey}>Create API key</Button>
          </div>
        )}

        {createdKey?.api_key && (
          <div className="apiKeyReveal">
            <p>
              <strong>Copy this key now, it won&apos;t be shown again.</strong>
            </p>
            <IntegrationCopyField label="API key" value={createdKey.api_key} />
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
                <td>{k.last_used_at || 'Never'}</td>
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
                  No API keys yet. Create one to call the evaluate endpoint from your ATS or scripts.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
