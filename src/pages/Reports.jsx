import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { normalizeProductMode } from '../lib/productMode';
import { Button, Card } from '../components/ui';
import { ApplicantInsights } from '../components/analytics/ApplicantInsights';
import { ScreeningInsights } from '../components/analytics/ScreeningInsights';
import { ExperienceAnalytics } from '../components/analytics/ExperienceAnalytics';
import { PlatformPillars } from '../components/PlatformPillars';

export function Reports() {
  const { user } = useAuth();
  const isIntelOnly = normalizeProductMode(user?.productMode) === 'intelligence';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/reports')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const exportCsv = () => {
    if (!data) return;
    const rows = [['Position', 'Applicants', 'Green', 'Amber', 'Red', 'Avg Score']];
    data.byJob.forEach((j) => rows.push([j.title, j.applicants, j.green, j.amber, j.red, j.avg_score || '']));
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'xperieval-report.csv';
    a.click();
  };

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Loading…</p>;

  const { bucketDist, byJob, integritySummary, recentApps, stageCounts, applicantInsights, screeningAnalytics, experienceAnalytics } =
    data;

  return (
    <>
      <div className="pageHead row">
        <div>
          <h1>Analytics</h1>
          <p>
            {isIntelOnly
              ? 'Experience score trends from ATS-synced and API-evaluated candidates.'
              : 'Experience intelligence, hiring funnel, source quality, and authenticity trends.'}
          </p>
        </div>
        <Button onClick={exportCsv}>
          <Download size={16} /> Export CSV
        </Button>
      </div>

      <section className="stats">
        {bucketDist.map((b) => (
          <Card key={b.bucket}>
            <div className="stat">
              <div>
                <span>{b.bucket} candidates</span>
                <strong>{b.count}</strong>
              </div>
            </div>
          </Card>
        ))}
        {integritySummary && (
          <Card>
            <div className="stat">
              <div>
                <span>Avg authenticity</span>
                <strong>{integritySummary.avg_authenticity ?? '—'}</strong>
                <small>
                  {integritySummary.genuine || 0} genuine · {integritySummary.review || 0} review ·{' '}
                  {integritySummary.high_risk || 0} high risk
                </small>
              </div>
            </div>
          </Card>
        )}
      </section>

      <ExperienceAnalytics data={experienceAnalytics} />

      {!isIntelOnly && (
        <>
      <ApplicantInsights initialData={applicantInsights} />

      <ScreeningInsights data={screeningAnalytics} />

      <PlatformPillars />

      <section className="grid two">
        <Card>
          <h2>By position</h2>
          <table>
            <thead>
              <tr>
                <th>Position</th>
                <th>Apps</th>
                <th>G</th>
                <th>A</th>
                <th>R</th>
                <th>Avg</th>
              </tr>
            </thead>
            <tbody>
              {byJob.map((j) => (
                <tr key={j.id}>
                  <td>{j.title}</td>
                  <td>{j.applicants}</td>
                  <td>{j.green || 0}</td>
                  <td>{j.amber || 0}</td>
                  <td>{j.red || 0}</td>
                  <td>{j.avg_score ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <h2>Pipeline stages</h2>
          {stageCounts.map((s) => (
            <div className="bar" key={s.stage}>
              <div>
                <span>{s.stage}</span>
                <b>{s.count}</b>
              </div>
              <progress value={s.count} max={Math.max(...stageCounts.map((x) => x.count), 1)} />
            </div>
          ))}
          <h3 className="mt">Applications (last 14 days)</h3>
          {recentApps.length ? (
            recentApps.map((d) => (
              <div className="audit" key={d.day}>
                <div>
                  <b>{d.day}</b>
                  <p>{d.count} application(s)</p>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">No recent applications.</p>
          )}
        </Card>
      </section>
        </>
      )}
    </>
  );
}
