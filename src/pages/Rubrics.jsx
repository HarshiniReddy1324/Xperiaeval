import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, FilePlus2, Library, Briefcase } from 'lucide-react';
import { api } from '../api/client';
import { SCREENING_HUB_TILES } from '../lib/rubricConstants';

const TILE_ICONS = {
  new: FilePlus2,
  templates: ClipboardList,
  library: Library,
  jobs: Briefcase,
};

export function Rubrics() {
  const [stats, setStats] = useState({ templates: 0, questions: 0, jobs: 0 });

  useEffect(() => {
    Promise.all([
      api('/rubric-templates').then((d) => d.templates?.length || 0),
      api('/question-pool?department=General').then((d) => d.count || 0),
      api('/jobs').then((d) => d.length || 0),
    ])
      .then(([templates, questions, jobs]) => setStats({ templates, questions, jobs }))
      .catch(console.error);
  }, []);

  const tileMeta = {
    new: 'Start from scratch',
    templates: `${stats.templates} saved`,
    library: `${stats.questions}+ questions`,
    jobs: `${stats.jobs} positions`,
  };

  return (
    <>
      <div className="pageHead">
        <h1>Screening</h1>
        <p>
          Build questionnaires, manage your question library, and apply screening rubrics to positions. Every saved
          template syncs new questions into the library automatically.
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
                <small>{tileMeta[tile.key]}</small>
                <p>{tile.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
