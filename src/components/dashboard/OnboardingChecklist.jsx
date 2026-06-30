import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { Card } from '../ui';

const DISMISS_KEY = 'xperieval_onboarding_dismissed';

export function OnboardingChecklist({ onboarding, canManage }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (!canManage || !onboarding || onboarding.complete || dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <Card className="onboardingChecklist">
      <div className="onboardingChecklistHead">
        <div>
          <h2>Get started</h2>
          <p className="muted">
            Your free pilot includes positions, intelligence scoring, and Jira workflow.{' '}
            {onboarding.completed} of {onboarding.total} steps complete.
          </p>
        </div>
        <button type="button" className="linkBtn" onClick={dismiss}>
          Dismiss
        </button>
      </div>
      <div className="onboardingProgress">
        <div className="onboardingProgressFill" style={{ width: `${onboarding.progress_pct}%` }} />
      </div>
      <ol className="onboardingSteps">
        {onboarding.steps.map((step) => (
          <li key={step.id} className={step.done ? 'onboardingStep--done' : ''}>
            {step.done ? (
              <CheckCircle2 size={18} className="onboardingStepIcon onboardingStepIcon--done" aria-hidden />
            ) : (
              <Circle size={18} className="onboardingStepIcon" aria-hidden />
            )}
            <div className="onboardingStepBody">
              <strong>{step.label}</strong>
              <p className="muted">{step.detail}</p>
              {!step.done && (
                <Link to={step.to} className="onboardingStepLink">
                  {step.id === 'position' ? 'Create position' : step.id === 'shortlist' ? 'Open candidates' : 'Set up'}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
