/** Org plan tiers and pilot limits. */

export const PLAN_TIERS = ['pilot', 'team', 'enterprise'];

export const DEFAULT_PILOT_LIMITS = {
  max_positions: 3,
  max_candidates: 75,
  max_team_users: 5,
  pilot_days: 90,
  integrations: false,
  api_keys: false,
  workflow_connectors: true,
};

export const TEAM_LIMITS = {
  max_positions: 25,
  max_candidates: 500,
  max_team_users: 25,
  integrations: true,
  api_keys: true,
};

export function normalizePlanTier(raw) {
  const t = String(raw || 'pilot').toLowerCase();
  if (PLAN_TIERS.includes(t)) return t;
  return 'pilot';
}

function parseLimitsJson(raw) {
  if (!raw) return {};
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

export function limitsForTier(tier, orgOverrides = {}) {
  const plan = normalizePlanTier(tier);
  if (plan === 'enterprise') return null;
  const base = plan === 'team' ? { ...TEAM_LIMITS } : { ...DEFAULT_PILOT_LIMITS, ...orgOverrides };
  return base;
}

function daysBetween(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const ms = new Date(endIso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function getOrgUsage(db, orgId) {
  const positions = db
    .prepare(`SELECT COUNT(*) as c FROM jobs WHERE org_id = ? AND deleted_at IS NULL`)
    .get(orgId)?.c;
  const candidates = db
    .prepare(
      `SELECT COUNT(*) as c FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE j.org_id = ? AND a.deleted_at IS NULL`
    )
    .get(orgId)?.c;
  const users = db.prepare(`SELECT COUNT(*) as c FROM users WHERE org_id = ?`).get(orgId)?.c;
  return {
    positions: positions ?? 0,
    candidates: candidates ?? 0,
    users: users ?? 0,
  };
}

export function getPilotSnapshot(db, org) {
  if (!org) return null;
  const orgId = org.id || org.org_id;
  if (!orgId) return null;
  const plan_tier = normalizePlanTier(org.plan_tier);
  const overrides = parseLimitsJson(org.pilot_limits_json);
  const limits = limitsForTier(plan_tier, overrides);
  const usage = getOrgUsage(db, orgId);
  const started_at = org.pilot_started_at || null;
  const ends_at =
    org.pilot_ends_at ||
    (plan_tier === 'pilot' && started_at
      ? new Date(new Date(started_at).getTime() + DEFAULT_PILOT_LIMITS.pilot_days * 86400000).toISOString()
      : null);
  const days_remaining = plan_tier === 'pilot' ? daysBetween(started_at, ends_at) : null;
  const expired = plan_tier === 'pilot' && ends_at && new Date(ends_at).getTime() < Date.now();

  return {
    plan_tier,
    is_pilot: plan_tier === 'pilot',
    started_at,
    ends_at,
    days_remaining,
    expired,
    limits,
    usage,
    features: {
      integrations: limits ? limits.integrations : true,
      api_keys: limits ? limits.api_keys : true,
    },
  };
}

function pilotError(message, snapshot) {
  const err = new Error(message);
  err.status = 403;
  err.code = 'PILOT_LIMIT';
  err.pilot = snapshot;
  return err;
}

export function assertPilotAction(db, org, action) {
  const snapshot = getPilotSnapshot(db, org);
  if (!snapshot) return snapshot;

  if (snapshot.plan_tier === 'enterprise') return snapshot;

  if (action === 'workflow_connectors') return snapshot;

  if (snapshot.expired) {
    throw pilotError('Your pilot period has ended. Request an upgrade to keep adding positions and candidates.', snapshot);
  }

  const { limits, usage } = snapshot;
  if (!limits) return snapshot;

  if (action === 'create_position' && usage.positions >= limits.max_positions) {
    throw pilotError(
      `Pilot limit reached: ${limits.max_positions} active positions. Request an upgrade to add more.`,
      snapshot
    );
  }

  if (action === 'add_candidate' && usage.candidates >= limits.max_candidates) {
    throw pilotError(
      `Pilot limit reached: ${limits.max_candidates} candidates. Request an upgrade to continue screening.`,
      snapshot
    );
  }

  if (action === 'add_user' && usage.users >= limits.max_team_users) {
    throw pilotError(
      `Pilot limit reached: ${limits.max_team_users} team members. Request an upgrade to invite more users.`,
      snapshot
    );
  }

  if (action === 'integrations' && !limits.integrations) {
    throw pilotError('ATS integrations are available on Team and Enterprise plans. Request an upgrade from Pilot settings.', snapshot);
  }

  if (action === 'api_keys' && !limits.api_keys) {
    throw pilotError('Intelligence API keys are available on Team and Enterprise plans. Request an upgrade from Pilot settings.', snapshot);
  }

  return snapshot;
}

export function pilotDatesForNewOrg() {
  const started = new Date();
  const ends = new Date(started);
  ends.setDate(ends.getDate() + DEFAULT_PILOT_LIMITS.pilot_days);
  return {
    pilot_started_at: started.toISOString(),
    pilot_ends_at: ends.toISOString(),
  };
}
