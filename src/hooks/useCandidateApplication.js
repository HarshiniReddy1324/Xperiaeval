import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { bucketClass } from '../components/ui';

export function formatTime(sec) {
  if (!sec && sec !== 0) return 'N/A';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function formatResponseType(type) {
  if (type === 'text+audio') return 'Typed + audio';
  if (type === 'audio') return 'Audio recording';
  if (type === 'video') return 'Video';
  return 'Typed';
}

export function isAudioMedia(mediaPath, responseType) {
  if (responseType === 'audio' || responseType === 'text+audio') return true;
  return /\.(webm|mp3|wav|m4a|ogg)(\?|$)/i.test(mediaPath || '');
}

export const PIPELINE_LABELS = {
  application_review: 'Application review',
  shortlisted_interview: 'Shortlisted for interview',
  interview_scheduled: 'Interview scheduled',
  interview_completed: 'Interview completed',
  rejected: 'Not advancing',
  final_review: 'Final review',
};

export const SCHEDULE_STATUS_LABELS = {
  awaiting_candidate: 'Waiting for candidate to pick time',
  awaiting_interviewer: 'Candidate picked time: confirm required',
  confirmed: 'Interview confirmed',
  declined: 'Time declined: resend invite',
  cancelled: 'Invite cancelled',
};

export function useCandidateApplication(id, navState) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
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
    const timer = setInterval(load, 12000);
    return () => clearInterval(timer);
  }, [id, data?.scheduling?.status, data?.pendingScheduleAction]);

  const setPipeline = async (pipeline_stage) => {
    try {
      const res = await api(`/applications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ pipeline_stage }),
      });
      applyPayload(res);
      showToast(
        res.connectorLinks?.jira?.issue_key
          ? `${res.message || 'Shortlisted'} · Jira issue created`
          : res.message || `Pipeline: ${PIPELINE_LABELS[pipeline_stage] || pipeline_stage}`
      );
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
      const emailed = res.email_sent && res.candidate_email;
      if (emailed) {
        showToast(`Scheduling invite emailed to ${res.candidate_email}`);
      } else if (url && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        showToast('Invite created: no applicant email on file; link copied to clipboard');
      } else {
        showToast(res.message || (url ? 'Invite created: copy the booking link below' : 'Scheduling invite sent'));
      }
      navigate(`/candidates/${id}/scheduling`, { state: navState });
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
      showToast(res.message || 'Declined: send a new invite');
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
      showToast('Moved to trash: recover from Trash if needed');
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
      navigate(`/candidates/${id}`, { state: navState });
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
      showToast(`Re-scored: ${score?.overall ?? 'N/A'}/100 (${score?.bucket ?? 'N/A'})`);
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
      navigate(`/candidates/${id}/background`, { state: navState });
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBgLoading(false);
    }
  };

  const app = data?.application;
  const appScore = data?.applicationScore || data?.score;
  const intelligenceRaw = data?.intelligenceReport || data?.candidateIntelligence;
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

  return {
    data,
    load,
    toast,
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
    showToast,
    setPipeline,
    sendSchedulingInvite,
    confirmSchedule,
    declineSchedule,
    copyBookingLink,
    deleteCandidate,
    addNote,
    saveOverride,
    rescore,
    revealIdentity,
    runBackgroundCheck,
    app,
    appScore,
    intelligence,
    scoreTone: bucketClass(appScore?.bucket),
    resumeFileName: app?.resume_path?.split('/').pop(),
    isGreen: appScore?.bucket === 'Green',
    pipeline: app?.pipeline_stage || 'application_review',
    canInterview: appScore && ['Green', 'Amber'].includes(appScore.bucket),
  };
}
