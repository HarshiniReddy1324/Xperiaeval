import React, { useEffect, useState } from 'react';
import { Library, Search, Check, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { Button, Card } from './ui';

export function QuestionPoolPicker({ jobId, onApplied, rubricApproved, rubricVersion }) {
  const [meta, setMeta] = useState({ departments: [], levels: [] });
  const [department, setDepartment] = useState('Engineering');
  const [level, setLevel] = useState('Mid');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/question-pool/meta')
      .then(setMeta)
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (department) q.set('department', department);
    if (level) q.set('level', level);
    if (search.trim()) q.set('search', search.trim());
    api(`/question-pool?${q}`)
      .then((d) => setItems(d.items || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
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
    if (selected.size < 10) {
      setError('Select at least 10 questions (7 mandatory + 3 optional will be assigned automatically).');
      return;
    }
    if (rubricApproved) {
      const ok = window.confirm(
        `Rubric v${rubricVersion} is currently approved and live for candidates.\n\nApplying these questions will create a new draft version. Candidates keep seeing the approved rubric until you save and approve the new version.\n\nContinue?`
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
    } catch (e) {
      setError(e.message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className="poolPicker">
      <div className="poolPickerHead">
        <h2>
          <Library size={20} /> Question library
        </h2>
        <p className="muted">
          Pick questions by department and seniority. Select 10+ — we assign 7 mandatory and 3 optional.
        </p>
      </div>

      {rubricApproved && (
        <div className="poolApprovedNotice">
          <strong>Rubric v{rubricVersion} is approved and live.</strong>
          <p>
            You can browse and select questions here. Applying your selection creates a <em>new draft version</em> — the
            current approved rubric stays active for candidates until you approve the revision.
          </p>
        </div>
      )}

      <div className="poolFilters">
        <select value={department} onChange={(e) => setDepartment(e.target.value)}>
          {(meta.departments || []).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          {(meta.levels || []).map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <div className="poolSearch">
          <Search size={16} />
          <input placeholder="Search questions…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <p className="poolSelectionCount">
        <Sparkles size={14} /> {selected.size} selected {selected.size >= 10 ? '— ready to apply' : `(need ${10 - selected.size} more)`}
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

      {error && <p className="error">{error}</p>}
      <Button onClick={applyToJob} disabled={applying || selected.size < 10}>
        {applying ? 'Applying…' : `Apply ${selected.size} questions to this job`}
      </Button>
    </Card>
  );
}
