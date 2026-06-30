import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { scoreApplication } from './scoring.js';
import { DEFAULT_RUBRIC_QUESTIONS, rubricRowFromQuestion } from './defaultRubric.js';
import { runSchemaMigrations, runDataMigrations, DEFAULT_NOTICE, DEFAULT_RETENTION } from './migrate.js';
import { join } from 'path';
import { dataDir } from './paths.js';

const db = new Database(join(dataDir, 'xperieval.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Hiring Manager',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id),
    title TEXT NOT NULL,
    team TEXT,
    location TEXT,
    stage TEXT DEFAULT 'Draft',
    owner_id TEXT REFERENCES users(id),
    slug TEXT UNIQUE,
    description TEXT,
    green_threshold INTEGER DEFAULT 80,
    amber_threshold INTEGER DEFAULT 60,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS rubric_versions (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    approved_by TEXT,
    approved_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS rubric_categories (
    id TEXT PRIMARY KEY,
    rubric_version_id TEXT NOT NULL REFERENCES rubric_versions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    weight INTEGER NOT NULL,
    question TEXT NOT NULL,
    expected_evidence TEXT,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    rubric_version_id TEXT REFERENCES rubric_versions(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    source TEXT DEFAULT 'Careers page',
    resume_path TEXT,
    resume_text TEXT,
    stage TEXT DEFAULT 'Applied',
    status TEXT DEFAULT 'Pending score',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES rubric_categories(id),
    question TEXT NOT NULL,
    body TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY,
    application_id TEXT UNIQUE NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    overall INTEGER NOT NULL,
    bucket TEXT NOT NULL,
    resume_match INTEGER,
    answer_quality INTEGER,
    evidence_strength INTEGER,
    communication INTEGER,
    risk TEXT,
    explanation TEXT,
    policy_version TEXT DEFAULT 'v1.0',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviewer_notes (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id),
    job_id TEXT,
    application_id TEXT,
    actor_id TEXT,
    actor_name TEXT,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as c FROM organizations').get().c;
  if (count > 0) return;

  const orgId = 'org-demo';
  const adminId = 'user-admin';
  const hash = bcrypt.hashSync('demo1234', 10);

  db.prepare('INSERT INTO organizations (id, name) VALUES (?, ?)').run(orgId, 'Xperieval Demo Co');

  db.prepare(
    `INSERT INTO users (id, org_id, email, password_hash, name, role)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(adminId, orgId, 'demo@xperieval.com', hash, 'Maya Chen', 'Admin');

  const jobs = [
    {
      id: 'REQ-2204',
      title: 'Senior Product Manager',
      team: 'Product',
      location: 'Remote / Chicago',
      stage: 'Screening',
    },
    {
      id: 'REQ-2198',
      title: 'Principal Data Engineer',
      team: 'Data Platform',
      location: 'Austin, TX',
      stage: 'Hiring Team Review',
    },
    {
      id: 'REQ-2187',
      title: 'Customer Success Lead',
      team: 'GTM',
      location: 'New York, NY',
      stage: 'Interviewing',
    },
  ];

  const insertJob = db.prepare(
    `INSERT INTO jobs (id, org_id, title, team, location, stage, owner_id, slug, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const j of jobs) {
    insertJob.run(
      j.id,
      orgId,
      j.title,
      j.team,
      j.location,
      j.stage,
      adminId,
      slugify(j.title) + '-' + j.id.toLowerCase(),
      `Join our team as ${j.title}. We evaluate candidates using structured evidence-based rubrics.`
    );
  }

  const rubricId = 'rub-2204-v1';
  db.prepare(
    `INSERT INTO rubric_versions (id, job_id, version, status, approved_by, approved_at)
     VALUES (?, ?, 1, 'approved', ?, datetime('now'))`
  ).run(rubricId, 'REQ-2204', adminId);

  const insertCat = db.prepare(
    `INSERT INTO rubric_categories (id, rubric_version_id, name, weight, question, expected_evidence, sort_order,
     response_type, priority, min_response_seconds, max_response_seconds, keywords, category_type, ideal_answer)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'text', ?, 90, 300, ?, ?, ?)`
  );

  DEFAULT_RUBRIC_QUESTIONS.forEach((q, i) => {
    const row = rubricRowFromQuestion(q);
    insertCat.run(
      `cat-${i + 1}`,
      rubricId,
      q.name,
      q.weight,
      q.question,
      row.expected_evidence,
      i,
      q.priority,
      q.keywords,
      q.category_type || 'General',
      row.ideal_answer
    );
  });

  db.prepare(
    `INSERT INTO audit_events (id, org_id, job_id, actor_id, actor_name, event_type, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    'audit-seed-1',
    orgId,
    'REQ-2204',
    adminId,
    'Maya Chen',
    'Rubric approved',
    'REQ-2204 rubric v1 approved before candidate scoring'
  );

  seedDemoApplications(orgId, rubricId);
}

function seedDemoApplications(orgId, rubricId) {
  const cats = db.prepare('SELECT * FROM rubric_categories WHERE rubric_version_id = ? ORDER BY sort_order').all(rubricId);
  const demos = [
    {
      id: 'XP-1042',
      name: 'Avery Johnson',
      email: 'avery@example.com',
      source: 'Sample data',
      resume: 'Senior Product Manager with 8 years experience. Led product launches increasing revenue by 40%. Managed cross-functional teams of 12. Shipped mobile app to 2M users.',
      answers: [
        'Eight years in B2B SaaS product management across analytics and workflow products, most recently Senior PM owning a platform squad of 12.',
        'I led our B2B analytics launch end-to-end: discovery, beta, GA. I owned roadmap, pricing inputs, and cross-functional rituals.',
        'We reduced time-to-insight by 35% and added $4.2M ARR in year one with 92% enterprise retention on the new SKU.',
        'I prioritize by impact × urgency, document trade-offs, and align sales, legal, and eng in a single decision memo before committing.',
        'When real-time alerts threatened stability, I chose event-driven architecture over batch, accepted ops complexity because NPS rose 12 points.',
        'Daily: SQL, Amplitude, Figma, Jira, written PRDs, and executive-ready decision docs for leadership reviews.',
        'I want to scale product discipline in a growth-stage company where I have shipped both 0-to-1 and 1-to-N motions.',
        'Won internal “Operator of the Year” for running our incident review program that cut repeat outages 40%.',
        '',
        '',
      ],
    },
    {
      id: 'XP-1038',
      name: 'Mina Patel',
      email: 'mina@example.com',
      source: 'Sample data',
      resume: 'Product manager with experience in SaaS. Worked on roadmap and user stories.',
      answers: [
        'I have managed products and worked with engineering teams on various features.',
        'I try to balance stakeholder needs and communicate regularly.',
        'I influenced technical decisions by attending architecture reviews.',
        'I am interested in your company and the product manager role.',
      ],
    },
    {
      id: 'XP-1029',
      name: 'Leo Kim',
      email: 'leo@example.com',
      source: 'Sample data',
      resume: 'PM background. Teams. Products.',
      answers: ['Good team player.', 'I prioritize tasks.', 'Tech decisions matter.', 'Want this job.'],
    },
  ];

  const insertApp = db.prepare(
    `INSERT INTO applications (id, job_id, rubric_version_id, name, email, source, resume_text, stage, status)
     VALUES (?, 'REQ-2204', ?, ?, ?, ?, ?, 'Scored', 'Scored')`
  );
  const insertAns = db.prepare(
    `INSERT INTO answers (id, application_id, category_id, question, body) VALUES (?, ?, ?, ?, ?)`
  );
  const insertScore = db.prepare(
    `INSERT INTO scores (id, application_id, overall, bucket, resume_match, answer_quality,
     evidence_strength, communication, risk, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const d of demos) {
    insertApp.run(d.id, rubricId, d.name, d.email, d.source, d.resume);
    const answers = cats.map((c, i) => ({
      category_id: c.id,
      body: d.answers[i] || '',
      question: c.question,
    }));
    for (const a of answers) {
      insertAns.run(uuid(), d.id, a.category_id, a.question, a.body);
    }
    const result = scoreApplication({
      answers,
      categories: cats,
      greenThreshold: 80,
      amberThreshold: 60,
    });
    insertScore.run(
      uuid(),
      d.id,
      result.overall,
      result.bucket,
      result.mandatory_points,
      result.optional_points,
      result.mandatory_max,
      result.optional_max,
      result.risk,
      result.explanation
    );
    db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(result.status, d.id);
  }

  db.prepare(
    `INSERT INTO audit_events (id, org_id, job_id, application_id, actor_name, event_type, description)
     VALUES (?, ?, 'REQ-2204', 'XP-1042', 'System', 'Score generated', ?)`
  ).run(uuid(), orgId, 'XP-1042 scored with rubric v1 and policy v1.0');
}

runSchemaMigrations();
seedIfEmpty();
runDataMigrations();

export { db, slugify, DEFAULT_NOTICE, DEFAULT_RETENTION };
