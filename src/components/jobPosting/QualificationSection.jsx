import React from 'react';
import { CheckCircle2 } from 'lucide-react';

function ListBlock({ title, items, muted }) {
  if (!items?.length) return null;
  return (
    <section className="jp-card">
      <h2>{title}</h2>
      <ul className="jp-list">
        {items.map((item, i) => (
          <li key={i}>
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 2, color: muted ? '#94a3b8' : '#059669' }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function QualificationSection({ posting }) {
  return (
    <>
      <ListBlock title="Responsibilities" items={posting?.responsibilities} />
      <ListBlock title="Required qualifications" items={posting?.requiredQualifications} />
      <ListBlock title="Preferred qualifications" items={posting?.preferredQualifications} muted />
      {posting?.techStack?.length > 0 && (
        <section className="jp-card">
          <h2>Tech stack</h2>
          <div className="jp-chips">
            {posting.techStack.map((t, i) => (
              <span key={i} className="jp-chip">
                {t}
              </span>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
