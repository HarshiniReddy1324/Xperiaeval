import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getVisibleSettingsSections } from '../../lib/settingsSections';

export function SettingsHub({ productMode, isAdmin }) {
  const sections = getVisibleSettingsSections(productMode, { isAdmin });

  return (
    <div className="settingsHub">
      <p className="settingsHubIntro muted">
        Configure scoring, compliance copy, proctoring, and review policies for your organization.
      </p>
      <div className="analyticsTileGrid settingsTileGrid">
        {sections.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.id}
              to={`/settings/${tile.id}`}
              className={`analyticsTile settingsTile analyticsTile--${tile.tone}`}
            >
              <div className="analyticsTileHead">
                <div className={`analyticsTileIcon ${tile.tone}`}>
                  <Icon size={18} aria-hidden />
                </div>
                <div className="analyticsTileHeadText">
                  <span className="analyticsTileLabel">{tile.label}</span>
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
