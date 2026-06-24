import React from 'react';
import { Gift } from 'lucide-react';

export function BenefitsSection({ posting }) {
  const benefits = posting?.benefits;
  const process = posting?.hiringProcess;
  if (!benefits?.length && !process?.length) return null;

  return (
    <>
      {benefits?.length > 0 && (
        <section className="jp-card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gift size={20} /> Benefits
          </h2>
          <ul style={{ marginTop: '1rem', paddingLeft: '1.25rem', color: '#475569', fontSize: '0.875rem' }}>
            {benefits.map((b, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {b}
              </li>
            ))}
          </ul>
        </section>
      )}
      {process?.length > 0 && (
        <section className="jp-card">
          <h2>Hiring process</h2>
          <ol className="jp-steps">
            {process.map((step, i) => (
              <li key={i}>
                <span className="jp-stepNum">{i + 1}</span>
                <span style={{ paddingTop: 4 }}>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {posting?.equalOpportunity && (
        <section className="jp-card jp-eoe">
          <h2>Equal opportunity</h2>
          <p style={{ fontSize: '0.75rem', lineHeight: 1.6 }}>{posting.equalOpportunity}</p>
        </section>
      )}
    </>
  );
}
