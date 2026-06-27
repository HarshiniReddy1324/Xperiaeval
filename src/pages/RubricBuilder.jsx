import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Button, Card } from '../components/ui';
import { QuestionnaireBuilder } from '../components/QuestionnaireBuilder';
import {
  emptyQuestionnaireSlots,
  questionnaireCounts,
  validateQuestionnaire,
} from '../lib/rubricConstants';

export function RubricBuilder() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [experienceLevel, setExperienceLevel] = useState('Mid');
  const [questions, setQuestions] = useState(emptyQuestionnaireSlots);
  const [jobs, setJobs] = useState([]);
  const [attachJobId, setAttachJobId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [departments, setDepartments] = useState(['HR', 'Engineering', 'Product', 'Design', 'Sales', 'Operations', 'General']);
  const [levels, setLevels] = useState(['Entry', 'Mid', 'Senior', 'Lead', 'All']);

  useEffect(() => {
    api('/jobs').then(setJobs).catch(console.error);
    api('/question-pool/meta')
      .then((m) => {
        if (m.departments?.length) setDepartments(m.departments);
        if (m.levels?.length) setLevels(m.levels);
      })
      .catch(console.error);
  }, []);

  const save = async (andApply = false) => {
    if (!name.trim()) {
      setError('Enter a template name');
      return;
    }
    const err = validateQuestionnaire(questions);
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await api('/rubric-templates', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description,
          department,
          experience_level: experienceLevel,
          questions,
          sync_to_library: true,
        }),
      });
      const sync = res.librarySync;
      setMsg(
        sync
          ? `Saved. Library: ${sync.added.length} added, ${sync.linked.length} linked (duplicates skipped).`
          : res.message
      );
      if (andApply && attachJobId) {
        await api(`/jobs/${attachJobId}/rubric/from-template/${res.id}`, { method: 'POST' });
        navigate(`/jobs/${attachJobId}`);
        return;
      }
      navigate(`/rubrics/templates/${res.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const counts = questionnaireCounts(questions);

  return (
    <>
      <div className="pageHead">
        <h1>Create questionnaire</h1>
        <p>
          Build 7 required + 3 optional questions. Saving creates a template and adds new questions to your library.
        </p>
      </div>

      <Card className="mb">
        <div className="builderMetaRow">
          <input
            className="formInput"
            placeholder='Template name e.g. "Senior Backend v2"'
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select value={department} onChange={(e) => setDepartment(e.target.value)}>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
            {levels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <textarea
          className="formInput"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
        <p className="muted">
          Progress: {counts.mandatory}/7 required · {counts.optional}/3 optional
          {!counts.valid && ' — adjust priorities to match'}
        </p>
      </Card>

      <Card className="mb">
        <QuestionnaireBuilder questions={questions} onChange={setQuestions} />
      </Card>

      <Card className="mb">
        <h2>Attach to job (optional)</h2>
        <p className="muted">Apply this questionnaire to a position immediately after saving.</p>
        <select value={attachJobId} onChange={(e) => setAttachJobId(e.target.value)} aria-label="Attach to job">
          <option value="">Save template only</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>
      </Card>

      {error && <p className="error">{error}</p>}
      {msg && <p className="success">{msg}</p>}

      <div className="row">
        <Button onClick={() => save(false)} disabled={saving}>
          {saving ? 'Saving…' : 'Save template & sync library'}
        </Button>
        {attachJobId && (
          <Button variant="outline" onClick={() => save(true)} disabled={saving}>
            Save & apply to job
          </Button>
        )}
        <Link to="/rubrics/library">
          <Button variant="outline">Pick from library instead</Button>
        </Link>
      </div>
    </>
  );
}
