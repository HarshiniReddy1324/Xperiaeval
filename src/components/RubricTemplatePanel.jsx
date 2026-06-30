import React, { useEffect, useState } from 'react';
import { Bookmark, Download, Upload } from 'lucide-react';
import { api } from '../api/client';
import { validateQuestionnaire } from '../lib/rubricConstants';
import { Button, Card } from './ui';

export function RubricTemplatePanel({ jobId, jobTitle, categories, onApplied, canSave, rubricApproved }) {
  const [templates, setTemplates] = useState([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => api('/rubric-templates').then((d) => setTemplates(d.templates || [])).catch(console.error);

  useEffect(() => {
    load();
  }, []);

  const saveTemplate = async () => {
    if (!name.trim()) {
      setError('Enter a template name (e.g. Senior Backend v2)');
      return;
    }
    const validationError = validateQuestionnaire(
      categories.map((c) => ({
        name: c.name,
        question: c.question,
        priority: c.priority,
      }))
    );
    if (validationError) {
      setError(`Save requires a valid questionnaire first: ${validationError}`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api('/rubric-templates', {
        method: 'POST',
        body: JSON.stringify({
          job_id: jobId,
          name: name.trim(),
          description: `From ${jobTitle}`,
        }),
      });
      setMsg(`Saved "${name}"`);
      setName('');
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = async (templateId) => {
    if (rubricApproved) {
      const ok = window.confirm(
        'The current screening is approved and live. Applying a template creates a new draft version. Continue?'
      );
      if (!ok) return;
    }
    setApplying(templateId);
    setError('');
    try {
      const res = await api(`/jobs/${jobId}/rubric/from-template/${templateId}`, { method: 'POST' });
      onApplied?.(res);
      setMsg(res.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setApplying(null);
    }
  };

  return (
    <Card className="templatePanel">
      <h2>
        <Bookmark size={20} /> Screening templates
      </h2>
      <p className="muted">
        Save this position&apos;s screening questions as a reusable template: new questions sync to the{' '}
        <a href="/rubrics/library">question library</a> automatically.
      </p>

      {canSave && (
        <div className="templateSaveRow">
          <input
            className="formInput"
            placeholder='Template name e.g. "Senior Backend v2"'
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button onClick={saveTemplate} disabled={saving}>
            <Upload size={16} /> {saving ? 'Saving…' : 'Save as template'}
          </Button>
        </div>
      )}

      {templates.length > 0 ? (
        <ul className="templateList">
          {templates.map((t) => (
            <li key={t.id} className="templateRow">
              <div>
                <b>{t.name}</b>
                <small className="muted">
                  {t.question_count} questions
                  {t.department ? ` · ${t.department}` : ''}
                  {t.experience_level ? ` · ${t.experience_level}` : ''}
                </small>
              </div>
              <Button
                variant="outline"
                className="small"
                disabled={applying === t.id}
                onClick={() => applyTemplate(t.id)}
              >
                <Download size={14} /> {applying === t.id ? 'Applying…' : 'Apply to position'}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No templates yet. Configure questions on a position, then save as template.</p>
      )}

      {error && <p className="error">{error}</p>}
      {msg && <p className="success">{msg}</p>}
    </Card>
  );
}
