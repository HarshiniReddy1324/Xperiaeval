import { v4 as uuid } from 'uuid';
import { db } from './db.js';

export function logAudit({ orgId, jobId, applicationId, actorId, actorName, eventType, description }) {
  db.prepare(
    `INSERT INTO audit_events (id, org_id, job_id, application_id, actor_id, actor_name, event_type, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(uuid(), orgId, jobId || null, applicationId || null, actorId || null, actorName || 'System', eventType, description);
}
