/**
 * Ingest ATS webhook payloads into Xperieval (Intelligence plugin mode).
 */

import { v4 as uuid } from 'uuid';
import { resolveApplicationSource } from './applicationSource.js';

function slugify(title) {
  return (title || 'role')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

/** Find job by external requisition id or create a linked stub job. */
export function resolveJobForAts(db, orgId, { job_external_id, job_title, provider }) {
  if (job_external_id) {
    const existing = db
      .prepare(
        `SELECT * FROM jobs WHERE org_id = ? AND external_id = ? AND deleted_at IS NULL LIMIT 1`
      )
      .get(orgId, String(job_external_id));
    if (existing) return existing;
  }

  const title = job_title || `ATS Role ${job_external_id || 'import'}`;
  const id = `JOB-ATS-${String(job_external_id || uuid()).slice(0, 24)}`;
  let slug = slugify(title);
  const clash = db.prepare('SELECT id FROM jobs WHERE slug = ?').get(slug);
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  db.prepare(
    `INSERT INTO jobs (id, org_id, title, team, location, stage, slug, description, external_id, external_provider)
     VALUES (?, ?, ?, 'ATS Import', 'Remote', 'Open', ?, ?, ?, ?)`
  ).run(
    id,
    orgId,
    title,
    slug,
    `Imported from ${provider || 'ATS'}. Complete screening rubric in Xperieval Hiring or evaluate via Intelligence API.`,
    job_external_id ? String(job_external_id) : null,
    provider || 'ats'
  );

  return db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
}

/** Upsert application from normalized ATS payload; returns { application, created, screening_url }. */
export function upsertApplicationFromAts(db, orgId, job, normalized, baseUrl) {
  const externalId = String(normalized.external_id);
  let app = db
    .prepare(
      `SELECT a.* FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE j.org_id = ? AND a.external_id = ? AND a.deleted_at IS NULL LIMIT 1`
    )
    .get(orgId, externalId);

  let created = false;
  if (!app) {
    const appId = `APP-ATS-${externalId.slice(0, 20)}`;
    const source = resolveApplicationSource({
      explicit: normalized.source,
      channel: 'ats',
      provider: normalized.provider,
    });
    db.prepare(
      `INSERT INTO applications (id, job_id, name, email, phone, source, resume_text, external_id, external_provider, pipeline_stage)
       VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, 'application_review')`
    ).run(
      appId,
      job.id,
      normalized.name || 'ATS Candidate',
      normalized.email || `${externalId}@ats-import.local`,
      source,
      normalized.raw?.resume_text || normalized.raw?.resume || '',
      externalId,
      normalized.provider || 'ats'
    );
    app = db.prepare('SELECT * FROM applications WHERE id = ?').get(appId);
    created = true;
  } else if (normalized.email && !app.email) {
    db.prepare(`UPDATE applications SET email = ? WHERE id = ?`).run(normalized.email, app.id);
    app = db.prepare('SELECT * FROM applications WHERE id = ?').get(app.id);
  }

  const screeningUrl = `${baseUrl}/apply/${job.slug}?external_id=${encodeURIComponent(externalId)}`;
  return { application: app, created, screening_url: screeningUrl, job };
}
