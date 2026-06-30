import React from 'react';

const DIM_KEYS = [
  { key: 'technical_competency', label: 'Technical' },
  { key: 'problem_solving', label: 'Problem solving' },
  { key: 'communication', label: 'Communication' },
  { key: 'project_ownership', label: 'Ownership' },
  { key: 'authenticity', label: 'Authenticity' },
  { key: 'resume_consistency', label: 'Resume fit' },
  { key: 'behavioral_confidence', label: 'Behavioral' },
];

export function DimensionRadar({ dimensions, label, color = '#6366f1', size = 200 }) {
  const values = DIM_KEYS.map((d) => dimensions?.[d.key] ?? 0);
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;
  const n = DIM_KEYS.length;

  const point = (i, r) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const dataPoints = values.map((v, i) => point(i, (v / 100) * maxR).join(',')).join(' ');

  return (
    <div className="radarWrap">
      {label && <p className="radarLabel">{label}</p>}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="radarSvg">
        {gridLevels.map((lvl) => (
          <polygon
            key={lvl}
            points={Array.from({ length: n }, (_, i) => point(i, maxR * lvl).join(',')).join(' ')}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}
        {DIM_KEYS.map((_, i) => {
          const [x, y] = point(i, maxR);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
        })}
        <polygon points={dataPoints} fill={`${color}33`} stroke={color} strokeWidth="2" />
        {DIM_KEYS.map((d, i) => {
          const [x, y] = point(i, maxR + 18);
          return (
            <text key={d.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="radarAxis">
              {d.label}
            </text>
          );
        })}
      </svg>
      <div className="radarLegend">
        {DIM_KEYS.map((d) => (
          <span key={d.key}>
            {d.label}: <strong>{dimensions?.[d.key] ?? 'N/A'}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}
