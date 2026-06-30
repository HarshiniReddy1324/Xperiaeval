import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, TrendingUp } from 'lucide-react';

function IntelStat({ label, value, tone, to, state }) {
  const inner = (
    <div className={`expIntelStat expIntelStat--${tone || 'neutral'}`}>
      <span className="expIntelStatLabel">{label}</span>
      <strong className="expIntelStatValue">{value}</strong>
    </div>
  );
  if (to) {
    return (
      <Link to={to} state={state} className="expIntelStatLink">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function ExperienceIntelligencePanel({ data, qualityTrend = [], linkState, compact = false }) {
  if (!data) return null;
  const avg = data.avg_experience_score ?? '—';
  const trend = qualityTrend?.length ? qualityTrend : [];
  const lastTrend = trend.length ? trend[trend.length - 1] : null;

  return (
    <section className={`expIntelPanel${compact ? ' expIntelPanel--compact' : ''}`}>
      <div className="expIntelPanelHead">
        <div>
          <span className="expIntelTag">
            <Sparkles size={12} /> Experience Intelligence
          </span>
          <h2>{compact ? 'Experience Intelligence' : 'Experience Intelligence overview'}</h2>
          {!compact && (
            <p className="muted">
              Explainable fit scores across your pipeline — before ATS status and pipeline metrics.
            </p>
          )}
        </div>
        <div className="expIntelHeroScore">
          <span className="expIntelHeroLabel">Average score</span>
          <strong className="expIntelHeroValue">{avg}</strong>
          {lastTrend && (
            <span className="expIntelHeroMeta">
              <TrendingUp size={12} /> {lastTrend.label}: {lastTrend.avg_score ?? '—'}
            </span>
          )}
        </div>
      </div>

      <div className="expIntelGrid">
        <IntelStat
          label="Elite candidates"
          value={data.elite_candidates ?? 0}
          tone="green"
          to="/candidates?bucket=Green"
          state={linkState}
        />
        <IntelStat
          label="Strong match"
          value={data.strong_match ?? 0}
          tone="blue"
          to="/candidates?bucket=Green"
          state={linkState}
        />
        <IntelStat
          label="Needs review"
          value={data.needs_review ?? 0}
          tone="amber"
          to="/candidates?bucket=Amber"
          state={linkState}
        />
        <IntelStat
          label="High risk"
          value={data.high_risk ?? 0}
          tone="red"
          to="/candidates?bucket=Red"
          state={linkState}
        />
      </div>

      {trend.length > 1 && !compact && (
        <div className="expIntelTrend">
          <span className="expIntelTrendLabel">Candidate quality trend (avg experience score)</span>
          <div className="expIntelTrendBars">
            {trend.map((t) => (
              <div key={t.month} className="expIntelTrendBar" title={`${t.label}: ${t.avg_score} (${t.scored} scored)`}>
                <div
                  className="expIntelTrendFill"
                  style={{ height: `${Math.min(100, Math.max(8, (t.avg_score || 0) * 0.9))}%` }}
                />
                <small>{t.label?.replace(/\s20\d{2}$/, '')}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="expIntelFoot muted">
        {data.scored_count ?? 0} candidates scored in this period ·{' '}
        <Link to="/reports">Open analytics</Link>
      </p>
    </section>
  );
}
