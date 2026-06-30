import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Gem,
  Plus,
  ShieldAlert,
  Target,
  CalendarClock,
  TrendingUp,
} from 'lucide-react';
import { api } from '../api/client';
import { FROM_DASHBOARD } from '../lib/navigation';
import { DonutChart, FunnelChart, GaugeChart } from '../components/dashboard/DashboardCharts';

const KPI_ICONS = {
  blue: Briefcase,
  green: CheckCircle2,
  amber: Clock,
  purple: CalendarClock,
  red: ShieldAlert,
};

function buildExperienceIntelBuckets(data = {}) {
  const total = data.scored_count ?? 0;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  return [
    { label: 'Elite', value: data.elite_candidates ?? 0, pct: pct(data.elite_candidates ?? 0), color: '#14532d', to: '/candidates?bucket=Green' },
    { label: 'Strong match', value: data.strong_match ?? 0, pct: pct(data.strong_match ?? 0), color: '#22c55e', to: '/candidates?bucket=Green' },
    { label: 'Needs review', value: data.needs_review ?? 0, pct: pct(data.needs_review ?? 0), color: '#f59e0b', to: '/candidates?bucket=Amber' },
    { label: 'Elevated risk', value: data.high_risk ?? 0, pct: pct(data.high_risk ?? 0), color: '#ef4444', to: '/candidates?bucket=Red' },
  ];
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
  const { dashDateRange: dateRange = '30d' } = useOutletContext() || {};
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

  const { analytics = {}, jobTable = [], kpiCards = [] } = data;
  const pipeline = normalizeFunnel(analytics.pipeline || {});
  const health = analytics.hiringHealth || {};
  const alerts = analytics.integrityAlerts || {};
  const perf = analytics.recruiterPerformance || {};
  const hiddenGemCount = analytics.hiddenGems ?? 0;
  const visibleJobs = jobTable.slice(0, 5);
  const experienceIntel = analytics.experienceIntelligence || {};
  const experienceBuckets = buildExperienceIntelBuckets(experienceIntel);

  const funnelStages = [
    { label: 'Applied', value: pipeline.applied ?? 0, to: '/candidates' },
    { label: 'Screened', value: pipeline.screened ?? 0, to: '/candidates?screening=complete' },
    { label: 'Verified', value: pipeline.verified ?? 0, to: '/candidates?screening=complete' },
    { label: 'Recommended', value: pipeline.recommended ?? 0, to: '/candidates?bucket=Green' },
    { label: 'Interviewed', value: pipeline.interviewed ?? 0, to: '/candidates?pipeline=interviewing' },
    { label: 'Selected', value: pipeline.selected ?? 0, to: '/candidates?pipeline=selected' },
  ];

  const alertGroups = [
    {
      id: 'ai',
      color: '#8b5cf6',
      value: alerts.ai_generated ?? 0,
      to: '/candidates?screening=ai_used',
      labels: ['AI responses'],
    },
    {
      id: 'integrity',
      color: '#ef4444',
      value: Math.max(alerts.voice_verification_failed ?? 0, alerts.high_risk_candidates ?? 0),
      to: '/candidates?integrity=flagged',
      labels: ['Voice failed', 'High risk'],
    },
    {
      id: 'browser',
      color: '#60a5fa',
      value: alerts.browser_switches ?? 0,
      to: '/candidates?integrity=flagged',
      labels: ['Browser switches'],
    },
  ];

  return (
    <div className="enterpriseDash">
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
              onClick={() => navigate(kpi.to, { state: FROM_DASHBOARD })}
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
        <div className="dashWidget dashWidget--quality dashWidget--expIntel">
          <div className="widgetHead">
            <h2>Experience Intelligence</h2>
            <Link to="/reports" state={FROM_DASHBOARD}>Analytics</Link>
          </div>
          {(experienceIntel.scored_count ?? 0) > 0 ? (
            <DonutChart
              segments={experienceBuckets}
              size={180}
              stroke={36}
              centerSub="evaluated"
              showLegendPct={false}
              hideTrack
              legendClassName="chartDonut--quality"
              onSegmentClick={(seg) => seg.to && navigate(seg.to, { state: FROM_DASHBOARD })}
            />
          ) : (
            <p className="muted dashEmptyChart">
              No evaluated candidates in this period. Publish apply links to begin screening.
            </p>
          )}
        </div>

        <div className="dashWidget">
          <div className="widgetHead">
            <h2>Pipeline</h2>
            <Link to="/candidates" state={FROM_DASHBOARD}>View all</Link>
          </div>
          <FunnelChart stages={funnelStages} onStageClick={(to) => navigate(to, { state: FROM_DASHBOARD })} />
          <p className="funnelMeta">
            Hire rate: <strong>{analytics.conversionRate ?? 0}%</strong>
          </p>
        </div>

        <div className="dashWidget dashWidget--health">
          <div className="widgetHead">
            <h2>Hiring health</h2>
          </div>
          <GaugeChart
            score={health.score ?? 0}
            label={`${health.label ?? '—'} · Overall health`}
            healthy={health.healthy_pct ?? 0}
            atRisk={health.at_risk_pct ?? 0}
            critical={health.critical_pct ?? 0}
            large
          />
        </div>
      </section>

      <section className="dashRowBottom">
        <div className="dashWidget dashWidgetWide dashWidgetTable">
          <div className="widgetHead widgetHead--tight">
            <h2>Open positions</h2>
            <Link to="/jobs" state={FROM_DASHBOARD}>View all</Link>
          </div>
          <div className="posTableWrap">
            <table className="posTable posTable--five">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>
                    Status
                    <span
                      className="tableHint"
                      title="Status reflects position workflow stage: Draft → Delayed, Open → About to Start, Screening/Review/Interviewing → In Progress. Filled only when a hire is recorded."
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
                {visibleJobs.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link to={`/candidates?jobId=${row.id}`} state={FROM_DASHBOARD}>
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
                {!visibleJobs.length && (
                  <tr>
                    <td colSpan={7} className="posTableEmpty">
                      No positions yet — create your first position to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashSideCol">
          <div className="dashKpiPair">
            <button
              type="button"
              className="kpiTile"
              onClick={() => hiddenGemCount > 0 && navigate('/candidates?hiddenGem=1', { state: FROM_DASHBOARD })}
              disabled={hiddenGemCount === 0}
              title={
                hiddenGemCount > 0
                  ? `View ${hiddenGemCount} standout candidate${hiddenGemCount === 1 ? '' : 's'}`
                  : 'No standout candidates in this period'
              }
            >
              <div>
                <span className="kpiLabel">Standout candidates</span>
                <strong>{hiddenGemCount}</strong>
                <small>
                  {hiddenGemCount > 0 ? 'Strong fit beyond the resume' : 'None in this period'}
                </small>
              </div>
              <div className="kpiTileIcon amber">
                <Gem size={18} />
              </div>
            </button>

            <button
              type="button"
              className="kpiTile"
              onClick={() => navigate(`/recruiter-performance?range=${dateRange}`, { state: FROM_DASHBOARD })}
              title="View recruiter performance details"
            >
              <div>
                <span className="kpiLabel">Recruiter performance</span>
                <strong>{perf.hours_saved ?? 0}</strong>
                <small>
                  hrs saved · {perf.screening_completion_pct ?? perf.screening_accuracy ?? 0}% screened ·{' '}
                  {perf.integrity_flags ?? perf.fraud_prevented ?? 0} flags
                </small>
              </div>
              <div className="kpiTileIcon purple">
                <TrendingUp size={18} />
              </div>
            </button>
          </div>

          <div className="dashWidget dashWidgetSide dashWidgetRisk">
            <div className="widgetHead widgetHead--tight">
              <h2>
                <ShieldAlert size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Risk &amp; Fraud Alerts
              </h2>
            </div>
            <div className="riskAlertChart">
              <div className="riskAlertCircles riskAlertCircles--3">
                {alertGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    className="riskAlertBubble"
                    style={{ '--bubble-color': group.color }}
                    onClick={() => navigate(group.to, { state: FROM_DASHBOARD })}
                    title={`${group.labels.join(', ')}: ${group.value}`}
                    aria-label={`${group.labels.join(', ')}: ${group.value} candidates`}
                  >
                    <strong>{group.value}</strong>
                  </button>
                ))}
              </div>
              <ul className="riskAlertLegend">
                {alertGroups.flatMap((group) =>
                  group.labels.map((label) => (
                    <li key={`${group.id}-${label}`}>
                      <span className="dot" style={{ background: group.color }} aria-hidden />
                      <span>{label}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
