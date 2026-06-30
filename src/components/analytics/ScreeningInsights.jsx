import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert, Users } from 'lucide-react';
import { InsightBar } from './InsightBars';

const BUCKET_LINKS = {
  complete: '/candidates?screening=complete',
  incomplete: '/candidates?screening=incomplete',
  ai_used: '/candidates?screening=ai_used',
  proctoring_violation: '/candidates?integrity=flagged',
  partial: '/candidates?screening=incomplete',
};

const BUCKET_ICONS = {
  complete: CheckCircle2,
  incomplete: Clock,
  ai_used: ShieldAlert,
  proctoring_violation: AlertTriangle,
  partial: Users,
};

/**
 * @param {{ data?: object }} props
 */
export function ScreeningInsights({ data }) {
  if (!data) return null;

  const { buckets = [], byJob = [], total_screened = 0, avg_completion_pct = 0, completion_rate_pct = 0 } =
    data;

  return (
    <div className="dashWidget screeningInsightsPanel">
      <div className="widgetHead">
        <h2>Pre-screening funnel</h2>
        <Link to="/candidates">View candidates</Link>
      </div>
      <p className="muted insightsSubtitle">
        Automated preliminary screening: completion, integrity flags, and routing buckets.
      </p>

      <div className="insightsKpiRow">
        <div className="insightsKpi">
          <span>Total screened</span>
          <strong>{total_screened}</strong>
        </div>
        <div className="insightsKpi">
          <span>Avg completion</span>
          <strong>{avg_completion_pct}%</strong>
        </div>
        <div className="insightsKpi">
          <span>Full completion rate</span>
          <strong>{completion_rate_pct}%</strong>
        </div>
      </div>

      <section className="insightsBlock insightsBlockBars">
        <h3>Screening status distribution</h3>
        {buckets.map((row, i) => (
          <Link key={row.id} to={BUCKET_LINKS[row.id] || '/candidates'} className="insightBarLink">
            <InsightBar label={row.label} pct={row.pct} count={row.count} delay={i * 0.05} />
          </Link>
        ))}
      </section>

      {byJob.length > 0 && (
        <section className="insightsBlock">
          <h3>By position</h3>
          <div className="screeningJobTableWrap">
            <table className="posTable screeningJobTable">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Total</th>
                  <th>Complete</th>
                  <th>Incomplete</th>
                  <th>AI flagged</th>
                  <th>Avg completion</th>
                </tr>
              </thead>
              <tbody>
                {byJob.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link to={`/candidates?jobId=${row.id}`}>
                        <b>{row.title}</b>
                      </Link>
                    </td>
                    <td>{row.total}</td>
                    <td>{row.complete || 0}</td>
                    <td>{row.incomplete || 0}</td>
                    <td>{row.ai_used || 0}</td>
                    <td>{row.avg_completion ?? 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="screeningBucketChips">
        {buckets.map((b) => {
          const Icon = BUCKET_ICONS[b.id] || Users;
          return (
            <Link key={b.id} to={BUCKET_LINKS[b.id] || '/candidates'} className={`screeningChip ${b.tone}`}>
              <Icon size={14} />
              {b.label}
              <strong>{b.count}</strong>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
