import React from 'react';
import { Briefcase, AlertTriangle } from 'lucide-react';

const SEVERITY_TONE = {
  ok: 'green',
  low: 'amber',
  moderate: 'amber',
  high: 'red',
  critical: 'red',
};

/**
 * Experience / seniority fit: surfaces years-gap and role-level mismatch.
 */
export function ExperienceFitPanel({ experienceFit }) {
  if (!experienceFit) return null;

  const tone = SEVERITY_TONE[experienceFit.severity] || 'amber';

  return (
    <div className={`dashWidget experienceFitPanel experienceFitPanel--${tone}`}>
      <div className="widgetHead">
        <h2>
          <Briefcase size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Experience / seniority fit
        </h2>
        <span className={`integrityLevelBadge integrityLevelBadge--${tone}`}>
          {experienceFit.fit_score}/100
        </span>
      </div>

      <p className="experienceFitSummary">{experienceFit.summary}</p>

      <div className="experienceFitGrid">
        <div className="experienceFitStat">
          <span>Resume years</span>
          <strong>{experienceFit.candidate_years ?? 'N/A'}</strong>
        </div>
        <div className="experienceFitStat">
          <span>Role minimum</span>
          <strong>{experienceFit.required_min_years ?? 'N/A'}+</strong>
        </div>
        <div className="experienceFitStat">
          <span>Gap</span>
          <strong>{experienceFit.years_gap > 0 ? `${experienceFit.years_gap} yrs` : 'None'}</strong>
        </div>
        <div className="experienceFitStat">
          <span>Seniority</span>
          <strong>
            {experienceFit.candidate_seniority} → {experienceFit.required_seniority}
          </strong>
        </div>
      </div>

      {experienceFit.employment_mismatch && (
        <div className="experienceFitAlert">
          <AlertTriangle size={16} />
          <span>
            Employment mismatch flagged: overall score penalized by {experienceFit.overall_penalty} pts
            {experienceFit.recommendation_cap != null
              ? ` · recommendation capped at ${experienceFit.recommendation_cap}`
              : ''}
          </span>
        </div>
      )}
    </div>
  );
}
