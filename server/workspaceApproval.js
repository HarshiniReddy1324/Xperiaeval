import { db } from './db.js';
import { logAudit } from './audit.js';
import { pilotDatesForNewOrg } from './pilotProgram.js';
import { notifyContactInbox } from './contactInquiries.js';

export const WORKSPACE_ACTIVE = 'active';
export const WORKSPACE_PENDING = 'pending';

export function operatorOrgId() {
  return process.env.PLATFORM_OPERATOR_ORG_ID || 'org-demo';
}

export function canApproveWorkspaces(user) {
  return user?.role === 'Admin' && user.orgId === operatorOrgId();
}

export function getOrgWorkspaceStatus(org) {
  return org?.workspace_status || WORKSPACE_ACTIVE;
}

export function assertWorkspaceActive(org) {
  const status = getOrgWorkspaceStatus(org);
  if (status === WORKSPACE_PENDING) {
    const err = new Error(
      'Your pilot workspace is awaiting approval. We will email you when your account is ready to use.'
    );
    err.status = 403;
    err.code = 'WORKSPACE_PENDING';
    throw err;
  }
  if (status === 'suspended') {
    const err = new Error('This workspace has been suspended. Contact your account team.');
    err.status = 403;
    err.code = 'WORKSPACE_SUSPENDED';
    throw err;
  }
}

export function listPendingWorkspaces() {
  return db
    .prepare(
      `SELECT o.id, o.name, o.created_at, u.id AS admin_user_id, u.name AS admin_name, u.email AS admin_email
       FROM organizations o
       JOIN users u ON u.org_id = o.id AND u.role = 'Admin'
       WHERE o.workspace_status = ?
       ORDER BY o.created_at ASC`
    )
    .all(WORKSPACE_PENDING);
}

export function approveWorkspace(orgId, actor) {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId);
  if (!org) {
    const err = new Error('Workspace not found');
    err.status = 404;
    throw err;
  }
  if (getOrgWorkspaceStatus(org) !== WORKSPACE_PENDING) {
    const err = new Error('Workspace is not pending approval');
    err.status = 400;
    throw err;
  }

  const { pilot_started_at, pilot_ends_at } = pilotDatesForNewOrg();
  db.prepare(
    `UPDATE organizations
     SET workspace_status = ?, pilot_started_at = ?, pilot_ends_at = ?
     WHERE id = ?`
  ).run(WORKSPACE_ACTIVE, pilot_started_at, pilot_ends_at, orgId);

  const admin = db
    .prepare(`SELECT id, name, email FROM users WHERE org_id = ? AND role = 'Admin' ORDER BY created_at ASC LIMIT 1`)
    .get(orgId);

  logAudit({
    orgId,
    actorId: actor.sub,
    actorName: actor.name,
    eventType: 'Pilot workspace approved',
    description: `Approved 90-day pilot for ${org.name}${admin ? ` (${admin.email})` : ''}`,
  });

  if (admin) {
    notifyContactInbox({
      name: admin.name,
      email: admin.email,
      company: org.name,
      interest: 'pilot',
      message: `Your Xperieval pilot workspace has been approved. Sign in at ${process.env.PUBLIC_APP_URL || 'http://localhost:5173'}/login`,
      source: 'workspace_approved',
    });
  }

  return db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId);
}

export function notifyPendingWorkspaceRegistration({ name, email, company }) {
  notifyContactInbox({
    name,
    email,
    company,
    interest: 'pilot',
    message: 'New self-service pilot workspace registration awaiting approval.',
    source: 'workspace_registration',
  });
}
