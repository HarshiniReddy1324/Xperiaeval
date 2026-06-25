import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import { Card } from '../components/ui';

export function Audit() {
  const [events, setEvents] = useState([]);
  const [loadError, setLoadError] = useState('');

  const load = () =>
    api('/audit')
      .then((rows) => {
        setEvents(rows);
        setLoadError('');
      })
      .catch((e) => setLoadError(e.message));

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="pageHead">
        <h1>Compliance audit log</h1>
        <p>Every score, view, override, export, and policy version is logged.</p>
      </div>
      <Card>
        {loadError && (
          <p className="error" role="alert">
            {loadError}{' '}
            <button type="button" className="linkBtn" onClick={load}>
              Retry
            </button>
          </p>
        )}
        {events.map((e) => (
          <div className="audit" key={e.id}>
            <ShieldCheck size={20} />
            <div>
              <b>{e.event_type}</b>
              <p>{e.description}</p>
              <small>
                {e.actor_name} · {e.created_at}
                {e.job_id ? ` · ${e.job_id}` : ''}
              </small>
            </div>
          </div>
        ))}
        {!events.length && <p className="muted">No audit events yet.</p>}
      </Card>
    </>
  );
}
