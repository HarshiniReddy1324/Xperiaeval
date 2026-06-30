import { v4 as uuid } from 'uuid';
import { getOrgConnectorSecrets } from './service.js';
import {
  buildCandidateSyncContext,
  createJiraIssue,
  mergeIntegrationsJson,
  parseIntegrationsJson,
  publishConfluenceScorecard,
  shouldAutoSync,
} from './atlassian.js';
import { postSlackShortlist } from './slack.js';
import { parseIntelligenceReport } from '../candidateIntelligence.js';

function loadCandidateBundle(db, applicationId, orgId) {
  const row = db
    .prepare(
      `SELECT a.*, j.title as job_title, j.team, j.org_id
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = ? AND j.org_id = ? AND a.deleted_at IS NULL`
    )
    .get(applicationId, orgId);
  if (!row) {
    const err = new Error('Candidate not found');
    err.status = 404;
    throw err;
  }
  const scoreRow = db.prepare('SELECT * FROM scores WHERE application_id = ?').get(applicationId);
  const intelligence = parseIntelligenceReport(scoreRow);
  return {
    application: row,
    job: { title: row.job_title, team: row.team, org_id: row.org_id },
    score: scoreRow,
    intelligence,
    integrations: parseIntegrationsJson(row.integrations_json),
  };
}

function saveIntegrations(db, applicationId, integrations) {
  db.prepare(`UPDATE applications SET integrations_json = ? WHERE id = ?`).run(
    JSON.stringify(integrations),
    applicationId
  );
}

function logConnectorEvent(db, orgId, provider, eventType, status, detail) {
  db.prepare(
    `INSERT INTO connector_events (id, org_id, provider, event_type, status, detail_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(uuid(), orgId, provider, eventType, status, JSON.stringify(detail || {}));
}

function portalBaseUrl() {
  return process.env.PUBLIC_APP_URL || process.env.VITE_APP_URL || '';
}

export async function syncJiraForCandidate(db, orgId, applicationId, { force = false } = {}) {
  const bundle = loadCandidateBundle(db, applicationId, orgId);
  if (bundle.integrations?.jira?.issue_key && !force) {
    return { skipped: true, reason: 'already_linked', ...bundle.integrations.jira };
  }

  const config = getOrgConnectorSecrets(db, orgId, 'jira');
  if (!config) {
    const err = new Error('Jira is not connected. Configure project key in Integrations.');
    err.status = 400;
    throw err;
  }

  const context = buildCandidateSyncContext({
    application: bundle.application,
    job: bundle.job,
    intelligence: bundle.intelligence,
    score: bundle.score,
    portalBaseUrl: portalBaseUrl(),
  });

  const result = await createJiraIssue(config, {
    summary: context.summary,
    descriptionLines: context.descriptionLines,
  });

  const integrations = mergeIntegrationsJson(bundle.application.integrations_json, {
    jira: { ...result, created_at: new Date().toISOString() },
  });
  saveIntegrations(db, applicationId, integrations);
  logConnectorEvent(db, orgId, 'jira', 'issue_created', 'success', { applicationId, ...result });

  return { created: true, ...result };
}

export async function syncConfluenceForCandidate(db, orgId, applicationId, { force = false } = {}) {
  const bundle = loadCandidateBundle(db, applicationId, orgId);
  if (bundle.integrations?.confluence?.page_id && !force) {
    return { skipped: true, reason: 'already_linked', ...bundle.integrations.confluence };
  }

  const config = getOrgConnectorSecrets(db, orgId, 'confluence');
  if (!config) {
    const err = new Error('Confluence is not connected. Configure space key in Integrations.');
    err.status = 400;
    throw err;
  }

  const context = buildCandidateSyncContext({
    application: bundle.application,
    job: bundle.job,
    intelligence: bundle.intelligence,
    score: bundle.score,
    portalBaseUrl: portalBaseUrl(),
  });

  const result = await publishConfluenceScorecard(config, context);
  const integrations = mergeIntegrationsJson(bundle.application.integrations_json, {
    confluence: { ...result, created_at: new Date().toISOString() },
  });
  saveIntegrations(db, applicationId, integrations);
  logConnectorEvent(db, orgId, 'confluence', 'page_published', 'success', { applicationId, ...result });

  return { created: true, ...result };
}

export async function syncSlackForCandidate(db, orgId, applicationId, { force = false } = {}) {
  const bundle = loadCandidateBundle(db, applicationId, orgId);
  if (bundle.integrations?.slack?.message_ts && !force) {
    return { skipped: true, reason: 'already_notified', ...bundle.integrations.slack };
  }

  const config = getOrgConnectorSecrets(db, orgId, 'slack');
  if (!config) {
    const err = new Error('Slack is not connected. Configure bot token and channel in Integrations.');
    err.status = 400;
    throw err;
  }

  const context = buildCandidateSyncContext({
    application: bundle.application,
    job: bundle.job,
    intelligence: bundle.intelligence,
    score: bundle.score,
    portalBaseUrl: portalBaseUrl(),
  });

  const result = await postSlackShortlist(config, context);
  const integrations = mergeIntegrationsJson(bundle.application.integrations_json, {
    slack: { ...result, notified_at: new Date().toISOString() },
  });
  saveIntegrations(db, applicationId, integrations);
  logConnectorEvent(db, orgId, 'slack', 'shortlist_notified', 'success', { applicationId, ...result });

  return { created: true, ...result };
}

export async function autoSyncWorkflowOnShortlist(db, orgId, applicationId) {
  const results = { jira: null };
  const jiraConfig = getOrgConnectorSecrets(db, orgId, 'jira');

  if (jiraConfig && shouldAutoSync(jiraConfig)) {
    try {
      results.jira = await syncJiraForCandidate(db, orgId, applicationId);
    } catch (err) {
      results.jira = { error: err.message };
      logConnectorEvent(db, orgId, 'jira', 'issue_created', 'failed', { applicationId, error: err.message });
    }
  }

  return results;
}

/** @deprecated use autoSyncWorkflowOnShortlist */
export const autoSyncAtlassianOnShortlist = autoSyncWorkflowOnShortlist;

export function getCandidateIntegrations(applicationRow) {
  return parseIntegrationsJson(applicationRow?.integrations_json);
}
