import React from 'react';
import { Card } from '../ui';
import { ApplicantInsights } from './ApplicantInsights';
import { ScreeningInsights } from './ScreeningInsights';
import { ExperienceAnalytics } from './ExperienceAnalytics';
import { PlatformPillars } from '../PlatformPillars';

export function AnalyticsSectionContent({ sectionId, data, isIntelOnly }) {
  if (!data) return null;

  const {
    bucketDist,
    byJob,
    integritySummary,
    recentApps,
    stageCounts,
    applicantInsights,
    screeningAnalytics,
    experienceAnalytics,
  } = data;

  switch (sectionId) {
    case 'overview':
      return (
        <section className="stats analyticsOverviewStats">
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
                  <strong>{integritySummary.avg_authenticity ?? 'N/A'}</strong>
                  <small>
                    {integritySummary.genuine || 0} genuine · {integritySummary.review || 0} review ·{' '}
                    {integritySummary.high_risk || 0} high risk
                  </small>
                </div>
              </div>
            </Card>
          )}
        </section>
      );

    case 'experience':
      return <ExperienceAnalytics data={experienceAnalytics} />;

    case 'applicants':
      if (isIntelOnly) return null;
      return <ApplicantInsights initialData={applicantInsights} />;

    case 'screening':
      if (isIntelOnly) return null;
      return <ScreeningInsights data={screeningAnalytics} />;

    case 'positions':
      if (isIntelOnly) return null;
      return (
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
                    <td>{j.avg_score ?? 'N/A'}</td>
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
      );

    case 'platform':
      if (isIntelOnly) return null;
      return <PlatformPillars />;

    default:
      return <p className="muted">This analytics section is not available.</p>;
  }
}
