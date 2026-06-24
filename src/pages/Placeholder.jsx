import React from 'react';
import { Card } from '../components/ui';

export function Placeholder({ title, description }) {
  return (
    <>
      <div className="pageHead">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <Card>
        <p className="muted">Coming in the next release. Core hiring workflow is live on Dashboard, Jobs, Candidates, Rubrics, and Audit.</p>
      </Card>
    </>
  );
}
