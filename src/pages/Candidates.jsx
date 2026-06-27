import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Eye, Trash2, GitCompare, CircleCheck, CircleAlert, CircleX, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { returnState } from '../lib/navigation';
import {
  BUCKET_TILES,
  buildCandidatesUrl,
  filtersToQuery,
  hasNonBucketFilters,
  PIPELINE_FILTER_OPTIONS,
  PIPELINE_LABELS,
  readCandidateFilters,
  SCREENING_CHIPS,
} from '../lib/candidateFilters';
import { Button, Card, BucketBadge } from '../components/ui';

const SPECIAL_CHIPS = [{ param: 'hiddenGem', value: '1', label: 'Hidden gems' }];

const BUCKET_ICONS = {
  Green: CircleCheck,
  Amber: CircleAlert,
  Red: CircleX,
};

const SCHEDULE_LABELS = {
  awaiting_candidate: 'Awaiting booking',
  awaiting_interviewer: 'Confirm time',
  confirmed: 'Confirmed',
  declined: 'Declined',
};

function screeningChipTone(key) {
  if (key === 'ai_used') return 'red';
  if (key === 'incomplete') return 'amber';
  if (key === 'complete') return 'green';
  return 'blue';
}

function bucketOf(candidate) {
  return candidate.application_bucket || candidate.bucket || '';
}

export function Candidates() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readCandidateFilters(searchParams);
  const [compareIds, setCompareIds] = useState([]);
  const [compareError, setCompareError] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [allCandidates, setAllCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const showBucketPicker = !filters.bucket && !hasNonBucketFilters(filters);
  const showListView = !showBucketPicker;
  const bucketMeta = BUCKET_TILES.find((b) => b.key === filters.bucket);

  const updateFilters = (patch) => {
    setSearchParams(filtersToQuery({ ...filters, ...patch }), { replace: true });
  };

  useEffect(() => {
    api('/jobs').then(setJobs).catch((e) => setLoadError(e.message));
  }, []);

  useEffect(() => {
    if (!showBucketPicker) return;
    api('/applications')
      .then(setAllCandidates)
      .catch((e) => setLoadError(e.message));
  }, [showBucketPicker]);

  const loadCandidates = useCallback(() => {
    const q = filtersToQuery(filters);
    return api(`/applications?${q}`).then(setCandidates).catch((e) => setLoadError(e.message));
  }, [filters.jobId, filters.bucket, filters.pipeline, filters.screening, filters.integrity, filters.hiddenGem]);

  useEffect(() => {
    if (showBucketPicker) return;
    setLoadError('');
    loadCandidates();
  }, [loadCandidates, showBucketPicker]);

  const bucketCounts = useMemo(() => {
    const counts = { Green: 0, Amber: 0, Red: 0 };
    for (const c of allCandidates) {
      const b = bucketOf(c);
      if (counts[b] != null) counts[b] += 1;
    }
    return counts;
  }, [allCandidates]);

  const hasActiveFilters = filters.bucket || hasNonBucketFilters(filters);

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
    navigate(`/candidates/compare?ids=${compareIds.join(',')}`, { state: returnState(location) });
  };

  const removeCandidate = async (c) => {
    if (!window.confirm(`Move application for ${c.name} to trash? You can recover from Trash.`)) return;
    setDeletingId(c.id);
    try {
      await api(`/applications/${c.id}`, { method: 'DELETE' });
      setCandidates((list) => list.filter((x) => x.id !== c.id));
      setAllCandidates((list) => list.filter((x) => x.id !== c.id));
    } catch (e) {
      alert(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const pageTitle = showBucketPicker
    ? 'Candidates'
    : filters.bucket
      ? `${filters.bucket} candidates`
      : 'Candidates';

  return (
    <>
      <div className="pageHead">
        <h1>{pageTitle}</h1>
        <p>
          {showBucketPicker && 'Choose a score bucket to view applicants ranked by fit and integrity signals.'}
          {showListView && filters.bucket && bucketMeta?.description}
          {showListView && !filters.bucket && hasNonBucketFilters(filters) && (
            <>Filtered applicant list across all buckets. Use screening and pipeline filters to narrow results.</>
          )}
        </p>
      </div>

      {loadError && (
        <p className="error" role="alert">
          {loadError}{' '}
          <button type="button" className="linkBtn" onClick={showBucketPicker ? () => api('/applications').then(setAllCandidates) : loadCandidates}>
            Retry
          </button>
        </p>
      )}

      {showBucketPicker ? (
        <div className="candidateBucketGrid">
          {BUCKET_TILES.map((tile) => {
            const Icon = BUCKET_ICONS[tile.key] || CircleCheck;
            const count = bucketCounts[tile.key] ?? 0;
            return (
              <Link
                key={tile.key}
                to={buildCandidatesUrl(searchParams, { bucket: tile.key })}
                className={`candidateBucketTile candidateBucketTile--${tile.tone}`}
              >
                <div className={`candidateBucketTileIcon ${tile.tone}`}>
                  <Icon size={24} aria-hidden />
                </div>
                <div className="candidateBucketTileBody">
                  <span className="candidateBucketTileLabel">{tile.label}</span>
                  <strong>{count}</strong>
                  <small>{tile.description}</small>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="screeningChipRow">
            {SCREENING_CHIPS.map((chip) => {
              const active = filters.screening === chip.key && !filters.hiddenGem;
              return (
                <Link
                  key={chip.key || 'all-screening'}
                  to={buildCandidatesUrl(searchParams, { screening: chip.key || '', hiddenGem: '' })}
                  className={`screeningChip ${active ? 'active' : ''} ${screeningChipTone(chip.key)}`}
                >
                  {chip.label}
                </Link>
              );
            })}
            {SPECIAL_CHIPS.map((chip) => {
              const active = filters.hiddenGem === chip.value;
              return (
                <Link
                  key={chip.param}
                  to={buildCandidatesUrl(searchParams, {
                    hiddenGem: active ? '' : chip.value,
                    screening: '',
                  })}
                  className={`screeningChip ${active ? 'active' : ''} amber`}
                >
                  <Sparkles size={13} aria-hidden /> {chip.label}
                </Link>
              );
            })}
          </div>

          <div className="filters">
            <select
              value={filters.jobId}
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
              value={filters.pipeline}
              aria-label="Filter by pipeline stage"
              onChange={(e) => updateFilters({ pipeline: e.target.value })}
            >
              {PIPELINE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={filters.integrity}
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
                  {!filters.bucket && <th scope="col">Bucket</th>}
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
                    {!filters.bucket && (
                      <td>
                        {bucketOf(c) ? <BucketBadge bucket={bucketOf(c)} /> : '—'}
                      </td>
                    )}
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
                      <span className={`screenTag ${c.screening_status || ''}`}>
                        {c.screening_category || c.screening_status || '—'}
                      </span>
                    </td>
                    <td>{c.completion_pct != null ? `${c.completion_pct}%` : '—'}</td>
                    <td>{PIPELINE_LABELS[c.pipeline_stage] || c.pipeline_stage || '—'}</td>
                    <td>{c.source}</td>
                    <td>
                      {c.authenticity_score != null ? (
                        <span
                          className={
                            c.authenticity_score >= 75 ? 'authOk' : c.authenticity_score >= 50 ? 'authWarn' : 'authBad'
                          }
                        >
                          {c.authenticity_score}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{c.job_title}</td>
                    <td>
                      <div className="row tight">
                        <Link to={`/candidates/${c.id}`} state={returnState(location)}>
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
                    <td colSpan={filters.bucket ? 13 : 14} className="empty">
                      {hasActiveFilters
                        ? 'No candidates match the current filters.'
                        : 'No applications yet. Share a job apply link to collect candidates.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
