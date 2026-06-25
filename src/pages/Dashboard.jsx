import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock,
  Plus,
  ShieldAlert,
  Target,
} from 'lucide-react';
import { api } from '../api/client';
import { DonutChart, FunnelChart, GaugeChart } from '../components/dashboard/DashboardCharts';

const KPI_ICONS = {
  blue: Briefcase,
  green: CheckCircle2,
  amber: Clock,
  purple: CalendarClock,
  red: ShieldAlert,
};

function formatDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  const fmt = (d) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

function normalizeFunnel(raw = {}) {
  const applied = Math.max(0, raw.applied ?? 0);
  const screened = Math.min(applied, Math.max(0, raw.screened ?? 0));
  const verified = Math.min(screened, Math.max(0, raw.scored ?? 0));
  const recommended = Math.min(verified, Math.max(0, raw.recommended ?? 0));
  const interviewed = Math.min(recommended, Math.max(0, raw.interviewed ?? 0));
  const selected = Math.min(interviewed, Math.max(0, raw.selected ?? 0));
  return { applied, screened, verified, recommended, interviewed, selected };
}

export function Dashboard() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('30d');
  const [showCalendar, setShowCalendar] = useState(false);
  const [data, setData] = useState({
    kpiCards: [],
    analytics: {},
    jobTable: [],
    screening: {},
    totals: {},
    recommendations: [],
  });
  const [loadError, setLoadError] = useState('');

  const loadDashboard = () => {
    setLoadError('');
    return api(`/dashboard?range=${dateRange}`)
      .then(setData)
      .catch((e) => setLoadError(e.message));
  };

  useEffect(() => {
    loadDashboard();
  }, [dateRange]);

  const { analytics = {}, jobTable = [], kpiCards = [], screening = {}, recommendations = [] } = data;
  const pipeline = normalizeFunnel(analytics.pipeline || {});
  const health = analytics.hiringHealth || {};
  const alerts = analytics.integrityAlerts || {};
  const perf = analytics.recruiterPerformance || {};

  const funnelStages = [
    { label: 'Applied', value: pipeline.applied ?? 0, to: '/candidates' },
    { label: 'Screened', value: pipeline.screened ?? 0, to: '/candidates?screening=complete' },
    { label: 'Verified', value: pipeline.verified ?? 0, to: '/candidates?screening=complete' },
    { label: 'Recommended', value: pipeline.recommended ?? 0, to: '/candidates?bucket=Green' },
    { label: 'Interviewed', value: pipeline.interviewed ?? 0, to: '/candidates?pipeline=interview_scheduled' },
    { label: 'Selected', value: pipeline.selected ?? 0, to: '/candidates?pipeline=final_review' },
  ];

  const alertItems = [
    { label: 'AI Generated Responses', value: alerts.ai_generated ?? 0, to: '/candidates?screening=ai_used' },
    { label: 'Employment Mismatch', value: alerts.employment_mismatch ?? 0, to: '/candidates?integrity=flagged' },
    { label: 'Voice Verification Failed', value: alerts.voice_verification_failed ?? 0, to: '/candidates?integrity=flagged' },
    { label: 'Multiple Browser Switches', value: alerts.browser_switches ?? 0, to: '/candidates?integrity=flagged' },
    { label: 'Fake Experience Risk', value: alerts.fake_experience_risk ?? 0, to: '/candidates?bucket=Red' },
    { label: 'High Risk Candidates', value: alerts.high_risk_candidates ?? 0, to: '/candidates?integrity=flagged', danger: true },
  ];

  const rangeDays = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;

  const dateLabel = useMemo(() => {
    if (dateRange === '7d') return 'Last 7 days';
    if (dateRange === '90d') return 'Last 90 days';
    return 'Last 30 days';
  }, [dateRange]);

  return (
    <div className="enterpriseDash">
      <header className="enterpriseHead">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your hiring activities and insights.</p>
        </div>
        <div className="enterpriseHeadActions">
          <div className="headActionWrap">
            <button type="button" className="headPill headPillBtn" onClick={() => setShowCalendar((s) => !s)}>
              <CalendarClock size={14} /> {dateLabel} <ChevronDown size={14} />
            </button>
            {showCalendar && (
              <div className="headDropdown">
                <button type="button" className={dateRange === '7d' ? 'active' : ''} onClick={() => { setDateRange('7d'); setShowCalendar(false); }}>
                  Last 7 days
                </button>
                <button type="button" className={dateRange === '30d' ? 'active' : ''} onClick={() => { setDateRange('30d'); setShowCalendar(false); }}>
                  Last 30 days
                </button>
                <button type="button" className={dateRange === '90d' ? 'active' : ''} onClick={() => { setDateRange('90d'); setShowCalendar(false); }}>
                  Last 90 days
                </button>
                <small>{formatDateRange(rangeDays)}</small>
              </div>
            )}
          </div>
          <Link to="/jobs/new" className="btn">
            <Plus size={14} /> New position
          </Link>
        </div>
      </header>

      {loadError && (
        <p className="error dashLoadError" role="alert">
          {loadError}{' '}
          <button type="button" className="linkBtn" onClick={loadDashboard}>
            Retry
          </button>
        </p>
      )}

      <section className="kpiGrid">
        {kpiCards.length > 0 ? (
          kpiCards.map((kpi) => {
          const Icon = KPI_ICONS[kpi.tone] || Target;
          return (
            <button
              key={kpi.id}
              type="button"
              className="kpiTile"
              onClick={() => navigate(kpi.to)}
              title={`Open ${kpi.label}`}
            >
              <div>
                <span className="kpiLabel">{kpi.label}</span>
                <strong>{kpi.value}</strong>
                <small>{kpi.sub}</small>
              </div>
              <div className={`kpiTileIcon ${kpi.tone}`}>
                <Icon size={18} />
              </div>
            </button>
          );
        })
        ) : (
          !loadError && (
            <div className="kpiEmpty card">
              <p className="muted">No hiring activity in this date range yet.</p>
              <Link to="/jobs/new" className="btn">
                <Plus size={14} /> Create a position
              </Link>
            </div>
          )
        )}
      </section>

      <section className="dashRow3">
        <div className="dashWidget">
          <div className="widgetHead">
            <h2>Positions Overview</h2>
            <Link to="/jobs">View all positions</Link>
          </div>
          <DonutChart segments={analytics.positionsOverview || []} size={140} stroke={24} />
        </div>

        <div className="dashWidget">
          <div className="widgetHead">
            <h2>Hiring Pipeline</h2>
            <Link to="/candidates">View all</Link>
          </div>
          <FunnelChart stages={funnelStages} onStageClick={(to) => navigate(to)} />
          <p className="funnelMeta">
            Conversion Rate: <strong>{analytics.conversionRate ?? 0}%</strong>
          </p>
        </div>

        <div className="dashWidget">
          <div className="widgetHead">
            <h2>Hiring Health</h2>
          </div>
          <GaugeChart
            score={health.score ?? 0}
            label={`${health.label ?? '—'} · Overall Health`}
            healthy={health.healthy_pct ?? 0}
            atRisk={health.at_risk_pct ?? 0}
            critical={health.critical_pct ?? 0}
          />
        </div>
      </section>

      <section className="dashRowBottom">
        <div className="dashWidget dashWidgetWide">
          <div className="widgetHead">
            <h2>Positions At A Glance</h2>
            <Link to="/jobs">View all</Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="posTable">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>
                    Status
                    <span
                      className="tableHint"
                      title="Status reflects job workflow stage: Draft → Delayed, Open → About to Start, Screening/Review/Interviewing → In Progress. Filled only when a hire is recorded."
                    >
                      ⓘ
                    </span>
                  </th>
                  <th>Applicants</th>
                  <th>Verified</th>
                  <th>Recommended</th>
                  <th>Progress</th>
                  <th>Target Hire Date</th>
                </tr>
              </thead>
              <tbody>
                {jobTable.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link to={`/candidates?jobId=${row.id}`}>
                        <b>{row.title}</b>
                        <small>{row.team}</small>
                      </Link>
                    </td>
                    <td>
                      <span className={`statusTag ${row.statusTone}`} title={row.statusHint}>
                        {row.status}
                      </span>
                    </td>
                    <td>{row.applicants}</td>
                    <td>{row.verified}</td>
                    <td>{row.recommended}</td>
                    <td>
                      <div className="progTrack">
                        <div className="progFill" style={{ width: `${row.progress}%` }} />
                      </div>
                      <small>{row.progress}%</small>
                    </td>
                    <td>{row.targetHireDate}</td>
                  </tr>
                ))}
                {!jobTable.length && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>
                      No positions yet — create a job posting to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashSquareCol">
          {(analytics.hiddenGems > 0 || recommendations.some((r) => r.hidden_gem)) && (
            <div className="dashWidget dashWidgetSquare">
              <div className="widgetHead">
                <h2>Hidden gem candidates</h2>
                <Link to="/candidates?hiddenGem=1">View all</Link>
              </div>
              <p className="muted insightsSubtitle">
                Strong answers + authentic sessions despite weaker resume fit — worth a second look.
              </p>
              <p className="hiddenGemCount">
                <strong>{analytics.hiddenGems ?? 0}</strong> in selected period
              </p>
              <ul className="hiddenGemList">
                {recommendations
                  .filter((r) => r.hidden_gem)
                  .slice(0, 4)
                  .map((r) => (
                    <li key={r.id}>
                      <Link to={`/candidates/${r.id}`}>
                        {r.display_name} · {r.score}/100
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <div className="dashWidget dashWidgetSquare">
            <div className="widgetHead">
              <h2>
                <ShieldAlert size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Risk &amp; Fraud Alerts
              </h2>
            </div>
            <ul className="alertRows">
              {alertItems.map((item) => (
                <li key={item.label} className={item.danger ? 'danger' : ''}>
                  <button type="button" className="alertBtn" onClick={() => navigate(item.to)}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </button>
                </li>
              ))}
            </ul>
            <p className="funnelMeta">
              {screening.integrity_flags ?? screening.integrity_alerts ?? 0} total integrity flags
            </p>
          </div>
          <div className="dashWidget dashWidgetSquare">
            <div className="widgetHead">
              <h2>Recruiter Performance</h2>
            </div>
            <div className="perfStats">
              <div className="perfStat" title={perf.hours_saved_basis || 'Estimated from auto-scored applications'}>
                <label>Est. hours saved</label>
                <strong>{perf.hours_saved ?? 0}</strong>
                <span className="perfDelta muted">
                  {perf.hours_saved_basis || '~45 min per auto-score'}
                </span>
              </div>
              <div className="perfStat" title="Share of applicants who completed the full screening (not model accuracy)">
                <label>Screening completion</label>
                <strong>{perf.screening_completion_pct ?? perf.screening_accuracy ?? 0}%</strong>
                <span className="perfDelta muted">applications fully screened</span>
              </div>
              <div className="perfStat" title="High-risk integrity signals flagged for review — advisory, not auto-rejected">
                <label>Integrity flags</label>
                <strong>{perf.integrity_flags ?? perf.fraud_prevented ?? 0}</strong>
                <span className="perfDelta muted">candidates to review</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
