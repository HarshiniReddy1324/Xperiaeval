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
                <td key={c.key}>{c.render ? c.render(row) : row[c.key] ?? '—'}</td>
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
            <strong className="expIntelHeroValue">{summary.avg_experience_score ?? '—'}</strong>
          </div>
        )}
      </div>

      {qualityTrend?.length > 0 && (
        <Card className="expAnalyticsCard">
          <h3>Candidate quality trend</h3>
          <p className="muted">Average experience score by month (last 6 months)</p>
          <div className="expIntelTrend expIntelTrend--wide">
            <div className="expIntelTrendBars">
              {qualityTrend.map((t) => (
                <div key={t.month} className="expIntelTrendBar" title={`${t.scored} scored`}>
                  <span className="expIntelTrendScore">{t.avg_score ?? '—'}</span>
                  <div
                    className="expIntelTrendFill"
                    style={{ height: `${Math.min(100, Math.max(10, (t.avg_score || 0) * 0.85))}%` }}
                  />
                  <small>{t.label?.replace(/\s20\d{2}$/, '')}</small>
                </div>
              ))}
            </div>
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
              { key: 'avg_score', label: 'Avg score', render: (r) => r.avg_score ?? '—' },
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
              { key: 'avg_score', label: 'Avg score', render: (r) => r.avg_score ?? '—' },
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
              { key: 'avg_score', label: 'Avg score', render: (r) => r.avg_score ?? '—' },
              { key: 'risk_count', label: 'Risk flags' },
            ]}
            rows={agencyPerformance}
          />
        </Card>
      )}
    </section>
  );
}
