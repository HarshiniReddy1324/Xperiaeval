import React from 'react';
import { AlertTriangle, CheckCircle2, Target, XCircle } from 'lucide-react';

const STATUS_ICON = {
  pass: CheckCircle2,
  review: AlertTriangle,
  fail: XCircle,
};

/**
 * @param {{ validation?: object }} props
 */
export function ResumeValidationPanel({ validation }) {
  if (!validation) {
    return (
      <div className="dashWidget resumeValidationPanel">
        <div className="widgetHead">
          <h2>Resume intelligence</h2>
        </div>
        <p className="muted">No resume text available for validation.</p>
      </div>
    );
  }

  const { confidence, checks = [], recommendations = [], domainMatch, seniority, education, yearsExperience, skills = [], transferableSkills = [], certifications = [] } =
    validation;

  return (
    <div className="dashWidget resumeValidationPanel">
      <div className="widgetHead">
        <h2>
          <Target size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Resume intelligence &amp; validation
        </h2>
        <span className="validationConfidence">{confidence}% confidence</span>
      </div>

      <div className="validationMetaRow">
        <span>
          Seniority: <strong>{seniority === 'Not detected' ? '—' : seniority}</strong>
        </span>
        <span>
          Education: <strong>{education}</strong>
        </span>
        <span>
          Experience: <strong>{yearsExperience != null ? `${yearsExperience} yrs` : '—'}</strong>
        </span>
        {domainMatch?.hits?.length > 0 && (
          <span>
            Role signals: <strong>{domainMatch.hits.slice(0, 4).join(', ')}</strong>
          </span>
        )}
        {skills.length > 0 && (
          <span>
            Top skills: <strong>{skills.slice(0, 5).join(', ')}</strong>
          </span>
        )}
        {certifications.length > 0 && (
          <span>
            Certs: <strong>{certifications.slice(0, 4).join(', ')}</strong>
          </span>
        )}
      </div>

      {transferableSkills.length > 0 && (
        <div className="validationTransferable">
          <h4>Transferable skills</h4>
          <div className="insightsSkillTags">
            {transferableSkills.map((t) => (
              <span key={t} className="insightsSkillTag">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      <ul className="validationCheckList">
        {checks.map((c) => {
          const Icon = STATUS_ICON[c.status] || AlertTriangle;
          return (
            <li key={c.id} className={`validationCheck ${c.status}`}>
              <Icon size={16} />
              <div>
                <b>{c.label}</b>
                <p>{c.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {recommendations?.length > 0 && (
        <div className="validationRecs">
          <h4>Recommendation engine</h4>
          <ul>
            {recommendations.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
