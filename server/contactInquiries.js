import { v4 as uuid } from 'uuid';
import { db } from './db.js';
import { logAudit } from './audit.js';
import { queueEmail } from './email.js';

const INBOUND_ORG_ID = 'org-inbound';

const INTEREST_LABELS = {
  demo: 'Product demo',
  pilot: 'Pilot program inquiry',
  integrations: 'ATS integrations',
  general: 'General question',
  other: 'Other',
};

export function contactInboxEmail() {
  return (
    process.env.CONTACT_INBOX_EMAIL ||
    process.env.SALES_INBOX_EMAIL ||
    'pharshinireddy13@gmail.com'
  ).trim();
}

function ensureInboundOrg() {
  const existing = db.prepare('SELECT id FROM organizations WHERE id = ?').get(INBOUND_ORG_ID);
  if (!existing) {
    db.prepare('INSERT INTO organizations (id, name) VALUES (?, ?)').run(INBOUND_ORG_ID, 'Inbound leads');
  }
}

function ensureInboundTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_inquiries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT,
      interest TEXT NOT NULL,
      message TEXT,
      source TEXT DEFAULT 'landing',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

export function recordContactInquiry({ name, email, company, interest, message, source = 'landing' }) {
  ensureInboundTable();
  const id = uuid();
  db.prepare(
    `INSERT INTO contact_inquiries (id, name, email, company, interest, message, source)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, email, company || null, interest, message || null, source);
  return id;
}

export function notifyContactInbox({ name, email, company, interest, message, source = 'landing' }) {
  const label = INTEREST_LABELS[interest] || interest || 'Inquiry';
  const subject = `Xperieval ${label}: ${name}${company ? ` (${company})` : ''}`;
  const body = [
    `Source: ${source}`,
    `Interest: ${label}`,
    `Name: ${name}`,
    `Email: ${email}`,
    company ? `Company: ${company}` : null,
    '',
    message || '(No message provided)',
  ]
    .filter(Boolean)
    .join('\n');

  queueEmail({
    orgId: INBOUND_ORG_ID,
    to: contactInboxEmail(),
    subject,
    body,
    meta: { type: 'contact_inquiry', interest, from_email: email, source },
  });

  return { subject, body };
}

export function submitPublicContact(payload = {}) {
  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const company = String(payload.company || '').trim();
  const interest = String(payload.interest || '').trim().toLowerCase();
  const message = String(payload.message || '').trim();

  if (!name || !email || !interest) {
    const err = new Error('Name, email, and interest are required.');
    err.status = 400;
    throw err;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const err = new Error('Enter a valid email address.');
    err.status = 400;
    throw err;
  }
  if (!INTEREST_LABELS[interest]) {
    const err = new Error('Select a valid interest option.');
    err.status = 400;
    throw err;
  }

  const id = recordContactInquiry({ name, email, company, interest, message, source: 'landing' });
  notifyContactInbox({ name, email, company, interest, message, source: 'landing' });
  ensureInboundOrg();
  logAudit({
    orgId: INBOUND_ORG_ID,
    actorName: name,
    eventType: 'Contact inquiry',
    description: `${labelFor(interest)} from ${email}${company ? ` · ${company}` : ''}`,
  });

  return { id, interest: labelFor(interest) };
}

export function labelFor(interest) {
  return INTEREST_LABELS[interest] || interest;
}

export function notifyPilotUpgradeRequest({ org, user, targetPlan, message }) {
  const orgName = org?.name || user.orgId;
  const subject = `Xperieval pilot upgrade request: ${orgName}`;
  const body = [
    `Organization: ${orgName} (${user.orgId})`,
    `Requested by: ${user.name} <${user.email}>`,
    `Target plan: ${targetPlan}`,
    '',
    message || '(No additional message)',
  ].join('\n');

  queueEmail({
    orgId: user.orgId,
    to: contactInboxEmail(),
    subject,
    body,
    meta: { type: 'pilot_upgrade', target_plan: targetPlan, org_id: user.orgId },
  });
}
