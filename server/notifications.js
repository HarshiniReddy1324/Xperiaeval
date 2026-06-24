import { v4 as uuid } from 'uuid';
import { db } from './db.js';
import { notifyByEmail } from './email.js';

export function createNotification({ orgId, userId, applicationId, type, title, body, link }) {
  const id = uuid();
  db.prepare(
    `INSERT INTO notifications (id, org_id, user_id, application_id, type, title, body, link)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, orgId, userId, applicationId || null, type, title, body, link || null);
  return id;
}

/** Notify every Admin, Recruiter, and Hiring Manager in the org (deduped). */
export function notifyHiringTeam(orgId, jobId, payload, extraUserIds = []) {
  const team = db
    .prepare(
      `SELECT DISTINCT u.id FROM users u
       WHERE u.org_id = ? AND u.role IN ('Hiring Manager', 'Recruiter', 'Admin')`
    )
    .all(orgId);

  const ids = new Set([...team.map((u) => u.id), ...extraUserIds.filter(Boolean)]);
  for (const userId of ids) {
    createNotification({ orgId, userId, ...payload });
  }
  if (payload.title && payload.body) {
    notifyByEmail(orgId, [...ids], payload.title, payload.body, {
      type: payload.type,
      applicationId: payload.applicationId,
      link: payload.link,
    });
  }
}

export function notifyInterviewersForJob(jobId, orgId, payload) {
  notifyHiringTeam(orgId, jobId, payload);
}

export function getUnreadCount(userId, orgId) {
  return db
    .prepare(`SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND org_id = ? AND read = 0`)
    .get(userId, orgId).c;
}

export function listNotifications(userId, orgId, limit = 50) {
  return db
    .prepare(
      `SELECT * FROM notifications WHERE user_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(userId, orgId, limit)
    .map((n) => ({ ...n, read: !!n.read }));
}
