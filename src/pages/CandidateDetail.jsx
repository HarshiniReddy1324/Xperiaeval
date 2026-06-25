import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ShieldAlert,
  Clock,
  Eye,
  Ban,
  Download,
  FileText,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  UserX,
  UserCheck,
  Trash2,
  Printer,
} from 'lucide-react';
import { api } from '../api/client';
import { assetUrl } from '../api/base.js';
import { Button, Card, BucketBadge, bucketClass } from '../components/ui';
import { CandidateIntelligenceReport } from '../components/CandidateIntelligenceReport';
import { ResumeValidationPanel } from '../components/candidate/ResumeValidationPanel';
import { IntegritySignalsPanel } from '../components/candidate/IntegritySignalsPanel';
import { BehavioralSignalsPanel } from '../components/candidate/BehavioralSignalsPanel';
import { ExperienceFitPanel } from '../components/candidate/ExperienceFitPanel';
import { VoiceVerificationPanel } from '../components/VoiceVerificationPanel';
import { useAuth } from '../context/AuthContext';

function formatTime(sec) {
  if (!sec && sec !== 0) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatResponseType(type) {
  if (type === 'text+audio') return 'Typed + audio';
  if (type === 'audio') return 'Audio recording';
  if (type === 'video') return 'Video';
  return 'Typed';
}

function isAudioMedia(mediaPath, responseType) {
  if (responseType === 'audio' || responseType === 'text+audio') return true;
  return /\.(webm|mp3|wav|m4a|ogg)(\?|$)/i.test(mediaPath || '');
}

const PIPELINE_LABELS = {
  application_review: 'Application review',
  shortlisted_interview: 'Shortlisted for interview',
  interview_scheduled: 'Interview scheduled',
  interview_completed: 'Interview completed',
  rejected: 'Not advancing',
  final_review: 'Final review',
};

const SCHEDULE_STATUS_LABELS = {
  awaiting_candidate: 'Waiting for candidate to pick time',
  awaiting_interviewer: 'Candidate picked time — confirm required',
  confirmed: 'Interview confirmed',
  declined: 'Time declined — resend invite',
  cancelled: 'Invite cancelled',
};

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast ${type}`}>{msg}</div>;
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'materials', label: 'Resume & answers', icon: FileText },
  { id: 'review', label: 'Reviewer actions', icon: MessageSquare },
  { id: 'background', label: 'Background check', icon: ShieldCheck },
];

export function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canSeeIntegrity = ['Admin', 'Recruiter', 'Hiring Manager'].includes(user?.role || '');
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [note, setNote] = useState('');
  const [overrideBucket, setOverrideBucket] = useState('');
  const [overrideNote, setOverrideNote] = useState('');
  const [rescoring, setRescoring] = useState(false);
  const [bgLoading, setBgLoading] = useState(false);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [toast, setToast] = useState({ msg: '', type: '' });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 4000);
  };

  const applyPayload = (payload) => {
    if (payload?.application) setData(payload);
  };

  const load = () =>
    api(`/applications/${id}`)
      .then(applyPayload)
      .catch((e) => showToast(e.message, 'error'));

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [id]);

  useEffect(() => {
    const needsPoll =
      data?.scheduling?.status === 'awaiting_interviewer' ||
      data?.scheduling?.status === 'awaiting_candidate' ||
      data?.pendingScheduleAction;
    if (!needsPoll) return;
    const id = setInterval(load, 12000);
    return () => clearInterval(id);
  }, [id, data?.scheduling?.status, data?.pendingScheduleAction]);

  const setPipeline = async (pipeline_stage) => {
    try {
      const res = await api(`/applications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ pipeline_stage }),
      });
      applyPayload(res);
      showToast(res.message || `Pipeline: ${PIPELINE_LABELS[pipeline_stage] || pipeline_stage}`);
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const sendSchedulingInvite = async () => {
    setInterviewLoading(true);
    try {
      const res = await api(`/applications/${id}/schedule/invite`, {
        method: 'POST',
        body: JSON.stringify({
          meeting_url: meetingUrl,
          message: 'Please select a time for your preliminary interview.',
        }),
      });
      applyPayload(res);
      const url = res.scheduling?.booking_url;
      if (url && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        showToast('Invite created — booking link copied to clipboard');
      } else {
        showToast(url ? 'Invite created — copy the booking link below' : res.message || 'Scheduling invite sent');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setInterviewLoading(false);
    }
  };

  const confirmSchedule = async () => {
    setInterviewLoading(true);
    try {
      const res = await api(`/applications/${id}/schedule/confirm`, { method: 'POST' });
      applyPayload(res);
      showToast(res.message || 'Interview confirmed');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setInterviewLoading(false);
    }
  };

  const declineSchedule = async () => {
    setInterviewLoading(true);
    try {
      const res = await api(`/applications/${id}/schedule/decline`, {
        method: 'POST',
        body: JSON.stringify({ reason: declineReason }),
      });
      applyPayload(res);
      setDeclineReason('');
      showToast(res.message || 'Declined — send a new invite');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setInterviewLoading(false);
    }
  };

  const copyBookingLink = async (url) => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    showToast('Booking link copied');
  };

  const deleteCandidate = async () => {
    if (!window.confirm('Move this application to trash? You can recover it from Trash.')) return;
    try {
      await api(`/applications/${id}`, { method: 'DELETE' });
      showToast('Moved to trash — recover from Trash if needed');
      navigate('/candidates');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const addNote = async () => {
    if (!note.trim()) {
      showToast('Please enter a note before saving.', 'error');
      return;
    }
    try {
      const res = await api(`/applications/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ body: note }),
      });
      applyPayload(res);
      setNote('');
      showToast(res.message || 'Note saved successfully');
      setTab('review');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const saveOverride = async () => {
    if (!overrideBucket) {
      showToast('Select a bucket to override.', 'error');
      return;
    }
    if (!overrideNote.trim()) {
      showToast('A written reason is required for bucket overrides.', 'error');
      return;
    }
    try {
      const res = await api(`/applications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ override_bucket: overrideBucket, override_note: overrideNote }),
      });
      applyPayload(res);
      setOverrideBucket('');
      setOverrideNote('');
      showToast(res.message || `Bucket updated to ${overrideBucket}`);
      setTab('overview');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const rescore = async () => {
    setRescoring(true);
    try {
      const res = await api(`/applications/${id}/rescore`, { method: 'POST' });
      applyPayload(res);
      const score = res.applicationScore || res.score;
      showToast(`Re-scored: ${score?.overall ?? '—'}/100 (${score?.bucket ?? '—'})`);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setRescoring(false);
    }
  };

  const revealIdentity = async () => {
    try {
      const res = await api(`/applications/${id}/reveal-identity`, { method: 'POST' });
      applyPayload(res);
      showToast(res.message || 'Identity revealed');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const runBackgroundCheck = async () => {
    setBgLoading(true);
    try {
      const res = await api(`/applications/${id}/background-check`, { method: 'POST' });
      applyPayload(res);
      showToast(res.message || 'Background check complete');
      setTab('background');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBgLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="loadingPage">
        <div className="spinner" />
        <p>Loading candidate…</p>
      </div>
    );
  }

  const {
    application: app,
    score,
    applicationScore,
    answers,
    notes,
    integrity,
    backgroundCheck,
    screening,
    scheduling,
    identityPolicy,
    materialsMasked,
    pendingScheduleAction,
    activity,
    intelligenceReport,
    candidateIntelligence,
    resumeValidation,
    integritySignals,
    behavioralSignals,
    experienceFit,
    hiddenGem,
    voiceVerification,
  } = data;
  const appScore = applicationScore || score;
  const intelligenceRaw = intelligenceReport || candidateIntelligence;
  const intelligence =
    intelligenceRaw && appScore
      ? {
          ...intelligenceRaw,
          overall: appScore.overall,
          bucket: appScore.bucket,
          tier: appScore.tier ?? intelligenceRaw.tier,
          recommendation: appScore.recommendation ?? intelligenceRaw.recommendation,
          confidence_level: appScore.confidence_level ?? intelligenceRaw.confidence_level,
        }
      : intelligenceRaw;
  const scoreTone = bucketClass(appScore?.bucket);
  const resumeFileName = app.resume_path?.split('/').pop();
  const isGreen = appScore?.bucket === 'Green';
  const pipeline = app.pipeline_stage || 'application_review';
  const canInterview = appScore && ['Green', 'Amber'].includes(appScore.bucket);

  return (
    <div className="candidatePage">
      <Toast msg={toast.msg} type={toast.type} />

      {pendingScheduleAction && scheduling?.selected_slot && (
        <div className="actionBanner">
          <div>
            <strong>Action required — candidate selected interview time</strong>
            <p>
              {scheduling.selected_slot.label} · Confirm or decline on Overview below.
            </p>
          </div>
          <Button onClick={() => document.getElementById('scheduling-card')?.scrollIntoView({ behavior: 'smooth' })}>
            Review scheduling
          </Button>
        </div>
      )}

      <div className="candidateHero">
        <Link to="/candidates" className="backLink">
          ← Back to candidates
        </Link>
        <div className="candidateHeroMain">
          <div>
            <h1>{app.display_name || app.name}</h1>
            {app.anonymized && identityPolicy && (
              <p className="anonBadge">{identityPolicy.reason}</p>
            )}
            <p className="candidateMeta">
              {app.id} · {app.job_title}
              {!app.anonymized && (
                <>
                  {' '}
                  · {app.email}
                  {app.phone ? ` · ${app.phone}` : ''}
                </>
              )}
            </p>
            <p className="muted">Applied {app.created_at} · Source: {app.source}</p>
            {screening && (
              <p className="muted">
                Screening: <strong>{screening.category || screening.status}</strong> · {screening.completion_pct}%
                complete
              </p>
            )}
            <div className="candidateBadges">
              <span className="pipelineStage">{PIPELINE_LABELS[pipeline] || pipeline}</span>
              {hiddenGem?.isHiddenGem && (
                <span
                  className="hiddenGemBadge"
                  title="Strong screening + authentic session, but resume keywords understate fit — manual second look recommended (does not auto-advance)."
                >
                  Hidden gem
                </span>
              )}
              {scheduling?.status && (
                <span className={`scheduleBadge ${scheduling.status}`}>
                  {SCHEDULE_STATUS_LABELS[scheduling.status] || scheduling.status}
                </span>
              )}
              {identityPolicy?.autoRevealed && (
                <span className="pipelineStage">Identity visible — final hiring stage</span>
              )}
              {identityPolicy?.canReveal && (
                <Button className="small" onClick={revealIdentity}>
                  Reveal identity (Hiring Manager)
                </Button>
              )}
            </div>
          </div>
          <div className="heroScoreCluster">
            <div className={`heroScorePair${integrity?.authenticity_score == null ? ' heroScorePair--solo' : ''}`}>
              <div className={`heroMetric heroMetric--primary heroMetric--${scoreTone || 'neutral'}`}>
                <span className="heroMetricLabel">Intelligence</span>
                <div className="heroMetricValueRow">
                  <strong className="heroMetricValue">{appScore?.overall ?? '—'}</strong>
                  {appScore?.bucket && <BucketBadge bucket={appScore.bucket} />}
                </div>
                {appScore?.tier && <span className="heroMetricMeta">{appScore.tier}</span>}
              </div>
              {integrity?.authenticity_score != null && (
                <div className="heroMetric heroMetric--secondary">
                  <span className="heroMetricLabel">Authenticity</span>
                  <strong className="heroMetricValue heroMetricValue--auth">{integrity.authenticity_score}</strong>
                </div>
              )}
            </div>
            {appScore?.recommendation && (
              <div className="heroMetric heroMetric--rec">
                <span className="heroMetricLabel">Recommendation</span>
                <p className="heroRecText">{appScore.recommendation}</p>
                {integrity?.authenticity_verdict && (
                  <p className="heroMetricFoot">{integrity.authenticity_verdict}</p>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="scoreExplainBox">
          <p>
            <strong>How to read these scores:</strong> The <em>intelligence score</em> (0–100) and{' '}
            <em>hiring recommendation</em> reflect overall fit — resume, answers, evidence, and communication.
            <em> Authenticity</em> is separate: it measures whether the applicant likely wrote answers themselves.
            Re-score recalculates from current rubric data
            {intelligence?.method === 'heuristic+ai' ? ' using AI-assisted evaluation' : ' using the rules engine'}
            {intelligence?.method === 'heuristic+ai' ? ' — the overall may shift by a few points between runs.' : '.'}
          </p>
        </div>
        <div className="pipelineBar">
          <Button className="small" onClick={() => setPipeline('shortlisted_interview')} disabled={!canInterview}>
            <UserCheck size={14} /> Shortlist for interview
          </Button>
          <Button className="small outline" onClick={sendSchedulingInvite} disabled={interviewLoading}>
            <Calendar size={14} /> Send scheduling invite
          </Button>
          <Button className="small outline" onClick={() => setPipeline('final_review')}>
            Final review
          </Button>
          <Button className="small ghost" onClick={() => setPipeline('rejected')}>
            <UserX size={14} /> Not advancing
          </Button>
          <Button className="small danger outline" onClick={deleteCandidate}>
            <Trash2 size={14} /> Move to trash
          </Button>
          {intelligence && (
            <Link to={`/candidates/${id}/scorecard`} target="_blank" rel="noreferrer">
              <Button className="small outline">
                <Printer size={14} /> Scorecard PDF
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Candidate profile sections">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            type="button"
            role="tab"
            id={`tab-${tid}`}
            aria-selected={tab === tid}
            aria-controls={`panel-${tid}`}
            className={tab === tid ? 'active' : ''}
            onClick={() => setTab(tid)}
          >
            <Icon size={16} />
            {label}
            {tid === 'background' && !isGreen && <span className="tabLock">Green only</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview">
        <>
          <div className={`dashWidget candidateScorecardWidget candidateScorecardWidget--${scoreTone || 'neutral'}`}>
            <div className="widgetHead intelReportHead">
              <h2>Candidate scorecard</h2>
              {intelligence && (
                <Link to={`/candidates/${id}/scorecard`} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="small">
                    <Printer size={15} /> Export PDF
                  </Button>
                </Link>
              )}
            </div>
            <CandidateIntelligenceReport
              key={`${appScore?.overall ?? 'x'}-${appScore?.bucket ?? 'x'}`}
              report={intelligence}
              applicationScore={appScore}
            />
          </div>

          <ExperienceFitPanel experienceFit={experienceFit || resumeValidation?.experienceFit || intelligence?.experience_fit} />

          <ResumeValidationPanel validation={resumeValidation} />

          <BehavioralSignalsPanel behavioral={behavioralSignals} />

          <IntegritySignalsPanel signals={integritySignals} />

          {hiddenGem?.isHiddenGem && (
            <div className="dashWidget hiddenGemPanel">
              <div className="widgetHead">
                <h2>Hidden gem — second look recommended</h2>
                <span className="hiddenGemBadge">Advisory only</span>
              </div>
              <p className="hiddenGemExplain">
                This candidate scored well on screening questions with an authentic session, but their resume
                shows weaker keyword overlap with the role. They may be stronger than the resume suggests — worth
                a manual review before dismissing. This does <em>not</em> auto-advance them.
              </p>
              <ul className="recList">
                {hiddenGem.reasons?.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="dashWidget candidateAppScoreWidget">
            <div className="widgetHead">
              <h2>Application score breakdown</h2>
            </div>
            <p className="muted scorecardIntro">
              Each screening question is scored from 0 to 10 points (mandatory questions up to 70 total, optional up
              to 30). Scores are evaluated against hidden rubric criteria recruiters configure — not shown to
              applicants.
            </p>
            {appScore ? (
              <>
                <div className="scorePanel">
                  <span>Total</span>
                  <strong>{appScore.overall}/100</strong>
                  <BucketBadge bucket={appScore.bucket} />
                  <p>{appScore.explanation}</p>
                </div>
                <div className="dimGrid">
                  <div className="dimCard">
                    <span>Mandatory</span>
                    <strong>
                      {appScore.mandatory_points ?? '—'}/{appScore.mandatory_max ?? 70}
                    </strong>
                  </div>
                  <div className="dimCard">
                    <span>Optional</span>
                    <strong>
                      {appScore.optional_points ?? '—'}/{appScore.optional_max ?? 30}
                    </strong>
                  </div>
                </div>
                {appScore.per_question?.length > 0 && (
                  <>
                    <h3 className="scorecardSubhead">Per-question scores</h3>
                    <ul className="recList scorecardQuestionList">
                      {appScore.per_question.map((q) => {
                        const pts = q.points ?? q.questionScore;
                        const maxPts = 10;
                        return (
                          <li key={q.category_id}>
                            <b>{q.name}</b> — {pts ?? '—'} of {maxPts} points
                            {q.notes ? <small>{q.notes}</small> : null}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
                <p className="muted">Risk: {appScore.risk}</p>
              </>
            ) : (
              <p>Not scored yet.</p>
            )}
            <Button onClick={rescore} disabled={rescoring}>
              <RefreshCw size={16} /> {rescoring ? 'Re-scoring…' : 'Re-score intelligence'}
            </Button>
          </div>

          <section className="grid two candidateOverviewGrid">
          <Card id="scheduling-card" className={`fullWidth scheduleOverview ${scheduling?.status || ''}`}>
            <h2>
              <Calendar size={18} /> Interview scheduling (optional)
            </h2>
            <p className="muted">Send a booking link if you want the candidate to pick an interview time.</p>
            <div className="formGroup">
              <label>Video meeting URL</label>
              <input
                placeholder="https://meet.google.com/..."
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
              />
            </div>
            {!scheduling && (
              <Button onClick={sendSchedulingInvite} disabled={interviewLoading}>
                <Calendar size={16} /> {interviewLoading ? 'Creating…' : 'Send scheduling invite'}
              </Button>
            )}
          </Card>

          {scheduling && (
            <Card className={`fullWidth scheduleOverview ${scheduling.status}`}>
              <h2>Interview scheduling status</h2>
              <p>
                <strong>{SCHEDULE_STATUS_LABELS[scheduling.status] || scheduling.status}</strong>
              </p>
              {scheduling.selected_slot && (
                <p className="scheduleTime">Candidate chose: {scheduling.selected_slot.label}</p>
              )}
              {scheduling.status === 'awaiting_candidate' && scheduling.booking_url && (
                <p>
                  Booking link: <code>{scheduling.booking_url}</code>
                  <Button variant="outline" onClick={() => copyBookingLink(scheduling.booking_url)}>
                    Copy for candidate
                  </Button>
                </p>
              )}
              {scheduling.status === 'awaiting_interviewer' && (
                <div className="scheduleDeclineBlock">
                  <label htmlFor="decline-reason">Reason for declining (optional)</label>
                  <textarea
                    id="decline-reason"
                    rows={3}
                    placeholder="e.g. Panel conflict — please pick another slot"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                  />
                  <div className="row">
                    <Button onClick={confirmSchedule} disabled={interviewLoading}>
                      Accept &amp; confirm interview
                    </Button>
                    <Button variant="outline" onClick={declineSchedule} disabled={interviewLoading}>
                      Decline / reschedule
                    </Button>
                  </div>
                </div>
              )}
              {scheduling.status === 'confirmed' && (
                <p className="success">
                  Confirmed for {scheduling.selected_slot?.label || scheduling.confirmed_starts_at}
                </p>
              )}
            </Card>
          )}

          {activity?.length > 0 && (
            <Card className="fullWidth">
              <h2>Activity timeline</h2>
              <ul className="activityList">
                {activity.map((ev, i) => (
                  <li key={i}>
                    <b>{ev.event_type}</b>
                    <span>{ev.description}</span>
                    <small>
                      {ev.actor_name || 'System'} · {ev.created_at}
                    </small>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {screening?.recommendation && (
            <Card className="fullWidth">
              <h2>AI recommendation</h2>
              <p>{screening.recommendation}</p>
              <p className="muted">
                Category: {screening.category} · Integrity: {integrity?.authenticity_verdict || '—'}
              </p>
            </Card>
          )}

          </section>
        </>
        </div>
      )}

      {tab === 'materials' && (
        <div role="tabpanel" id="panel-materials" aria-labelledby="tab-materials">
        <section className="grid two">
          <Card>
            <h2>
              <FileText size={20} /> Resume
            </h2>
            {materialsMasked ? (
              <p className="muted">Resume hidden during blind screening.</p>
            ) : app.resume_path ? (
              <div className="resumeBlock">
                <FileText size={24} />
                <div>
                  <b>{resumeFileName}</b>
                  <a href={assetUrl(app.resume_path)} target="_blank" rel="noreferrer" className="resumeLink">
                    <Download size={14} /> Open / download file
                  </a>
                </div>
              </div>
            ) : (
              <p className="muted">No resume file was uploaded.</p>
            )}
            {!materialsMasked && app.resume_text ? (
              <div className="resumeText">
                <small className="muted">Text used for scoring:</small>
                <pre>{app.resume_text}</pre>
              </div>
            ) : materialsMasked ? null : (
              <p className="muted">No resume text on file.</p>
            )}
          </Card>

          <Card>
            <h2>Application answers ({answers.length})</h2>
            {materialsMasked && (
              <p className="anonBadge">Answer text partially hidden until identity unlock — scores still visible.</p>
            )}
            {answers.length ? (
              answers.map((a, i) => {
                const isPlaceholder = /^\[(audio|video).*recorded\]/i.test(a.body || '');
                const showTranscript = Boolean(a.transcript_text?.trim());
                return (
                <div className="answerCard" key={a.id}>
                  <span className="answerNum">Q{i + 1}</span>
                  <b>{a.question}</b>
                  {showTranscript && (
                    <div className="answerTranscriptBox">
                      <span className="answerTranscriptLabel">Audio/video transcript (used for scoring)</span>
                      <p className="answerTranscriptBody">{a.transcript_text}</p>
                    </div>
                  )}
                  {!isPlaceholder && a.body?.trim() && (
                    <p className="answerTypedBody">{a.body}</p>
                  )}
                  {isPlaceholder && !showTranscript && (
                    <p className="answerPlaceholder muted">Audio/video response — see recording below.</p>
                  )}
                  <small className="muted answerMeta">
                    {formatResponseType(a.response_type)}
                    {a.time_taken_seconds != null && (
                      <>
                        {' · '}
                        <span
                          className={
                            a.timing?.exceeded_beyond_grace
                              ? 'answerTimeFlag answerTimeFlag--warn'
                              : a.timing?.status === 'grace'
                                ? 'answerTimeFlag answerTimeFlag--grace'
                                : ''
                          }
                          title={a.timing?.detail || undefined}
                        >
                          {formatTime(a.time_taken_seconds)}
                          {a.timing?.max_allowed_seconds
                            ? ` (guideline ${formatTime(a.timing.max_allowed_seconds)})`
                            : ''}
                          {a.timing?.exceeded_beyond_grace ? ' · over time limit' : ''}
                        </span>
                      </>
                    )}
                    {a.idle_seconds > 0 && ` · idle ${a.idle_seconds}s`}
                    {a.focus_loss_count > 0 && ` · ${a.focus_loss_count} tab switches`}
                    {a.score_points != null && ` · ${a.score_points} of 10 points`}
                  </small>
                  {a.media_path && (
                    <div className="answerMedia">
                      {isAudioMedia(a.media_path, a.response_type) ? (
                        <audio src={assetUrl(a.media_path)} controls className="mediaPlayer" preload="metadata" />
                      ) : (
                        <video src={assetUrl(a.media_path)} controls className="mediaPlayer" />
                      )}
                      <a href={assetUrl(a.media_path)} target="_blank" rel="noreferrer" className="resumeLink">
                        Download recording
                      </a>
                    </div>
                  )}
                </div>
              );
              })
            ) : (
              <p className="muted">No answers found.</p>
            )}
          </Card>

          {canSeeIntegrity && (
            <Card className="fullWidth">
              <h2>Proctoring &amp; session integrity</h2>
              <p className="muted">Recruiter-only — clipboard, focus, fullscreen, and typing signals from the apply session.</p>
              {integrity?.authenticity_score != null ? (
                <>
                  <div
                    className={`integrityPanel ${integrity.authenticity_score < 50 ? 'risk' : integrity.authenticity_score < 75 ? 'warn' : 'ok'}`}
                  >
                    <ShieldAlert size={22} />
                    <div>
                      <strong>{integrity.authenticity_verdict}</strong>
                      <p>Authenticity: {integrity.authenticity_score}/100</p>
                      {integrity.proctoring_verdict && <p>Proctoring: {integrity.proctoring_verdict}</p>}
                      {integrity.proctoring_score != null && <p>Proctoring score: {integrity.proctoring_score}/100</p>}
                    </div>
                  </div>
                  <div className="integrityStats">
                    <span>
                      <Clock size={14} /> {formatTime(integrity.total_time_seconds)} on form
                    </span>
                    <span>
                      <Eye size={14} /> {integrity.focus_loss_count ?? 0} focus/blur events
                    </span>
                    {integrity.camera_presence?.presence_pct != null && (
                      <span>
                        <Eye size={14} /> Camera presence {integrity.camera_presence.presence_pct}%
                      </span>
                    )}
                    {integrity.camera_presence?.look_away_samples > 0 && (
                      <span className="warn">
                        Look-away signals ×{integrity.camera_presence.look_away_samples}
                      </span>
                    )}
                    <span>
                      <Ban size={14} /> {integrity.paste_attempts ?? 0} paste · {integrity.copy_attempts ?? 0} copy
                    </span>
                    <span>
                      {integrity.devtools_detected_count > 0 && `DevTools ×${integrity.devtools_detected_count} `}
                      {integrity.fullscreen_exit_count > 0 && `Fullscreen exit ×${integrity.fullscreen_exit_count} `}
                      {integrity.outside_boundary_clicks > 0 && `Outside clicks ×${integrity.outside_boundary_clicks}`}
                    </span>
                    {integrity.submitter_ip && <span>IP: {integrity.submitter_ip}</span>}
                    {integrity.ip_duplicate && <span className="warn">Duplicate IP flagged</span>}
                    {integrity.proctoring_failed && <span className="risk">Proctoring failed</span>}
                  </div>
                  {(integrity.flags || []).length > 0 && (
                    <ul className="flagList">
                      {integrity.flags.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="muted">No integrity session data.</p>
              )}
            </Card>
          )}
        </section>
        </div>
      )}

      {tab === 'review' && (
        <div role="tabpanel" id="panel-review" aria-labelledby="tab-review">
        <section className="grid two">
          <Card>
            <h2>
              <MessageSquare size={20} /> Reviewer notes
            </h2>
            <p className="muted">Document your human judgment. Notes appear in the audit log.</p>
            <div className="formGroup">
              <label>New note</label>
              <textarea
                placeholder="e.g. Strong PM background — schedule hiring manager screen…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
              />
              <Button onClick={addNote}>
                <MessageSquare size={16} /> Save note
              </Button>
            </div>
            <div className="notesList">
              {notes.length ? (
                notes.map((n) => (
                  <div className="noteCard" key={n.id}>
                    <b>{n.author || 'Reviewer'}</b>
                    <small>{n.created_at}</small>
                    <p>{n.body}</p>
                  </div>
                ))
              ) : (
                <p className="muted emptyBox">No reviewer notes yet.</p>
              )}
            </div>
          </Card>

          <Card className="fullWidth">
            <VoiceVerificationPanel
              applicationId={id}
              voiceVerification={voiceVerification}
              onUpdated={load}
            />
          </Card>

          <Card>
            <h2>Override application bucket</h2>
            <p className="muted">
              Change Green / Amber / Red for the <strong>application</strong> score after human review.
            </p>
            <div className="formGroup">
              <label>New bucket</label>
              <select value={overrideBucket} onChange={(e) => setOverrideBucket(e.target.value)}>
                <option value="">— Select bucket —</option>
                <option value="Green">Green — Ready for interview pool</option>
                <option value="Amber">Amber — Needs review</option>
                <option value="Red">Red — Low match (still visible)</option>
              </select>
            </div>
            <div className="formGroup">
              <label>Reason for override (required)</label>
              <textarea
                placeholder="Explain why you are changing the automated bucket…"
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
                rows={3}
              />
            </div>
            <Button onClick={saveOverride} variant="outline">
              Apply bucket override
            </Button>
            {appScore && (
              <p className="muted mt">
                Current application bucket: <BucketBadge bucket={appScore.bucket} />
              </p>
            )}
          </Card>
        </section>
        </div>
      )}

      {tab === 'background' && (
        <div role="tabpanel" id="panel-background" aria-labelledby="tab-background">
        <Card className="bgCard">
          <h2>
            <ShieldCheck size={22} /> Pre-employment verification
          </h2>
          <p className="muted">
            Simulated background check. Available only for <strong>Green-bucket</strong> application scores.
          </p>

          {!isGreen ? (
            <div className="lockedBox">
              <AlertTriangle size={32} />
              <p>
                Application bucket is <BucketBadge bucket={appScore?.bucket || '—'} />. Move to Green before
                verification.
              </p>
            </div>
          ) : backgroundCheck ? (
            <div className="bgReport">
              <div className={`bgStatus ${backgroundCheck.overall_status}`}>
                {backgroundCheck.overall_status === 'clear' && <CheckCircle2 size={28} />}
                {backgroundCheck.overall_status === 'review' && <AlertTriangle size={28} />}
                {backgroundCheck.overall_status === 'fail' && <XCircle size={28} />}
                <div>
                  <strong>Status: {backgroundCheck.overall_status?.toUpperCase()}</strong>
                  <p>{backgroundCheck.summary}</p>
                  <small>Confidence: {backgroundCheck.confidence}%</small>
                </div>
              </div>
              <div className="bgChecks">
                {(backgroundCheck.checks || []).map((c) => (
                  <div className={`bgCheckItem ${c.status}`} key={c.id}>
                    <span className="bgCheckIcon">
                      {c.status === 'pass' && <CheckCircle2 size={18} />}
                      {c.status === 'review' && <AlertTriangle size={18} />}
                      {c.status === 'fail' && <XCircle size={18} />}
                    </span>
                    <div>
                      <b>{c.label}</b>
                      <p>{c.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="disclaimer">{backgroundCheck.disclaimer}</p>
              <Button onClick={runBackgroundCheck} disabled={bgLoading}>
                <RefreshCw size={16} /> Re-run verification
              </Button>
            </div>
          ) : (
            <div className="bgRunBox">
              <p>Verify identity consistency, employment signals, and resume claims before offer stage.</p>
              <Button onClick={runBackgroundCheck} disabled={bgLoading}>
                <ShieldCheck size={16} /> {bgLoading ? 'Running check…' : 'Run background verification'}
              </Button>
            </div>
          )}
        </Card>
        </div>
      )}
    </div>
  );
}
