import React from 'react';
import { CheckCircle2, Clock, Sparkles } from 'lucide-react';

const PILLARS = [
  {
    id: 'resume',
    title: 'Resume intelligence',
    features: [
      { name: 'Years of experience validation', status: 'live' },
      { name: 'Education validation', status: 'live' },
      { name: 'Timeline consistency', status: 'live' },
      { name: 'Domain / keyword alignment', status: 'live' },
      { name: 'Certification validation (external)', status: 'planned' },
      { name: 'Employment history API (consent-based)', status: 'planned' },
    ],
  },
  {
    id: 'experience',
    title: 'Experience validation',
    features: [
      { name: 'Claim verification questions', status: 'live' },
      { name: 'Resume consistency analysis', status: 'live' },
      { name: 'Project ownership validation', status: 'live' },
      { name: 'Background check (Green bucket)', status: 'live' },
      { name: 'Payroll / ADP verification', status: 'planned' },
      { name: 'SSN-based employment records', status: 'planned' },
    ],
  },
  {
    id: 'integrity',
    title: 'Assessment integrity',
    features: [
      { name: 'Time-bound screening questions', status: 'live' },
      { name: 'Text / audio / video responses', status: 'live' },
      { name: 'Tab switch & focus monitoring', status: 'live' },
      { name: 'Idle time & paste detection', status: 'live' },
      { name: 'AI-generated response detection', status: 'live' },
      { name: 'Voice verification', status: 'live' },
      { name: 'Full-screen & browser lockdown', status: 'live' },
      { name: 'Camera-based presence monitoring', status: 'live' },
    ],
  },
  {
    id: 'potential',
    title: 'Candidate potential',
    features: [
      { name: 'Candidate intelligence score (0–100)', status: 'live' },
      { name: 'Green / Amber / Red buckets', status: 'live' },
      { name: 'Hiring recommendation engine', status: 'live' },
      { name: 'Blind / anonymized screening', status: 'live' },
      { name: 'Transferable skills & gap analysis', status: 'planned' },
      { name: 'Role recommendation engine', status: 'planned' },
    ],
  },
];

function StatusBadge({ status }) {
  if (status === 'live') {
    return (
      <span className="pillarStatus live">
        <CheckCircle2 size={12} /> Live
      </span>
    );
  }
  return (
    <span className="pillarStatus planned">
      <Clock size={12} /> Planned
    </span>
  );
}

export function PlatformPillars() {
  return (
    <div className="dashWidget platformPillarsPanel">
      <div className="widgetHead insightsPanelHead">
        <div>
          <span className="insightsPremiumTag">
            <Sparkles size={12} /> Platform
          </span>
          <h2>Xperieval capability map</h2>
          <p className="muted insightsSubtitle">
            Four pillars for preliminary screening, resume validation, assessment integrity, and hiring intelligence.
          </p>
        </div>
      </div>
      <div className="pillarGrid">
        {PILLARS.map((pillar) => (
          <section key={pillar.id} className="pillarCard">
            <h3>{pillar.title}</h3>
            <ul>
              {pillar.features.map((f) => (
                <li key={f.name}>
                  <span>{f.name}</span>
                  <StatusBadge status={f.status} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
