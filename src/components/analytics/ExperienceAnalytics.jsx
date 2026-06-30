import React from 'react';
import { Sparkles } from 'lucide-react';
import { Card } from '../ui';

function DataTable({ columns, rows, empty }) {
  if (!rows?.length) return <p className="muted">{empty}</p>;
  return (
    <div className="expAnalyticsTableWrap">
      <table className="expAnalyticsTable">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || row.source || row.agency || row.recruiter || i}>
              {columns.map((c) => (
                <td key={c.key}>{c.render ? c.render(row) : row[c.key] ?? 'N/A'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ExperienceAnalytics({ data }) {
  if (!data) return null;
  const { summary, qualityTrend, sourceQuality, agencyPerformance, recruiterQuality } = data;

  return (
    <section className="expAnalyticsSection">
      <div className="expIntelPanelHead">
        <div>
          <span className="expIntelTag">
            <Sparkles size={12} /> Experience Intelligence
          </span>
          <h2>Quality &amp; source analytics</h2>
          <p className="muted">Average experience scores, submission sources, and recruiter contribution.</p>
        </div>
        {summary && (
          <div className="expIntelHeroScore">
            <span className="expIntelHeroLabel">Org average</span>
            <strong className="expIntelHeroValue">{summary.avg_experience_score ?? 'N/A'}</strong>
          </div>
        )}
      </div>

      {qualityTrend?.length > 0 && (
        <Card className="expAnalyticsCard expAnalyticsCard--trend">
          <div className="qualityTrendHead">
            <div>
              <h3>Candidate quality trend</h3>
              <p className="muted">Average experience score by month (last 6 months)</p>
            </div>
          </div>
          <div className="qualityTrendChart">
            {qualityTrend.map((t) => {
              const score = t.avg_score ?? null;
              const pct = score != null ? Math.min(100, Math.max(0, score)) : 0;
              return (
                <div key={t.month} className="qualityTrendRow">
                  <span className="qualityTrendMonth">{t.label?.replace(/\s20\d{2}$/, '') || t.month}</span>
                  <div className="qualityTrendTrack" aria-hidden>
                    <div className="qualityTrendFill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="qualityTrendValue">{score ?? 'N/A'}</span>
                  <span className="qualityTrendMeta">{t.scored ?? 0} scored</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid two expAnalyticsGrid">
        <Card className="expAnalyticsCard">
          <h3>Source quality</h3>
          <DataTable
            empty="No source data yet."
            columns={[
              { key: 'source', label: 'Source' },
              { key: 'submissions', label: 'Submitted' },
              { key: 'avg_score', label: 'Avg score', render: (r) => r.avg_score ?? 'N/A' },
              { key: 'green', label: 'Green' },
            ]}
            rows={sourceQuality}
          />
        </Card>

        <Card className="expAnalyticsCard">
          <h3>Recruiter quality</h3>
          <DataTable
            empty="Assign position owners to track recruiter contribution."
            columns={[
              { key: 'recruiter', label: 'Recruiter / owner' },
              { key: 'candidates_submitted', label: 'Candidates' },
              { key: 'avg_score', label: 'Avg score', render: (r) => r.avg_score ?? 'N/A' },
              { key: 'interview_pct', label: 'Interview %', render: (r) => `${r.interview_pct ?? 0}%` },
              { key: 'offer_pct', label: 'Offer %', render: (r) => `${r.offer_pct ?? 0}%` },
            ]}
            rows={recruiterQuality}
          />
        </Card>
      </div>

      {agencyPerformance?.length > 0 && (
        <Card className="expAnalyticsCard">
          <h3>Agency &amp; external source performance</h3>
          <DataTable
            empty="No agency submissions yet."
            columns={[
              { key: 'agency', label: 'Source' },
              { key: 'submissions', label: 'Submitted' },
              { key: 'recommended', label: 'Green' },
              { key: 'hired', label: 'Hired' },
              { key: 'avg_score', label: 'Avg score', render: (r) => r.avg_score ?? 'N/A' },
              { key: 'risk_count', label: 'Risk flags' },
            ]}
            rows={agencyPerformance}
          />
        </Card>
      )}
    </section>
  );
}
