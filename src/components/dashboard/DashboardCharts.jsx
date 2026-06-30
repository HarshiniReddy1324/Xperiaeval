import React from 'react';

function polar(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polar(cx, cy, r, endAngle);
  const end = polar(cx, cy, r, startAngle);
  const large = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`;
}

export function DonutChart({
  segments,
  size = 160,
  stroke = 28,
  centerSub = 'total',
  onSegmentClick,
  showLegendPct = true,
  legendClassName = '',
  hideTrack = false,
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 0;
  const displayTotal = total || segments.reduce((s, x) => s + (x.value ?? 0), 0);
  let angle = 0;
  const cx = size / 2;
  const cy = size / 2;
  const r = hideTrack ? size / 2 - 4 : (size - stroke) / 2;
  const innerHoleR = hideTrack ? r - stroke : r - stroke / 2 - 4;

  const legendValue = (seg) =>
    showLegendPct
      ? `${seg.value} · ${seg.pct ?? (total ? Math.round((seg.value / total) * 100) : 0)}%`
      : String(seg.value);

  return (
    <div className={`chartDonut${legendClassName ? ` ${legendClassName}` : ''}`}>
      <div className="chartDonutSvgWrap" style={{ width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="chartDonutSvg" style={{ display: 'block' }}>
        {!hideTrack && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        )}
        {segments.map((seg) => {
          if (!seg.value) return null;
          const sweep = (seg.value / (total || 1)) * 360;
          const path = arcPath(cx, cy, r, angle, angle + sweep - 0.5);
          angle += sweep;
          return (
            <path
              key={seg.label}
              d={path}
              fill={seg.color}
              opacity={0.95}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
          );
        })}
        <circle cx={cx} cy={cy} r={innerHoleR} fill="var(--chart-center, var(--surface-1))" />
        <text x={cx} y={cy - 4} textAnchor="middle" className="chartDonutCenter">
          {displayTotal}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="chartDonutSub">
          {centerSub}
        </text>
      </svg>
      </div>
      <ul className="chartLegend">
        {segments.map((seg) => (
          <li key={seg.label}>
            {onSegmentClick ? (
              <button
                type="button"
                className="chartLegendBtn"
                onClick={() => onSegmentClick(seg)}
                disabled={!seg.value}
              >
                <span className="dot" style={{ background: seg.color }} />
                <span className="chartLegendLabel">{seg.label}</span>
                <strong className="chartLegendCount" style={{ color: seg.color }}>
                  {legendValue(seg)}
                </strong>
              </button>
            ) : (
              <>
                <span className="dot" style={{ background: seg.color }} />
                <span className="chartLegendLabel">{seg.label}</span>
                <strong className="chartLegendCount" style={{ color: seg.color }}>
                  {legendValue(seg)}
                </strong>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Connected inverted-pyramid funnel — width narrows by stage index. */
export function FunnelChart({ stages, onStageClick }) {
  const palette = ['#2563eb', '#1d4ed8', '#0284c7', '#0ea5e9', '#14b8a6', '#22c55e'];
  const topWidths = [100, 86, 72, 58, 44, 30];

  return (
    <div className="chartFunnel chartFunnelPyramid">
      {stages.map((stage, i) => {
        const top = topWidths[i] ?? 30;
        const bottom = topWidths[i + 1] ?? Math.max(18, top - 14);
        const clipPath = `polygon(${50 - top / 2}% 0%, ${50 + top / 2}% 0%, ${50 + bottom / 2}% 100%, ${50 - bottom / 2}% 100%)`;

        const body = (
          <div className="funnelRow">
            <span className="funnelLabel">{stage.label}</span>
            <div className="funnelBarWrap">
              <div
                className="funnelBar"
                style={{
                  clipPath,
                  background: `linear-gradient(180deg, ${palette[i] || '#3b82f6'} 0%, ${(palette[i] || '#3b82f6')}cc 100%)`,
                }}
              >
                <strong>{stage.value.toLocaleString()}</strong>
              </div>
            </div>
          </div>
        );

        return stage.to && onStageClick ? (
          <button
            key={stage.label}
            type="button"
            className="funnelRowBtn"
            onClick={() => onStageClick(stage.to)}
          >
            {body}
          </button>
        ) : (
          <div key={stage.label}>{body}</div>
        );
      })}
    </div>
  );
}

export function GaugeChart({ score, label, healthy, atRisk, critical, large = false }) {
  const clamped = Math.min(100, Math.max(0, score));
  const rotation = -90 + (clamped / 100) * 180;
  const stroke = large ? 18 : 14;
  return (
    <div className={`chartGauge${large ? ' chartGauge--large' : ''}`}>
      <svg viewBox="0 0 200 120" className="gaugeSvg">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--surface-3)" strokeWidth={stroke} strokeLinecap="round" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * 251} 251`}
        />
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <g transform={`rotate(${rotation} 100 100)`}>
          <line x1="100" y1="100" x2="100" y2="34" stroke="var(--text)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="100" r="6" fill="var(--accent)" />
        </g>
        <text x="100" y="88" textAnchor="middle" className="gaugeScore">
          {clamped}%
        </text>
      </svg>
      <p className="gaugeLabel">{label}</p>
      <div className="gaugeBreakdown">
        <span><i className="dot green" /> Healthy {healthy}%</span>
        <span><i className="dot amber" /> At Risk {atRisk}%</span>
        <span><i className="dot red" /> Critical {critical}%</span>
      </div>
    </div>
  );
}
