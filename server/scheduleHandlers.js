import { v4 as uuid } from 'uuid';
import { db } from './db.js';
import { logAudit } from './audit.js';
import { queueEmail } from './email.js';
import { generateDefaultSlots, formatSlotLabel, buildIcsEvent } from './scheduling.js';
import { createNotification, notifyHiringTeam } from './notifications.js';

export function getScheduleInviteForApplication(applicationId) {
  return db
    .prepare(
      `SELECT i.*, u.name as interviewer_name, u.email as interviewer_email
       FROM interview_schedule_invites i
       LEFT JOIN users u ON u.id = i.interviewer_id
       WHERE i.application_id = ? AND i.status != 'cancelled'
       ORDER BY
         CASE i.status
           WHEN 'awaiting_interviewer' THEN 0
           WHEN 'confirmed' THEN 1
           WHEN 'awaiting_candidate' THEN 2
           WHEN 'declined' THEN 3
           ELSE 4
         END,
         datetime(i.updated_at) DESC,
         datetime(i.created_at) DESC
       LIMIT 1`
    )
    .get(applicationId);
}

export function getSlotsForInvite(inviteId) {
  return db
    .prepare(
      `SELECT * FROM interview_availability_slots WHERE invite_id = ? ORDER BY starts_at`
    )
    .all(inviteId);
}

export function formatInvitePayload(invite, baseUrl = 'http://localhost:5173') {
  if (!invite) return null;
  const slots = getSlotsForInvite(invite.id);
  const selected = invite.selected_slot_id
    ? slots.find((s) => s.id === invite.selected_slot_id)
    : null;
  return {
    id: invite.id,
    status: invite.status,
    token: invite.token,
    booking_url: `${baseUrl}/schedule/${invite.token}`,
    duration_minutes: invite.duration_minutes,
    timezone: invite.timezone,
    meeting_url: invite.meeting_url,
    message: invite.message,
    interviewer_name: invite.interviewer_name,
    confirmed_starts_at: invite.confirmed_starts_at,
    confirmed_ends_at: invite.confirmed_ends_at,
    declined_reason: invite.declined_reason,
    selected_slot: selected
      ? { ...selected, label: formatSlotLabel(selected.starts_at, invite.timezone) }
      : null,
    slots: slots.map((s) => ({
      ...s,
      label: formatSlotLabel(s.starts_at, invite.timezone),
      available: !s.booked,
    })),
    created_at: invite.created_at,
  };
}

export function createScheduleInvite({
  applicationId,
  jobId,
  orgId,
  interviewerId,
  interviewerName,
  slots,
  durationMinutes,
  timezone,
  meetingUrl,
  message,
  baseUrl,
}) {
  const existing = db
    .prepare(
      `SELECT id FROM interview_schedule_invites WHERE application_id = ? AND status IN ('awaiting_candidate', 'awaiting_interviewer')`
    )
    .get(applicationId);
  if (existing) {
    db.prepare(`UPDATE interview_schedule_invites SET status='cancelled', updated_at=datetime('now') WHERE id=?`).run(
      existing.id
    );
  }

  const inviteId = uuid();
  const token = uuid().replace(/-/g, '');
  const slotList =
    slots?.length > 0
      ? slots.map((s) => ({
          id: s.id || uuid(),
          starts_at: s.starts_at,
          ends_at: s.ends_at,
        }))
      : generateDefaultSlots({ durationMinutes: durationMinutes || 30, timezone });

  db.prepare(
    `INSERT INTO interview_schedule_invites
     (id, application_id, job_id, interviewer_id, token, status, duration_minutes, timezone, meeting_url, message)
     VALUES (?, ?, ?, ?, ?, 'awaiting_candidate', ?, ?, ?, ?)`
  ).run(
    inviteId,
    applicationId,
    jobId,
    interviewerId,
    token,
    durationMinutes || 30,
    timezone || 'America/New_York',
    meetingUrl || '',
    message || 'Please select a time for your interview.'
  );

  const insertSlot = db.prepare(
    `INSERT INTO interview_availability_slots (id, invite_id, starts_at, ends_at) VALUES (?, ?, ?, ?)`
  );
  for (const s of slotList) {
    insertSlot.run(s.id, inviteId, s.starts_at, s.ends_at);
  }

  db.prepare(
    `UPDATE applications SET pipeline_stage='shortlisted_interview', status='Awaiting interview booking' WHERE id=?`
  ).run(applicationId);

  const invite = getScheduleInviteForApplication(applicationId);
  const payload = formatInvitePayload(invite, baseUrl);

  logAudit({
    orgId,
    jobId,
    applicationId,
    actorId: interviewerId,
    actorName: interviewerName,
    eventType: 'Scheduling invite sent',
    description: `Candidate booking link created, ${payload.slots.length} slots`,
  });

  notifyHiringTeam(orgId, jobId, {
    applicationId,
    type: 'scheduling',
    title: 'Interview invite sent',
    body: `Scheduling link sent for ${applicationId}. Waiting for candidate to pick a time.`,
    link: `/candidates/${applicationId}`,
  }, [interviewerId]);

  const app = db
    .prepare(
      `SELECT a.name, a.email, j.title as job_title
       FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = ?`
    )
    .get(applicationId);

  if (app?.email && payload?.booking_url) {
    const firstName = (app.name || 'there').split(/\s+/)[0];
    queueEmail({
      orgId,
      to: app.email,
      subject: `Schedule your interview for ${app.job_title || 'your application'}`,
      body: [
        `Hi ${firstName},`,
        '',
        'You have been shortlisted for an interview. Please choose a time using the link below:',
        payload.booking_url,
        '',
        message || 'Please select a time for your interview.',
        '',
        'If you have questions, reply to the recruiter who contacted you.',
      ].join('\n'),
      meta: { type: 'scheduling_invite', applicationId, inviteId },
    });
  }

  return payload;
}

export function candidateBookSlot(token, slotId) {
  const invite = db.prepare('SELECT * FROM interview_schedule_invites WHERE token = ?').get(token);
  if (!invite) return { error: 'Invalid or expired scheduling link', status: 404 };
  if (invite.status !== 'awaiting_candidate') {
    return { error: 'This invite is no longer accepting bookings', status: 400 };
  }

  const slot = db
    .prepare('SELECT * FROM interview_availability_slots WHERE id = ? AND invite_id = ?')
    .get(slotId, invite.id);
  if (!slot || slot.booked) return { error: 'This time slot is no longer available', status: 400 };

  db.prepare(
    `UPDATE interview_availability_slots SET booked=1, booked_at=datetime('now') WHERE id=?`
  ).run(slotId);
  db.prepare(
    `UPDATE interview_schedule_invites SET status='awaiting_interviewer', selected_slot_id=?,
     confirmed_starts_at=?, confirmed_ends_at=?, updated_at=datetime('now') WHERE id=?`
  ).run(slotId, slot.starts_at, slot.ends_at, invite.id);

  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(invite.application_id);
  const job = db.prepare('SELECT org_id, title FROM jobs WHERE id = ?').get(invite.job_id);

  db.prepare(`UPDATE applications SET status='Interview slot chosen: pending confirmation' WHERE id=?`).run(
    invite.application_id
  );

  const slotLabel = formatSlotLabel(slot.starts_at, invite.timezone);

  notifyHiringTeam(
    job.org_id,
    invite.job_id,
    {
      applicationId: invite.application_id,
      type: 'scheduling',
      title: 'Interview slot selected by candidate',
      body: `${app.name} chose ${slotLabel}. Action required: confirm or decline on the candidate page.`,
      link: `/candidates/${invite.application_id}`,
    },
    [invite.interviewer_id]
  );

  logAudit({
    orgId: job.org_id,
    jobId: invite.job_id,
    applicationId: invite.application_id,
    actorName: app.name,
    eventType: 'Interview slot selected',
    description: slotLabel,
  });

  return {
    invite: formatInvitePayload(getScheduleInviteForApplication(invite.application_id)),
    status: 200,
    message: `Slot booked: ${slotLabel}. Hiring team notified.`,
  };
}

export function interviewerConfirmSchedule(applicationId, userId, userName, orgId) {
  const invite = getScheduleInviteForApplication(applicationId);
  if (!invite) return { error: 'No scheduling invite found', status: 404 };
  if (invite.status !== 'awaiting_interviewer') {
    return { error: 'Nothing pending confirmation', status: 400 };
  }

  db.prepare(
    `UPDATE interview_schedule_invites SET status='confirmed', updated_at=datetime('now') WHERE id=?`
  ).run(invite.id);

  const sessionId = uuid();
  db.prepare(
    `INSERT INTO interview_sessions (id, application_id, job_id, status, interviewer_id, scheduled_at)
     VALUES (?, ?, ?, 'scheduled', ?, ?)`
  ).run(sessionId, applicationId, invite.job_id, invite.interviewer_id, invite.confirmed_starts_at);

  db.prepare(
    `UPDATE applications SET pipeline_stage='interview_scheduled', status='Interview confirmed',
     identity_revealed=1, identity_revealed_by=?, identity_revealed_at=datetime('now') WHERE id=?`
  ).run(userId, applicationId);

  const app = db.prepare('SELECT name, email FROM applications WHERE id = ?').get(applicationId);
  const job = db.prepare('SELECT title FROM jobs WHERE id = ?').get(invite.job_id);

  const ics = buildIcsEvent({
    title: `Interview, ${job.title}`,
    startsAt: invite.confirmed_starts_at,
    endsAt: invite.confirmed_ends_at,
    description: invite.message,
    location: invite.meeting_url || 'Video call',
  });

  logAudit({
    orgId,
    jobId: invite.job_id,
    applicationId,
    actorId: userId,
    actorName: userName,
    eventType: 'Interview confirmed',
    description: `Confirmed ${formatSlotLabel(invite.confirmed_starts_at, invite.timezone)}`,
  });

  return {
    invite: formatInvitePayload(getScheduleInviteForApplication(applicationId)),
    calendar_ics: ics,
    message: `Interview confirmed with ${app.name}`,
    status: 200,
  };
}

export function interviewerDeclineSchedule(applicationId, userId, userName, orgId, reason) {
  const invite = getScheduleInviteForApplication(applicationId);
  if (!invite) return { error: 'No scheduling invite found', status: 404 };

  db.prepare(
    `UPDATE interview_schedule_invites SET status='declined', declined_reason=?, selected_slot_id=NULL,
     confirmed_starts_at=NULL, confirmed_ends_at=NULL, updated_at=datetime('now') WHERE id=?`
  ).run(reason || 'Declined by interviewer', invite.id);

  db.prepare(`UPDATE interview_availability_slots SET booked=0, booked_at=NULL WHERE invite_id=?`).run(
    invite.id
  );

  db.prepare(`UPDATE applications SET status='Interview time declined: reschedule needed' WHERE id=?`).run(
    applicationId
  );

  logAudit({
    orgId,
    jobId: invite.job_id,
    applicationId,
    actorId: userId,
    actorName: userName,
    eventType: 'Interview slot declined',
    description: reason || 'Declined',
  });

  return {
    invite: formatInvitePayload(getScheduleInviteForApplication(applicationId)),
    message: 'Declined. Send a new invite with updated availability.',
    status: 200,
  };
}
