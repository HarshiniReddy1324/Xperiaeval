import React from 'react';
import { CATEGORY_TYPES, PRIORITIES, RESPONSE_TYPES } from '../lib/rubricConstants';

export function QuestionnaireBuilder({ questions, onChange, compact = false }) {
  const update = (index, field, value) => {
    const next = [...questions];
    next[index] = {
      ...next[index],
      [field]:
        field === 'weight' || field === 'max_response_seconds' ? Number(value) : value,
    };
    onChange(next);
  };

  return (
    <div className="questionnaireBuilder">
      {questions.map((q, i) => (
        <div className={`rubricEdit screeningEdit${compact ? ' screeningEdit--compact' : ''}`} key={q.id || i}>
          <div className="questionSlotHead">
            <span className={`questionSlotBadge ${q.priority === 'optional' ? 'optional' : 'mandatory'}`}>
              {i + 1} · {q.priority === 'optional' ? 'Optional' : 'Required'}
            </span>
          </div>
          <input
            value={q.name}
            onChange={(e) => update(i, 'name', e.target.value)}
            placeholder="Category name"
          />
          <div className="rubricRow">
            <select value={q.response_type || 'text'} onChange={(e) => update(i, 'response_type', e.target.value)}>
              {RESPONSE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select value={q.category_type || 'General'} onChange={(e) => update(i, 'category_type', e.target.value)}>
              {CATEGORY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select value={q.priority} onChange={(e) => update(i, 'priority', e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {!compact && (
            <>
              <label className="rubricFieldLabel">Time guideline (seconds, internal)</label>
              <input
                type="number"
                className="rubricTimeGuideline"
                value={q.max_response_seconds || 300}
                onChange={(e) => update(i, 'max_response_seconds', e.target.value)}
                min={60}
                max={3600}
              />
            </>
          )}
          <label className="rubricFieldLabel">Question (shown to applicants)</label>
          <textarea
            value={q.question}
            onChange={(e) => update(i, 'question', e.target.value)}
            rows={2}
            placeholder="Question text"
          />
          <label className="rubricFieldLabel">Sample answer (internal — for AI scoring)</label>
          <textarea
            value={q.ideal_answer || ''}
            onChange={(e) => update(i, 'ideal_answer', e.target.value)}
            rows={compact ? 3 : 4}
            placeholder="Strong example answer recruiters expect"
          />
          <label className="rubricFieldLabel">AI keywords (comma-separated)</label>
          <input
            value={q.keywords || ''}
            onChange={(e) => update(i, 'keywords', e.target.value)}
            placeholder="metrics, stakeholder, delivered"
          />
        </div>
      ))}
    </div>
  );
}
