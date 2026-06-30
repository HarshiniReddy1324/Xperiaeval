import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export function JobExperienceIntelligence({ data, jobId, locationState }) {
  if (!data) return null;

  return (
    <section className="expIntelPanel expIntelPanel--job">
      <div className="expIntelPanelHead">
        <div>
          <span className="expIntelTag">
            <Sparkles size={12} /> Experience Intelligence
          </span>
          <h2>Role fit at a glance</h2>
          <p className="muted">Evaluated candidates for this position — review fit tiers before pipeline actions.</p>
        </div>
        <div className="expIntelHeroScore">
          <span className="expIntelHeroLabel">Average score</span>
          <strong className="expIntelHeroValue">{data.avg_experience_score ?? '—'}</strong>
        </div>
      </div>
      <div className="expIntelGrid expIntelGrid--5">
        <div className="expIntelStat expIntelStat--elite">
          <span className="expIntelStatLabel">Elite</span>
          <strong className="expIntelStatValue">{data.elite_candidates ?? 0}</strong>
        </div>
        <div className="expIntelStat expIntelStat--blue">
          <span className="expIntelStatLabel">Strong match</span>
          <strong className="expIntelStatValue">{data.strong_match ?? 0}</strong>
        </div>
        <div className="expIntelStat expIntelStat--purple">
          <span className="expIntelStatLabel">Needs review</span>
          <strong className="expIntelStatValue">{data.needs_review ?? 0}</strong>
        </div>
        <div className="expIntelStat expIntelStat--slate">
          <span className="expIntelStatLabel">Elevated risk</span>
          <strong className="expIntelStatValue">{data.high_risk ?? 0}</strong>
        </div>
        <div className="expIntelStat expIntelStat--neutral">
          <span className="expIntelStatLabel">Integrity flags</span>
          <strong className="expIntelStatValue">{data.integrity_flags ?? 0}</strong>
        </div>
      </div>
      <div className="expIntelJobActions">
        <Link to={`/candidates?jobId=${jobId}&bucket=Green`} state={locationState}>
          View Green bucket
        </Link>
        <Link to={`/candidates?jobId=${jobId}`} state={locationState}>
          All candidates
        </Link>
      </div>
    </section>
  );
}
