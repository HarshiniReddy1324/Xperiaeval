/** Unified integration activity feed (ATS + workflow connectors). */

function parseJson(raw) {
  if (!raw) return null;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

function labelAtsEvent(row) {
  const type = row.event_type || '';
  if (type.includes('writeback.sent') || row.status === 'delivered') return 'Score sent to ATS';
  if (type.includes('writeback.received')) return 'ATS acknowledged score';
  if (row.status === 'ingested') return 'Candidate synced from ATS';
  if (type.includes('applied') || type === 'candidate.updated') return 'Candidate received from ATS';
  return type.replace(/[._]/g, ' ') || 'ATS event';
}

function labelConnectorEvent(row) {
  const map = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    test: 'Connection tested',
    issue_created: 'Jira issue created',
    page_published: 'Confluence page published',
    shortlist_notified: 'Slack notification sent',
  };
  return map[row.event_type] || row.event_type;
}

export function listUnifiedIntegrationActivity(db, orgId, limit = 30) {
  const ats = db
    .prepare(
      `SELECT id, provider, event_type, status, created_at, 'ats' as source
       FROM ats_events WHERE org_id = ? ORDER BY datetime(created_at) DESC LIMIT ?`
    )
    .all(orgId, limit);

  const connectors = db
    .prepare(
      `SELECT id, provider, event_type, status, created_at, detail_json, 'workflow' as source
       FROM connector_events WHERE org_id = ? ORDER BY datetime(created_at) DESC LIMIT ?`
    )
    .all(orgId, limit);

  const merged = [
    ...ats.map((r) => ({
      id: r.id,
      source: 'ats',
      provider: r.provider,
      label: labelAtsEvent(r),
      status: r.status,
      created_at: r.created_at,
    })),
    ...connectors.map((r) => ({
      id: r.id,
      source: 'workflow',
      provider: r.provider,
      label: labelConnectorEvent(r),
      status: r.status,
      created_at: r.created_at,
      detail: parseJson(r.detail_json),
    })),
  ];

  merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return merged.slice(0, limit);
}

export function getIntegrationHealth(db, orgId) {
  const lastAts = db
    .prepare(`SELECT status, created_at FROM ats_events WHERE org_id = ? ORDER BY datetime(created_at) DESC LIMIT 1`)
    .get(orgId);
  const lastIngested = db
    .prepare(`SELECT created_at FROM ats_events WHERE org_id = ? AND status = 'ingested' ORDER BY datetime(created_at) DESC LIMIT 1`)
    .get(orgId);
  const pendingWritebacks = db
    .prepare(`SELECT COUNT(*) as c FROM ats_writeback_queue WHERE org_id = ? AND status IN ('pending', 'failed')`)
    .get(orgId)?.c;
  const failedWritebacks = db
    .prepare(`SELECT COUNT(*) as c FROM ats_writeback_queue WHERE org_id = ? AND status = 'failed'`)
    .get(orgId)?.c;

  const connectors = db
    .prepare(`SELECT provider, status, last_tested_at, last_error FROM org_connectors WHERE org_id = ?`)
    .all(orgId);

  const atsCount = db.prepare(`SELECT COUNT(*) as c FROM ats_integrations WHERE org_id = ? AND enabled = 1`).get(orgId)?.c;

  return {
    ats: {
      connected: atsCount > 0,
      last_event_at: lastAts?.created_at || null,
      last_ingested_at: lastIngested?.created_at || null,
      last_event_status: lastAts?.status || null,
      pending_writebacks: pendingWritebacks ?? 0,
      failed_writebacks: failedWritebacks ?? 0,
    },
    workflow: connectors.map((c) => ({
      provider: c.provider,
      status: c.status,
      last_tested_at: c.last_tested_at,
      last_error: c.last_error,
    })),
  };
}
