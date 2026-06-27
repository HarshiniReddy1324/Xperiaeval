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

function buildApplicantBuckets(analytics = {}) {
  if (analytics.applicantBuckets?.length) {
    return analytics.applicantBuckets;
  }
  const scored = analytics.pipeline?.scored ?? 0;
  if (!scored) return [];
  const health = analytics.hiringHealth || {};
  const green = Math.round(((health.healthy_pct ?? 0) / 100) * scored);
  const amber = Math.round(((health.at_risk_pct ?? 0) / 100) * scored);
  const red = Math.max(0, scored - green - amber);
  const pct = (n) => Math.round((n / scored) * 100);
  return [
    { label: 'Green', value: green, pct: pct(green), color: '#22c55e', bucket: 'Green' },
    { label: 'Amber', value: amber, pct: pct(amber), color: '#f59e0b', bucket: 'Amber' },
    { label: 'Red', value: red, pct: pct(red), color: '#ef4444', bucket: 'Red' },
  ];
}

function buildBucketMeta(analytics = {}) {
  if (analytics.applicantBucketsMeta) {
    return analytics.applicantBucketsMeta;
  }
  const scored = analytics.pipeline?.scored ?? 0;
  const total = analytics.pipeline?.applied ?? 0;
  return {
    scored,
    total_applicants: total,
    unscored: Math.max(0, total - scored),
  };
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
  const applicantBuckets = buildApplicantBuckets(analytics);
  const bucketMeta = buildBucketMeta(analytics);

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
      color: '#3b82f6',
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
        <div className="dashWidget dashWidget--quality">
          <div className="widgetHead">
            <h2>Applicant quality</h2>
            <Link to="/candidates" state={FROM_DASHBOARD}>View all</Link>
          </div>
          {bucketMeta.scored > 0 ? (
            <DonutChart
              segments={applicantBuckets}
              size={180}
              stroke={36}
              centerSub="scored"
              showLegendPct={false}
              hideTrack
              legendClassName="chartDonut--quality"
              onSegmentClick={(seg) =>
                seg.bucket && navigate(`/candidates?bucket=${seg.bucket}`, { state: FROM_DASHBOARD })
              }
            />
          ) : (
            <p className="muted dashEmptyChart">
              No scored applicants in this period yet. Share apply links to start screening.
            </p>
          )}
        </div>

        <div className="dashWidget">
          <div className="widgetHead">
            <h2>Hiring Pipeline</h2>
            <Link to="/candidates" state={FROM_DASHBOARD}>View all</Link>
          </div>
          <FunnelChart stages={funnelStages} onStageClick={(to) => navigate(to, { state: FROM_DASHBOARD })} />
          <p className="funnelMeta">
            Conversion Rate: <strong>{analytics.conversionRate ?? 0}%</strong>
          </p>
        </div>

        <div className="dashWidget dashWidget--health">
          <div className="widgetHead">
            <h2>Hiring Health</h2>
          </div>
          <GaugeChart
            score={health.score ?? 0}
            label={`${health.label ?? '—'} · Overall Health`}
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
            <h2>Positions At A Glance</h2>
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
                      No positions yet — create a job posting to get started.
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
                  ? `View ${hiddenGemCount} hidden gem candidate${hiddenGemCount === 1 ? '' : 's'}`
                  : 'No hidden gem candidates in this period'
              }
            >
              <div>
                <span className="kpiLabel">Hidden gems</span>
                <strong>{hiddenGemCount}</strong>
                <small>
                  {hiddenGemCount > 0 ? 'Strong fit beyond resume' : 'None in this period'}
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
