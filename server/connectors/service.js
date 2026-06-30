import { v4 as uuid } from 'uuid';
import { CONNECTOR_CATALOG, activeConnectorCatalog, connectorById } from './catalog.js';
import { testConnector } from './providers.js';

function parseJson(raw, fallback = {}) {
  if (!raw) return fallback;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return fallback;
  }
}

function getStoredConfig(db, orgId, providerId) {
  const row = db
    .prepare(`SELECT config_json FROM org_connectors WHERE org_id = ? AND provider = ? AND enabled = 1`)
    .get(orgId, providerId);
  return row ? parseJson(row.config_json) : null;
}

function providerOnlyConfig(providerId, merged) {
  const catalog = connectorById(providerId);
  if (!catalog) return merged;
  const out = {};
  for (const field of catalog.fields) {
    if (merged[field.key] !== undefined && merged[field.key] !== '') {
      out[field.key] = merged[field.key];
    }
  }
  return out;
}

export function resolveConnectorConfig(db, orgId, providerId, configOverride = {}) {
  const stored = getStoredConfig(db, orgId, providerId) || {};
  const merged = { ...stored, ...configOverride };

  if (providerId === 'jira' || providerId === 'confluence') {
    const atlassian = getStoredConfig(db, orgId, 'atlassian');
    if (!atlassian?.site_url || !atlassian?.email || !atlassian?.api_token) {
      const err = new Error('Connect your Atlassian account first (site URL, email, and API token).');
      err.status = 400;
      throw err;
    }
    return { ...atlassian, ...merged };
  }
  return merged;
}

function maskConfig(config, catalog) {
  const masked = { ...config };
  for (const field of catalog?.fields || []) {
    if (field.secret && masked[field.key]) {
      masked[field.key] = undefined;
    }
  }
  return masked;
}

function buildCredentialHint(providerId, config, resolved) {
  switch (providerId) {
    case 'atlassian':
      return resolved?.site_url?.replace(/^https?:\/\//, '') || config.email || null;
    case 'jira':
      return config.project_key ? `project ${config.project_key}` : null;
    case 'confluence':
      return config.space_key ? `space ${config.space_key}` : null;
    case 'slack':
      return config.channel_id ? `#${config.channel_id}` : 'bot connected';
    default:
      return null;
  }
}

export function listConnectorCatalog() {
  return { connectors: activeConnectorCatalog() };
}

export function listOrgConnectors(db, orgId) {
  const rows = db
    .prepare(
      `SELECT id, provider, enabled, status, credential_hint, last_tested_at, last_error, test_result_json, created_at, updated_at
       FROM org_connectors WHERE org_id = ? ORDER BY provider ASC`
    )
    .all(orgId);

  const byProvider = Object.fromEntries(rows.map((r) => [r.provider, r]));
  const atlassianConnected = Boolean(byProvider.atlassian?.enabled);

  const connectors = activeConnectorCatalog().map((def) => {
    const row = byProvider[def.id];
    const needsAtlassian = def.requires === 'atlassian';
    return {
      ...def,
      connected: Boolean(row?.enabled),
      connection_id: row?.id || null,
      status: row?.status || 'not_configured',
      credential_hint: row?.credential_hint || null,
      last_tested_at: row?.last_tested_at || null,
      last_error: row?.last_error || null,
      test_summary: row?.test_result_json ? parseJson(row.test_result_json) : null,
      blocked_reason:
        needsAtlassian && !atlassianConnected ? 'Connect Atlassian account first' : null,
    };
  });

  return { connectors, atlassian_connected: atlassianConnected };
}

export function getOrgConnectorConfig(db, orgId, providerId) {
  const row = db
    .prepare(`SELECT * FROM org_connectors WHERE org_id = ? AND provider = ?`)
    .get(orgId, providerId);
  if (!row) return null;
  const catalog = connectorById(providerId);
  return {
    id: row.id,
    provider: row.provider,
    enabled: !!row.enabled,
    status: row.status,
    config: maskConfig(parseJson(row.config_json), catalog),
    credential_hint: row.credential_hint,
    last_tested_at: row.last_tested_at,
    last_error: row.last_error,
  };
}

export async function saveOrgConnector(db, orgId, providerId, config, { actorId, actorName } = {}) {
  const catalog = connectorById(providerId);
  if (!catalog) {
    const err = new Error('Unknown connector');
    err.status = 400;
    throw err;
  }

  const existing = db.prepare(`SELECT * FROM org_connectors WHERE org_id = ? AND provider = ?`).get(orgId, providerId);
  const merged = { ...parseJson(existing?.config_json), ...config };

  for (const field of catalog.fields) {
    if (field.required && !merged[field.key]) {
      const err = new Error(`${field.label} is required`);
      err.status = 400;
      throw err;
    }
  }

  const resolved = resolveConnectorConfig(db, orgId, providerId, merged);
  const testResult = await testConnector(providerId, resolved);
  const toStore = providerOnlyConfig(providerId, merged);
  const now = new Date().toISOString();
  const hint = buildCredentialHint(providerId, toStore, resolved);
  const id = existing?.id || uuid();

  if (existing) {
    db.prepare(
      `UPDATE org_connectors SET config_json = ?, enabled = 1, status = 'connected', credential_hint = ?,
       last_tested_at = ?, last_error = NULL, test_result_json = ?, updated_at = ?
       WHERE id = ?`
    ).run(JSON.stringify(toStore), hint, now, JSON.stringify(testResult), now, id);
  } else {
    db.prepare(
      `INSERT INTO org_connectors (id, org_id, provider, config_json, enabled, status, credential_hint, last_tested_at, test_result_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, 'connected', ?, ?, ?, ?, ?)`
    ).run(id, orgId, providerId, JSON.stringify(toStore), hint, now, JSON.stringify(testResult), now, now);
  }

  db.prepare(
    `INSERT INTO connector_events (id, org_id, provider, event_type, status, detail_json, created_at)
     VALUES (?, ?, ?, 'connected', 'success', ?, ?)`
  ).run(uuid(), orgId, providerId, JSON.stringify({ actorId, actorName, summary: testResult }), now);

  return {
    id,
    provider: providerId,
    enabled: true,
    status: 'connected',
    credential_hint: hint,
    last_tested_at: now,
    test_result: testResult,
  };
}

export async function testOrgConnector(db, orgId, providerId, configOverride = null) {
  const catalog = connectorById(providerId);
  if (!catalog) {
    const err = new Error('Unknown connector');
    err.status = 400;
    throw err;
  }

  const existing = db.prepare(`SELECT * FROM org_connectors WHERE org_id = ? AND provider = ?`).get(orgId, providerId);
  const merged = configOverride
    ? { ...parseJson(existing?.config_json), ...configOverride }
    : parseJson(existing?.config_json);

  if (!Object.keys(merged).length && providerId !== 'atlassian') {
    const err = new Error('Configure credentials before testing');
    err.status = 400;
    throw err;
  }

  const resolved = resolveConnectorConfig(db, orgId, providerId, merged);
  const now = new Date().toISOString();

  try {
    const testResult = await testConnector(providerId, resolved);
    if (existing) {
      db.prepare(
        `UPDATE org_connectors SET last_tested_at = ?, last_error = NULL, test_result_json = ?, status = 'connected', updated_at = ?
         WHERE id = ?`
      ).run(now, JSON.stringify(testResult), now, existing.id);
    }
    db.prepare(
      `INSERT INTO connector_events (id, org_id, provider, event_type, status, detail_json, created_at)
       VALUES (?, ?, ?, 'test', 'success', ?, ?)`
    ).run(uuid(), orgId, providerId, JSON.stringify(testResult), now);
    return { ok: true, tested_at: now, result: testResult };
  } catch (err) {
    if (existing) {
      db.prepare(
        `UPDATE org_connectors SET last_tested_at = ?, last_error = ?, status = 'error', updated_at = ? WHERE id = ?`
      ).run(now, err.message, now, existing.id);
    }
    db.prepare(
      `INSERT INTO connector_events (id, org_id, provider, event_type, status, detail_json, created_at)
       VALUES (?, ?, ?, 'test', 'failed', ?, ?)`
    ).run(uuid(), orgId, providerId, JSON.stringify({ error: err.message, detail: err.detail }), now);
    throw err;
  }
}

export function disconnectOrgConnector(db, orgId, providerId, { actorId, actorName } = {}) {
  const row = db.prepare(`SELECT * FROM org_connectors WHERE org_id = ? AND provider = ?`).get(orgId, providerId);
  if (!row) return { ok: true, removed: false };

  db.prepare(`DELETE FROM org_connectors WHERE id = ?`).run(row.id);
  db.prepare(
    `INSERT INTO connector_events (id, org_id, provider, event_type, status, detail_json, created_at)
     VALUES (?, ?, ?, 'disconnected', 'success', ?, datetime('now'))`
  ).run(uuid(), orgId, providerId, JSON.stringify({ actorId, actorName }));

  return { ok: true, removed: true };
}

export function listConnectorEvents(db, orgId, limit = 20) {
  return db
    .prepare(
      `SELECT id, provider, event_type, status, detail_json, created_at
       FROM connector_events WHERE org_id = ? ORDER BY datetime(created_at) DESC LIMIT ?`
    )
    .all(orgId, limit)
    .map((row) => ({
      ...row,
      detail: parseJson(row.detail_json),
    }));
}

export function getOrgConnectorSecrets(db, orgId, providerId) {
  const row = db
    .prepare(`SELECT config_json FROM org_connectors WHERE org_id = ? AND provider = ? AND enabled = 1`)
    .get(orgId, providerId);
  if (!row) return null;
  try {
    return resolveConnectorConfig(db, orgId, providerId, parseJson(row.config_json));
  } catch {
    return null;
  }
}
