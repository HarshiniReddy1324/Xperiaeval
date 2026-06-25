import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { Eye, Trash2, GitCompare } from 'lucide-react';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [compareIds, setCompareIds] = useState([]);
  const [compareError, setCompareError] = useState('');
  const jobId = searchParams.get('jobId');
  const screeningFilter = searchParams.get('screening');
  const bucketFilter = searchParams.get('bucket');
  const pipelineFilter = searchParams.get('pipeline');
  const integrityFilter = searchParams.get('integrity');
  const hiddenGemFilter = searchParams.get('hiddenGem');
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const filterJob = jobId || '';
  const filterBucket = bucketFilter || '';
  const filterPipeline = pipelineFilter || '';
  const filterScreening = screeningFilter || '';
  const filterIntegrity = integrityFilter || '';
  const filterHiddenGem = hiddenGemFilter || '';

  const updateFilters = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    api('/jobs').then(setJobs).catch((e) => setLoadError(e.message));
  }, []);

  const loadCandidates = useCallback(() => {
    const q = new URLSearchParams();
    if (filterJob) q.set('jobId', filterJob);
    if (filterBucket) q.set('bucket', filterBucket);
    if (filterPipeline) q.set('pipeline', filterPipeline);
    if (filterScreening) q.set('screening', filterScreening);
    if (filterIntegrity) q.set('integrity', filterIntegrity);
    if (filterHiddenGem) q.set('hiddenGem', filterHiddenGem);
    return api(`/applications?${q}`).then(setCandidates).catch((e) => setLoadError(e.message));
  }, [filterJob, filterBucket, filterPipeline, filterScreening, filterIntegrity, filterHiddenGem]);

  useEffect(() => {
    setLoadError('');
    loadCandidates();
  }, [loadCandidates, location.pathname, location.key]);

  const toggleCompare = (id) => {
    setCompareError('');
    const candidate = candidates.find((c) => c.id === id);
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      if (prev.length === 1 && candidate?.job_id) {
        const first = candidates.find((c) => c.id === prev[0]);
        if (first?.job_id && first.job_id !== candidate.job_id) {
          setCompareError('Select candidates from the same job to compare.');
          return prev;
        }
      }
      return [...prev, id];
    });
  };

  const startCompare = () => {
    if (compareIds.length < 2) return;
    const selected = candidates.filter((c) => compareIds.includes(c.id));
    const jobIds = new Set(selected.map((c) => c.job_id).filter(Boolean));
    if (jobIds.size > 1) {
      setCompareError('Select candidates from the same job to compare.');
      return;
    }
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
        {loadError && (
          <p className="error" role="alert">
            {loadError}{' '}
            <button type="button" className="linkBtn" onClick={loadCandidates}>
              Retry
            </button>
          </p>
        )}
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
          <select
            value={filterJob}
            aria-label="Filter by job"
            onChange={(e) => updateFilters({ jobId: e.target.value })}
          >
            <option value="">All jobs</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
          <select
            value={filterBucket}
            aria-label="Filter by application bucket"
            onChange={(e) => updateFilters({ bucket: e.target.value })}
          >
            <option value="">All buckets</option>
            <option value="Green">Green</option>
            <option value="Amber">Amber</option>
            <option value="Red">Red</option>
          </select>
          <select
            value={filterPipeline}
            aria-label="Filter by pipeline stage"
            onChange={(e) => updateFilters({ pipeline: e.target.value })}
          >
            <option value="">All pipeline stages</option>
            {Object.entries(PIPELINE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={filterScreening}
            aria-label="Filter by screening status"
            onChange={(e) => updateFilters({ screening: e.target.value })}
          >
            <option value="">All screening status</option>
            <option value="complete">Complete</option>
            <option value="incomplete">Incomplete Applications</option>
            <option value="ai_used">AI Used</option>
          </select>
          <select
            value={filterIntegrity}
            aria-label="Filter by integrity"
            onChange={(e) => updateFilters({ integrity: e.target.value })}
          >
            <option value="">All integrity</option>
            <option value="flagged">Integrity flagged</option>
          </select>
          <Button variant="outline" disabled={compareIds.length < 2} onClick={startCompare}>
            <GitCompare size={16} /> Compare ({compareIds.length}/2)
          </Button>
        </div>
        {(compareIds.length > 0 || compareError) && (
          <p className={`muted compareHint${compareError ? ' error' : ''}`}>
            {compareError || (
              <>
                Select two candidates for the same job, then Compare.{' '}
                {compareIds.length < 2 ? 'Pick one more.' : 'Ready.'}
              </>
            )}
          </p>
        )}
        <div className="tableScrollWrap">
        <table>
          <thead>
            <tr>
              <th scope="col" aria-label="Compare" />
              <th scope="col">Candidate</th>
              <th scope="col">Score /100</th>
              <th scope="col">Recommendation</th>
              <th scope="col">Bucket</th>
              <th scope="col">Schedule</th>
              <th scope="col">Screening</th>
              <th scope="col">Completion</th>
              <th scope="col">Pipeline</th>
              <th scope="col">Source</th>
              <th scope="col">Authenticity</th>
              <th scope="col">Job</th>
              <th scope="col" aria-label="Actions" />
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
                    aria-label={`Add ${c.name} to comparison`}
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
                      aria-label={`Move ${c.name} to trash`}
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
