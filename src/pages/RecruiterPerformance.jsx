import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  CalendarClock,
  ChevronDown,
  Clock,
  ShieldAlert,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { api } from '../api/client';
import { returnState } from '../lib/navigation';

function formatDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  const fmt = (d) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function RecruiterPerformance() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateRange = searchParams.get('range') || '30d';
  const [showCalendar, setShowCalendar] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    api(`/dashboard?range=${dateRange}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [dateRange]);

  const perf = data?.analytics?.recruiterPerformance || {};
  const rangeDays = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;

  const dateLabel = useMemo(() => {
    if (dateRange === '7d') return 'Last 7 days';
    if (dateRange === '90d') return 'Last 90 days';
    return 'Last 30 days';
  }, [dateRange]);

  const setRange = (range) => {
    setSearchParams({ range });
    setShowCalendar(false);
  };

  const metrics = [
    {
      id: 'hours',
      label: 'Hours saved',
      value: perf.hours_saved ?? 0,
      sub: perf.hours_saved_basis || 'From auto-scored applications',
      icon: Clock,
      tone: 'purple',
    },
    {
      id: 'screening',
      label: 'Screening completion',
      value: `${perf.screening_completion_pct ?? 0}%`,
      sub: `${perf.screening_complete ?? 0} of ${perf.applications_in_period ?? 0} applicants`,
      icon: Target,
      tone: 'green',
      to: '/candidates?screening=complete',
    },
    {
      id: 'flags',
      label: 'Integrity flags',
      value: perf.integrity_flags ?? 0,
      sub: 'High-risk signals for review',
      icon: ShieldAlert,
      tone: 'red',
      to: '/candidates?integrity=flagged',
    },
    {
      id: 'scored',
      label: 'Auto-scored',
      value: perf.auto_scored_count ?? 0,
      sub: `~${perf.minutes_saved_per_score ?? 45} min saved each`,
      icon: TrendingUp,
      tone: 'blue',
    },
  ];

  const breakdown = perf.integrity_breakdown || {};

  if (error) {
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  }

  if (!data) return <p className="muted">Loading recruiter performance…</p>;

  return (
    <div className="recruiterPerfPage">
      <div className="pageHead row">
        <div>
          <h1>Recruiter performance</h1>
          <p>Estimated time saved, screening throughput, and integrity workload for {dateLabel.toLowerCase()}.</p>
        </div>
        <div className="headActionWrap">
          <button type="button" className="headPill headPillBtn" onClick={() => setShowCalendar((s) => !s)}>
            <CalendarClock size={14} /> {dateLabel} <ChevronDown size={14} />
          </button>
          {showCalendar && (
            <div className="headDropdown">
              <button type="button" className={dateRange === '7d' ? 'active' : ''} onClick={() => setRange('7d')}>
                Last 7 days
              </button>
              <button type="button" className={dateRange === '30d' ? 'active' : ''} onClick={() => setRange('30d')}>
                Last 30 days
              </button>
              <button type="button" className={dateRange === '90d' ? 'active' : ''} onClick={() => setRange('90d')}>
                Last 90 days
              </button>
              <small>{formatDateRange(rangeDays)}</small>
            </div>
          )}
        </div>
      </div>

      <section className="kpiGrid perfMetricGrid">
        {metrics.map((m) => {
          const Icon = m.icon;
          const inner = (
            <>
              <div>
                <span className="kpiLabel">{m.label}</span>
                <strong>{m.value}</strong>
                <small>{m.sub}</small>
              </div>
              <div className={`kpiTileIcon ${m.tone}`}>
                <Icon size={18} />
              </div>
            </>
          );
          return m.to ? (
            <button
              key={m.id}
              type="button"
              className="kpiTile"
              onClick={() => navigate(m.to, { state: returnState(location) })}
              title={`Open ${m.label}`}
            >
              {inner}
            </button>
          ) : (
            <div key={m.id} className="kpiTile kpiTile--static">
              {inner}
            </div>
          );
        })}
      </section>

      <div className="grid two perfDetailGrid">
        <section className="card perfExplainCard">
          <h2>How hours saved is calculated</h2>
          <p className="muted">
            Each application with an overall score counts as one auto-scored review. We estimate{' '}
            <strong>{perf.minutes_saved_per_score ?? 45} minutes</strong> of manual recruiter time saved per
            scored application (resume read, rubric alignment, and note-taking).
          </p>
          <div className="perfFormula">
            <div>
              <span>Auto-scored applications</span>
              <strong>{perf.auto_scored_count ?? 0}</strong>
            </div>
            <span className="perfFormulaOp">×</span>
            <div>
              <span>Minutes per review</span>
              <strong>{perf.minutes_saved_per_score ?? 45}</strong>
            </div>
            <span className="perfFormulaOp">=</span>
            <div>
              <span>Total minutes saved</span>
              <strong>{perf.total_minutes_saved ?? 0}</strong>
            </div>
            <span className="perfFormulaOp">→</span>
            <div>
              <span>Hours saved (rounded)</span>
              <strong>{perf.hours_saved ?? 0}</strong>
            </div>
          </div>
          <p className="muted perfNote">
            This is an operational estimate for planning — not payroll or billing. Adjust the per-review
            assumption in your internal ops model if your team spends more or less time per screen.
          </p>
        </section>

        <section className="card perfExplainCard">
          <h2>Screening completion</h2>
          <p className="muted">
            Share of applicants in the selected period who finished the full screening flow (
            <code>screening_status = complete</code>), out of all applications created in that window.
          </p>
          <ul className="perfBreakdownList">
            <li>
              <span>Applications in period</span>
              <strong>{perf.applications_in_period ?? 0}</strong>
            </li>
            <li>
              <span>Started screening</span>
              <strong>{perf.screening_started ?? 0}</strong>
            </li>
            <li>
              <span>Fully complete</span>
              <strong>{perf.screening_complete ?? 0}</strong>
            </li>
            <li>
              <span>Incomplete / in progress</span>
              <strong>{perf.screening_incomplete ?? 0}</strong>
            </li>
            <li>
              <span>Completion rate</span>
              <strong>{perf.screening_completion_pct ?? 0}%</strong>
            </li>
          </ul>
          <Link to="/candidates?screening=complete" state={returnState(location)} className="btn outline perfLinkBtn">
            <Users size={14} /> View fully screened candidates
          </Link>
        </section>

        <section className="card perfExplainCard perfExplainCard--wide">
          <h2>Integrity flags</h2>
          <p className="muted">
            Count of candidates flagged as <strong>high risk</strong> in the period — any applicant with
            proctoring failure, AI-assisted responses detected, or authenticity score below 50. These are
            advisory signals for recruiter review, not automatic rejections.
          </p>
          <ul className="perfBreakdownList perfBreakdownList--grid">
            <li>
              <button type="button" className="perfBreakdownBtn" onClick={() => navigate('/candidates?integrity=flagged', { state: returnState(location) })}>
                <span>Total high-risk flags</span>
                <strong>{perf.integrity_flags ?? 0}</strong>
              </button>
            </li>
            <li>
              <button type="button" className="perfBreakdownBtn" onClick={() => navigate('/candidates?screening=ai_used', { state: returnState(location) })}>
                <span>AI-generated responses</span>
                <strong>{breakdown.ai_generated ?? 0}</strong>
              </button>
            </li>
            <li>
              <button type="button" className="perfBreakdownBtn" onClick={() => navigate('/candidates?integrity=flagged', { state: returnState(location) })}>
                <span>Voice verification failed</span>
                <strong>{breakdown.voice_verification_failed ?? 0}</strong>
              </button>
            </li>
            <li>
              <button type="button" className="perfBreakdownBtn" onClick={() => navigate('/candidates?integrity=flagged', { state: returnState(location) })}>
                <span>Browser / tab switches</span>
                <strong>{breakdown.browser_switches ?? 0}</strong>
              </button>
            </li>
            <li>
              <button type="button" className="perfBreakdownBtn" onClick={() => navigate('/candidates?integrity=flagged', { state: returnState(location) })}>
                <span>Employment mismatch</span>
                <strong>{breakdown.employment_mismatch ?? 0}</strong>
              </button>
            </li>
            <li>
              <button type="button" className="perfBreakdownBtn" onClick={() => navigate('/candidates?bucket=Red', { state: returnState(location) })}>
                <span>Fake experience risk</span>
                <strong>{breakdown.fake_experience_risk ?? 0}</strong>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
