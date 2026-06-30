import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QuestionPoolBrowser } from '../components/QuestionPoolBrowser';

export function RubricLibrary() {
  const navigate = useNavigate();

  return (
    <>
      <div className="pageHead">
        <h1>Question library</h1>
        <p>
          Curated questions by department and level. Select 10+ to build a template, or add your own: they stay in the
          library for reuse.
        </p>
      </div>
      <QuestionPoolBrowser
        mode="library"
        showImportExport
        onBuildTemplate={(res) => navigate(`/rubrics/templates/${res.id}`)}
      />
    </>
  );
}
