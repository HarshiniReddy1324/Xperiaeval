import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import { Button, Card } from '../components/ui';
import { apiUrl } from '../api/base.js';

export function CandidateSchedule() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  const [booked, setBooked] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(apiUrl(`/api/public/schedule/${token}`))
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
        if (d.invite?.status === 'awaiting_interviewer' || d.invite?.status === 'confirmed') {
          setBooked(d.invite);
        }
      })
      .catch((e) => setError(e.message));
  }, [token]);

  const book = async () => {
    if (!selected) {
      setError('Please select a time slot');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl(`/api/public/schedule/${token}/book`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_id: selected }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Booking failed');
      setBooked(d.invite);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (error && !data) {
    return (
      <div className="authPage">
        <Card className="authCard">{error}</Card>
      </div>
    );
  }

  if (!data) return <div className="authPage">Loading availability…</div>;

  const { invite, job, candidate_name } = data;
  const availableSlots = invite?.slots?.filter((s) => s.available) || [];

  if (booked?.status === 'confirmed') {
    return (
      <div className="authPage">
        <Card className="authCard wide schedulePage">
          <CheckCircle2 size={48} className="successIcon" />
          <h1>Interview confirmed</h1>
          <p>
            Your interview for <strong>{job?.title}</strong> is confirmed.
          </p>
          <p className="scheduleTime">
            <Clock size={18} /> {booked.selected_slot?.label || booked.confirmed_starts_at}
          </p>
          {invite.meeting_url && (
            <p>
              <a href={invite.meeting_url} target="_blank" rel="noreferrer">
                Join meeting
              </a>
            </p>
          )}
        </Card>
      </div>
    );
  }

  if (booked?.status === 'awaiting_interviewer') {
    return (
      <div className="authPage">
        <Card className="authCard wide schedulePage">
          <CheckCircle2 size={48} className="successIcon" />
          <h1>Time selected: pending confirmation</h1>
          <p>Hi {candidate_name}, your preferred time was submitted:</p>
          <p className="scheduleTime">
            <Calendar size={18} /> {booked.selected_slot?.label}
          </p>
          <p className="muted">
            The interviewer will accept or propose another time. You will be notified when confirmed.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="authPage applyPage">
      <Card className="authCard wide schedulePage">
        <h1>Choose your interview time</h1>
        <p>
          <strong>{job?.title}</strong>
          {job?.team && ` · ${job.team}`}
        </p>
        <p className="muted">{invite?.message}</p>
        <p className="muted">
          Duration: {invite?.duration_minutes} minutes · Interviewer: {invite?.interviewer_name || 'Hiring team'}
        </p>

        <div className="slotGrid">
          {availableSlots.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`slotBtn ${selected === s.id ? 'selected' : ''}`}
              onClick={() => setSelected(s.id)}
            >
              {s.label}
            </button>
          ))}
          {!availableSlots.length && (
            <p className="empty">No slots available. Contact the recruiter for a new link.</p>
          )}
        </div>

        {error && <p className="error">{error}</p>}
        <Button onClick={book} disabled={loading || !availableSlots.length}>
          {loading ? 'Booking…' : 'Confirm this time'}
        </Button>
      </Card>
    </div>
  );
}
