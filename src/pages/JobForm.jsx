import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  ExternalLink,
  Briefcase,
  Building2,
  FileText,
  Users,
  Eye,
} from 'lucide-react';
import { api } from '../api/client';
import { Button } from '../components/ui';
import { FormSection, FormField, FormGrid } from '../components/forms/FormSection';
import { EMPTY_POSTING_FIELDS, listToText, textToList } from '../lib/jobPostingForm';

const STAGES = ['Draft', 'Open', 'Screening', 'Hiring Team Review', 'Interviewing'];
const inputClass = 'formInput';
const textareaClass = 'formInput formTextarea';
const textareaMono = 'formInput formTextarea mono';

export function JobForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [slug, setSlug] = useState('');
  const [form, setForm] = useState({
    title: '',
    team: '',
    location: '',
    stage: 'Draft',
    description: '',
    green_threshold: '',
    amber_threshold: '',
    posting: { ...EMPTY_POSTING_FIELDS },
  });

  useEffect(() => {
    if (!isEdit) return;
    api(`/jobs/${id}`)
      .then((d) => {
        const p = d.posting || {};
        setSlug(d.slug || '');
        setForm({
          title: d.title || '',
          team: d.team || '',
          location: d.location || '',
          stage: d.stage || 'Draft',
          description: d.description || '',
          green_threshold: d.green_threshold ?? '',
          amber_threshold: d.amber_threshold ?? '',
          posting: {
            ...EMPTY_POSTING_FIELDS,
            ...p,
            responsibilities: listToText(p.responsibilities),
            requiredQualifications: listToText(p.requiredQualifications),
            preferredQualifications: listToText(p.preferredQualifications),
            techStack: listToText(p.techStack),
            benefits: listToText(p.benefits),
            hiringProcess: listToText(p.hiringProcess),
          },
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const setPosting = (field, value) => {
    setForm((f) => ({ ...f, posting: { ...f.posting, [field]: value } }));
  };

  const buildPayload = () => ({
    title: form.title,
    team: form.team,
    location: form.location,
    stage: form.stage,
    description: form.posting.summary || form.description,
    green_threshold: form.green_threshold !== '' ? Number(form.green_threshold) : undefined,
    amber_threshold: form.amber_threshold !== '' ? Number(form.amber_threshold) : undefined,
    posting: {
      ...form.posting,
      department: form.posting.department || form.team,
      responsibilities: textToList(form.posting.responsibilities),
      requiredQualifications: textToList(form.posting.requiredQualifications),
      preferredQualifications: textToList(form.posting.preferredQualifications),
      techStack: textToList(form.posting.techStack),
      benefits: textToList(form.posting.benefits),
      hiringProcess: textToList(form.posting.hiringProcess),
    },
  });

  const save = async (e) => {
    e?.preventDefault();
    if (!form.title.trim()) return alert('Job title is required');
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await api(`/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        navigate(`/jobs/${id}`);
      } else {
        const job = await api('/jobs', { method: 'POST', body: JSON.stringify(payload) });
        navigate(`/jobs/${job.id}`);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!isEdit || !window.confirm(`Move "${form.title}" to trash? Recover anytime from Trash.`)) return;
    setDeleting(true);
    try {
      await api(`/jobs/${id}`, { method: 'DELETE' });
      navigate('/trash');
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="loadingPage">
        <Loader2 className="spinIcon" size={36} />
        <p>Loading job…</p>
      </div>
    );
  }

  const p = form.posting;

  return (
    <div className="formPage">
      <div className="formPageTop">
        <Link to="/jobs" className="backLink light">
          <ArrowLeft size={16} /> Jobs
        </Link>
        <div className="formPageTitleRow">
          <div>
            <p className="eyebrow">Recruiter · Job posting</p>
            <h1>{isEdit ? 'Edit job posting' : 'Create job posting'}</h1>
            <p className="lead">
              Candidates see a careers page with full details. <strong>Apply</strong> opens your screening
              questions (7 required + 3 optional).
            </p>
          </div>
          <div className="formPageActions">
            {slug && (
              <a href={`/careers/${slug}`} target="_blank" rel="noreferrer" className="btn outline">
                <Eye size={16} /> Preview careers page
              </a>
            )}
            {isEdit && (
              <button type="button" className="btn danger outline" onClick={remove} disabled={deleting}>
                <Trash2 size={16} /> {deleting ? 'Moving…' : 'Move to trash'}
              </button>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={save} className="formPageLayout">
        <div className="formPageMain">
          <FormSection
            title="Role overview"
            description="What applicants see in the header — title, location, compensation."
            icon={Briefcase}
          >
            <FormGrid cols={2}>
              <FormField label="Job title" required className="span2">
                <input
                  className={inputClass}
                  required
                  placeholder="e.g. Senior Product Manager"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </FormField>
              <FormField label="Company name">
                <input
                  className={inputClass}
                  placeholder="Your company"
                  value={p.companyName}
                  onChange={(e) => setPosting('companyName', e.target.value)}
                />
              </FormField>
              <FormField label="Department">
                <input
                  className={inputClass}
                  placeholder="e.g. Product"
                  value={p.department}
                  onChange={(e) => setPosting('department', e.target.value)}
                />
              </FormField>
              <FormField label="Location">
                <input
                  className={inputClass}
                  placeholder="Remote / City"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </FormField>
              <FormField label="Employment type">
                <select className={inputClass} value={p.employmentType} onChange={(e) => setPosting('employmentType', e.target.value)}>
                  {['Full-time', 'Part-time', 'Contract', 'Internship'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Salary min (USD)">
                <input
                  type="number"
                  className={inputClass}
                  placeholder="140000"
                  value={p.salaryMin}
                  onChange={(e) => setPosting('salaryMin', e.target.value)}
                />
              </FormField>
              <FormField label="Salary max (USD)">
                <input
                  type="number"
                  className={inputClass}
                  placeholder="175000"
                  value={p.salaryMax}
                  onChange={(e) => setPosting('salaryMax', e.target.value)}
                />
              </FormField>
              <FormField label="Visa sponsorship">
                <input
                  className={inputClass}
                  value={p.visaSponsorship}
                  onChange={(e) => setPosting('visaSponsorship', e.target.value)}
                />
              </FormField>
              <FormField label="Job status">
                <select className={inputClass} value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                  {STAGES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </FormField>
              {isEdit && (
                <>
                  <FormField label="Green bucket threshold (≥)" hint="Overrides org default for this job">
                    <input
                      type="number"
                      className={inputClass}
                      min={50}
                      max={100}
                      placeholder="e.g. 75"
                      value={form.green_threshold}
                      onChange={(e) => setForm({ ...form, green_threshold: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Amber bucket threshold (≥)">
                    <input
                      type="number"
                      className={inputClass}
                      min={40}
                      max={95}
                      placeholder="e.g. 55"
                      value={form.amber_threshold}
                      onChange={(e) => setForm({ ...form, amber_threshold: e.target.value })}
                    />
                  </FormField>
                </>
              )}
            </FormGrid>
          </FormSection>

          <FormSection title="About & summary" description="Company story and role pitch." icon={Building2}>
            <FormField label="About the company">
              <textarea
                rows={4}
                className={textareaClass}
                placeholder="Who you are and why candidates should care…"
                value={p.aboutCompany}
                onChange={(e) => setPosting('aboutCompany', e.target.value)}
              />
            </FormField>
            <FormField label="Job summary">
              <textarea
                rows={3}
                className={textareaClass}
                placeholder="2–3 sentences on the role…"
                value={p.summary}
                onChange={(e) => setPosting('summary', e.target.value)}
              />
            </FormField>
          </FormSection>

          <FormSection
            title="Role details"
            description="One item per line. Hidden scoring criteria are configured separately under Screening questions."
            icon={FileText}
          >
            <FormField label="Responsibilities" hint="One per line">
              <textarea rows={5} className={textareaMono} value={p.responsibilities} onChange={(e) => setPosting('responsibilities', e.target.value)} />
            </FormField>
            <FormField label="Required qualifications">
              <textarea rows={4} className={textareaMono} value={p.requiredQualifications} onChange={(e) => setPosting('requiredQualifications', e.target.value)} />
            </FormField>
            <FormField label="Preferred qualifications">
              <textarea rows={3} className={textareaMono} value={p.preferredQualifications} onChange={(e) => setPosting('preferredQualifications', e.target.value)} />
            </FormField>
            <FormGrid cols={2}>
              <FormField label="Tech stack" hint="One per line">
                <textarea rows={4} className={textareaMono} value={p.techStack} onChange={(e) => setPosting('techStack', e.target.value)} />
              </FormField>
              <FormField label="Benefits">
                <textarea rows={4} className={textareaMono} value={p.benefits} onChange={(e) => setPosting('benefits', e.target.value)} />
              </FormField>
            </FormGrid>
            <FormField label="Hiring process steps">
              <textarea rows={4} className={textareaMono} value={p.hiringProcess} onChange={(e) => setPosting('hiringProcess', e.target.value)} />
            </FormField>
            <FormField label="Equal opportunity statement">
              <textarea rows={3} className={textareaClass} value={p.equalOpportunity} onChange={(e) => setPosting('equalOpportunity', e.target.value)} />
            </FormField>
          </FormSection>

          <FormSection title="Recruiter contact" description="Shown on the careers page sidebar." icon={Users}>
            <FormGrid cols={2}>
              <FormField label="Recruiter name">
                <input className={inputClass} value={p.recruiterName} onChange={(e) => setPosting('recruiterName', e.target.value)} />
              </FormField>
              <FormField label="Recruiter email">
                <input type="email" className={inputClass} value={p.recruiterEmail} onChange={(e) => setPosting('recruiterEmail', e.target.value)} />
              </FormField>
            </FormGrid>
          </FormSection>

          <div className="formPageFooter">
            <Button type="submit" disabled={saving}>
              <Save size={16} /> {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create job'}
            </Button>
            <Link to="/jobs">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </div>

        <aside className="formPageAside">
          <div className="asideCard stickyAside">
            <h3>Applicant journey</h3>
            <ol className="journeySteps">
              <li>
                <strong>Careers page</strong>
                <span>Job details, benefits, Apply button</span>
              </li>
              <li>
                <strong>Application form</strong>
                <span>Profile + 10 screening questions</span>
              </li>
              <li>
                <strong>Your dashboard</strong>
                <span>Scores /100, Green · Amber · Red</span>
              </li>
            </ol>
            {slug && (
              <div className="asideLinks">
                <a href={`/careers/${slug}`} target="_blank" rel="noreferrer" className="asideLink">
                  <ExternalLink size={14} /> Careers page
                </a>
                <a href={`/apply/${slug}`} target="_blank" rel="noreferrer" className="asideLink">
                  <ExternalLink size={14} /> Application form
                </a>
              </div>
            )}
            {isEdit && (
              <Link to={`/jobs/${id}`} className="btn outline fullWidth">
                Configure screening questions →
              </Link>
            )}
          </div>
        </aside>
      </form>
    </div>
  );
}
