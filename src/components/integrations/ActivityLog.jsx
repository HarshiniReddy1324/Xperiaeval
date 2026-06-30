import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Card } from '../ui';

function statusClass(status) {
  const s = String(status || '').toLowerCase();
  if (['success', 'connected', 'ingested', 'delivered'].includes(s)) return 'ok';
  if (['failed', 'error'].includes(s)) return 'error';
  if (['pending', 'queued'].includes(s)) return 'pending';
  return 'neutral';
}

export function ActivityLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api('/integrations/activity')
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter((r) => {
    if (filter === 'all') return true;
    return r.source === filter;
  });

  if (loading) return <p className="muted">Loading activity…</p>;

  return (
    <Card>
      <h2>Integration activity</h2>
      <p className="muted integrationsTabLead">
        Recent ATS webhooks, score writebacks, and Jira workflow events for your organization.
      </p>

      <div className="integrationActivityFilters">
        {[
          { id: 'all', label: 'All' },
          { id: 'ats', label: 'ATS' },
          { id: 'workflow', label: 'Jira' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            className={`integrationsTab${filter === f.id ? ' integrationsTab--active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>System</th>
            <th>Event</th>
            <th>Status</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={`${r.source}-${r.id}`}>
              <td>{r.source === 'ats' ? 'ATS' : 'Jira'}</td>
              <td>{r.provider}</td>
              <td>{r.label}</td>
              <td>
                <span className={`integrationStatus integrationStatus--${statusClass(r.status)}`}>
                  {r.status || 'N/A'}
                </span>
              </td>
              <td>{r.created_at ? new Date(r.created_at).toLocaleString() : 'N/A'}</td>
            </tr>
          ))}
          {!filtered.length && (
            <tr>
              <td colSpan={5} className="empty">
                No activity yet. Connect Jira or your ATS to see events here.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
