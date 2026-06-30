import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../ui';

export function CandidateWorkflowActions({ applicationId, connectorLinks, onUpdated, canManage }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const jira = connectorLinks?.jira;
  const hasLink = Boolean(jira?.url);
  if (!canManage && !hasLink) return null;

  const createIssue = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api(`/connectors/jira/candidates/${applicationId}`, {
        method: 'POST',
        body: JSON.stringify({ force: false }),
      });
      onUpdated?.(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="candidateAtlassianBar">
      <span className="candidateAtlassianLabel">Jira</span>
      {jira?.url ? (
        <a href={jira.url} target="_blank" rel="noreferrer" className="connectorDocsLink">
          {jira.issue_key} <ExternalLink size={14} />
        </a>
      ) : canManage ? (
        <Button className="small outline" onClick={createIssue} disabled={busy}>
          {busy ? 'Creating…' : 'Create issue'}
        </Button>
      ) : null}
      {error && <span className="error candidateAtlassianError">{error}</span>}
    </div>
  );
}
