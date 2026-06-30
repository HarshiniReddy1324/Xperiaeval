import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getVisibleCandidateSections } from '../../lib/candidateSections';

export function CandidateSectionHub({ candidateId, ctx, navState }) {
  const sections = getVisibleCandidateSections(ctx);
  const groups = [...new Set(sections.map((s) => s.group))];

  return (
    <div className="candidateSectionHub">
      <div className="candidateSectionHubIntro">
        <h2>Profile sections</h2>
        <p className="muted">Jump to any area — use the bar below or open a row.</p>
      </div>

      <nav className="candidateSectionQuickNav" aria-label="Profile sections">
        {sections.map((tile) => (
          <Link
            key={tile.id}
            to={`/candidates/${candidateId}/${tile.id}`}
            state={navState}
            className={`candidateSectionPill candidateSectionPill--${tile.tone}`}
          >
            {tile.label}
          </Link>
        ))}
      </nav>

      {groups.map((group) => {
        const groupSections = sections.filter((s) => s.group === group);
        return (
          <section key={group} className="candidateSectionGroup">
            <h3 className="candidateSectionGroupTitle">{group}</h3>
            <div className="candidateSectionList">
              {groupSections.map((tile) => {
                const Icon = tile.icon;
                return (
                  <Link
                    key={tile.id}
                    to={`/candidates/${candidateId}/${tile.id}`}
                    state={navState}
                    className={`candidateSectionRow candidateSectionRow--${tile.tone}`}
                  >
                    <div className={`candidateSectionRowIcon ${tile.tone}`}>
                      <Icon size={18} aria-hidden />
                    </div>
                    <div className="candidateSectionRowBody">
                      <span className="candidateSectionRowLabel">{tile.label}</span>
                      <small>{tile.description}</small>
                    </div>
                    <ChevronRight size={16} className="candidateSectionRowChevron" aria-hidden />
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
