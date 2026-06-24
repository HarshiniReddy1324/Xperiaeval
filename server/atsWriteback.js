/**
 * ATS egress writeback — real HTTP delivery to configured webhook (Greenhouse-compatible).
 */

import { v4 as uuid } from 'uuid';
import { buildGreenhouseWritebackBody } from './atsAdapter.js';

const DEFAULT_TIMEOUT_MS = 12000;

/**
 * Process pending writeback queue rows for an org or globally.
 */
export async function processWritebackQueue(db, { orgId = null, limit = 15 } = {}) {
  let sql = `
    SELECT w.*, i.provider, i.writeback_url, i.writeback_api_key, i.webhook_secret
    FROM ats_writeback_queue w
    JOIN ats_integrations i ON i.org_id = w.org_id AND i.enabled = 1
    WHERE w.status IN ('pending', 'failed') AND (w.attempts IS NULL OR w.attempts < 5)
  `;
  const params = [];
  if (orgId) {
    sql += ' AND w.org_id = ?';
    params.push(orgId);
  }
  sql += ' ORDER BY w.created_at ASC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params);
  const results = [];

  for (const row of rows) {
    results.push(await deliverWriteback(db, row));
  }
  return results;
}

/**
 * Deliver a single writeback row via HTTP POST.
 */
export async function deliverWriteback(db, row) {
  const payload = JSON.parse(row.payload_json || '{}');
  const url =
    row.writeback_url ||
    process.env.ATS_WRITEBACK_URL ||
    process.env.GREENHOUSE_WRITEBACK_URL;

  if (!url) {
    db.prepare(
      `UPDATE ats_writeback_queue SET status='failed', last_error=?, attempts=COALESCE(attempts,0)+1 WHERE id=?`
    ).run('No writeback_url configured on integration or ATS_WRITEBACK_URL env', row.id);
    return { id: row.id, status: 'failed', error: 'no_url' };
  }

  const body =
    row.provider === 'greenhouse'
      ? buildGreenhouseWritebackBody(payload)
      : payload;

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Xperieval-ATS-Egress/1.0',
  };
  if (row.writeback_api_key) {
    headers.Authorization = `Bearer ${row.writeback_api_key}`;
  } else if (row.webhook_secret) {
    headers['X-Webhook-Secret'] = row.webhook_secret;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const responseText = await res.text().catch(() => '');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${responseText.slice(0, 200)}`);
    }

    db.prepare(
      `UPDATE ats_writeback_queue SET status='sent', sent_at=datetime('now'), last_error=NULL,
       attempts=COALESCE(attempts,0)+1, response_code=? WHERE id=?`
    ).run(res.status, row.id);

    db.prepare(
      `INSERT INTO ats_events (id, org_id, provider, event_type, payload_json, status)
       VALUES (?, ?, ?, 'writeback.sent', ?, 'delivered')`
    ).run(
      uuid(),
      row.org_id,
      row.provider || 'generic',
      JSON.stringify({ queue_id: row.id, application_id: row.application_id, status: res.status })
    );

    return { id: row.id, status: 'sent', httpStatus: res.status };
  } catch (err) {
    const msg = err.name === 'AbortError' ? 'Writeback request timed out' : err.message;
    db.prepare(
      `UPDATE ats_writeback_queue SET status='failed', last_error=?, attempts=COALESCE(attempts,0)+1 WHERE id=?`
    ).run(msg, row.id);
    return { id: row.id, status: 'failed', error: msg };
  }
}
