import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Download } from 'lucide-react';
import { api } from '../api/client';
import { returnState } from '../lib/navigation';
import { Button, Card } from '../components/ui';

export function RubricJobs() {
  const location = useLocation();
  const [jobs, setJobs] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api('/jobs')
      .then(setJobs)
      .catch((e) => setLoadError(e.message));
  }, []);

  return (
    <>
      <div className="pageHead">
        <h1>Screening by job</h1>
        <p>Open a position to edit its rubric, apply a template, or pull questions from the library.</p>
      </div>

      {loadError && <p className="error">{loadError}</p>}

      {!jobs.length ? (
        <Card>
          <p className="muted">No positions yet.</p>
          <Link to="/jobs/new">
            <Button>Create position</Button>
          </Link>
        </Card>
      ) : (
        <div className="templateGallery">
          {jobs.map((j) => (
            <Card key={j.id} className="templateCard">
              <h3>
                <Link to={`/jobs/${j.id}`} state={returnState(location)}>
                  {j.title}
                </Link>
              </h3>
              <p className="muted">
                {j.id} · {j.team} · Stage: {j.stage}
              </p>
              <div className="miniStats inline">
                <span>
                  {j.applicants} <small>Applicants</small>
                </span>
                <span>
                  {j.green} <small>Green</small>
                </span>
              </div>
              <Link to={`/jobs/${j.id}`} state={returnState(location)}>
                <Button variant="outline" className="small">
                  <Download size={14} /> Edit screening rubric
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
