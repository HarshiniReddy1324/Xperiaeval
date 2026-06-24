import React from 'react';
import { motion } from 'framer-motion';

/**
 * LinkedIn-style horizontal insight bar.
 * @param {{ label: string, pct: number, count?: number, delay?: number }} props
 */
export function InsightBar({ label, pct, count, delay = 0 }) {
  const width = Math.max(pct > 0 ? 6 : 0, Math.min(100, pct));

  return (
    <div className="insightBarRow">
      <p className="insightBarLabel">
        <strong>{pct}%</strong> {label}
        {count != null && count > 0 && <span className="insightBarCount"> · {count}</span>}
      </p>
      <div className="insightBarTrack" aria-hidden="true">
        {width > 0 && (
          <motion.div
            className="insightBarFill"
            initial={{ width: 0 }}
            animate={{ width: `${width}%` }}
            transition={{ duration: 0.55, ease: 'easeOut', delay }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Large education stat row (LinkedIn education section style).
 * @param {{ label: string, pct: number, highlight?: boolean, delay?: number }} props
 */
export function EducationStat({ label, pct, highlight = false, delay = 0 }) {
  return (
    <div className={`educationStatRow ${highlight ? 'highlight' : ''}`}>
      <motion.span
        className="educationStatPct"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
      >
        {pct}%
      </motion.span>
      <span className="educationStatLabel">
        {label}
        {highlight && <em> (Similar to your pool)</em>}
      </span>
      <div className="insightBarTrack educationStatTrack" aria-hidden="true">
        <motion.div
          className="insightBarFill educationStatFill"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(pct, 4)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: delay + 0.05 }}
        />
      </div>
    </div>
  );
}
