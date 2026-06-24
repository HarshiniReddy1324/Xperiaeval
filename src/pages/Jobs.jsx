import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Pencil, ExternalLink } from 'lucide-react';
import { api } from '../api/client';
import { Button, Card } from '../components/ui';

const STAGE_TONE = {
  Draft: 'purple',
  Open: 'amber',
  Screening: 'blue',
  'Hiring Team Review': 'blue',
  Interviewing: 'green',
};

export function Jobs() {
  const [searchParams] = useSearchParams();
  const stageFilter = searchParams.get('stage') || '';
  const [jobs, setJobs] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  const load = () => api('/jobs').then(setJobs).catch(console.error);

  useEffect(() => {
    load();
  }, []);

  const filtered = stageFilter ? jobs.filter((j) => j.stage === stageFilter) : jobs;

  const removeJob = async (e, job) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Move "${job.title}" to trash? You can recover it from Trash.`)) return;
    setDeletingId(job.id);
    try {
      await api(`/jobs/${job.id}`, { method: 'DELETE' });
      setJobs((list) => list.filter((j) => j.id !== job.id));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="pageHead row">
        <div>
          <h1>Positions</h1>
          <p>
            Manage requisitions, rubrics, careers pages, and application links.
            {stageFilter && (
              <>
                {' '}
                <Link to="/jobs">Clear filter</Link> — showing <strong>{stageFilter}</strong> only.
              </>
            )}
          </p>
        </div>
        <Link to="/jobs/new">
          <Button>
            <Plus size={16} /> New job
          </Button>
        </Link>
      </div>
      {!filtered.length ? (
        <Card>
          <p className="muted">{stageFilter ? `No positions in "${stageFilter}" stage.` : 'No jobs yet.'}</p>
          <Link to="/jobs/new">
            <Button>Create your first job posting</Button>
          </Link>
        </Card>
      ) : (
        <div className="jobGrid">
          {filtered.map((j) => (
            <Card key={j.id} className="jobCard">
              <div className="jobCardHead">
                <Link to={`/jobs/${j.id}`} className="jobCardLink">
                  <h2>{j.title}</h2>
                  <p className="muted">
                    {j.id} · <span className={`statusTag ${STAGE_TONE[j.stage] || 'blue'}`}>{j.stage}</span>
                  </p>
                  <div className="miniStats inline">
                    <span>
                      {j.applicants} <small>All</small>
                    </span>
                    <span>
                      {j.green} <small>Green</small>
                    </span>
                    <span>
                      {j.amber} <small>Amber</small>
                    </span>
                    <span>
                      {j.red} <small>Red</small>
                    </span>
                  </div>
                </Link>
                <div className="jobCardActions">
                  <Link to={`/jobs/${j.id}/edit`} title="Edit posting">
                    <Button variant="outline" className="small">
                      <Pencil size={14} />
                    </Button>
                  </Link>
                  <a href={`/careers/${j.slug}`} target="_blank" rel="noreferrer" title="Careers page">
                    <Button variant="outline" className="small">
                      <ExternalLink size={14} />
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    className="small danger"
                    disabled={deletingId === j.id}
                    onClick={(e) => removeJob(e, j)}
                    title="Move to trash"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <p className="applyLink">
                Apply: <code>/apply/{j.slug}</code> · Careers: <code>/careers/{j.slug}</code>
              </p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
