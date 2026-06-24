import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { Eye, UserCheck, Trash2, GitCompare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Button, Card, BucketBadge } from '../components/ui';

const SCREENING_CHIPS = [
  { key: '', label: 'All' },
  { key: 'complete', label: 'Complete' },
  { key: 'incomplete', label: 'Incomplete' },
  { key: 'ai_used', label: 'AI used' },
];

const SPECIAL_CHIPS = [{ param: 'hiddenGem', value: '1', label: 'Hidden gems' }];

const PIPELINE_LABELS = {
  application_review: 'App review',
  shortlisted_interview: 'Shortlisted',
  interview_scheduled: 'Scheduled',
  interview_completed: 'Interview done',
  rejected: 'Not advancing',
  final_review: 'Final review',
};

const SCHEDULE_LABELS = {
  awaiting_candidate: 'Awaiting booking',
  awaiting_interviewer: 'Confirm time',
  confirmed: 'Confirmed',
  declined: 'Declined',
};

export function Candidates() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [compareIds, setCompareIds] = useState([]);
  const jobId = searchParams.get('jobId');
  const screeningFilter = searchParams.get('screening');
  const bucketFilter = searchParams.get('bucket');
  const pipelineFilter = searchParams.get('pipeline');
  const integrityFilter = searchParams.get('integrity');
  const hiddenGemFilter = searchParams.get('hiddenGem');
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [filterJob, setFilterJob] = useState(jobId || '');
  const [filterBucket, setFilterBucket] = useState(bucketFilter || '');
  const [filterPipeline, setFilterPipeline] = useState(pipelineFilter || '');
  const [filterScreening, setFilterScreening] = useState(screeningFilter || '');
  const [filterIntegrity, setFilterIntegrity] = useState(integrityFilter || '');
  const [filterHiddenGem, setFilterHiddenGem] = useState(hiddenGemFilter || '');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    api('/jobs').then(setJobs).catch(console.error);
  }, []);

  useEffect(() => {
    setFilterJob(searchParams.get('jobId') || '');
    setFilterBucket(searchParams.get('bucket') || '');
    setFilterPipeline(searchParams.get('pipeline') || '');
    setFilterScreening(searchParams.get('screening') || '');
    setFilterIntegrity(searchParams.get('integrity') || '');
    setFilterHiddenGem(searchParams.get('hiddenGem') || '');
  }, [searchParams]);

  const loadCandidates = useCallback(() => {
    const q = new URLSearchParams();
    if (filterJob) q.set('jobId', filterJob);
    if (filterBucket) q.set('bucket', filterBucket);
    if (filterPipeline) q.set('pipeline', filterPipeline);
    if (filterScreening) q.set('screening', filterScreening);
    if (filterIntegrity) q.set('integrity', filterIntegrity);
    if (filterHiddenGem) q.set('hiddenGem', filterHiddenGem);
    return api(`/applications?${q}`).then(setCandidates).catch(console.error);
  }, [filterJob, filterBucket, filterPipeline, filterScreening, filterIntegrity, filterHiddenGem]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates, location.pathname, location.key]);

  const toggleCompare = (id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const startCompare = () => {
    if (compareIds.length < 2) return;
    navigate(`/candidates/compare?ids=${compareIds.join(',')}`);
  };

  const removeCandidate = async (c) => {
    if (!window.confirm(`Move application for ${c.name} to trash? You can recover from Trash.`)) return;
    setDeletingId(c.id);
    try {
      await api(`/applications/${c.id}`, { method: 'DELETE' });
      setCandidates((list) => list.filter((x) => x.id !== c.id));
    } catch (e) {
      alert(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="pageHead">
        <h1>Candidates</h1>
        <p>Applications ranked by score (0–100) and bucket — Green, Amber, or Red. Open a candidate for full answers and integrity signals.</p>
      </div>
      <Card>
        <div className="screeningChipRow">
          {SCREENING_CHIPS.map((chip) => {
            const active = filterScreening === chip.key;
            const params = new URLSearchParams();
            if (filterJob) params.set('jobId', filterJob);
            if (filterBucket) params.set('bucket', filterBucket);
            if (filterPipeline) params.set('pipeline', filterPipeline);
            if (filterIntegrity) params.set('integrity', filterIntegrity);
            if (filterHiddenGem) params.set('hiddenGem', filterHiddenGem);
            if (chip.key) params.set('screening', chip.key);
            const to = `/candidates${params.toString() ? `?${params}` : ''}`;
            return (
              <Link
                key={chip.key || 'all'}
                to={to}
                className={`screeningChip ${active ? 'active' : ''} ${chip.key === 'ai_used' ? 'red' : chip.key === 'incomplete' ? 'amber' : chip.key === 'complete' ? 'green' : 'blue'}`}
              >
                {chip.label}
              </Link>
            );
          })}
          {SPECIAL_CHIPS.map((chip) => {
            const active = filterHiddenGem === chip.value;
            const params = new URLSearchParams();
            if (filterJob) params.set('jobId', filterJob);
            if (filterBucket) params.set('bucket', filterBucket);
            if (filterPipeline) params.set('pipeline', filterPipeline);
            if (filterScreening) params.set('screening', filterScreening);
            if (filterIntegrity) params.set('integrity', filterIntegrity);
            if (!active) params.set(chip.param, chip.value);
            const to = `/candidates${params.toString() ? `?${params}` : ''}`;
            return (
              <Link
                key={chip.param}
                to={to}
                className={`screeningChip ${active ? 'active' : ''} amber`}
              >
                {chip.label}
              </Link>
            );
          })}
        </div>
        <div className="filters">
          <select value={filterJob} onChange={(e) => setFilterJob(e.target.value)}>
            <option value="">All jobs</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
          <select value={filterBucket} onChange={(e) => setFilterBucket(e.target.value)}>
            <option value="">All app buckets</option>
            <option value="Green">Green (app)</option>
            <option value="Amber">Amber (app)</option>
            <option value="Red">Red (app)</option>
          </select>
          <select value={filterPipeline} onChange={(e) => setFilterPipeline(e.target.value)}>
            <option value="">All pipeline stages</option>
            {Object.entries(PIPELINE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select value={filterScreening} onChange={(e) => setFilterScreening(e.target.value)}>
            <option value="">All screening status</option>
            <option value="complete">Complete</option>
            <option value="incomplete">Incomplete Applications</option>
            <option value="ai_used">AI Used</option>
          </select>
          <select value={filterIntegrity} onChange={(e) => setFilterIntegrity(e.target.value)}>
            <option value="">All integrity</option>
            <option value="flagged">Integrity flagged</option>
          </select>
          <Button>
            <UserCheck size={16} /> Assign review
          </Button>
          <Button variant="outline" disabled={compareIds.length < 2} onClick={startCompare}>
            <GitCompare size={16} /> Compare ({compareIds.length}/2)
          </Button>
        </div>
        {compareIds.length > 0 && (
          <p className="muted compareHint">
            Select two candidates for the same job, then Compare. {compareIds.length < 2 ? 'Pick one more.' : 'Ready.'}
          </p>
        )}
        <div className="tableScrollWrap">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Candidate</th>
              <th>Score /100</th>
              <th>Recommendation</th>
              <th>Bucket</th>
              <th>Schedule</th>
              <th>Screening</th>
              <th>Completion</th>
              <th>Pipeline</th>
              <th>Source</th>
              <th>Authenticity</th>
              <th>Job</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.id} className={compareIds.includes(c.id) ? 'compareSelected' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={compareIds.includes(c.id)}
                    onChange={() => toggleCompare(c.id)}
                    title="Add to comparison"
                  />
                </td>
                <td>
                  <b>{c.name}</b>
                  {c.hidden_gem === 1 && <span className="hiddenGemBadge small">Hidden gem</span>}
                  <small>
                    {c.id} · {c.email}
                  </small>
                </td>
                <td className="score">{c.application_score ?? c.score ?? '—'}</td>
                <td>
                  <small>{c.recommendation || '—'}</small>
                </td>
                <td>
                  {(c.application_bucket || c.bucket) ? (
                    <BucketBadge bucket={c.application_bucket || c.bucket} />
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {c.schedule_status ? (
                    <span className={`scheduleBadge ${c.schedule_status}`}>
                      {SCHEDULE_LABELS[c.schedule_status] || c.schedule_status}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <span className={`screenTag ${c.screening_status || ''}`}>{c.screening_category || c.screening_status || '—'}</span>
                </td>
                <td>{c.completion_pct != null ? `${c.completion_pct}%` : '—'}</td>
                <td>{PIPELINE_LABELS[c.pipeline_stage] || c.pipeline_stage || '—'}</td>
                <td>{c.source}</td>
                <td>
                  {c.authenticity_score != null ? (
                    <span className={c.authenticity_score >= 75 ? 'authOk' : c.authenticity_score >= 50 ? 'authWarn' : 'authBad'}>
                      {c.authenticity_score}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{c.job_title}</td>
                <td>
                  <div className="row tight">
                    <Link to={`/candidates/${c.id}`}>
                      <Button>
                        <Eye size={15} /> View
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="small danger"
                      disabled={deletingId === c.id}
                      onClick={() => removeCandidate(c)}
                      title="Move to trash"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!candidates.length && (
              <tr>
                <td colSpan={14} className="empty">
                  No applications yet. Share a job apply link to collect candidates.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </Card>
    </>
  );
}
