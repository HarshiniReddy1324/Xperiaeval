import { createHash, randomBytes } from 'crypto';
import { v4 as uuid } from 'uuid';

export function ensureApiKeysTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id),
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      key_prefix TEXT NOT NULL,
      scopes TEXT DEFAULT 'evaluate,read',
      created_at TEXT DEFAULT (datetime('now')),
      last_used_at TEXT,
      revoked_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(org_id);
  `);
}

function hashKey(raw) {
  return createHash('sha256').update(raw).digest('hex');
}

export function createApiKey(db, orgId, { name = 'Default', scopes = 'evaluate,read' } = {}) {
  const raw = `xpi_${randomBytes(24).toString('hex')}`;
  const id = uuid();
  const prefix = raw.slice(0, 12);
  db.prepare(
    `INSERT INTO api_keys (id, org_id, name, key_hash, key_prefix, scopes) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, orgId, name, hashKey(raw), prefix, scopes);
  return { id, name, key_prefix: prefix, api_key: raw, scopes, created_at: new Date().toISOString() };
}

export function listApiKeys(db, orgId) {
  return db
    .prepare(
      `SELECT id, name, key_prefix, scopes, created_at, last_used_at, revoked_at
       FROM api_keys WHERE org_id = ? ORDER BY datetime(created_at) DESC`
    )
    .all(orgId)
    .map((k) => ({ ...k, active: !k.revoked_at }));
}

export function revokeApiKey(db, orgId, keyId) {
  const row = db.prepare(`SELECT id FROM api_keys WHERE id = ? AND org_id = ?`).get(keyId, orgId);
  if (!row) return false;
  db.prepare(`UPDATE api_keys SET revoked_at = datetime('now') WHERE id = ?`).run(keyId);
  return true;
}

export function resolveApiKey(db, rawKey) {
  if (!rawKey || !rawKey.startsWith('xpi_')) return null;
  const row = db
    .prepare(`SELECT * FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL`)
    .get(hashKey(rawKey));
  if (!row) return null;
  db.prepare(`UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?`).run(row.id);
  return row;
}
