import React, { useEffect, useState } from 'react';
import { HelpCircle, Sparkles, TrendingUp, Users } from 'lucide-react';
import { api } from '../../api/client';
import { EducationStat, InsightBar } from './InsightBars';

function KpiMini({ label, value, sub }) {
  return (
    <div className="insightsKpi">
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

function InsightsEmpty({ onJobChange, jobs }) {
  return (
    <div className="insightsEmpty">
      <Users size={32} strokeWidth={1.5} />
      <h3>No applicants yet</h3>
      <p>Share your position apply link to populate seniority, education, and skill insights.</p>
      {jobs?.length > 0 && (
        <label className="insightsJobSelect">
          <span>Position</span>
          <select onChange={(e) => onJobChange(e.target.value)} defaultValue="">
            <option value="" disabled>
              Select a position
            </option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

/**
 * @param {{ initialData?: object }} props
 */
export function ApplicantInsights({ initialData = null }) {
  const [jobId, setJobId] = useState(initialData?.jobId || '');
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const q = jobId ? `?insightsJobId=${encodeURIComponent(jobId)}` : '';
    api(`/reports${q}`)
      .then((payload) => {
        const insights = payload.applicantInsights;
        if (!insights) throw new Error('Applicant insights unavailable — restart the API server');
        setData(insights);
        if (!jobId && insights.jobId) setJobId(insights.jobId);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleJobChange = (id) => setJobId(id);

  if (loading && !data) {
    return (
      <div className="dashWidget applicantInsightsPanel">
        <div className="widgetHead">
          <h2>Applicant Insights</h2>
        </div>
        <p className="muted insightsLoading">Loading applicant analytics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashWidget applicantInsightsPanel">
        <div className="widgetHead">
          <h2>Applicant Insights</h2>
        </div>
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!data?.jobId || (data.total === 0 && !data.jobs?.length)) {
    return (
      <div className="dashWidget applicantInsightsPanel">
        <div className="widgetHead insightsPanelHead">
          <div>
            <span className="insightsPremiumTag">
              <Sparkles size={12} /> Premium
            </span>
            <h2>Applicant Insights</h2>
            <p className="muted insightsSubtitle">See how your applicant pool compares across seniority and education</p>
          </div>
        </div>
        <InsightsEmpty jobs={data?.jobs || []} onJobChange={handleJobChange} />
      </div>
    );
  }

  const topEducation = data.education[0];

  return (
    <div className="dashWidget applicantInsightsPanel">
      <div className="widgetHead insightsPanelHead">
        <div>
          <span className="insightsPremiumTag">
            <Sparkles size={12} /> Premium
          </span>
          <h2>Applicant Insights</h2>
          <p className="muted insightsSubtitle">
            See how applicants compare for <strong>{data.jobTitle}</strong>
          </p>
        </div>
        <button type="button" className="insightsHelpBtn" title="Derived from resume text and scores in your database">
          <HelpCircle size={16} />
        </button>
      </div>

      <label className="insightsJobSelect">
        <span>Position</span>
        <select value={jobId || data.jobId || ''} onChange={(e) => handleJobChange(e.target.value)}>
          {(data.jobs || []).map((j) => (
            <option key={j.id} value={j.id}>
              {j.title} ({j.applicants} applicants)
            </option>
          ))}
        </select>
      </label>

      {data.total === 0 ? (
        <InsightsEmpty jobs={data.jobs} onJobChange={handleJobChange} />
      ) : (
        <div className="insightsBody">
          <section className="insightsBlock">
            <h3>Candidates who clicked apply</h3>
            <p className="insightsTotal">
              <strong>{data.total}</strong> total
            </p>
            <p className="insightsRecent">
              <strong>{data.last24Hours}</strong> in the past day
              {data.last7Days > data.last24Hours && (
                <span className="muted"> · {data.last7Days} this week</span>
              )}
            </p>
          </section>

          <div className="insightsKpiRow">
            <KpiMini
              label="Avg years experience"
              value={data.avgYearsExperience != null ? data.avgYearsExperience : '—'}
            />
            <KpiMini
              label="Avg resume score"
              value={data.avgResumeScore != null ? `${data.avgResumeScore}/100` : '—'}
            />
            <KpiMini label="Strong fit (Green)" value={`${data.greenPct}%`} sub="of scored applicants" />
          </div>

          <div className="insightsGrid">
            <section className="insightsBlock insightsBlockBars">
              <h3>Candidate seniority level</h3>
              {data.seniority.length ? (
                data.seniority.map((row, i) => (
                  <InsightBar
                    key={row.label}
                    label={`${row.label} level candidates`}
                    pct={row.pct}
                    count={row.count}
                    delay={i * 0.06}
                  />
                ))
              ) : (
                <p className="muted">Not enough resume data to infer seniority.</p>
              )}
            </section>

            <section className="insightsBlock insightsBlockEducation">
              <h3>Candidate education level</h3>
              {data.education.length ? (
                data.education.map((row, i) => (
                  <EducationStat
                    key={row.label}
                    label={`have ${row.label === 'Other' ? 'other degrees' : `a ${row.label}`}`}
                    pct={row.pct}
                    highlight={row.label === topEducation?.label && row.pct >= 20}
                    delay={i * 0.05}
                  />
                ))
              ) : (
                <p className="muted">No education signals detected in resumes.</p>
              )}
            </section>
          </div>

          {data.topSkills?.length > 0 && (
            <section className="insightsBlock">
              <h3>Top skills among applicants</h3>
              <div className="insightsSkillTags">
                {data.topSkills.map((s) => (
                  <span key={s.skill} className="insightsSkillTag">
                    {s.skill}
                    <small>{s.pct}%</small>
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="insightsBlock insightsAiBlock">
            <h3>
              <TrendingUp size={16} /> AI hiring insights
            </h3>
            <ul className="insightsAiList">
              {(data.insights || []).map((item) => (
                <li key={item.text} className={`insightsAiItem ${item.type}`}>
                  {item.text}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {loading && <p className="muted insightsRefreshing">Refreshing…</p>}
    </div>
  );
}
