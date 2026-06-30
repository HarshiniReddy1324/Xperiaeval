import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Pencil, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { Button, Card } from '../components/ui';
import { QuestionPoolPicker } from '../components/QuestionPoolPicker';
import { RubricTemplatePanel } from '../components/RubricTemplatePanel';
import { JobExperienceIntelligence } from '../components/jobs/JobExperienceIntelligence';
import { returnState } from '../lib/navigation';
import {
  distributeWeights,
  MAX_RUBRIC_QUESTIONS,
  MIN_RUBRIC_QUESTIONS,
  validateQuestionnaire,
} from '../lib/rubricConstants';

const RESPONSE_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
];

const PRIORITIES = [
  { value: 'mandatory', label: 'Required' },
  { value: 'optional', label: 'Optional' },
];

const CATEGORY_TYPES = [
  'Technical',
  'Behavioral',
  'Problem Solving',
  'Communication',
  'Project Experience',
  'Leadership',
  'Motivation',
  'General',
];

export function JobDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [job, setJob] = useState(null);
  const [categories, setCategories] = useState([]);
  const [rubric, setRubric] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api(`/jobs/${id}`).then((d) => {
      setJob(d);
      setCategories(
        (d.categories || []).map((c) => ({
          ...c,
          ideal_answer: c.ideal_answer || c.expected_evidence || '',
          keywords: Array.isArray(c.keywords)
            ? c.keywords.join(', ')
            : c.keywords || '',
          min_response_seconds: 0,
          max_response_seconds: c.max_response_seconds || 300,
          response_type: c.response_type || 'text',
          priority: c.priority || 'mandatory',
          weight: c.weight || 10,
        }))
      );
      setRubric(d.rubric);
    });

  useEffect(() => {
    load().catch(console.error);
  }, [id]);

  const updateCategory = (index, field, value) => {
    const next = [...categories];
    next[index] = {
      ...next[index],
      [field]:
        field === 'max_response_seconds'
          ? Number(value)
          : value,
    };
    setCategories(next);
  };

  const addCategory = () => {
    if (categories.length >= MAX_RUBRIC_QUESTIONS) return;
    setCategories([
      ...categories,
      {
        name: '',
        question: '',
        ideal_answer: '',
        keywords: '',
        category_type: 'General',
        response_type: 'text',
        priority: 'mandatory',
        weight: 0,
        min_response_seconds: 0,
        max_response_seconds: 300,
      },
    ]);
  };

  const removeCategory = (index) => {
    if (categories.length <= MIN_RUBRIC_QUESTIONS) return;
    setCategories(categories.filter((_, i) => i !== index));
  };

  const saveRubric = async () => {
    if (rubric?.status === 'approved') {
      const ok = window.confirm(
        `Screening v${rubric.version} is approved and live. Saving creates draft v${(rubric.version || 0) + 1}. Continue?`
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      const res = await api(`/jobs/${id}/rubric`, {
        method: 'PUT',
        body: JSON.stringify({
          categories: categories.map((c) => ({
            name: c.name,
            weight: c.weight || 10,
            question: c.question,
            expected_evidence: (c.ideal_answer || '').slice(0, 280),
            ideal_answer: c.ideal_answer || '',
            category_type: c.category_type || 'General',
            response_type: c.response_type || 'text',
            priority: c.priority || 'mandatory',
            min_response_seconds: 0,
            max_response_seconds: c.max_response_seconds || 300,
            keywords: c.keywords || '',
          })),
        }),
      });
      setCategories(
        (res.categories || []).map((c) => ({
          ...c,
          keywords: Array.isArray(c.keywords) ? c.keywords.join(', ') : c.keywords || '',
          min_response_seconds: 0,
          max_response_seconds: c.max_response_seconds || 300,
        }))
      );
      setRubric(res.rubric);
    } finally {
      setSaving(false);
    }
  };

  const approveRubric = async () => {
    const res = await api(`/jobs/${id}/rubric/approve`, { method: 'POST' });
    setRubric(res.rubric);
    load();
  };

  const reviseRubric = async () => {
    if (
      rubric?.status === 'approved' &&
      !window.confirm(
        `Create draft v${(rubric.version || 0) + 1} from approved v${rubric.version}? Candidates keep seeing the approved screening until you approve the new version.`
      )
    ) {
      return;
    }
    const res = await api(`/jobs/${id}/rubric/revise`, { method: 'POST' });
    setCategories(
      (res.categories || []).map((c) => ({
        ...c,
        keywords: Array.isArray(c.keywords) ? c.keywords.join(', ') : c.keywords || '',
      }))
    );
    setRubric(res.rubric);
  };

  if (!job) return <p>Loading…</p>;

  const weights = distributeWeights(categories.length);
  const rubricValid = !validateQuestionnaire(
    categories.map((c) => ({
      name: c.name,
      question: c.question,
      priority: c.priority,
    }))
  );
  const mandatoryCount = categories.filter((c) => c.priority !== 'optional').length;
  const optionalCount = categories.filter((c) => c.priority === 'optional').length;
  const mandatoryPts = categories.reduce(
    (sum, c, i) => sum + (c.priority !== 'optional' ? weights[i] : 0),
    0
  );

  return (
    <>
      <div className="pageHead row">
        <div>
          <h1>{job.title}</h1>
          <p>
            {job.id} · {job.team} · {job.location} · Stage: {job.stage}
          </p>
        </div>
        <div className="row">
          <Link to={`/jobs/${id}/edit`} state={returnState(location)}>
            <Button variant="outline">
              <Pencil size={15} /> Edit posting
            </Button>
          </Link>
          <a href={`/careers/${job.slug}`} target="_blank" rel="noreferrer">
            <Button variant="outline">
              <ExternalLink size={15} /> Careers page
            </Button>
          </a>
        </div>
      </div>
      <JobExperienceIntelligence
        data={job.experienceIntelligence}
        jobId={id}
        locationState={returnState(location)}
      />
      <div className="pageHead sub">
        {rubric?.status === 'approved' ? (
          <div className="rubricStatusRow">
            <p className="success">
              Screening v{rubric.version} approved ·{' '}
              <Link to={`/apply/${job.slug}`} target="_blank">
                Open apply + screening
              </Link>
            </p>
            <Button variant="outline" className="small" onClick={reviseRubric}>
              Revise screening (new draft)
            </Button>
          </div>
        ) : (
          <p className="warning">Approve screening before candidates can complete the questionnaire.</p>
        )}
      </div>
      <QuestionPoolPicker
        jobId={id}
        rubricApproved={rubric?.status === 'approved'}
        rubricVersion={rubric?.version}
        onApplied={(res) => {
          setCategories(
            (res.categories || []).map((c) => ({
              ...c,
              keywords: Array.isArray(c.keywords) ? c.keywords.join(', ') : c.keywords || '',
              min_response_seconds: 0,
              max_response_seconds: c.max_response_seconds || 300,
            }))
          );
          setRubric(res.rubric);
        }}
      />

      <RubricTemplatePanel
        jobId={id}
        jobTitle={job.title}
        categories={categories}
        canSave={rubricValid}
        rubricApproved={rubric?.status === 'approved'}
        onApplied={(res) => {
          setCategories(
            (res.categories || []).map((c) => ({
              ...c,
              keywords: Array.isArray(c.keywords) ? c.keywords.join(', ') : c.keywords || '',
              min_response_seconds: 0,
              max_response_seconds: c.max_response_seconds || 300,
            }))
          );
          setRubric(res.rubric);
        }}
      />

      <section className="grid two">
        <Card>
          <h2>Screening question builder</h2>
          <p className="muted">
            Configure any number of questions — points split evenly to 100 total. Candidates see questions only — no
            timers. Recruiters set an <strong>internal time guideline</strong> per question (not shown to applicants);
            we flag and lightly penalize scores only when time exceeds the guideline by more than ~2 minutes.
          </p>
          {categories.map((c, i) => (
            <div className="rubricEdit screeningEdit" key={c.id || i}>
              <div className="questionSlotHead">
                <span className={`questionSlotBadge ${c.priority === 'optional' ? 'optional' : 'mandatory'}`}>
                  Question {i + 1} · {weights[i]} pts
                </span>
                {categories.length > MIN_RUBRIC_QUESTIONS && (
                  <button
                    type="button"
                    className="questionSlotRemove"
                    onClick={() => removeCategory(i)}
                    aria-label={`Remove question ${i + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <input value={c.name} onChange={(e) => updateCategory(i, 'name', e.target.value)} placeholder="Category name" />
              <div className="rubricRow">
                <span className="rubricPtsBadge" title="Auto-calculated from question count">
                  {weights[i]} pts
                </span>
                <select value={c.response_type} onChange={(e) => updateCategory(i, 'response_type', e.target.value)}>
                  {RESPONSE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <select value={c.category_type || 'General'} onChange={(e) => updateCategory(i, 'category_type', e.target.value)}>
                  {CATEGORY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select value={c.priority} onChange={(e) => updateCategory(i, 'priority', e.target.value)}>
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="rubricFieldLabel">Time guideline (seconds, internal — not shown to applicants)</label>
              <input
                type="number"
                className="rubricTimeGuideline"
                value={c.max_response_seconds}
                onChange={(e) => updateCategory(i, 'max_response_seconds', e.target.value)}
                min={60}
                max={3600}
                title="Internal time guideline — flags scoring if exceeded by more than ~2 min"
              />
              <p className="rubricFieldHint muted">
                Applicants are not timed or blocked. We only flag when they exceed this by more than ~2 minutes.
              </p>
              <label className="rubricFieldLabel">Question (shown to applicants)</label>
              <textarea value={c.question} onChange={(e) => updateCategory(i, 'question', e.target.value)} rows={2} placeholder="Question text" />
              <label className="rubricFieldLabel">Sample answer — internal only (HR / recruiter reference for AI scoring)</label>
              <textarea
                value={c.ideal_answer || ''}
                onChange={(e) => updateCategory(i, 'ideal_answer', e.target.value)}
                rows={5}
                placeholder="Write a strong example answer recruiters would expect. Not visible to applicants."
              />
              <label className="rubricFieldLabel">AI evaluation keywords (comma-separated)</label>
              <input
                value={c.keywords || ''}
                onChange={(e) => updateCategory(i, 'keywords', e.target.value)}
                placeholder="e.g. metrics, stakeholder, SQL, delivered, outcome"
              />
              <p className="rubricFieldHint muted">The AI matches these terms and concepts in applicant answers when scoring.</p>
            </div>
          ))}
          {categories.length < MAX_RUBRIC_QUESTIONS && (
            <Button type="button" variant="outline" onClick={addCategory}>
              <Plus size={16} /> Add question
            </Button>
          )}
          <div className="row">
            <Button onClick={saveRubric} disabled={saving}>
              Save draft
            </Button>
            <Button variant="outline" onClick={approveRubric} disabled={!rubricValid || rubric?.status === 'approved'}>
              Approve screening
            </Button>
          </div>
          {rubric?.status === 'approved' && (
            <p className="muted">
              Screening v{rubric.version} is approved. Use <strong>Revise screening</strong>, edit below and save, or apply
              library questions — each creates a new draft you must approve before candidates see changes.
            </p>
          )}
          <p className="muted">
            {categories.length} question{categories.length === 1 ? '' : 's'} · {mandatoryCount} required (
            {mandatoryPts} pts) · {optionalCount} optional ({100 - mandatoryPts} pts) · 100 total
          </p>
        </Card>
        <Card>
          <h2>Pipeline stats</h2>
          <div className="miniStats inline">
            <span>
              {job.applicants} <small>Applicants</small>
            </span>
            <span>
              {job.green} <small>Green</small>
            </span>
            <span>
              {job.amber} <small>Amber</small>
            </span>
            <span>
              {job.red} <small>Red</small>
            </span>
          </div>
          <Link to={`/candidates?jobId=${job.id}`} state={returnState(location)}>
            <Button>View candidates</Button>
          </Link>
        </Card>
      </section>
    </>
  );
}
