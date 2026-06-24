import { db } from './db.js';
import { v4 as uuid } from 'uuid';

/** Demo email channel — logs + stores outbox rows. Wire SendGrid/Resend via EMAIL_API_KEY in production. */
export function queueEmail({ orgId, to, subject, body, meta = {} }) {
  const id = uuid();
  db.prepare(
    `INSERT INTO email_outbox (id, org_id, recipient, subject, body, meta_json, status)
     VALUES (?, ?, ?, ?, ?, ?, 'queued')`
  ).run(id, orgId, to, subject, body, JSON.stringify(meta));

  if (process.env.EMAIL_API_KEY) {
    // Production: call provider here
    console.log(`[email] would send to ${to}: ${subject}`);
  } else {
    console.log(`[email demo] → ${to}: ${subject}`);
  }
  return id;
}

export function notifyByEmail(orgId, userIds, subject, body, meta) {
  const users = db
    .prepare(`SELECT id, email, name FROM users WHERE id IN (${userIds.map(() => '?').join(',') || "''"})`)
    .all(...userIds);
  for (const u of users) {
    queueEmail({
      orgId,
      to: u.email,
      subject,
      body: body.replace(/\{name\}/g, u.name),
      meta: { ...meta, userId: u.id },
    });
  }
}
