import React from 'react';

export function CompanyInfo({ posting }) {
  if (!posting?.aboutCompany) return null;
  return (
    <section className="jp-card">
      <h2>About the company</h2>
      <p className="jp-lead">{posting.aboutCompany}</p>
    </section>
  );
}
