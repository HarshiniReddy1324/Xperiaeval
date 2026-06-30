import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { api } from '../api/client';
import { CandidateIntelligenceReport } from '../components/CandidateIntelligenceReport';
import { Button } from '../components/ui';

export function CandidateScorecard() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api(`/applications/${id}`)
      .then(setData)
      .catch(console.error);
  }, [id]);

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [data]);

  if (!data) return <p>Loading scorecard…</p>;

  const app = data.application;
  const intel = data.intelligenceReport || data.candidateIntelligence;

  return (
    <div className="scorecardPrintPage">
      <div className="noPrint scorecardPrintBar">
        <Link to={`/candidates/${id}`}>
          <Button variant="outline">← Back</Button>
        </Link>
        <Button onClick={() => window.print()}>
          <Printer size={16} /> Print / Save as PDF
        </Button>
      </div>
      <header className="scorecardPrintHeader">
        <p className="eyebrow">Xperieval · Hiring Manager Scorecard</p>
        <h1>{app.display_name || app.name}</h1>
        <p>
          {app.job_title} · {app.id} · Generated {new Date().toLocaleString()}
        </p>
      </header>
      <CandidateIntelligenceReport report={intel} applicationScore={data.applicationScore} />
      <footer className="scorecardPrintFooter">
        <p>Advisory score: human review required before hiring decision. Confidential.</p>
      </footer>
    </div>
  );
}
