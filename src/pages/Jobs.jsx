import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Pencil, ExternalLink, GraduationCap, Sprout, Briefcase, Crown } from 'lucide-react';
import { api } from '../api/client';
import { returnState } from '../lib/navigation';
import {
  compareJobsByLevel,
  compareJobsByStageOnly,
  JOB_STAGE_DESCRIPTIONS,
  LEGACY_STAGE_FILTER,
  matchesPositionFilter,
  matchesPositionLevel,
  POSITION_FILTERS,
  POSITION_LEVELS,
  positionFilterLabel,
  positionLevelLabel,
  STAGE_TONE,
} from '../lib/jobStages';
import { Button, Card } from '../components/ui';

const LEVEL_ICONS = {
  internship: GraduationCap,
  entry: Sprout,
  mid: Briefcase,
  senior: Crown,
};

function JobCard({ job, location, deletingId, onRemove, showLevel }) {
  return (
    <Card className="jobCard">
      <div className="jobCardHead">
        <Link to={`/jobs/${job.id}`} state={returnState(location)} className="jobCardLink">
          <h2>{job.title}</h2>
          <p className="muted">
            {job.id}
            {showLevel && (
              <>
                {' · '}
                <span className="statusTag slate" title="Career level">
                  {positionLevelLabel(job.position_level)}
                </span>
              </>
            )}
            {' · '}
            <span
              className={`statusTag ${STAGE_TONE[job.stage] || 'blue'}`}
              title={JOB_STAGE_DESCRIPTIONS[job.stage] || 'Workflow stage'}
            >
              {job.stage}
            </span>
          </p>
          <div className="miniStats inline">
            <span>
              {job.applicants} <small>All</small>
            </span>
            <span>
              {job.green} <small>Green</small>
            </span>
            <span>
              {job.amber} <small>Amber</small>
            </span>
            <span>
              {job.red} <small>Red</small>
            </span>
          </div>
        </Link>
        <div className="jobCardActions">
          <Link to={`/jobs/${job.id}/edit`} state={returnState(location)} title="Edit posting">
            <Button variant="outline" className="small">
              <Pencil size={14} />
            </Button>
          </Link>
          <a href={`/careers/${job.slug}`} target="_blank" rel="noreferrer" title="Careers page">
            <Button variant="outline" className="small">
              <ExternalLink size={14} />
            </Button>
          </a>
          <Button
            variant="outline"
            className="small danger"
            disabled={deletingId === job.id}
            onClick={(e) => onRemove(e, job)}
            title="Move to trash"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function Jobs() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const legacyStage = searchParams.get('stage') || '';
  const activeFilter = searchParams.get('filter') || LEGACY_STAGE_FILTER[legacyStage] || '';
  const activeLevel = searchParams.get('level') || '';
  const [jobs, setJobs] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [loadError, setLoadError] = useState('');

  const load = () =>
    api('/jobs')
      .then((rows) => {
        setJobs(rows);
        setLoadError('');
      })
      .catch((e) => setLoadError(e.message));

  useEffect(() => {
    load();
  }, []);

  const showLevelPicker = !activeLevel && !activeFilter;
  const showFilterList = activeFilter && !activeLevel;
  const showLevelList = Boolean(activeLevel);
  const levelMeta = POSITION_LEVELS.find((l) => l.id === activeLevel);

  const jobsInScope = useMemo(() => {
    if (activeLevel) return jobs.filter((j) => matchesPositionLevel(j, activeLevel));
    if (activeFilter) return jobs.filter((j) => matchesPositionFilter(j, activeFilter));
    return jobs;
  }, [jobs, activeLevel, activeFilter]);

  const filterCounts = useMemo(() => {
    const scope = activeLevel ? jobs.filter((j) => matchesPositionLevel(j, activeLevel)) : jobs;
    const counts = { '': scope.length };
    for (const job of scope) {
      for (const filter of POSITION_FILTERS) {
        if (!filter.id) continue;
        if (matchesPositionFilter(job, filter.id)) {
          counts[filter.id] = (counts[filter.id] || 0) + 1;
        }
      }
    }
    return counts;
  }, [jobs, activeLevel]);

  const levelCounts = useMemo(() => {
    const base = activeFilter ? jobs.filter((j) => matchesPositionFilter(j, activeFilter)) : jobs;
    const counts = {};
    for (const level of POSITION_LEVELS) {
      counts[level.id] = base.filter((j) => matchesPositionLevel(j, level.id)).length;
    }
    return counts;
  }, [jobs, activeFilter]);

  const buildJobsUrl = (filter, level) => {
    const params = new URLSearchParams();
    if (filter) params.set('filter', filter);
    if (level) params.set('level', level);
    const q = params.toString();
    return q ? `/jobs?${q}` : '/jobs';
  };

  const visibleJobs = useMemo(() => {
    const list = jobsInScope.filter((j) => !activeLevel || matchesPositionFilter(j, activeFilter));
    return [...list].sort(showFilterList ? compareJobsByLevel : compareJobsByStageOnly);
  }, [jobsInScope, activeLevel, activeFilter, showFilterList]);

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

  const pageTitle = showLevelList
    ? levelMeta?.label || 'Positions'
    : showFilterList
      ? positionFilterLabel(activeFilter)
      : 'Positions';

  return (
    <>
      <div className="pageHead row">
        <div>
          <h1>{pageTitle}</h1>
          <p>
            {showLevelPicker && 'Choose a career level to view and manage positions.'}
            {showLevelList && (
              <>
                {levelMeta?.description}. New positions start as <strong>Draft</strong>: edit and set to{' '}
                <strong>Open</strong> when ready to go live.
              </>
            )}
            {showFilterList && (
              <>
                All <strong>{positionFilterLabel(activeFilter).toLowerCase()}</strong> positions across every
                level. Use the level row below to narrow, or open a position card to view details.
              </>
            )}
          </p>
        </div>
        <Link to="/jobs/new">
          <Button>
            <Plus size={16} /> New position
          </Button>
        </Link>
      </div>

      {loadError && (
        <p className="error" role="alert">
          {loadError}{' '}
          <button type="button" className="linkBtn" onClick={load}>
            Retry
          </button>
        </p>
      )}

      {showLevelPicker ? (
        !jobs.length && !loadError ? (
          <Card>
            <p className="muted">No positions yet.</p>
            <Link to="/jobs/new">
              <Button>Create your first position</Button>
            </Link>
          </Card>
        ) : (
          <div className="positionLevelGrid">
            {POSITION_LEVELS.map((level) => {
              const Icon = LEVEL_ICONS[level.id] || Briefcase;
              const count = levelCounts[level.id] ?? 0;
              return (
                <Link
                  key={level.id}
                  to={buildJobsUrl('', level.id)}
                  className={`positionLevelTile positionLevelTile--${level.tone}`}
                >
                  <div className={`positionLevelTileIcon ${level.tone}`}>
                    <Icon size={22} aria-hidden />
                  </div>
                  <div className="positionLevelTileBody">
                    <span className="positionLevelTileLabel">{level.label}</span>
                    <strong>{count}</strong>
                    <small>{level.description}</small>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      ) : (
        <>
          <div className="positionFilterRow screeningChipRow">
            {POSITION_FILTERS.map((filter) => {
              const active = activeFilter === filter.id;
              const to = buildJobsUrl(filter.id, activeLevel);
              const count = filterCounts[filter.id] ?? 0;
              return (
                <Link
                  key={filter.id || 'all'}
                  to={to}
                  className={`screeningChip ${active ? 'active' : ''} ${filter.tone}`}
                >
                  {filter.label}
                  <strong>{count}</strong>
                </Link>
              );
            })}
          </div>

          {showFilterList && (
            <div className="positionFilterRow screeningChipRow positionLevelFilterRow">
              <span className="positionFilterLabel">Level</span>
              {POSITION_LEVELS.map((level) => {
                const count = jobs.filter(
                  (j) => matchesPositionFilter(j, activeFilter) && matchesPositionLevel(j, level.id)
                ).length;
                return (
                  <Link
                    key={level.id}
                    to={buildJobsUrl(activeFilter, level.id)}
                    className={`screeningChip blue`}
                  >
                    {level.shortLabel}
                    <strong>{count}</strong>
                  </Link>
                );
              })}
            </div>
          )}

          {!visibleJobs.length ? (
            <Card>
              <p className="muted">
                {showFilterList
                  ? `No ${positionFilterLabel(activeFilter).toLowerCase()} positions yet.`
                  : activeFilter
                    ? `No ${positionFilterLabel(activeFilter).toLowerCase()} positions at ${positionLevelLabel(activeLevel)}.`
                    : `No positions at ${positionLevelLabel(activeLevel)} yet.`}
              </p>
              {activeFilter ? (
                <Link to={buildJobsUrl('', activeLevel)}>
                  <Button variant="outline">Show all in this level</Button>
                </Link>
              ) : (
                <Link to="/jobs/new">
                  <Button>Create a position</Button>
                </Link>
              )}
            </Card>
          ) : (
            <div className="jobGrid">
              {visibleJobs.map((j) => (
                <JobCard
                  key={j.id}
                  job={j}
                  location={location}
                  deletingId={deletingId}
                  onRemove={removeJob}
                  showLevel={showFilterList}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
