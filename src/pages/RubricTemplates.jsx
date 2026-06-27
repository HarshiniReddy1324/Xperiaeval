import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Upload, Copy, Trash2, Eye } from 'lucide-react';
import { api } from '../api/client';
import { Button, Card } from '../components/ui';

export function RubricTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loadError, setLoadError] = useState('');

  const load = () =>
    api('/rubric-templates')
      .then((d) => setTemplates(d.templates || []))
      .catch((e) => setLoadError(e.message));

  useEffect(() => {
    load();
  }, []);

  const duplicate = async (id, name) => {
    const res = await api(`/rubric-templates/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ name: `${name} (copy)` }),
    });
    navigate(`/rubrics/templates/${res.id}`);
  };

  const remove = async (id, name) => {
    if (!window.confirm(`Delete template "${name}"?`)) return;
    await api(`/rubric-templates/${id}`, { method: 'DELETE' });
    load();
  };

  const exportAll = async () => {
    const data = await api('/rubric-templates/export');
    const blob = new Blob([JSON.stringify(data.templates, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'screening-templates.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importAll = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const parsed = JSON.parse(await file.text());
    const templates = Array.isArray(parsed) ? parsed : parsed.templates;
    await api('/rubric-templates/import', { method: 'POST', body: JSON.stringify({ templates }) });
    load();
    e.target.value = '';
  };

  return (
    <>
      <div className="pageHead row">
        <div>
          <h1>Saved templates</h1>
          <p>Reusable 10-question questionnaires. Apply to any position or edit and re-save.</p>
        </div>
        <div className="row">
          <Link to="/rubrics/new">
            <Button>Create questionnaire</Button>
          </Link>
          <Button variant="outline" onClick={exportAll}>
            <Download size={14} /> Export
          </Button>
          <label className="btn outline">
            <Upload size={14} /> Import
            <input type="file" accept=".json" onChange={importAll} hidden />
          </label>
        </div>
      </div>

      {loadError && <p className="error">{loadError}</p>}

      {!templates.length ? (
        <Card>
          <p className="muted">No templates yet.</p>
          <Link to="/rubrics/new">
            <Button>Create your first questionnaire</Button>
          </Link>
        </Card>
      ) : (
        <div className="templateGallery">
          {templates.map((t) => (
            <Card key={t.id} className="templateCard">
              <div className="templateCardHead">
                <h3>{t.name}</h3>
                <span className="templateUsageBadge">Used on {t.usage_count || 0} jobs</span>
              </div>
              <p className="muted">
                {t.question_count} questions
                {t.department ? ` · ${t.department}` : ''}
                {t.experience_level ? ` · ${t.experience_level}` : ''}
                {t.version ? ` · v${t.version}` : ''}
              </p>
              {t.description && <p className="templateCardDesc">{t.description}</p>}
              <div className="templateCardActions">
                <Link to={`/rubrics/templates/${t.id}`}>
                  <Button variant="outline" className="small">
                    <Eye size={14} /> Preview
                  </Button>
                </Link>
                <Button variant="outline" className="small" onClick={() => duplicate(t.id, t.name)}>
                  <Copy size={14} /> Duplicate
                </Button>
                <Button variant="outline" className="small" onClick={() => remove(t.id, t.name)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
