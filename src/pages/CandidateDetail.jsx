import React, { useEffect } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Calendar,
  Printer,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Button, BucketBadge } from '../components/ui';
import { PageBack } from '../components/PageBack';
import { CandidateSectionHub } from '../components/candidate/CandidateSectionHub';
import { CandidateSectionContent } from '../components/candidate/CandidateSectionContent';
import { useAuth } from '../context/AuthContext';
import { normalizeProductMode } from '../lib/productMode';
import {
  getCandidateSection,
  getVisibleCandidateSections,
  candidateSectionLabel,
} from '../lib/candidateSections';
import { formatApplicationSource } from '../lib/applicationSource';
import { sanitizeProductCopy } from '../lib/copy';
import { PIPELINE_LABELS } from '../lib/candidateFilters';
import { useCandidateApplication, SCHEDULE_STATUS_LABELS } from '../hooks/useCandidateApplication';
import { CandidateWorkflowActions } from '../components/integrations/CandidateWorkflowActions';

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast ${type}`}>{msg}</div>;
}

export function CandidateDetail() {
  const { id, section } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state;
  const { user } = useAuth();
  const isIntelOnly = normalizeProductMode(user?.productMode) === 'intelligence';
  const canSeeIntegrity = ['Admin', 'Recruiter', 'Hiring Manager'].includes(user?.role || '');
  const canManageIntegrations = ['Admin', 'Recruiter'].includes(user?.role || '');

  const vm = useCandidateApplication(id, navState);
  const {
    data,
    load,
    toast,
    setPipeline,
    sendSchedulingInvite,
    deleteCandidate,
    revealIdentity,
    app,
    appScore,
    intelligence,
    scoreTone,
    pipeline,
    canInterview,
    isGreen,
  } = vm;

  const sectionMeta = section ? getCandidateSection(section) : null;
  const hubCtx = {
    isIntelOnly,
    canSeeIntegrity,
    isGreen,
    hiddenGem: data?.hiddenGem,
    activity: data?.activity,
  };
  const visibleSections = getVisibleCandidateSections(hubCtx);
  const sectionAllowed = !section || visibleSections.some((s) => s.id === section);

  useEffect(() => {
    if (section && !sectionAllowed && data) {
      navigate(`/candidates/${id}`, { replace: true, state: navState });
    }
  }, [section, sectionAllowed, data, id, navigate, navState]);

  if (!data) {
    return (
      <div className="loadingPage">
        <div className="spinner" />
        <p>Loading candidate…</p>
      </div>
    );
  }

  if (section && !sectionMeta) {
    return <Navigate to={`/candidates/${id}`} replace state={navState} />;
  }

  const {
    identityPolicy,
    screening,
    scheduling,
    hiddenGem,
    pendingScheduleAction,
    integrity,
  } = data;

  return (
    <div className="candidatePage">
      <Toast msg={toast.msg} type={toast.type} />

      {pendingScheduleAction && scheduling?.selected_slot && !section && (
        <div className="actionBanner">
          <div>
            <strong>Action required: candidate selected interview time</strong>
            <p>
              {scheduling.selected_slot.label} · Review scheduling to confirm or decline.
            </p>
          </div>
          <Button onClick={() => navigate(`/candidates/${id}/scheduling`, { state: navState })}>
            Review scheduling
          </Button>
        </div>
      )}

      <div className={`candidateHero${section ? ' candidateHero--compact' : ''}`}>
        <div className="candidateHeroMain">
          <div className="candidateHeroIdentity">
            <PageBack className="candidateHeroBack" />
            <div className="candidateHeroInfo">
              <h1>{app.display_name || app.name}</h1>
              {app.anonymized && identityPolicy && <p className="anonBadge">{identityPolicy.reason}</p>}
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
              <p className="muted">
                Applied {app.created_at} · Source: {formatApplicationSource(app.source)}
              </p>
              {screening && !section && (
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
                    title="Strong screening + authentic session, but resume keywords understate fit: manual second look recommended."
                  >
                    Standout candidate
                  </span>
                )}
                {scheduling?.status && (
                  <span className={`scheduleBadge ${scheduling.status}`}>
                    {SCHEDULE_STATUS_LABELS[scheduling.status] || scheduling.status}
                  </span>
                )}
                {identityPolicy?.autoRevealed && (
                  <span className="pipelineStage">Identity visible: final hiring stage</span>
                )}
                {identityPolicy?.canReveal && (
                  <Button className="small" onClick={revealIdentity}>
                    Reveal identity (Hiring Manager)
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="heroScoreCluster">
            <div className={`heroMetric heroMetric--primary heroMetric--${scoreTone || 'neutral'}`}>
              <span className="heroMetricLabel">Experience score</span>
              <div className="heroMetricValueRow">
                <strong className="heroMetricValue">{appScore?.overall ?? 'N/A'}</strong>
                {appScore?.bucket && <BucketBadge bucket={appScore.bucket} />}
              </div>
              {appScore?.tier && <span className="heroMetricMeta">{appScore.tier}</span>}
            </div>
            {(integrity?.authenticity_score != null || (appScore?.recommendation && !section)) && (
              <div className="heroScoreExtras">
                {integrity?.authenticity_score != null && (
                  <div className="heroScoreExtra heroScoreExtra--auth">
                    <span>Authenticity</span>
                    <strong>{integrity.authenticity_score}</strong>
                  </div>
                )}
                {appScore?.recommendation && !section && (
                  <div className="heroScoreExtra heroScoreExtra--rec">
                    <span>Recommendation</span>
                    <p>{sanitizeProductCopy(appScore.recommendation)}</p>
                    {integrity?.authenticity_verdict && (
                      <p className="heroScoreExtraFoot">{sanitizeProductCopy(integrity.authenticity_verdict)}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {!section && (
          <>
            {!isIntelOnly && (
              <div className="pipelineBar">
                <Button className="small" onClick={() => setPipeline('shortlisted_interview')} disabled={!canInterview}>
                  <UserCheck size={14} /> Shortlist for interview
                </Button>
                <Button className="small outline" onClick={sendSchedulingInvite}>
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
            )}
            {(canManageIntegrations || data.connectorLinks?.jira) && (
              <CandidateWorkflowActions
                applicationId={id}
                connectorLinks={data.connectorLinks}
                canManage={canManageIntegrations}
                onUpdated={load}
              />
            )}
            {isIntelOnly && intelligence && (
              <div className="pipelineBar">
                <Link to={`/candidates/${id}/scorecard`} target="_blank" rel="noreferrer">
                  <Button className="small outline">
                    <Printer size={14} /> Export scorecard PDF
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      {section ? (
        <div className="candidateSectionPage">
          <div className="candidateSectionPageHead">
            <h2>{candidateSectionLabel(section)}</h2>
            <p className="muted">{sectionMeta?.description}</p>
          </div>
          <CandidateSectionContent
            section={section}
            candidateId={id}
            vm={{ ...vm, data, canSeeIntegrity, user }}
          />
        </div>
      ) : (
        <CandidateSectionHub candidateId={id} ctx={hubCtx} navState={navState} />
      )}
    </div>
  );
}
