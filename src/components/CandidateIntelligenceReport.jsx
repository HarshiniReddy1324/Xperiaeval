import React, { useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Target,
  AlertTriangle,
  CheckCircle2,
  Mic,
  Clock,
} from 'lucide-react';
import { BucketBadge, bucketClass } from './ui';

const DIMENSION_LABELS = {
  technical_competency: 'Technical Competency',
  problem_solving: 'Problem Solving',
  communication: 'Communication',
  project_ownership: 'Project Ownership',
  authenticity: 'Authenticity',
  resume_consistency: 'Resume Consistency',
  behavioral_confidence: 'Behavioral Confidence',
};

function ScoreBar({ label, value, tone }) {
  const v = value ?? 0;
  return (
    <div className="intelDimRow">
      <div className="intelDimHead">
        <span>{label}</span>
        <strong>{v}</strong>
      </div>
      <div className="intelDimTrack">
        <div className={`intelDimFill ${tone ? `tone-${tone}` : ''}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function tierClass(tier) {
  if (!tier) return '';
  if (tier.includes('Exceptional') || tier.includes('Strong')) return 'tierStrong';
  if (tier.includes('Potential')) return 'tierMid';
  if (tier.includes('Needs')) return 'tierReview';
  return 'tierLow';
}

export function CandidateIntelligenceReport({ report, applicationScore }) {
  const [showQuestions, setShowQuestions] = useState(true);
  if (!report) {
    return (
      <div className="intelEmpty">
        <p className="muted">No intelligence report yet. Re-score after answers are complete.</p>
      </div>
    );
  }

  const dims = report.dimensions || {};
  const insights = report.insights || {};
  const behavioral = report.behavioral || {};
  const headlineOverall = applicationScore?.overall ?? report.overall ?? '—';
  const headlineBucket = applicationScore?.bucket ?? report.bucket;
  const headlineTier = applicationScore?.tier ?? report.tier;
  const bucketTone = bucketClass(headlineBucket);

  return (
    <div className={`intelReport ${bucketTone ? `intelReport--${bucketTone}` : ''}`}>
      <header className={`intelHero ${bucketTone ? `intelHero--${bucketTone}` : ''}`}>
        <div>
          <p className="eyebrow">Candidate Intelligence Report</p>
          <h2>{report.candidate_name || 'Candidate'}</h2>
          <p className="muted">{report.job_title}</p>
        </div>
        <div className="intelHeroScore">
          <span className="intelOverall">{headlineOverall}</span>
          <span className="intelOverallLabel">Match score</span>
          {headlineBucket && <BucketBadge bucket={headlineBucket} />}
          <span className={`intelTier ${tierClass(headlineTier)}`}>{headlineTier}</span>
        </div>
      </header>

      <div className="intelRecGrid">
        <div className="intelRecCard">
          <label>Hiring recommendation</label>
          <strong>{report.recommendation}</strong>
        </div>
        <div className="intelRecCard">
          <label>Confidence</label>
          <strong>{report.confidence_level}</strong>
        </div>
        <div className="intelRecCard">
          <label>Interview readiness</label>
          <strong>{report.interview_readiness}</strong>
        </div>
        <div className="intelRecCard">
          <label>Scoring method</label>
          <strong>{report.method === 'heuristic+ai' ? 'AI + rubric' : 'Rubric engine'}</strong>
        </div>
      </div>

      <section className="intelSection">
        <h3>
          <BarChart3 size={18} /> Category scores
        </h3>
        <div className="intelDims">
          {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
            <ScoreBar key={key} label={label} value={dims[key]} tone={bucketTone} />
          ))}
        </div>
      </section>

      <div className="intelTwoCol">
        <section className="intelSection">
          <h3>
            <CheckCircle2 size={18} /> Top strengths
          </h3>
          <ul className="intelBullets">
            {(insights.top_strengths || []).map((s) => (
              <li key={s}>{s}</li>
            ))}
            {!insights.top_strengths?.length && <li className="muted">—</li>}
          </ul>
        </section>
        <section className="intelSection">
          <h3>
            <AlertTriangle size={18} /> Potential concerns
          </h3>
          <ul className="intelBullets concerns">
            {(insights.potential_concerns || []).map((s) => (
              <li key={s}>{s}</li>
            ))}
            {!insights.potential_concerns?.length && <li className="muted">None flagged</li>}
          </ul>
        </section>
      </div>

      <section className="intelSection">
        <h3>
          <Target size={18} /> Recommended interview focus
        </h3>
        <ul className="intelBullets">
          {(insights.interview_focus_areas || []).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <div className="intelTwoCol">
        <section className="intelSection compact">
          <h4>Resume vs assessment</h4>
          <ul className="intelBullets small">
            {(insights.resume_findings || []).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
        <section className="intelSection compact">
          <h4>Project experience signals</h4>
          <ul className="intelBullets small">
            {(insights.project_findings || []).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="intelSection">
        <h3>
          <Clock size={18} /> Behavioral observations
        </h3>
        <p className="muted intelBehaviorNote">
          Tab switches and paste events are context signals only — they do not auto-reject candidates.
        </p>
        <div className="intelBehaviorStats">
          <span>Assessment time: {behavioral.total_assessment_seconds || 0}s</span>
          <span>Tab switches: {behavioral.tab_switches ?? 0}</span>
          <span>Paste events: {behavioral.paste_events ?? 0}</span>
          <span>Behavioral confidence: {dims.behavioral_confidence ?? behavioral.behavioral_confidence ?? '—'}</span>
        </div>
        <ul className="intelBullets small">
          {(insights.behavioral_observations || behavioral.observations || []).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section className="intelSection">
        <button
          type="button"
          className="intelToggle"
          onClick={() => setShowQuestions((v) => !v)}
        >
          Per-question breakdown ({report.per_question?.length || 0})
          {showQuestions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showQuestions && (
          <div className="intelQuestions">
            {(report.per_question || []).map((q, i) => (
              <div key={q.category_id || i} className="intelQCard">
                <div className="intelQHead">
                  <span className="intelQNum">Q{i + 1}</span>
                  <span className="intelQType">{q.category_type}</span>
                  <strong className="intelQScore">{q.questionScore}/100</strong>
                </div>
                <p className="intelQText">{q.question}</p>
                <div className="intelQDims">
                  <small>Technical {q.technicalAccuracy}</small>
                  <small>Depth {q.depthScore}</small>
                  <small>Problem solving {q.problemSolving}</small>
                  <small>Communication {q.communicationScore}</small>
                  <small>Authenticity {q.authenticityScore}</small>
                </div>
                {q.has_media && (
                  <span className="intelAudioTag">
                    <Mic size={12} /> Audio/video attached
                  </span>
                )}
                {q.strengths?.length > 0 && (
                  <p className="intelQStrength">+ {(q.strengths || []).join(' · ')}</p>
                )}
                {q.concerns?.length > 0 && (
                  <p className="intelQConcern">− {(q.concerns || []).join(' · ')}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {report.explainability?.note && (
        <p className="intelAudit muted">
          <small>{report.explainability.note}</small>
        </p>
      )}
    </div>
  );
}
