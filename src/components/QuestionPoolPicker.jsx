import React from 'react';
import { QuestionPoolBrowser } from './QuestionPoolBrowser';

export function QuestionPoolPicker({ jobId, onApplied, rubricApproved, rubricVersion }) {
  return (
    <QuestionPoolBrowser
      mode="job"
      jobId={jobId}
      onApplied={onApplied}
      rubricApproved={rubricApproved}
      rubricVersion={rubricVersion}
      showImportExport={false}
    />
  );
}
