import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Download } from 'lucide-react';
import { api } from '../api/client';
import { Button, Card } from '../components/ui';

export function Rubrics() {
  const [jobs, setJobs] = useState([]);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    api('/jobs').then(setJobs).catch(console.error);
    api('/rubric-templates')
      .then((d) => setTemplates(d.templates || []))
      .catch(console.error);
  }, []);

  return (
    <>
      <div className="pageHead">
        <h1>Rubrics & templates</h1>
        <p>
          Define screening questions per job, or save a full 10-question set as a reusable template (e.g. Senior Backend
          v2) and apply it in one click on new roles.
        </p>
      </div>

      <Card className="mb">
        <h2>
          <Bookmark size={20} /> Saved rubric templates
        </h2>
        {templates.length ? (
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
                <span className="muted">Apply from any job&apos;s detail page</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            No templates yet. Open a job with 7 mandatory + 3 optional questions saved, then use &quot;Save as
            template&quot; on the job screen.
          </p>
        )}
      </Card>

      <h2 className="sectionTitle">Jobs</h2>
      {jobs.map((j) => (
        <Card key={j.id} className="mb">
          <h3>
            <Link to={`/jobs/${j.id}`}>{j.title}</Link>
          </h3>
          <p className="muted">{j.id}</p>
          <Link to={`/jobs/${j.id}`}>
            <Button variant="outline" className="small">
              <Download size={14} /> Edit rubric & question library
            </Button>
          </Link>
        </Card>
      ))}
    </>
  );
}
