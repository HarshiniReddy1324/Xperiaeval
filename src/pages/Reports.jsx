import React, { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { normalizeProductMode } from '../lib/productMode';
import {
  analyticsSectionById,
  analyticsSectionLabel,
  getVisibleAnalyticsSections,
} from '../lib/analyticsSections';
import { Button } from '../components/ui';
import { AnalyticsHub } from '../components/analytics/AnalyticsHub';
import { AnalyticsSectionContent } from '../components/analytics/AnalyticsSectionContent';

function buildHubMetrics(data) {
  if (!data) return {};
  const totalCandidates = (data.bucketDist || []).reduce((s, b) => s + (b.count || 0), 0);
  const avgScore = data.experienceAnalytics?.summary?.avg_experience_score;
  const screened = data.screeningAnalytics?.total_screened;
  const positions = data.byJob?.length;
  const insightsTotal = data.applicantInsights?.total;

  return {
    overview: totalCandidates ? `${totalCandidates} scored` : null,
    experience: avgScore != null ? `Avg ${avgScore}` : null,
    applicants: insightsTotal != null ? `${insightsTotal} applicants` : null,
    screening: screened != null ? `${screened} screened` : null,
    positions: positions != null ? `${positions} positions` : null,
    platform: 'Live + planned',
  };
}

export function Reports() {
  const { section: sectionId } = useParams();
  const { user } = useAuth();
  const isIntelOnly = normalizeProductMode(user?.productMode) === 'intelligence';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const visibleSections = useMemo(
    () => getVisibleAnalyticsSections({ isIntelOnly, isAdmin: user?.role === 'Admin', role: user?.role || '' }),
    [isIntelOnly, user?.role],
  );
  const activeSection = sectionId ? analyticsSectionById(sectionId) : null;
  const showHub = !sectionId;

  useEffect(() => {
    api('/reports')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const exportCsv = () => {
    if (!data?.byJob) return;
    const rows = [['Position', 'Applicants', 'Green', 'Amber', 'Red', 'Avg Score']];
    data.byJob.forEach((j) => rows.push([j.title, j.applicants, j.green, j.amber, j.red, j.avg_score || '']));
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'xperieval-report.csv';
    a.click();
  };

  if (sectionId && !activeSection) {
    return <Navigate to="/reports" replace />;
  }

  if (sectionId && !visibleSections.some((s) => s.id === sectionId)) {
    return <Navigate to="/reports" replace />;
  }

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Loading…</p>;

  const hubMetrics = buildHubMetrics(data);

  return (
    <>
      <div className="pageHead row">
        <div>
          <h1>{showHub ? 'Analytics' : analyticsSectionLabel(sectionId)}</h1>
          <p>
            {showHub &&
              (isIntelOnly
                ? 'Experience score trends from ATS-synced and API-evaluated candidates.'
                : 'Experience intelligence, hiring funnel, source quality, and authenticity trends.')}
            {!showHub && activeSection?.description}
          </p>
        </div>
        {!isIntelOnly && (
          <Button onClick={exportCsv}>
            <Download size={16} /> Export CSV
          </Button>
        )}
      </div>

      {showHub ? (
        <div className="analyticsReportsHub">
          <div className="analyticsReportsHubRow">
            <section className="analyticsOverviewBlock card">
              <h2>Overview</h2>
              <p className="muted analyticsOverviewLead">
                Score buckets and authenticity across your evaluated pipeline.
              </p>
              <AnalyticsSectionContent sectionId="overview" data={data} isIntelOnly={isIntelOnly} />
            </section>
            <AnalyticsHub
              isIntelOnly={isIntelOnly}
              metrics={hubMetrics}
              role={user?.role || ''}
              isAdmin={user?.role === 'Admin'}
            />
          </div>
        </div>
      ) : (
        <AnalyticsSectionContent sectionId={sectionId} data={data} isIntelOnly={isIntelOnly} />
      )}
    </>
  );
}
