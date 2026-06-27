import React, { useEffect, useState } from 'react';
import { Bookmark, Download, Upload } from 'lucide-react';
import { api } from '../api/client';
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
    const mandatory = categories.filter((c) => c.priority !== 'optional').length;
    const optional = categories.filter((c) => c.priority === 'optional').length;
    if (mandatory !== 7 || optional !== 3) {
      setError('Save requires 7 mandatory + 3 optional questions on this job first.');
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
        'The current rubric is approved and live. Applying a template creates a new draft version. Continue?'
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
        <Bookmark size={20} /> Rubric templates
      </h2>
      <p className="muted">
        Save this job&apos;s 10 questions as a reusable template — new questions sync to the{' '}
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
                <Download size={14} /> {applying === t.id ? 'Applying…' : 'Apply to job'}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No templates yet. Configure 10 questions on a job, then save as template.</p>
      )}

      {error && <p className="error">{error}</p>}
      {msg && <p className="success">{msg}</p>}
    </Card>
  );
}
