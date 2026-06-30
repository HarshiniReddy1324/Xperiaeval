import React, { useEffect, useState } from 'react';
import { Library, Search, Check, Sparkles, Plus, Download, Upload } from 'lucide-react';
import { api } from '../api/client';
import { Button, Card } from './ui';
import { CATEGORY_TYPES, MIN_RUBRIC_QUESTIONS } from '../lib/rubricConstants';

export function QuestionPoolBrowser({
  mode = 'browse',
  jobId,
  onApplied,
  rubricApproved,
  rubricVersion,
  onBuildTemplate,
  showImportExport = true,
}) {
  const [meta, setMeta] = useState({ departments: [], levels: [] });
  const [department, setDepartment] = useState('Engineering');
  const [level, setLevel] = useState('Mid');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newQ, setNewQ] = useState({
    department: 'Engineering',
    experience_level: 'Mid',
    category_type: 'General',
    name: '',
    question: '',
    ideal_answer: '',
    keywords: '',
    default_priority: 'mandatory',
  });
  const [templateName, setTemplateName] = useState('');

  const loadItems = () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (department) q.set('department', department);
    if (level) q.set('level', level);
    if (search.trim()) q.set('search', search.trim());
    return api(`/question-pool?${q}`)
      .then((d) => setItems(d.items || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api('/question-pool/meta')
      .then(setMeta)
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadItems();
  }, [department, level, search]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyToJob = async () => {
    if (!jobId || selected.size < MIN_RUBRIC_QUESTIONS) {
      setError(`Select at least ${MIN_RUBRIC_QUESTIONS} question`);
      return;
    }
    if (rubricApproved) {
      const ok = window.confirm(
        `Screening v${rubricVersion} is approved and live. Applying creates a new draft. Continue?`
      );
      if (!ok) return;
    }
    setError('');
    setApplying(true);
    try {
      const res = await api(`/jobs/${jobId}/rubric/from-pool`, {
        method: 'POST',
        body: JSON.stringify({ pool_ids: [...selected] }),
      });
      onApplied?.(res);
      setSelected(new Set());
      setMsg('Questions applied to position');
    } catch (e) {
      setError(e.message);
    } finally {
      setApplying(false);
    }
  };

  const buildTemplate = async () => {
    if (selected.size < MIN_RUBRIC_QUESTIONS) {
      setError(`Select at least ${MIN_RUBRIC_QUESTIONS} question to build a template`);
      return;
    }
    if (!templateName.trim()) {
      setError('Enter a template name');
      return;
    }
    setApplying(true);
    setError('');
    try {
      const res = await api('/rubric-templates/from-pool', {
        method: 'POST',
        body: JSON.stringify({
          name: templateName.trim(),
          department,
          experience_level: level,
          pool_ids: [...selected],
        }),
      });
      setMsg(res.message);
      setSelected(new Set());
      onBuildTemplate?.(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setApplying(false);
    }
  };

  const addQuestion = async () => {
    if (!newQ.name.trim() || !newQ.question.trim()) {
      setError('Name and question text are required');
      return;
    }
    setError('');
    try {
      await api('/question-pool', { method: 'POST', body: JSON.stringify(newQ) });
      setShowAdd(false);
      setNewQ({ ...newQ, name: '', question: '', ideal_answer: '', keywords: '' });
      loadItems();
      setMsg('Question added to library');
    } catch (e) {
      setError(e.message);
    }
  };

  const exportLibrary = async () => {
    const data = await api('/question-pool/export');
    const blob = new Blob([JSON.stringify(data.items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question-library.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importLibrary = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed) ? parsed : parsed.items;
    const res = await api('/question-pool/import', { method: 'POST', body: JSON.stringify({ items }) });
    setMsg(res.message);
    loadItems();
    e.target.value = '';
  };

  return (
    <Card className="poolPicker">
      <div className="poolPickerHead">
        <h2>
          <Library size={20} /> Question library
        </h2>
        <p className="muted">
          Browse questions by department. Select one or more to apply to a position or save as a template.
        </p>
      </div>

      {rubricApproved && jobId && (
        <div className="poolApprovedNotice">
          <strong>Screening v{rubricVersion} is approved and live.</strong>
          <p>Applying selection creates a new draft version.</p>
        </div>
      )}

      <div className="poolFilters">
        <div className="poolFiltersSelects">
          <select value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Department">
            {(meta.departments || []).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Experience level">
            {(meta.levels || []).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="poolSearch">
          <Search size={16} aria-hidden />
          <input
            placeholder="Search questions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search questions"
          />
        </div>
        <div className="poolFiltersActions">
          <Button variant="outline" className="small" onClick={() => setShowAdd((v) => !v)}>
            <Plus size={14} /> Add question
          </Button>
          {showImportExport && (
            <>
              <Button variant="outline" className="small" onClick={exportLibrary}>
                <Download size={14} /> Export
              </Button>
              <label className="btn outline small poolImportBtn">
                <Upload size={14} /> Import
                <input type="file" accept=".json" onChange={importLibrary} hidden />
              </label>
            </>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="poolAddForm">
          <input placeholder="Short name" value={newQ.name} onChange={(e) => setNewQ({ ...newQ, name: e.target.value })} />
          <select value={newQ.department} onChange={(e) => setNewQ({ ...newQ, department: e.target.value })}>
            {(meta.departments || []).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={newQ.category_type}
            onChange={(e) => setNewQ({ ...newQ, category_type: e.target.value })}
          >
            {CATEGORY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Question text"
            value={newQ.question}
            onChange={(e) => setNewQ({ ...newQ, question: e.target.value })}
            rows={2}
          />
          <textarea
            placeholder="Sample answer (internal)"
            value={newQ.ideal_answer}
            onChange={(e) => setNewQ({ ...newQ, ideal_answer: e.target.value })}
            rows={2}
          />
          <Button className="small" onClick={addQuestion}>
            Save to library
          </Button>
        </div>
      )}

      <p className="poolSelectionCount">
        <Sparkles size={14} /> {selected.size} selected
        {selected.size >= MIN_RUBRIC_QUESTIONS
          ? ' — ready'
          : ` (select at least ${MIN_RUBRIC_QUESTIONS})`}
      </p>

      {loading ? (
        <p className="muted">Loading library…</p>
      ) : (
        <ul className="poolList">
          {items.map((item) => {
            const on = selected.has(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={on ? 'poolItem selected' : 'poolItem'}
                  onClick={() => toggle(item.id)}
                  aria-pressed={on}
                >
                  <span className="poolCheck">{on && <Check size={14} />}</span>
                  <div className="poolItemBody">
                    <div className="poolItemTags">
                      <span>{item.department}</span>
                      <span>{item.experience_level}</span>
                      <span>{item.category_type}</span>
                      <span className={`sourceBadge sourceBadge--${item.org_id ? 'org' : 'system'}`}>
                        {item.source_label || (item.org_id ? 'Org' : 'System')}
                      </span>
                      <span className={item.default_priority === 'optional' ? 'opt' : 'req'}>
                        {item.default_priority === 'optional' ? 'Optional' : 'Mandatory'}
                      </span>
                    </div>
                    <b>{item.name}</b>
                    <p>{item.question}</p>
                  </div>
                </button>
              </li>
            );
          })}
          {!items.length && <li className="muted">No questions match filters.</li>}
        </ul>
      )}

      {mode === 'job' && jobId && (
        <Button onClick={applyToJob} disabled={applying || selected.size < MIN_RUBRIC_QUESTIONS}>
          {applying ? 'Applying…' : `Apply ${selected.size} questions to this position`}
        </Button>
      )}

      {mode === 'library' && (
        <div className="poolTemplateBuild">
          <input
            className="formInput"
            placeholder='Template name e.g. "Senior Backend v2"'
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          />
          <Button onClick={buildTemplate} disabled={applying || selected.size < MIN_RUBRIC_QUESTIONS}>
            {applying ? 'Saving…' : 'Build template from selection'}
          </Button>
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {msg && <p className="success">{msg}</p>}
    </Card>
  );
}
