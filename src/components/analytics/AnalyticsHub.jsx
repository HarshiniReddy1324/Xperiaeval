import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getAnalyticsHubSections } from '../../lib/analyticsSections';

function tileMetric(sectionId, metrics = {}) {
  const v = metrics[sectionId];
  if (v == null || v === '') return null;
  return v;
}

export function AnalyticsHub({ isIntelOnly, metrics = {} }) {
  const sections = getAnalyticsHubSections({ isIntelOnly });

  if (!sections.length) return null;

  return (
    <div className="analyticsHub">
      <div className="analyticsHubIntro">
        <h2 className="analyticsHubHeading">Explore further</h2>
        <p className="muted">Drill into experience intelligence, screening, and position-level trends.</p>
      </div>
      <div className={`analyticsTileGrid${sections.length <= 2 ? ' analyticsTileGrid--compact' : ''}`}>
        {sections.map((tile) => {
          const Icon = tile.icon;
          const metric = tileMetric(tile.id, metrics);
          return (
            <Link
              key={tile.id}
              to={`/reports/${tile.id}`}
              className={`analyticsTile analyticsTile--${tile.tone}`}
            >
              <div className="analyticsTileHead">
                <div className={`analyticsTileIcon ${tile.tone}`}>
                  <Icon size={18} aria-hidden />
                </div>
                <div className="analyticsTileHeadText">
                  <span className="analyticsTileLabel">{tile.label}</span>
                  {metric != null && <span className="analyticsTileMetric">{metric}</span>}
                </div>
                <ChevronRight size={16} className="analyticsTileChevron" aria-hidden />
              </div>
              <p className="analyticsTileDesc">{tile.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
