import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Key, Plug, RefreshCw, Sparkles, Users } from 'lucide-react';
import { api } from '../api/client';
import { Card } from '../components/ui';

function bucketClass(bucket) {
  if (bucket === 'Green') return 'bucketGreen';
  if (bucket === 'Amber') return 'bucketAmber';
  return 'bucketRed';
}

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function humanEvent(event) {
  const type = event.event_type || '';
  if (type.includes('writeback.sent') || type === 'delivered') return 'Score sent to ATS';
  if (type.includes('writeback.received')) return 'ATS acknowledged score';
  if (event.status === 'ingested') return 'Candidate synced from ATS';
  if (type.includes('applied') || type === 'candidate.updated') return 'New application from ATS';
  return type.replace(/\./g, ' ') || 'Webhook received';
}

export function IntelligenceDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/intelligence/dashboard')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) {
    return (
      <div className="loadingPage">
        <div className="spinner" />
        <p>Loading intelligence workspace…</p>
      </div>
    );
  }

  const summary = data.api_summary || {};
  const hasEvaluations = (data.evaluations_total ?? 0) > 0;
  const hasAtsActivity = (data.ats_candidates_synced ?? 0) > 0 || (data.ats_events?.length ?? 0) > 0;

  return (
    <div className="intelligenceDashboard">
      <section className="intelWorkflow">
        <Card className="intelWorkflowStep">
          <span className="intelWorkflowNum">1</span>
          <Plug size={20} />
          <div>
            <strong>Connect your ATS</strong>
            <p>Greenhouse, Lever, or any system that can send webhooks.</p>
          </div>
          <Link to="/integrations" className="intelWorkflowLink">
            Set up <ArrowRight size={14} />
          </Link>
        </Card>
        <Card className="intelWorkflowStep">
          <span className="intelWorkflowNum">2</span>
          <Sparkles size={20} />
          <div>
            <strong>Score experience</strong>
            <p>Each candidate gets an explainable fit score with evidence and risk flags.</p>
          </div>
          <Link to="/integrations" className="intelWorkflowLink">
            API keys <ArrowRight size={14} />
          </Link>
        </Card>
        <Card className="intelWorkflowStep">
          <span className="intelWorkflowNum">3</span>
          <RefreshCw size={20} />
          <div>
            <strong>Write back to ATS</strong>
            <p>Scores, tags, and notes sync to your system of record automatically.</p>
          </div>
          <Link to="/integrations#writeback-queue" className="intelWorkflowLink">
            View queue <ArrowRight size={14} />
          </Link>
        </Card>
      </section>

      <section className="intelKpiGrid">
        <Card className="intelKpi">
          <Sparkles size={20} />
          <div>
            <strong>{summary.avg_experience_score ?? '—'}</strong>
            <span>Avg experience score</span>
            <small>{hasEvaluations ? `From ${data.evaluations_total} API evaluations` : 'No evaluations yet'}</small>
          </div>
        </Card>
        <Card className="intelKpi">
          <Users size={20} />
          <div>
            <strong>{data.ats_candidates_synced ?? 0}</strong>
            <span>Candidates from ATS</span>
            <small>Synced via webhook</small>
          </div>
          <Link to="/candidates">View</Link>
        </Card>
        <Card className="intelKpi">
          <Key size={20} />
          <div>
            <strong>{data.api_keys_active ?? 0}</strong>
            <span>Active API keys</span>
            <small>For direct evaluate calls</small>
          </div>
          <Link to="/integrations">Manage</Link>
        </Card>
        <Card className="intelKpi">
          <RefreshCw size={20} />
          <div>
            <strong>{data.ats_events?.filter((e) => e.status === 'ingested').length ?? 0}</strong>
            <span>Recent ATS syncs</span>
            <small>Last 8 webhook events</small>
          </div>
        </Card>
      </section>

      {hasEvaluations && (
        <section className="expIntelPanel">
          <div className="expIntelPanelHead">
            <div>
              <span className="expIntelTag">
                <Sparkles size={12} /> Score breakdown
              </span>
              <h2>Candidate evaluation breakdown</h2>
              <p className="muted">Distribution from API evaluations across your connected ATS.</p>
            </div>
          </div>
          <div className="intelTierRow">
            <div className="intelTierCard intelTierCard--elite">
              <strong>{summary.elite_candidates ?? 0}</strong>
              <span>Elite</span>
            </div>
            <div className="intelTierCard intelTierCard--strong">
              <strong>{summary.strong_match ?? 0}</strong>
              <span>Strong match</span>
            </div>
            <div className="intelTierCard intelTierCard--review">
              <strong>{summary.needs_review ?? 0}</strong>
              <span>Needs review</span>
            </div>
            <div className="intelTierCard intelTierCard--risk">
              <strong>{summary.high_risk ?? 0}</strong>
              <span>Elevated risk</span>
            </div>
          </div>
        </section>
      )}

      {!hasEvaluations && !hasAtsActivity && (
        <Card className="intelEmptyState">
          <h2>Get your first score</h2>
          <p>
            You haven&apos;t evaluated any candidates yet. Create an API key and POST a candidate payload, or send a test
            webhook from <Link to="/integrations">Integrations</Link>.
          </p>
          <div className="row">
            <Link to="/integrations" className="btn">
              Go to Integrations
            </Link>
            <Link to="/help" className="btn outline">
              Read setup guide
            </Link>
          </div>
        </Card>
      )}

      <section className="grid two">
        <Card>
          <h2>Recent scores</h2>
          <p className="muted">Candidates evaluated through the Intelligence API.</p>
          <table>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Role</th>
                <th>Score</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {(data.recent_evaluations || []).map((row) => (
                <tr key={row.id}>
                  <td>{row.candidate_name || row.external_id || '—'}</td>
                  <td>{row.job_title || '—'}</td>
                  <td>
                    {row.experience_score != null ? (
                      <span className={bucketClass(row.bucket)}>{row.experience_score}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{formatWhen(row.created_at)}</td>
                </tr>
              ))}
              {!data.recent_evaluations?.length && (
                <tr>
                  <td colSpan={4} className="empty">
                    No scores yet. Use the Evaluate API or ingest candidates from your ATS.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <Card>
          <h2>ATS activity</h2>
          <p className="muted">Webhook events from connected applicant tracking systems.</p>
          <ul className="intelActivityList">
            {(data.ats_events || []).map((e) => (
              <li key={e.id} className="intelActivityItem">
                <div>
                  <strong>{humanEvent(e)}</strong>
                  <span>{e.provider}</span>
                </div>
                <time>{formatWhen(e.created_at)}</time>
              </li>
            ))}
            {!data.ats_events?.length && (
              <li className="intelActivityItem intelActivityItem--empty">
                No ATS events yet. Configure a webhook in Integrations.
              </li>
            )}
          </ul>
          <Link to="/integrations" className="textLink">
            Configure ATS integration →
          </Link>
        </Card>
      </section>
    </div>
  );
}
