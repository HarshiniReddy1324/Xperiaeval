import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GitCompare } from 'lucide-react';
import { api } from '../api/client';
import { Button, Card, BucketBadge } from '../components/ui';
import { DimensionRadar } from '../components/DimensionRadar';

const COLORS = ['#6366f1', '#059669', '#d97706', '#dc2626'];

export function CandidateCompare() {
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const ids = params.get('ids');
    if (!ids) {
      setError('Select candidates from the list to compare.');
      return;
    }
    api(`/applications/compare?ids=${encodeURIComponent(ids)}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [params]);

  if (error && !data) {
    return (
      <Card>
        <p className="error">{error}</p>
        <Link to="/candidates">
          <Button>Back to candidates</Button>
        </Link>
      </Card>
    );
  }

  if (!data) {
    return (
      <div className="loadingPage">
        <div className="spinner" />
        <p>Loading comparison…</p>
      </div>
    );
  }

  const { candidates } = data;

  return (
    <div className="comparePage">
      <div className="pageHead row">
        <div>
          <h1>
            <GitCompare size={28} /> Compare candidates
          </h1>
          <p className="muted">Side-by-side intelligence dimensions for the same role.</p>
        </div>
        <Link to={data.job_id ? `/candidates?jobId=${data.job_id}` : '/candidates'}>
          <Button variant="outline">← Back to list</Button>
        </Link>
      </div>

      <div className="compareGrid">
        {candidates.map((c, i) => {
          const intel = c.intelligence;
          const dims = intel?.dimensions || {};
          return (
            <Card key={c.id} className="compareCard">
              <div className="compareCardHead">
                <div>
                  <h2>{c.application?.display_name || c.application?.name}</h2>
                  <p className="muted">{c.id}</p>
                </div>
                <div className="compareScoreBlock">
                  <strong className="compareScore">{c.score?.overall ?? '—'}</strong>
                  {c.score?.bucket && <BucketBadge bucket={c.score.bucket} />}
                  <small>{intel?.tier || c.score?.tier}</small>
                </div>
              </div>
              <DimensionRadar dimensions={dims} color={COLORS[i % COLORS.length]} size={220} />
              <p className="muted">
                <strong>{intel?.recommendation || c.score?.recommendation}</strong>
              </p>
              <Link to={`/candidates/${c.id}`}>
                <Button variant="outline" className="small">
                  Full profile
                </Button>
              </Link>
            </Card>
          );
        })}
      </div>

      <Card className="compareOverlay">
        <h3>Dimension overlay</h3>
        <p className="muted">Same axes — compare radar shapes at a glance.</p>
        <div className="compareOverlayRadars">
          {candidates.map((c, i) => (
            <DimensionRadar
              key={c.id}
              label={c.application?.display_name || c.id}
              dimensions={c.intelligence?.dimensions}
              color={COLORS[i % COLORS.length]}
              size={180}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
