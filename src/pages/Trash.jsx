import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArchiveRestore, Briefcase, Trash2, User, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { Button, Card, BucketBadge } from '../components/ui';

function formatDeleted(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function Trash() {
  const [data, setData] = useState({ jobs: [], applications: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = () =>
    api('/trash')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const restoreJob = async (id) => {
    setBusy(`job-restore-${id}`);
    try {
      await api(`/jobs/${id}/restore`, { method: 'POST' });
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  const restoreApp = async (id) => {
    setBusy(`app-restore-${id}`);
    try {
      await api(`/applications/${id}/restore`, { method: 'POST' });
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  const purgeJob = async (job) => {
    if (
      !window.confirm(
        `Permanently delete "${job.title}" and all related data? This cannot be undone.`
      )
    )
      return;
    setBusy(`job-purge-${job.id}`);
    try {
      await api(`/jobs/${job.id}/permanent`, { method: 'DELETE' });
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  const purgeApp = async (app) => {
    if (!window.confirm(`Permanently delete this application? This cannot be undone.`)) return;
    setBusy(`app-purge-${app.id}`);
    try {
      await api(`/applications/${app.id}/permanent`, { method: 'DELETE' });
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  const empty = !data.jobs?.length && !data.applications?.length;

  return (
    <div className="dashPage">
      <div className="formPageTop">
        <p className="eyebrow">Recovery</p>
        <h1>Trash</h1>
        <p className="lead">
          Deleted positions and applications are kept here so you can recover mistakes. Restore brings
          everything back; permanent delete removes data for good (Admin / Recruiter only).
        </p>
      </div>

      <div className="trashNotice">
        <AlertCircle size={18} />
        <span>
          Moving something to trash hides it from the dashboard, positions list, and careers page. Use{' '}
          <strong>Recover</strong> to undo.
        </span>
      </div>

      {loading ? (
        <div className="loadingPage">
          <div className="spinner" />
          <p>Loading trash…</p>
        </div>
      ) : empty ? (
        <Card className="emptyTrash">
          <ArchiveRestore size={40} strokeWidth={1.5} />
          <h2>Trash is empty</h2>
          <p className="muted">When you delete a position or application, it will appear here for recovery.</p>
          <Link to="/jobs">
            <Button variant="outline">Back to positions</Button>
          </Link>
        </Card>
      ) : (
        <>
          {data.jobs?.length > 0 && (
            <Card className="trashSection">
              <h2>
                <Briefcase size={20} /> Deleted positions ({data.jobs.length})
              </h2>
              <p className="muted">Restoring a position also restores its applications.</p>
              <ul className="trashList">
                {data.jobs.map((job) => (
                  <li key={job.id} className="trashItem">
                    <div className="trashItemMain">
                      <b>{job.title}</b>
                      <span className="muted">
                        {job.location || 'No location'} · {job.applications_in_trash} application(s) ·
                        removed {formatDeleted(job.deleted_at)}
                      </span>
                    </div>
                    <div className="trashItemActions">
                      <Button
                        className="small"
                        disabled={busy === `job-restore-${job.id}`}
                        onClick={() => restoreJob(job.id)}
                      >
                        <ArchiveRestore size={14} /> Recover
                      </Button>
                      <Button
                        variant="outline"
                        className="small danger"
                        disabled={busy === `job-purge-${job.id}`}
                        onClick={() => purgeJob(job)}
                      >
                        <Trash2 size={14} /> Delete forever
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {data.applications?.length > 0 && (
            <Card className="trashSection">
              <h2>
                <User size={20} /> Deleted applications ({data.applications.length})
              </h2>
              <p className="muted">Individual applications removed from an active position.</p>
              <ul className="trashList">
                {data.applications.map((app) => (
                  <li key={app.id} className="trashItem">
                    <div className="trashItemMain">
                      <b>{app.name || app.anonymized_code || app.id}</b>
                      <span className="muted">
                        {app.job_title} · removed {formatDeleted(app.deleted_at)}
                      </span>
                      {app.score != null && (
                        <span className="trashScore">
                          Score {app.score} <BucketBadge bucket={app.bucket} />
                        </span>
                      )}
                    </div>
                    <div className="trashItemActions">
                      <Button
                        className="small"
                        disabled={busy === `app-restore-${app.id}`}
                        onClick={() => restoreApp(app.id)}
                      >
                        <ArchiveRestore size={14} /> Recover
                      </Button>
                      <Button
                        variant="outline"
                        className="small danger"
                        disabled={busy === `app-purge-${app.id}`}
                        onClick={() => purgeApp(app)}
                      >
                        <Trash2 size={14} /> Delete forever
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
