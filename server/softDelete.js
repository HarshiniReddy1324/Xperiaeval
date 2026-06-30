/** Soft-delete helpers, delete moves to trash; restore brings data back. */

export const SQL_JOB_ACTIVE = 'deleted_at IS NULL';
export const SQL_JOB_ACTIVE_J = 'j.deleted_at IS NULL';
export const SQL_APP_ACTIVE = 'deleted_at IS NULL';
export const SQL_APP_ACTIVE_A = 'a.deleted_at IS NULL';

export function nowIso() {
  return new Date().toISOString();
}

export function softDeleteJob(db, jobId) {
  const ts = nowIso();
  db.prepare(`UPDATE applications SET deleted_at = ? WHERE job_id = ? AND ${SQL_APP_ACTIVE}`).run(ts, jobId);
  db.prepare(`UPDATE jobs SET deleted_at = ? WHERE id = ? AND ${SQL_JOB_ACTIVE}`).run(ts, jobId);
  return ts;
}

export function softDeleteApplication(db, applicationId) {
  const ts = nowIso();
  db.prepare(`UPDATE applications SET deleted_at = ? WHERE id = ? AND ${SQL_APP_ACTIVE}`).run(ts, applicationId);
  return ts;
}

export function restoreJob(db, jobId) {
  db.prepare('UPDATE jobs SET deleted_at = NULL WHERE id = ?').run(jobId);
  db.prepare('UPDATE applications SET deleted_at = NULL WHERE job_id = ?').run(jobId);
}

export function restoreApplication(db, applicationId) {
  db.prepare('UPDATE applications SET deleted_at = NULL WHERE id = ?').run(applicationId);
}

export function permanentDeleteJob(db, jobId) {
  db.prepare('DELETE FROM answers WHERE application_id IN (SELECT id FROM applications WHERE job_id = ?)').run(jobId);
  db.prepare('DELETE FROM scores WHERE application_id IN (SELECT id FROM applications WHERE job_id = ?)').run(jobId);
  db.prepare('DELETE FROM reviewer_notes WHERE application_id IN (SELECT id FROM applications WHERE job_id = ?)').run(jobId);
  db.prepare('DELETE FROM applications WHERE job_id = ?').run(jobId);
  db.prepare('DELETE FROM rubric_categories WHERE rubric_version_id IN (SELECT id FROM rubric_versions WHERE job_id = ?)').run(jobId);
  db.prepare('DELETE FROM rubric_versions WHERE job_id = ?').run(jobId);
  db.prepare('DELETE FROM jobs WHERE id = ?').run(jobId);
}

export function permanentDeleteApplication(db, applicationId) {
  db.prepare('DELETE FROM answers WHERE application_id = ?').run(applicationId);
  db.prepare('DELETE FROM scores WHERE application_id = ?').run(applicationId);
  db.prepare('DELETE FROM reviewer_notes WHERE application_id = ?').run(applicationId);
  db.prepare('DELETE FROM applications WHERE id = ?').run(applicationId);
}

export function listTrash(db, orgId) {
  const jobs = db
    .prepare(
      `SELECT j.id, j.title, j.team, j.location, j.slug, j.deleted_at,
        (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.deleted_at IS NOT NULL) as applications_in_trash
       FROM jobs j
       WHERE j.org_id = ? AND j.deleted_at IS NOT NULL
       ORDER BY j.deleted_at DESC`
    )
    .all(orgId);

  const applications = db
    .prepare(
      `SELECT a.id, a.name, a.email, a.anonymized_code, a.deleted_at, j.title as job_title, j.id as job_id,
        s.overall as score, s.bucket
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       LEFT JOIN scores s ON s.application_id = a.id
       WHERE j.org_id = ? AND j.deleted_at IS NULL AND a.deleted_at IS NOT NULL
       ORDER BY a.deleted_at DESC`
    )
    .all(orgId);

  return { jobs, applications };
}

export function trashCount(db, orgId) {
  const jobs = db.prepare(`SELECT COUNT(*) as c FROM jobs WHERE org_id = ? AND deleted_at IS NOT NULL`).get(orgId).c;
  const apps = db
    .prepare(
      `SELECT COUNT(*) as c FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE j.org_id = ? AND j.deleted_at IS NULL AND a.deleted_at IS NOT NULL`
    )
    .get(orgId).c;
  return jobs + apps;
}
