import React from 'react';
import { Link } from 'react-router-dom';
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
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  Printer,
} from 'lucide-react';
import { assetUrl } from '../../api/base.js';
import { Button, Card, BucketBadge } from '../ui';
import { CandidateIntelligenceReport } from '../CandidateIntelligenceReport';
import { ResumeValidationPanel } from './ResumeValidationPanel';
import { IntegritySignalsPanel } from './IntegritySignalsPanel';
import { BehavioralSignalsPanel } from './BehavioralSignalsPanel';
import { ExperienceFitPanel } from './ExperienceFitPanel';
import { VoiceVerificationPanel } from '../VoiceVerificationPanel';
import {
  formatTime,
  formatResponseType,
  isAudioMedia,
  SCHEDULE_STATUS_LABELS,
} from '../../hooks/useCandidateApplication';

export function CandidateSectionContent({ section, candidateId, vm }) {
  const {
    data,
    load,
    note,
    setNote,
    overrideBucket,
    setOverrideBucket,
    overrideNote,
    setOverrideNote,
    rescoring,
    bgLoading,
    interviewLoading,
    meetingUrl,
    setMeetingUrl,
    declineReason,
    setDeclineReason,
    addNote,
    saveOverride,
    rescore,
    sendSchedulingInvite,
    confirmSchedule,
    declineSchedule,
    copyBookingLink,
    runBackgroundCheck,
    app,
    appScore,
    intelligence,
    scoreTone,
    resumeFileName,
    isGreen,
    canSeeIntegrity,
  } = vm;

  const {
    answers = [],
    notes = [],
    integrity,
    backgroundCheck,
    screening,
    scheduling,
    materialsMasked,
    activity,
    resumeValidation,
    integritySignals,
    behavioralSignals,
    experienceFit,
    hiddenGem,
    voiceVerification,
  } = data;

  switch (section) {
    case 'intelligence':
      return (
        <div className={`dashWidget candidateScorecardWidget candidateScorecardWidget--${scoreTone || 'neutral'}`}>
          <div className="widgetHead intelReportHead">
            <h2>Experience Intelligence report</h2>
            {intelligence && (
              <Link to={`/candidates/${candidateId}/scorecard`} target="_blank" rel="noreferrer">
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
      );

    case 'experience-fit':
      return (
        <ExperienceFitPanel
          experienceFit={experienceFit || resumeValidation?.experienceFit || intelligence?.experience_fit}
        />
      );

    case 'resume-validation':
      return <ResumeValidationPanel validation={resumeValidation} />;

    case 'behavioral':
      return <BehavioralSignalsPanel behavioral={behavioralSignals} />;

    case 'integrity-signals':
      return <IntegritySignalsPanel signals={integritySignals} />;

    case 'score-breakdown':
      return (
        <div className="dashWidget candidateAppScoreWidget">
          <div className="widgetHead">
            <h2>Application score breakdown</h2>
          </div>
          <p className="muted scorecardIntro">
            Each screening question is scored internally from 0 to 10, then converted to its share of the 100-point
            total (split evenly across configured questions). Required and optional questions each contribute up to
            their portion of 100. Scores are evaluated against hidden rubric criteria recruiters configure — not shown
            to applicants.
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
                    {appScore.mandatory_points ?? '—'}/{appScore.mandatory_max ?? '—'}
                  </strong>
                </div>
                <div className="dimCard">
                  <span>Optional</span>
                  <strong>
                    {appScore.optional_points ?? '—'}/{appScore.optional_max ?? '—'}
                  </strong>
                </div>
              </div>
              {appScore.per_question?.length > 0 && (
                <>
                  <h3 className="scorecardSubhead">Per-question scores</h3>
                  <ul className="recList scorecardQuestionList">
                    {appScore.per_question.map((q) => {
                      const pts = q.points ?? q.questionScore;
                      const maxPts = q.max ?? q.weight ?? 10;
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
            <RefreshCw size={16} /> {rescoring ? 'Re-scoring…' : 'Re-score experience'}
          </Button>
        </div>
      );

    case 'hidden-gem':
      return hiddenGem?.isHiddenGem ? (
        <div className="dashWidget hiddenGemPanel">
          <div className="widgetHead">
            <h2>Standout candidate — second look recommended</h2>
            <span className="hiddenGemBadge">Advisory only</span>
          </div>
          <p className="hiddenGemExplain">
            This candidate scored well on screening questions with an authentic session, but their resume shows weaker
            keyword overlap with the role. They may be stronger than the resume suggests — worth a manual review
            before dismissing. This does <em>not</em> auto-advance them.
          </p>
          <ul className="recList">
            {hiddenGem.reasons?.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : (
        <Card>
          <p className="muted">This candidate is not flagged as a standout review.</p>
        </Card>
      );

    case 'audit':
      return activity?.length > 0 ? (
        <Card className="fullWidth auditTimelineCard">
          <h2>Audit timeline</h2>
          <p className="muted">Who did what and when — scoring, reviews, overrides, and pipeline changes.</p>
          <ol className="auditTimelineList auditTimelineList--compact">
            {activity.map((ev, i) => (
              <li key={i} className="auditTimelineItem">
                <span className="auditTimelineDot" aria-hidden />
                <div className="auditTimelineBody">
                  <div className="auditTimelineHead">
                    <b>{ev.event_type}</b>
                    <time>{ev.created_at}</time>
                  </div>
                  <p>{ev.description}</p>
                  <small>{ev.actor_name || 'System'}</small>
                </div>
              </li>
            ))}
          </ol>
          <Link to="/audit" className="muted">
            View full compliance audit log →
          </Link>
        </Card>
      ) : (
        <Card>
          <p className="muted">No audit events recorded for this candidate yet.</p>
        </Card>
      );

    case 'scheduling':
      return (
        <section className="candidateSectionStack">
          <Card className={`fullWidth scheduleOverview ${scheduling?.status || ''}`}>
            <h2>
              <Calendar size={18} /> Interview scheduling
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
      );

    case 'resume':
      return (
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
      );

    case 'answers':
      return (
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
                  {!isPlaceholder && a.body?.trim() && <p className="answerTypedBody">{a.body}</p>}
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
      );

    case 'proctoring':
      return canSeeIntegrity ? (
        <Card className="fullWidth">
          <h2>Proctoring &amp; session integrity</h2>
          <p className="muted">
            Recruiter-only — clipboard, focus, fullscreen, and typing signals from the apply session.
          </p>
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
                  <span className="warn">Look-away signals ×{integrity.camera_presence.look_away_samples}</span>
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
      ) : (
        <Card>
          <p className="muted">You do not have permission to view session integrity data.</p>
        </Card>
      );

    case 'notes':
      return (
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
      );

    case 'voice':
      return (
        <Card className="fullWidth">
          <VoiceVerificationPanel
            applicationId={candidateId}
            voiceVerification={voiceVerification}
            onUpdated={load}
          />
        </Card>
      );

    case 'override':
      return (
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
      );

    case 'background':
      return (
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
      );

    default:
      return null;
  }
}
