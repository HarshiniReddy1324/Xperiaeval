import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, GitCompare } from 'lucide-react';
import { api } from '../api/client';
import { returnState } from '../lib/navigation';
import { Button, Card, BucketBadge } from '../components/ui';
import { DimensionRadar } from '../components/DimensionRadar';

const DIM_ROWS = [
  { key: 'technical_competency', label: 'Technical competency' },
  { key: 'problem_solving', label: 'Problem solving' },
  { key: 'communication', label: 'Communication' },
  { key: 'project_ownership', label: 'Project ownership' },
  { key: 'authenticity', label: 'Authenticity signal' },
  { key: 'resume_consistency', label: 'Resume consistency' },
  { key: 'behavioral_confidence', label: 'Behavioral confidence' },
];

const COLORS = ['#3b82f6', '#22c55e'];

function displayName(c) {
  return c.application?.display_name || c.application?.name || c.id;
}

function metricValue(c, key) {
  if (key === 'overall') return c.score?.overall;
  if (key === 'mandatory') return c.score?.mandatory_points;
  if (key === 'optional') return c.score?.optional_points;
  return c.intelligence?.dimensions?.[key];
}

function formatMetric(val) {
  if (val == null || val === '') return 'N/A';
  return val;
}

function bestIndex(values) {
  const nums = values.map((v) => (typeof v === 'number' ? v : Number(v)));
  if (nums.some((n) => Number.isNaN(n))) return -1;
  const max = Math.max(...nums);
  if (!Number.isFinite(max)) return -1;
  const winners = nums.map((n, i) => (n === max ? i : -1)).filter((i) => i >= 0);
  return winners.length === 1 ? winners[0] : -1;
}

export function CandidateCompare() {
  const location = useLocation();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const ids = params.get('ids');
    if (!ids) {
      setError('Select two candidates from the same position on the candidates list, then open Compare.');
      return;
    }
    api(`/applications/compare?ids=${encodeURIComponent(ids)}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [params]);

  const summaryRows = useMemo(() => {
    if (!data?.candidates?.length) return [];
    return [
      { label: 'Experience score', key: 'overall', suffix: '/100' },
      { label: 'Mandatory points', key: 'mandatory', suffix: '' },
      { label: 'Optional points', key: 'optional', suffix: '' },
      ...DIM_ROWS.map((d) => ({ label: d.label, key: d.key, suffix: '' })),
    ];
  }, [data]);

  if (error && !data) {
    return (
      <Card>
        <h2>Compare candidates</h2>
        <p className="error">{error}</p>
        <p className="muted">
          Open the candidates list for a position, select two rows, then use Compare.
        </p>
        <Link to="/candidates" state={returnState(location)}>
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
  const jobTitle = candidates[0]?.job_title || candidates[0]?.application?.job_title || 'This role';
  const backTo = returnState(location).from || (data.job_id ? `/candidates?jobId=${data.job_id}` : '/candidates');

  return (
    <div className="comparePage">
      <div className="pageHead comparePageHead">
        <div>
          <h1>
            <GitCompare size={26} aria-hidden /> Compare candidates
          </h1>
          <p className="muted">
            Side-by-side review for <strong>{jobTitle}</strong>: scores, recommendations, and intelligence
            dimensions. Use this to decide who to advance when two applicants are close.
          </p>
        </div>
        <Link to={backTo} state={returnState(location)}>
          <Button variant="outline">← Back to list</Button>
        </Link>
      </div>

      <div className="compareSummaryGrid">
        {candidates.map((c, i) => (
          <Card key={c.id} className="compareSummaryCard">
            <div className="compareSummaryCardTop">
              <div>
                <span className="compareCandidateTag" style={{ '--tag-color': COLORS[i] }}>
                  Candidate {i + 1}
                </span>
                <h2>{displayName(c)}</h2>
                <p className="muted">{c.id}</p>
              </div>
              <div className="compareScoreBlock">
                <strong className="compareScore">{c.score?.overall ?? 'N/A'}</strong>
                <span className="compareScoreSub">/ 100</span>
                {c.score?.bucket && <BucketBadge bucket={c.score.bucket} />}
              </div>
            </div>
            <dl className="compareSummaryDl">
              <div>
                <dt>Recommendation</dt>
                <dd>{c.intelligence?.recommendation || c.score?.recommendation || 'N/A'}</dd>
              </div>
              <div>
                <dt>Tier</dt>
                <dd>{c.intelligence?.tier || c.score?.tier || 'N/A'}</dd>
              </div>
              <div>
                <dt>Risk note</dt>
                <dd>{c.score?.risk || 'N/A'}</dd>
              </div>
            </dl>
            <Link to={`/candidates/${c.id}`} state={returnState(location)} className="compareProfileLink">
              Open full profile <ArrowRight size={14} />
            </Link>
          </Card>
        ))}
      </div>

      <Card className="compareTableCard">
        <h3>Score breakdown</h3>
        <p className="muted compareTableIntro">
          Higher values are highlighted per row. Ties are left neutral.
        </p>
        <div className="tableScrollWrap">
          <table className="compareMetricsTable">
            <thead>
              <tr>
                <th scope="col">Metric</th>
                {candidates.map((c, i) => (
                  <th key={c.id} scope="col">
                    <span className="compareThName" style={{ '--tag-color': COLORS[i] }}>
                      {displayName(c)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row) => {
                const values = candidates.map((c) => metricValue(c, row.key));
                const winner = bestIndex(values);
                return (
                  <tr key={row.key}>
                    <th scope="row">{row.label}</th>
                    {candidates.map((c, i) => {
                      const val = metricValue(c, row.key);
                      return (
                        <td key={c.id} className={winner === i ? 'compareCell--best' : ''}>
                          <strong>
                            {formatMetric(val)}
                            {row.suffix && val != null ? row.suffix : ''}
                          </strong>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {candidates.some((c) => c.intelligence?.dimensions) && (
        <Card className="compareRadarCard">
          <h3>Intelligence dimensions</h3>
          <p className="muted">Radar view of the same seven dimensions shown in the table above.</p>
          <div className="compareRadarGrid">
            {candidates.map((c, i) => (
              <div key={c.id} className="compareRadarItem">
                <DimensionRadar
                  label={displayName(c)}
                  dimensions={c.intelligence?.dimensions}
                  color={COLORS[i % COLORS.length]}
                  size={220}
                />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
