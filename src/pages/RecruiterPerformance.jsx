import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  CalendarClock,
  ChevronDown,
  Clock,
  Info,
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
  return `${fmt(start)} to ${fmt(end)}`;
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
      id: 'scored',
      label: 'Auto-scored',
      value: perf.auto_scored_count ?? 0,
      sub: `~${perf.minutes_saved_per_score ?? 45} min saved each`,
      icon: TrendingUp,
      tone: 'blue',
    },
  ];

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
          <p>
            Time saved and screening throughput for {dateLabel.toLowerCase()}. Integrity and fraud signals live on the
            dashboard under <strong>Risk &amp; Fraud Alerts</strong>.
          </p>
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
          <h2>Screening throughput</h2>
          <p className="muted">
            Share of applicants in the selected period who finished the full screening flow, out of all applications
            created in that window.
          </p>
          <div className="perfThroughputBar" aria-hidden>
            <div
              className="perfThroughputBarFill"
              style={{ width: `${Math.min(100, perf.screening_completion_pct ?? 0)}%` }}
            />
          </div>
          <p className="perfThroughputPct">
            <strong>{perf.screening_completion_pct ?? 0}%</strong> completion rate
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
          </ul>
          <Link to="/candidates?screening=complete" state={returnState(location)} className="btn outline perfLinkBtn">
            <Users size={14} /> View fully screened candidates
          </Link>
        </section>

        <section className="card perfExplainCard">
          <h2>Time savings</h2>
          <div className="perfSavingsHero">
            <span className="perfSavingsValue">{perf.hours_saved ?? 0}</span>
            <span className="perfSavingsUnit">hours saved</span>
          </div>
          <p className="muted perfSavingsLead">
            Based on <strong>{perf.auto_scored_count ?? 0}</strong> auto-scored applications in this period, each
            estimated to save ~<strong>{perf.minutes_saved_per_score ?? 45}</strong> minutes of manual review.
          </p>
          <ul className="perfBreakdownList perfBreakdownList--compact">
            <li>
              <span>Auto-scored applications</span>
              <strong>{perf.auto_scored_count ?? 0}</strong>
            </li>
            <li>
              <span>Total minutes saved</span>
              <strong>{perf.total_minutes_saved ?? 0}</strong>
            </li>
          </ul>
          <details className="perfMethodology">
            <summary>
              <Info size={14} aria-hidden /> How we estimate hours saved
            </summary>
            <div className="perfMethodologyBody">
              <p>
                Each application with an overall score counts as one auto-scored review. We assume{' '}
                {perf.minutes_saved_per_score ?? 45} minutes of recruiter time per review (resume read, rubric
                alignment, and notes). This is an operational planning estimate; not payroll or billing.
              </p>
              <p className="perfMethodologyFormula">
                {perf.auto_scored_count ?? 0} scored × {perf.minutes_saved_per_score ?? 45} min ={' '}
                {perf.total_minutes_saved ?? 0} min → {perf.hours_saved ?? 0} hrs
              </p>
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}
