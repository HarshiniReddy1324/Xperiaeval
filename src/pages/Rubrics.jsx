import React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, FilePlus2, Library, Briefcase } from 'lucide-react';
import { SCREENING_HUB_TILES } from '../lib/rubricConstants';

const TILE_ICONS = {
  new: FilePlus2,
  templates: ClipboardList,
  library: Library,
  jobs: Briefcase,
};

export function Rubrics() {
  return (
    <>
      <div className="pageHead">
        <h1>Screening</h1>
        <p>
          Create questionnaires, manage your question library, and assign screening to open positions.
        </p>
      </div>

      <div className="screeningHubGrid">
        {SCREENING_HUB_TILES.map((tile) => {
          const Icon = TILE_ICONS[tile.key] || ClipboardList;
          return (
            <Link key={tile.key} to={tile.to} className={`screeningHubTile screeningHubTile--${tile.tone}`}>
              <div className={`screeningHubTileIcon ${tile.tone}`}>
                <Icon size={22} aria-hidden />
              </div>
              <div className="screeningHubTileBody">
                <span className="screeningHubTileLabel">{tile.label}</span>
                <p>{tile.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
