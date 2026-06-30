import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Button, Card } from '../components/ui';
import { QuestionnaireBuilder } from '../components/QuestionnaireBuilder';
import { questionnaireCounts, validateQuestionnaire } from '../lib/rubricConstants';

export function RubricTemplateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [versions, setVersions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applyJobId, setApplyJobId] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () =>
    Promise.all([
      api(`/rubric-templates/${id}`),
      api(`/rubric-templates/${id}/versions`).catch(() => ({ versions: [] })),
      api('/jobs'),
    ]).then(([tplRes, verRes, jobList]) => {
      setTemplate(tplRes.template);
      setQuestions(tplRes.template.questions || []);
      setVersions(verRes.versions || []);
      setJobs(jobList || []);
    });

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [id]);

  const save = async () => {
    const err = validateQuestionnaire(questions);
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await api(`/rubric-templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          department: template.department,
          experience_level: template.experience_level,
          questions,
          sync_to_library: true,
        }),
      });
      setMsg(
        res.librarySync
          ? `Saved. Added ${res.librarySync.added.length}, linked ${res.librarySync.linked.length} to library.`
          : 'Template updated'
      );
      setEditing(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const applyToJob = async () => {
    if (!applyJobId) {
      setError('Select a position');
      return;
    }
    setError('');
    try {
      await api(`/jobs/${applyJobId}/rubric/from-template/${id}`, { method: 'POST' });
      setMsg('Template applied — open the position to review and approve screening.');
      navigate(`/jobs/${applyJobId}`);
    } catch (e) {
      setError(e.message);
    }
  };

  if (!template) return <p>Loading…</p>;

  const counts = questionnaireCounts(questions);

  return (
    <>
      <div className="pageHead row">
        <div>
          <h1>{template.name}</h1>
          <p>
            {template.department || 'General'} · {template.experience_level || 'All'} · v{template.version || 1} · Used
            on {template.usage_count || 0} positions
          </p>
        </div>
        <div className="row">
          {!editing ? (
            <Button variant="outline" onClick={() => setEditing(true)}>
              Edit template
            </Button>
          ) : (
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save & sync library'}
            </Button>
          )}
        </div>
      </div>

      {template.description && <p className="muted mb">{template.description}</p>}
      {error && <p className="error">{error}</p>}
      {msg && <p className="success">{msg}</p>}

      <div className="grid two">
        <Card>
          <h2>Questions ({counts.mandatory} required + {counts.optional} optional)</h2>
          {editing ? (
            <QuestionnaireBuilder questions={questions} onChange={setQuestions} />
          ) : (
            <ol className="templatePreviewList">
              {questions.map((q, i) => (
                <li key={i}>
                  <span className={`questionSlotBadge ${q.priority === 'optional' ? 'optional' : 'mandatory'}`}>
                    {q.priority === 'optional' ? 'Optional' : 'Required'}
                  </span>
                  <b>{q.name}</b>
                  <p>{q.question}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <div className="stack">
          <Card>
            <h2>Apply to position</h2>
            <p className="muted">Creates a draft screening questionnaire on the selected position.</p>
            <select value={applyJobId} onChange={(e) => setApplyJobId(e.target.value)} aria-label="Select position">
              <option value="">Choose position…</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
            <Button onClick={applyToJob} disabled={!applyJobId}>
              Apply template
            </Button>
          </Card>

          {versions.length > 1 && (
            <Card>
              <h2>Version history</h2>
              <ul className="versionList">
                {versions.map((v) => (
                  <li key={v.id}>
                    <Link to={`/rubrics/templates/${v.id}`}>
                      v{v.version} — {v.name}
                    </Link>
                    <small className="muted">{v.created_at?.slice(0, 10)}</small>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <h2>Library sync</h2>
            <p className="muted">
              Saving this template adds any new questions to your org library (duplicates are linked, not copied).
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
