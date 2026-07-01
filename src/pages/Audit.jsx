import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Download, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { canViewAuditLog } from '../lib/roleAccess';
import { Button, Card } from '../components/ui';

const EVENT_TYPES = [
  '',
  'Candidate intelligence scored',
  'Bucket override',
  'Reviewer note',
  'Application submitted',
  'Integrity alert',
  'Background check',
  'Voice verification',
  'Pipeline updated',
];

function formatWhen(iso) {
  if (!iso) return 'N/A';
  try {
    return new Date(iso.replace(' ', 'T')).toLocaleString();
  } catch {
    return iso;
  }
}

export function Audit() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [eventType, setEventType] = useState('');
  const [jobId, setJobId] = useState('');

  const load = () => {
    const q = new URLSearchParams();
    if (eventType) q.set('eventType', eventType);
    if (jobId.trim()) q.set('jobId', jobId.trim());
    q.set('limit', '200');
    return api(`/audit?${q}`)
      .then((rows) => {
        setEvents(rows);
        setLoadError('');
      })
      .catch((e) => setLoadError(e.message));
  };

  useEffect(() => {
    load();
  }, [eventType, jobId]);

  if (!canViewAuditLog(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  const exportCsv = () => {
    const rows = [['When', 'Event', 'Description', 'Actor', 'Position', 'Application']];
    events.forEach((e) => {
      rows.push([
        e.created_at,
        e.event_type,
        (e.description || '').replace(/"/g, '""'),
        e.actor_name || '',
        e.job_id || '',
        e.application_id || '',
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'xperieval-audit.csv';
    a.click();
  };

  const grouped = useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      const day = (ev.created_at || '').slice(0, 10) || 'Unknown';
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(ev);
    }
    return [...map.entries()];
  }, [events]);

  return (
    <>
      <div className="pageHead row">
        <div>
          <h1>Compliance audit log</h1>
          <p>
            Timestamped timeline of scoring, reviews, overrides, integrity events, and decisions: who did what and
            when.
          </p>
        </div>
        <Button onClick={exportCsv} disabled={!events.length}>
          <Download size={16} /> Export CSV
        </Button>
      </div>

      <Card className="auditFilters">
        <div className="auditFilterRow">
          <label>
            Event type
            <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
              <option value="">All events</option>
              {EVENT_TYPES.filter(Boolean).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            Position ID
            <input
              placeholder="e.g. JOB-INT-001"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
            />
          </label>
        </div>
      </Card>

      <Card>
        {loadError && (
          <p className="error" role="alert">
            {loadError}{' '}
            <button type="button" className="linkBtn" onClick={load}>
              Retry
            </button>
          </p>
        )}

        {!events.length && !loadError && <p className="muted">No audit events yet.</p>}

        <div className="auditTimeline">
          {grouped.map(([day, dayEvents]) => (
            <section key={day} className="auditTimelineDay">
              <h3 className="auditTimelineDate">{day}</h3>
              <ol className="auditTimelineList">
                {dayEvents.map((e) => (
                  <li key={e.id} className="auditTimelineItem">
                    <span className="auditTimelineDot" aria-hidden />
                    <div className="auditTimelineBody">
                      <div className="auditTimelineHead">
                        <ShieldCheck size={16} />
                        <b>{e.event_type}</b>
                        <time>{formatWhen(e.created_at)}</time>
                      </div>
                      <p>{e.description}</p>
                      <small>
                        {e.actor_name || 'System'}
                        {e.application_id && (
                          <>
                            {' · '}
                            <Link to={`/candidates/${e.application_id}`}>View candidate</Link>
                          </>
                        )}
                        {e.job_id && !e.application_id && <> · {e.job_id}</>}
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </Card>
    </>
  );
}
