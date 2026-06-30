import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Sparkles, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui';
import { ScreeningQuestion } from '../components/ScreeningQuestion';
import { CameraConsentStep, CameraPresenceIndicator } from '../components/CameraPresence';
import { useProctoring, shuffleCategories } from '../hooks/useProctoring';
import { useCameraPresence } from '../hooks/useCameraPresence';
import { mergeProctoringPolicy } from '../components/ProctoringSettingsEditor';
import { apiUrl } from '../api/base.js';

function readApplyTracking() {
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname || '';
  return {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    ref: params.get('ref') || params.get('source') || '',
    channel: path.startsWith('/embed/') ? 'embed' : 'careers',
  };
}

export function Apply() {
  const { slug } = useParams();
  const [jobData, setJobData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [step, setStep] = useState('profile');
  const [qIndex, setQIndex] = useState(0);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [applyTracking] = useState(readApplyTracking);
  const [answers, setAnswers] = useState({});
  const [mediaBlobs, setMediaBlobs] = useState({});
  const [resume, setResume] = useState(null);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [presencePct, setPresencePct] = useState(null);
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [followUpAnswers, setFollowUpAnswers] = useState({});
  const [fitPreview, setFitPreview] = useState(null);
  const [fitLoading, setFitLoading] = useState(false);
  const boundaryRef = useRef(null);

  const proctoringPolicy = mergeProctoringPolicy(jobData?.proctoringPolicy);
  const proctoring = useProctoring(proctoringPolicy, boundaryRef);
  const cameraPresence = useCameraPresence(proctoringPolicy.camera_presence_monitoring);
  const needsCamera = proctoringPolicy.camera_presence_monitoring;
  const currentCat = categories[qIndex];

  const goToScreening = useCallback(() => {
    if (needsCamera) setStep('camera');
    else setStep('screening');
    setQIndex(0);
  }, [needsCamera]);

  const runFitPreview = useCallback(async () => {
    setFitLoading(true);
    setError('');
    try {
      const fd = new FormData();
      if (resume) fd.append('resume', resume);
      const res = await fetch(apiUrl(`/api/public/jobs/${slug}/fit-preview`), { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fit preview failed');
      setFitPreview(data);
      setFollowUpQuestions(data.followUpQuestions || []);
      const init = {};
      (data.followUpQuestions || []).forEach((q) => {
        init[q.id] = '';
      });
      setFollowUpAnswers(init);
      if (data.requiresFollowUp) setStep('followup');
      else goToScreening();
    } catch (e) {
      setError(e.message || 'Fit preview failed. You can still continue without resume analysis.');
    } finally {
      setFitLoading(false);
    }
  }, [resume, slug, goToScreening]);

  useEffect(() => {
    fetch(apiUrl(`/api/public/jobs/${slug}`))
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setJobData(d);
        let cats = d.categories || [];
        if (d.proctoringPolicy?.shuffle_questions) {
          cats = shuffleCategories(cats);
        }
        setCategories(cats);
        const init = {};
        cats.forEach((c) => {
          init[c.id] = { body: '', response_type: c.response_type || 'text' };
        });
        setAnswers(init);
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  useEffect(() => {
    if (step !== 'screening' || !cameraPresence.isActive) return undefined;
    const id = setInterval(() => {
      setPresencePct(cameraPresence.getMetrics().presence_pct);
    }, 2000);
    return () => clearInterval(id);
  }, [step, cameraPresence.isActive, cameraPresence]);

  useEffect(() => {
    if (step === 'screening' && proctoringPolicy.enabled) {
      proctoring.requestFullscreen();
    }
  }, [step, proctoringPolicy.enabled]);

  useEffect(() => {
    if (step !== 'screening' || !proctoringPolicy.enabled) return;
    const shell = document.querySelector('.applyShell');
    if (!shell) return;
    const block = (e) => proctoring.blockClipboard(e);
    const sel = (e) => proctoring.onSelectStart(e);
    shell.addEventListener('copy', block);
    shell.addEventListener('cut', block);
    shell.addEventListener('paste', block);
    shell.addEventListener('selectstart', sel);
    shell.addEventListener('contextmenu', proctoring.onFieldContextMenu);
    return () => {
      shell.removeEventListener('copy', block);
      shell.removeEventListener('cut', block);
      shell.removeEventListener('paste', block);
      shell.removeEventListener('selectstart', sel);
      shell.removeEventListener('contextmenu', proctoring.onFieldContextMenu);
    };
  }, [step, proctoringPolicy.enabled, proctoring]);

  const saveCurrentAnswer = useCallback(
    (payload) => {
      if (!currentCat) return;
      setAnswers((prev) => ({
        ...prev,
        [currentCat.id]: { ...prev[currentCat.id], ...payload, category_id: currentCat.id },
      }));
    },
    [currentCat]
  );

  const onMediaBlob = useCallback(
    (blob, mode) => {
      if (!currentCat) return;
      if (!blob) {
        setMediaBlobs((prev) => {
          const next = { ...prev };
          delete next[currentCat.id];
          return next;
        });
        return;
      }
      setMediaBlobs((prev) => ({ ...prev, [currentCat.id]: { blob, mode } }));
    },
    [currentCat]
  );

  const answerHasContent = (catId) => {
    const a = answers[catId];
    const body = (a?.body || '').trim();
    const typed = body.length >= 8 && !/^\[(audio|video).*recorded/i.test(body);
    return typed || Boolean(mediaBlobs[catId]?.blob);
  };

  const goNextQuestion = useCallback(() => {
    if (proctoring.autoFailed) {
      setError('Unable to continue. Please refresh and try again.');
      return;
    }
    if (qIndex < categories.length - 1) setQIndex((i) => i + 1);
    else setStep('review');
  }, [qIndex, categories.length, proctoring.autoFailed]);

  const submit = async () => {
    if (proctoring.autoFailed) {
      setError('Unable to submit. Please refresh and try again.');
      return;
    }
    setError('');
    setSubmitting(true);
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('email', form.email);
    fd.append('phone', form.phone);
    fd.append('utm_source', applyTracking.utm_source);
    fd.append('utm_medium', applyTracking.utm_medium);
    fd.append('ref', applyTracking.ref);
    fd.append('channel', applyTracking.channel);
    if (resume) fd.append('resume', resume);

    const answersPayload = categories.map((c) => {
      const a = answers[c.id] || {};
      return {
        category_id: c.id,
        body: a.body || '',
        response_type: a.response_type || c.response_type || 'text',
        time_taken_seconds: a.metrics?.time_taken_seconds || 0,
        idle_seconds: a.metrics?.idle_seconds || 0,
        focus_loss_count: a.metrics?.focus_loss_count || 0,
      };
    });
    fd.append('answers', JSON.stringify(answersPayload));

    for (const [catId, media] of Object.entries(mediaBlobs)) {
      if (media?.blob) fd.append(`media_${catId}`, media.blob, `response.webm`);
    }

    if (proctoringPolicy.enabled) {
      const integrity = { ...proctoring.getSnapshot() };
      if (needsCamera) {
        integrity.camera_presence = cameraPresence.getMetrics();
      }
      fd.append('integrity', JSON.stringify(integrity));
    }

    if (followUpQuestions.length > 0) {
      fd.append(
        'follow_up',
        JSON.stringify({
          questions: followUpQuestions,
          answers: followUpQuestions.map((q) => ({
            id: q.id,
            body: followUpAnswers[q.id] || '',
          })),
        })
      );
    }

    try {
      const res = await fetch(apiUrl(`/api/public/jobs/${slug}/apply`), { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Submission failed');
        return;
      }
      setSubmitted(data);
      setStep('done');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !jobData) {
    return (
      <div className="applyShell publicPortal">
        <div className="applyShellInner">
          <p className="error">{error}</p>
        </div>
      </div>
    );
  }

  if (!jobData) {
    return (
      <div className="applyShell publicPortal">
        <div className="applyShellInner loadingPage">
          <div className="spinner" />
          <p>Loading application…</p>
        </div>
      </div>
    );
  }

  const { job, orgName, candidateNotice } = jobData;
  const mandatoryCount = categories.filter((c) => !c.optional).length;
  const noBacktrack = proctoringPolicy.no_backtrack;

  if (submitted || step === 'done') {
    return (
      <div className="applyShell publicPortal">
        <div className="applyShellInner">
          <div className="applyFormCard applySuccess">
            <div className="applySuccessIcon">
              <CheckCircle2 size={32} />
            </div>
            <h1>Application submitted</h1>
            <p className="muted">Reference: {submitted.applicationId}</p>
            <p className="muted">
              {submitted.message || 'Thank you. The hiring team will review your responses.'}
            </p>
            <Link to={`/careers/${slug}`} className="applyBack">
              ← Back to position details
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stepIndex =
    step === 'profile'
      ? 0
      : step === 'followup'
        ? 1
        : step === 'camera'
          ? (followUpQuestions.length > 0 ? 2 : 1)
          : step === 'screening'
            ? (followUpQuestions.length > 0 ? (needsCamera ? 3 : 2) : needsCamera ? 2 : 1)
            : step === 'review'
              ? (followUpQuestions.length > 0 ? (needsCamera ? 4 : 3) : needsCamera ? 3 : 2)
              : 0;
  const showFollowUpStep = followUpQuestions.length > 0 || step === 'followup';
  const proctoredActive = (step === 'screening' || step === 'camera') && proctoringPolicy.enabled;

  return (
    <div className={`applyShell publicPortal${proctoredActive ? ' proctoredSession' : ''}`}>
      <div className="applyShellInner">
        <div className="applyTopBar">
          <div className="applyBrand">
            <Sparkles size={20} />
            {orgName}
          </div>
          <Link to={`/careers/${slug}`} className="applyBack">
            ← Position details
          </Link>
        </div>

        <div className="applyHeroCard">
          <p className="muted">
            {job.location}
            {job.team ? ` · ${job.team}` : ''}
          </p>
          <h1>{job.title}</h1>
          <p className="muted">{candidateNotice}</p>
          <div className="applyProgress">
            <span className={step === 'profile' ? 'active' : stepIndex > 0 ? 'done' : ''}>Your info</span>
            {showFollowUpStep && (
              <span className={step === 'followup' ? 'active' : stepIndex > 1 ? 'done' : ''}>Follow-up</span>
            )}
            {needsCamera && (
              <span className={step === 'camera' ? 'active' : stepIndex > (showFollowUpStep ? 2 : 1) ? 'done' : ''}>
                Camera consent
              </span>
            )}
            <span
              className={
                step === 'screening'
                  ? 'active'
                  : step === 'review' || step === 'done'
                    ? 'done'
                    : ''
              }
            >
              Questions ({mandatoryCount} required)
            </span>
            <span className={step === 'review' ? 'active' : step === 'done' ? 'done' : ''}>Submit</span>
          </div>
        </div>

        {step === 'profile' && (
          <div className="applyFormCard">
            <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Your information</h2>
            <p className="muted" style={{ marginBottom: 20 }}>
              We use this to identify your application. Next: screening questions: type, record audio, or both.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runFitPreview();
              }}
            >
              <label>Full name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <label>Email</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <label>Resume (PDF, DOCX, or TXT)</label>
              <input type="file" accept=".pdf,.doc,.docx,.txt,.md" onChange={(e) => setResume(e.target.files[0])} />
              {error && (
                <p className="error" role="alert" style={{ marginTop: 12 }}>
                  {error}
                </p>
              )}
              <div className="row" style={{ marginTop: 24 }}>
                <Button type="submit" disabled={fitLoading}>
                  {fitLoading ? 'Checking fit…' : 'Continue'}
                  {!fitLoading && <ChevronRight size={16} />}
                </Button>
                {error && (
                  <Button type="button" variant="outline" onClick={goToScreening}>
                    Skip and continue
                  </Button>
                )}
              </div>
            </form>
          </div>
        )}

        {step === 'followup' && followUpQuestions.length > 0 && (
          <div className="applyFormCard">
            <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Quick follow-up</h2>
            <p className="muted" style={{ marginBottom: 16 }}>
              {fitPreview?.experienceFit?.summary ||
                'We need a bit more context before your screening questions.'}
            </p>
            {followUpQuestions.map((q) => (
              <div key={q.id} className="followUpBlock">
                <label>{q.question}</label>
                <textarea
                  rows={5}
                  required
                  minLength={q.min_chars || 60}
                  placeholder={q.placeholder || 'Type your answer…'}
                  value={followUpAnswers[q.id] || ''}
                  onChange={(e) => setFollowUpAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                />
              </div>
            ))}
            <div className="row" style={{ marginTop: 20 }}>
              <Button type="button" variant="outline" onClick={() => setStep('profile')}>
                <ChevronLeft size={16} /> Back
              </Button>
              <Button type="button" onClick={goToScreening}>
                Continue to screening <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {step === 'camera' && needsCamera && (
          <>
            <CameraConsentStep
              loading={cameraLoading}
              onAccept={async () => {
                setCameraLoading(true);
                setError('');
                const result = await cameraPresence.grantConsent();
                setCameraLoading(false);
                if (result !== 'granted') {
                  setError('Camera access is required to continue with integrity monitoring.');
                  return;
                }
                setStep('screening');
                setQIndex(0);
              }}
              onDecline={() => {
                cameraPresence.denyConsent();
                setError('You must accept camera presence monitoring to complete this screening.');
              }}
            />
            {error && <p className="error">{error}</p>}
          </>
        )}

        {step === 'screening' && currentCat && (
          <div className="applyFormCard proctorBoundary" ref={boundaryRef}>
            {needsCamera && cameraPresence.isActive && (
              <CameraPresenceIndicator
                videoRef={cameraPresence.videoRef}
                presencePct={presencePct}
              />
            )}
            <p className="applyQProgress">
              Question {qIndex + 1} of {categories.length}
              {currentCat.optional && ' · Optional'}
            </p>
            <ScreeningQuestion
              key={currentCat.id}
              category={currentCat}
              index={qIndex}
              total={categories.length}
              value={answers[currentCat.id]}
              onChange={saveCurrentAnswer}
              proctoring={proctoring}
              proctoringPolicy={proctoringPolicy}
              onMediaBlob={onMediaBlob}
              allowAudioRecord
            />
            {error && <p className="error">{error}</p>}
            <div className="row" style={{ marginTop: 20 }}>
              {!noBacktrack && (
                <Button type="button" variant="outline" disabled={qIndex === 0} onClick={() => setQIndex((i) => Math.max(0, i - 1))}>
                  <ChevronLeft size={16} /> Back
                </Button>
              )}
              <Button
                type="button"
                disabled={proctoring.autoFailed}
                onClick={() => {
                  const isOptional = currentCat.optional;
                  if (!isOptional && !answerHasContent(currentCat.id)) {
                    setError('Please type an answer or record audio for this required question.');
                    return;
                  }
                  setError('');
                  goNextQuestion();
                }}
              >
                {qIndex < categories.length - 1 ? (
                  <>
                    Next <ChevronRight size={16} />
                  </>
                ) : (
                  'Review & submit'
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="applyFormCard">
            <h2 style={{ margin: '0 0 16px' }}>Review & submit</h2>
            <ul className="reviewList">
              {categories.map((c, i) => {
                const body = (answers[c.id]?.body || '').trim();
                const typed = body && !/^\[(audio|video).*recorded/i.test(body);
                const hasAudio = Boolean(mediaBlobs[c.id]?.blob);
                return (
                  <li key={c.id}>
                    <b>Q{i + 1}.</b>{' '}
                    {typed ? body.slice(0, 80) + (body.length > 80 ? '…' : '') : null}
                    {typed && hasAudio && ' · '}
                    {hasAudio && <em>Audio recording attached</em>}
                    {!typed && !hasAudio && <em>(skipped)</em>}
                  </li>
                );
              })}
            </ul>
            {error && <p className="error">{error}</p>}
            <div className="row">
              {!noBacktrack && (
                <Button type="button" variant="outline" onClick={() => { setStep('screening'); setQIndex(0); }}>
                  Edit answers
                </Button>
              )}
              <Button type="button" onClick={submit} disabled={submitting || proctoring.autoFailed}>
                {submitting ? 'Submitting…' : 'Submit application'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
