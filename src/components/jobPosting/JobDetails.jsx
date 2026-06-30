import React from 'react';

export function JobDetails({ posting }) {
  if (!posting?.summary) return null;
  return (
    <section className="jp-card">
      <h2>Position summary</h2>
      <p className="jp-lead">{posting.summary}</p>
    </section>
  );
}
