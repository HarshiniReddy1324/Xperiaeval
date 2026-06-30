import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Eye, Trash2, GitCompare, CircleCheck, CircleAlert, CircleX, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { formatApplicationSource } from '../lib/applicationSource';
import { useAuth } from '../context/AuthContext';
import { normalizeProductMode } from '../lib/productMode';
import { returnState, rememberCandidatesList } from '../lib/navigation';
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
  const { user } = useAuth();
  const isIntelOnly = normalizeProductMode(user?.productMode) === 'intelligence';
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

  useEffect(() => {
    if (!showListView) return;
    rememberCandidatesList(location.pathname, location.search);
  }, [showListView, location.pathname, location.search]);

  const updateFilters = (patch) => {
    setSearchParams(filtersToQuery({ ...filters, ...patch }), { replace: true });
  };

  useEffect(() => {
    if (!isIntelOnly) {
      api('/jobs').then(setJobs).catch((e) => setLoadError(e.message));
    }
  }, [isIntelOnly]);

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

  const compareSelection = useMemo(
    () => compareIds.map((id) => candidates.find((c) => c.id === id)).filter(Boolean),
    [compareIds, candidates],
  );

  const compareJobTitle = compareSelection[0]?.job_title;

  const toggleCompare = (id) => {
    setCompareError('');
    const candidate = candidates.find((c) => c.id === id);
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      if (prev.length === 1 && candidate?.job_id) {
        const first = candidates.find((c) => c.id === prev[0]);
        if (first?.job_id && first.job_id !== candidate.job_id) {
          setCompareError('Select candidates from the same position to compare.');
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
      setCompareError('Select candidates from the same position to compare.');
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
    ? filters.integrity === 'flagged'
      ? 'Experience Verification'
      : 'Candidates'
    : filters.integrity === 'flagged'
      ? 'Experience Verification'
      : filters.bucket
        ? `${filters.bucket} candidates`
        : 'Candidates';

  return (
    <>
      <div className="pageHead">
        <h1>{pageTitle}</h1>
        <p>
          {isIntelOnly &&
            'Candidates synced from your ATS or scored via the Intelligence API — review experience scores and explainability.'}
          {!isIntelOnly && filters.integrity === 'flagged' &&
            'Candidates with integrity, authenticity, or experience verification flags — review before advancing.'}
          {!isIntelOnly && showBucketPicker && filters.integrity !== 'flagged' &&
            'Choose a score bucket to view applicants ranked by fit and integrity signals.'}
          {!isIntelOnly && showListView && filters.bucket && bucketMeta?.description}
          {!isIntelOnly && showListView && !filters.bucket && hasNonBucketFilters(filters) && (
            <>Filtered applicant list across all buckets. Use screening and pipeline filters to narrow results.</>
          )}
          {isIntelOnly && showBucketPicker && 'Choose a score bucket to review candidates by experience fit.'}
          {isIntelOnly && showListView && filters.bucket && bucketMeta?.description}
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
          {!isIntelOnly && (
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
          )}

          <div className="filters">
            {!isIntelOnly && (
            <select
              value={filters.jobId}
              aria-label="Filter by position"
              onChange={(e) => updateFilters({ jobId: e.target.value })}
            >
              <option value="">All positions</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
            )}
            {!isIntelOnly && (
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
            )}
            {!isIntelOnly && (
            <select
              value={filters.integrity}
              aria-label="Filter by integrity"
              onChange={(e) => updateFilters({ integrity: e.target.value })}
            >
              <option value="">All verification status</option>
              <option value="flagged">Flags only</option>
            </select>
            )}
          </div>

          {!isIntelOnly && (
            <div className="compareToolbar">
              <div className="compareToolbarMain">
                <GitCompare size={18} aria-hidden />
                <div>
                  <strong>Compare two candidates for the same position</strong>
                  <p className="muted">
                    {compareIds.length === 0 &&
                      'Check two rows below to open a side-by-side score breakdown.'}
                    {compareIds.length === 1 &&
                      compareJobTitle &&
                      `Selected one — pick another candidate for ${compareJobTitle}.`}
                    {compareIds.length === 1 && !compareJobTitle && 'Selected one — pick one more for the same position.'}
                    {compareIds.length >= 2 && 'Ready — open the comparison view.'}
                  </p>
                </div>
              </div>
              {compareSelection.length > 0 && (
                <div className="compareChips" aria-label="Selected for comparison">
                  {compareSelection.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="compareChip"
                      onClick={() => toggleCompare(c.id)}
                      title="Remove from comparison"
                    >
                      {c.name}
                      <span aria-hidden>×</span>
                    </button>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                className="compareGoBtn"
                disabled={compareIds.length < 2}
                onClick={startCompare}
              >
                <GitCompare size={16} /> Compare side-by-side
              </Button>
            </div>
          )}

          {compareError && !isIntelOnly && (
            <p className="error compareError" role="alert">
              {compareError}
            </p>
          )}

          <div className="tableScrollWrap">
            <table>
              <thead>
                <tr>
                  {!isIntelOnly && <th scope="col" aria-label="Compare" />}
                  <th scope="col">Candidate</th>
                  <th scope="col">Score /100</th>
                  <th scope="col">Recommendation</th>
                  {!filters.bucket && <th scope="col">Bucket</th>}
                  {!isIntelOnly && <th scope="col">Schedule</th>}
                  {!isIntelOnly && <th scope="col">Screening</th>}
                  {!isIntelOnly && <th scope="col">Completion</th>}
                  {!isIntelOnly && <th scope="col">Pipeline</th>}
                  <th scope="col">Source</th>
                  {!isIntelOnly && <th scope="col">Authenticity</th>}
                  <th scope="col">Role</th>
                  <th scope="col" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id} className={compareIds.includes(c.id) ? 'compareSelected' : ''}>
                    {!isIntelOnly && (
                    <td>
                      <label className="compareCheck">
                        <input
                          type="checkbox"
                          checked={compareIds.includes(c.id)}
                          onChange={() => toggleCompare(c.id)}
                          aria-label={`Add ${c.name} to comparison`}
                        />
                        <span className="compareCheckBox" aria-hidden />
                      </label>
                    </td>
                    )}
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
                    {!isIntelOnly && (
                    <td>
                      {c.schedule_status ? (
                        <span className={`scheduleBadge ${c.schedule_status}`}>
                          {SCHEDULE_LABELS[c.schedule_status] || c.schedule_status}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    )}
                    {!isIntelOnly && (
                    <td>
                      <span className={`screenTag ${c.screening_status || ''}`}>
                        {c.screening_category || c.screening_status || '—'}
                      </span>
                    </td>
                    )}
                    {!isIntelOnly && <td>{c.completion_pct != null ? `${c.completion_pct}%` : '—'}</td>}
                    {!isIntelOnly && <td>{PIPELINE_LABELS[c.pipeline_stage] || c.pipeline_stage || '—'}</td>}
                    <td>{formatApplicationSource(c.source)}</td>
                    {!isIntelOnly && (
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
                    )}
                    <td>{c.job_title}</td>
                    <td>
                      <div className="row tight">
                        <Link to={`/candidates/${c.id}`} state={returnState(location)}>
                          <Button>
                            <Eye size={15} /> View
                          </Button>
                        </Link>
                        {!isIntelOnly && (
                        <Button
                          variant="outline"
                          className="small danger"
                          disabled={deletingId === c.id}
                          onClick={() => removeCandidate(c)}
                          aria-label={`Move ${c.name} to trash`}
                        >
                          <Trash2 size={14} />
                        </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!candidates.length && (
                  <tr>
                    <td colSpan={isIntelOnly ? (filters.bucket ? 6 : 7) : (filters.bucket ? 13 : 14)} className="empty">
                      {hasActiveFilters
                        ? 'No candidates match the current filters.'
                        : isIntelOnly
                          ? 'No candidates yet — ingest via ATS webhook or evaluate via API.'
                          : 'No applications yet. Share a position apply link to collect candidates.'}
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
