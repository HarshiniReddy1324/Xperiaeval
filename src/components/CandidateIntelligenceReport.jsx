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
  Sparkles,
  ShieldCheck,
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

const EVIDENCE_CATEGORIES = [
  { key: 'project_ownership', label: 'Leadership' },
  { key: 'technical_competency', label: 'Technical' },
  { key: 'communication', label: 'Communication' },
  { key: 'problem_solving', label: 'Business / strategy' },
];

function scoreToStars(value) {
  if (value == null) return 0;
  if (value >= 90) return 5;
  if (value >= 80) return 4;
  if (value >= 70) return 3;
  if (value >= 55) return 2;
  return 1;
}

function StarRow({ label, value }) {
  const stars = scoreToStars(value);
  return (
    <div className="intelEvidenceRow">
      <span className="intelEvidenceLabel">{label}</span>
      <span className="intelEvidenceStars" aria-label={`${value ?? '—'} out of 100`}>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < stars ? 'on' : 'off'}>
            ★
          </span>
        ))}
      </span>
      <span className="intelEvidenceScore">{value ?? '—'}</span>
    </div>
  );
}

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
  if (tier.includes('Exceptional') || tier.includes('Strong') || tier.includes('Elite')) return 'tierStrong';
  if (tier.includes('Potential')) return 'tierMid';
  if (tier.includes('Needs')) return 'tierReview';
  return 'tierLow';
}

function tierLabel(tier, overall) {
  if (tier) return tier;
  if (overall >= 90) return 'Elite match';
  if (overall >= 80) return 'Strong match';
  if (overall >= 60) return 'Needs review';
  return 'High risk';
}

function buildFallbackExplainability(report) {
  const dims = report.dimensions || {};
  const insights = report.insights || {};
  return {
    overall: report.overall,
    because: Object.entries(DIMENSION_LABELS).map(([key, label]) => ({
      key,
      label,
      score: dims[key] ?? null,
      weight_pct: null,
    })).filter((d) => d.score != null),
    positives: (insights.top_strengths || []).map((text) => ({ text, tone: 'positive' })),
    gaps: (insights.potential_concerns || []).map((text) => ({ text, tone: 'gap' })),
    risk: [],
    ai_summary: insights.ai_summary || insights.strength_summary,
    confidence_pct: report.confidence_level === 'High' ? 94 : report.confidence_level === 'Medium' ? 78 : 62,
    note: report.explainability?.note,
  };
}

export function CandidateIntelligenceReport({ report, applicationScore }) {
  const [showQuestions, setShowQuestions] = useState(false);
  const [showDimensions, setShowDimensions] = useState(false);
  if (!report) {
    return (
      <div className="intelEmpty">
        <p className="muted">No experience intelligence report yet. Re-score after answers are complete.</p>
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
  const explain =
    report.explainability?.because?.length
      ? report.explainability
      : buildFallbackExplainability(report);

  return (
    <div className={`intelReport ${bucketTone ? `intelReport--${bucketTone}` : ''}`}>
      <header className={`intelHero intelHero--experience ${bucketTone ? `intelHero--${bucketTone}` : ''}`}>
        <div className="intelHeroCopy">
          <p className="eyebrow">
            <Sparkles size={12} /> Experience Intelligence
          </p>
          <h2>{report.candidate_name || 'Candidate'}</h2>
          <p className="muted">{report.job_title}</p>
        </div>
        <div className="intelExperienceScoreBlock">
          <span className="intelExperienceLabel">Experience score</span>
          <span className="intelExperienceValue">{headlineOverall}</span>
          <div className="intelExperienceMeta">
            {headlineBucket && <BucketBadge bucket={headlineBucket} />}
            <span className={`intelTier ${tierClass(headlineTier)}`}>
              {tierLabel(headlineTier, headlineOverall)}
            </span>
          </div>
        </div>
      </header>

      <div className="intelPrimaryGrid">
        <section className="intelSection intelEvidencePanel">
          <h3>Evidence</h3>
          {EVIDENCE_CATEGORIES.map(({ key, label }) => (
            <StarRow key={key} label={label} value={dims[key]} />
          ))}
        </section>

        <section className="intelSection intelSummaryPanel">
          <h3>AI summary</h3>
          <p className="intelAiSummary">{explain.ai_summary || report.recommendation || '—'}</p>
          <div className="intelConfidenceRow">
            <span>Confidence</span>
            <strong>{explain.confidence_pct != null ? `${explain.confidence_pct}%` : report.confidence_level || '—'}</strong>
          </div>
          <div className="intelRecInline">
            <span>Recommendation</span>
            <strong>{report.recommendation || applicationScore?.recommendation || '—'}</strong>
          </div>
        </section>

        <section className="intelSection intelRiskPanel">
          <h3>
            <ShieldCheck size={16} /> Risk &amp; integrity
          </h3>
          <ul className="intelRiskList">
            {(explain.risk || []).map((r) => (
              <li key={r.label} className={`intelRiskItem intelRiskItem--${r.status || 'review'}`}>
                <span className="intelRiskDot" />
                <div>
                  <strong>{r.label}</strong>
                  {r.detail && <small>{r.detail}</small>}
                </div>
              </li>
            ))}
            {!explain.risk?.length && (
              <>
                <li className="intelRiskItem intelRiskItem--clear">
                  <span className="intelRiskDot" />
                  <div>
                    <strong>No employment mismatch</strong>
                  </div>
                </li>
                <li className="intelRiskItem intelRiskItem--clear">
                  <span className="intelRiskDot" />
                  <div>
                    <strong>Integrity signals within normal range</strong>
                  </div>
                </li>
              </>
            )}
          </ul>
        </section>
      </div>

      <section className="intelSection intelWhyPanel">
        <h3>Why this score?</h3>
        <p className="intelWhyLead">
          Overall <strong>{headlineOverall}</strong> because:
        </p>
        <div className="intelWhyBecause">
          {explain.because?.map((row) => (
            <div key={row.key} className="intelWhyRow">
              <span>{row.label}</span>
              <strong>{row.score}</strong>
            </div>
          ))}
        </div>
        <div className="intelWhyCols">
          <div>
            <h4>Strengths</h4>
            <ul className="intelBullets">
              {(explain.positives || []).map((p) => (
                <li key={p.text}>+ {p.text}</li>
              ))}
              {!explain.positives?.length &&
                (insights.top_strengths || []).map((s) => <li key={s}>+ {s}</li>)}
              {!explain.positives?.length && !insights.top_strengths?.length && (
                <li className="muted">No major strengths highlighted</li>
              )}
            </ul>
          </div>
          <div>
            <h4>Missing / gaps</h4>
            <ul className="intelBullets concerns">
              {(explain.gaps || []).map((g) => (
                <li key={g.text}>− {g.text}</li>
              ))}
              {!explain.gaps?.length &&
                (insights.potential_concerns || []).map((s) => <li key={s}>− {s}</li>)}
              {!explain.gaps?.length && !insights.potential_concerns?.length && (
                <li className="muted">No significant gaps flagged</li>
              )}
            </ul>
          </div>
        </div>
        {explain.note && <p className="intelAudit muted"><small>{explain.note}</small></p>}
      </section>

      <div className="intelRecGrid">
        <div className="intelRecCard">
          <label>Interview readiness</label>
          <strong>{report.interview_readiness}</strong>
        </div>
        <div className="intelRecCard">
          <label>Scoring method</label>
          <strong>{report.method === 'heuristic+ai' ? 'AI + rubric' : 'Rubric engine'}</strong>
        </div>
        <div className="intelRecCard">
          <label>Evidence score</label>
          <strong>{dims.authenticity ?? '—'}</strong>
        </div>
        <div className="intelRecCard">
          <label>Integrity score</label>
          <strong>{dims.behavioral_confidence ?? behavioral.behavioral_confidence ?? '—'}</strong>
        </div>
      </div>

      <section className="intelSection">
        <button type="button" className="intelToggle" onClick={() => setShowDimensions((v) => !v)}>
          Full dimension breakdown ({Object.keys(DIMENSION_LABELS).length})
          {showDimensions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showDimensions && (
          <div className="intelDims">
            {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
              <ScoreBar key={key} label={label} value={dims[key]} tone={bucketTone} />
            ))}
          </div>
        )}
      </section>

      <div className="intelTwoCol">
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
          </div>
        </section>
      </div>

      <section className="intelSection">
        <button type="button" className="intelToggle" onClick={() => setShowQuestions((v) => !v)}>
          Per-question evidence ({report.per_question?.length || 0})
          {showQuestions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showQuestions && (
          <div className="intelQuestions">
            {(report.per_question || []).map((q, i) => (
              <div key={q.category_id || i} className="intelQCard">
                <div className="intelQHead">
                  <span className="intelQNum">Q{i + 1}</span>
                  <span className="intelQType">{q.category_type}</span>
                  <strong className="intelQScore" title="Composite intelligence score (0–100)">
                    {q.questionScore ?? '—'}
                  </strong>
                </div>
                <p className="intelQText">{q.question}</p>
                {q.strengths?.length > 0 && (
                  <p className="intelQStrength">+ {(q.strengths || []).join(' · ')}</p>
                )}
                {q.concerns?.length > 0 && (
                  <p className="intelQConcern">− {(q.concerns || []).join(' · ')}</p>
                )}
                {q.has_media && (
                  <span className="intelAudioTag">
                    <Mic size={12} /> Audio/video attached
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
