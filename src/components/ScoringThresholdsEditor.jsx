import React from 'react';
import { Sliders } from 'lucide-react';

const TIER_LABELS = [
  { key: 'exceptional', label: 'Exceptional Match', hint: '≥ this score' },
  { key: 'strong', label: 'Strong Match', hint: '' },
  { key: 'potential', label: 'Potential Match', hint: '' },
  { key: 'needs_review', label: 'Needs Review', hint: '' },
];

const REC_LABELS = [
  { key: 'strongly_recommend', label: 'Strongly recommend interview' },
  { key: 'recommend', label: 'Recommend interview' },
  { key: 'review', label: 'Recruiter review needed' },
];

const DEFAULT_THRESHOLDS = {
  bucket: { green: 80, amber: 60 },
  tiers: { exceptional: 90, strong: 80, potential: 70, needs_review: 60 },
  recommendations: { strongly_recommend: 90, recommend: 80, review: 65 },
};

export function mergeThresholds(input) {
  const t = input || {};
  return {
    bucket: { ...DEFAULT_THRESHOLDS.bucket, ...t.bucket },
    tiers: { ...DEFAULT_THRESHOLDS.tiers, ...t.tiers },
    recommendations: { ...DEFAULT_THRESHOLDS.recommendations, ...t.recommendations },
  };
}

function ThresholdSlider({ label, hint, value, onChange, min = 50, max = 100 }) {
  return (
    <div className="threshRow">
      <div className="threshLabel">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      <div className="threshControl">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <input type="number" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      </div>
    </div>
  );
}

export function ScoringThresholdsEditor({ thresholds, onChange }) {
  const t = mergeThresholds(thresholds);

  const setBucket = (key, val) => onChange({ ...t, bucket: { ...t.bucket, [key]: val } });
  const setTier = (key, val) => onChange({ ...t, tiers: { ...t.tiers, [key]: val } });
  const setRec = (key, val) => onChange({ ...t, recommendations: { ...t.recommendations, [key]: val } });

  return (
    <div className="threshEditor">
      <div className="threshPreview">
        <div className="threshPreviewBar">
          <span style={{ width: `${100 - t.bucket.amber}%` }} className="barGreen" />
          <span style={{ width: `${t.bucket.green - t.bucket.amber}%` }} className="barAmber" />
          <span style={{ width: `${t.bucket.amber}%` }} className="barRed" />
        </div>
        <div className="threshPreviewLabels">
          <span>Red &lt; {t.bucket.amber}</span>
          <span>Amber {t.bucket.amber}–{t.bucket.green - 1}</span>
          <span>Green ≥ {t.bucket.green}</span>
        </div>
      </div>

      <section className="threshSection">
        <h3>
          <Sliders size={16} /> Pipeline buckets
        </h3>
        <p className="muted">Used on dashboard filters and candidate Green / Amber / Red badges.</p>
        <ThresholdSlider label="Green bucket (≥)" value={t.bucket.green} onChange={(v) => setBucket('green', v)} />
        <ThresholdSlider label="Amber bucket (≥)" value={t.bucket.amber} onChange={(v) => setBucket('amber', v)} min={40} max={95} />
      </section>

      <section className="threshSection">
        <h3>Intelligence tiers</h3>
        <p className="muted">Match tier labels shown on the Candidate Intelligence Report.</p>
        {TIER_LABELS.map(({ key, label, hint }) => (
          <ThresholdSlider key={key} label={label} hint={hint} value={t.tiers[key]} onChange={(v) => setTier(key, v)} />
        ))}
      </section>

      <section className="threshSection">
        <h3>Hiring recommendations</h3>
        <p className="muted">Automated interview recommendation text.</p>
        {REC_LABELS.map(({ key, label }) => (
          <ThresholdSlider key={key} label={label} value={t.recommendations[key]} onChange={(v) => setRec(key, v)} />
        ))}
      </section>
    </div>
  );
}
