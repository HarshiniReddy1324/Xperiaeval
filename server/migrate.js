import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { db } from './db.js';
import { getDefaultInterviewRubric } from './interviewNotetaker.js';
import { DEFAULT_RUBRIC_QUESTIONS, rubricRowFromQuestion } from './defaultRubric.js';
import { serializePosting } from './jobPosting.js';
import { seedQuestionPool, ensureQuestionPool } from './questionPool.js';
import { ensureRubricTemplatesTable } from './rubricTemplates.js';
import { DEFAULT_INTELLIGENCE_THRESHOLDS } from './scoringThresholds.js';
import { DEFAULT_PROCTORING_POLICY } from './proctoring.js';
import { patchIntelligenceJsonScores } from './candidateIntelligence.js';
import { backfillApplicationKeystrokes } from './keystrokeProfile.js';

const DEFAULT_NOTICE =
  'Your application will be evaluated using structured rubrics. Automated scores are advisory only; a human reviewer makes all hiring decisions.';

const DEFAULT_RETENTION =
  'Application data is retained for 24 months for audit and compliance purposes, then securely deleted. Candidates may request export or deletion per applicable privacy laws.';

function columnExists(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((c) => c.name === column);
}

function addColumn(table, column, definition) {
  if (!columnExists(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function runMigrations() {
  addColumn('organizations', 'candidate_notice', 'TEXT');
  addColumn('organizations', 'retention_policy', 'TEXT');
  addColumn('organizations', 'scheduling_enabled', 'INTEGER DEFAULT 0');
  addColumn('organizations', 'scheduling_url', 'TEXT DEFAULT ""');
  addColumn('organizations', 'default_green_threshold', 'INTEGER DEFAULT 80');
  addColumn('organizations', 'default_amber_threshold', 'INTEGER DEFAULT 60');
  addColumn('organizations', 'scoring_policy', 'TEXT');
  addColumn('organizations', 'require_typed_answers', 'INTEGER DEFAULT 1');
  addColumn('organizations', 'track_session_integrity', 'INTEGER DEFAULT 1');
  addColumn('organizations', 'anonymize_screening', 'INTEGER DEFAULT 1');
  addColumn('organizations', 'identity_auto_reveal_stage', "TEXT DEFAULT 'interview_scheduled'");
  addColumn('organizations', 'require_screening_complete', 'INTEGER DEFAULT 1');
  addColumn('organizations', 'intelligence_thresholds_json', 'TEXT');
  addColumn('organizations', 'dei_blind_until_shortlist', 'INTEGER DEFAULT 1');
  addColumn('organizations', 'proctoring_policy_json', 'TEXT');
  addColumn('applications', 'submitter_ip', 'TEXT');
  addColumn('applications', 'proctoring_failed', 'INTEGER DEFAULT 0');
  addColumn('applications', 'proctoring_score', 'INTEGER');
  addColumn('applications', 'hidden_gem', 'INTEGER DEFAULT 0');
  addColumn('applications', 'follow_up_json', 'TEXT');
  addColumn('applications', 'experience_mismatch', 'INTEGER DEFAULT 0');
  addColumn('ats_integrations', 'writeback_url', 'TEXT');
  addColumn('ats_integrations', 'writeback_api_key', 'TEXT');
  addColumn('ats_writeback_queue', 'attempts', 'INTEGER DEFAULT 0');
  addColumn('ats_writeback_queue', 'last_error', 'TEXT');
  addColumn('ats_writeback_queue', 'sent_at', 'TEXT');
  addColumn('ats_writeback_queue', 'response_code', 'INTEGER');

  db.exec(`
    CREATE TABLE IF NOT EXISTS question_pool (
      id TEXT PRIMARY KEY,
      org_id TEXT REFERENCES organizations(id),
      department TEXT NOT NULL,
      experience_level TEXT NOT NULL DEFAULT 'All',
      category_type TEXT DEFAULT 'General',
      name TEXT NOT NULL,
      question TEXT NOT NULL,
      expected_evidence TEXT,
      keywords TEXT,
      default_priority TEXT DEFAULT 'mandatory',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  addColumn('jobs', 'scheduling_url', 'TEXT');
  addColumn('jobs', 'candidate_notice_override', 'TEXT');
  addColumn('jobs', 'posting_json', 'TEXT');
  addColumn('jobs', 'deleted_at', 'TEXT');

  addColumn('applications', 'deleted_at', 'TEXT');
  addColumn('applications', 'integrity_json', 'TEXT');
  addColumn('applications', 'authenticity_score', 'INTEGER');
  addColumn('applications', 'authenticity_verdict', 'TEXT');
  addColumn('applications', 'reviewer_bucket_override', 'TEXT');

  db.exec(`
    CREATE TABLE IF NOT EXISTS background_checks (
      id TEXT PRIMARY KEY,
      application_id TEXT UNIQUE NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      overall_status TEXT NOT NULL,
      confidence INTEGER,
      summary TEXT,
      report_json TEXT NOT NULL,
      requested_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  addColumn('applications', 'pipeline_stage', "TEXT DEFAULT 'application_review'");
  addColumn('applications', 'screening_status', "TEXT DEFAULT 'incomplete'");
  addColumn('applications', 'screening_category', 'TEXT');
  addColumn('applications', 'completion_pct', 'INTEGER DEFAULT 0');
  addColumn('applications', 'anonymized_code', 'TEXT');
  addColumn('applications', 'identity_revealed', 'INTEGER DEFAULT 0');
  addColumn('applications', 'identity_revealed_by', 'TEXT');
  addColumn('applications', 'identity_revealed_at', 'TEXT');
  addColumn('applications', 'recommendation', 'TEXT');
  addColumn('applications', 'voice_fingerprint', 'TEXT');

  addColumn('rubric_categories', 'response_type', "TEXT DEFAULT 'text'");
  addColumn('rubric_categories', 'priority', "TEXT DEFAULT 'mandatory'");
  addColumn('rubric_categories', 'min_response_seconds', 'INTEGER DEFAULT 0');
  addColumn('rubric_categories', 'max_response_seconds', 'INTEGER DEFAULT 300');
  addColumn('rubric_categories', 'keywords', 'TEXT');
  addColumn('rubric_categories', 'category_type', "TEXT DEFAULT 'General'");
  addColumn('rubric_categories', 'ideal_answer', 'TEXT');

  addColumn('scores', 'intelligence_json', 'TEXT');
  addColumn('scores', 'recommendation', 'TEXT');
  addColumn('scores', 'confidence_level', 'TEXT');
  addColumn('scores', 'tier', 'TEXT');

  addColumn('answers', 'response_type', "TEXT DEFAULT 'text'");
  addColumn('answers', 'media_path', 'TEXT');
  addColumn('answers', 'time_taken_seconds', 'INTEGER');
  addColumn('answers', 'idle_seconds', 'INTEGER DEFAULT 0');
  addColumn('answers', 'focus_loss_count', 'INTEGER DEFAULT 0');
  addColumn('answers', 'keywords_matched', 'INTEGER DEFAULT 0');
  addColumn('answers', 'score_points', 'INTEGER');
  addColumn('answers', 'transcript_text', 'TEXT');

  db.exec(`
    CREATE TABLE IF NOT EXISTS interview_rubric_questions (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      expected_context TEXT,
      sort_order INTEGER DEFAULT 0
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS interview_sessions (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES jobs(id),
      status TEXT NOT NULL DEFAULT 'scheduled',
      interviewer_id TEXT,
      transcript TEXT,
      overall INTEGER,
      bucket TEXT,
      depth INTEGER,
      relevance INTEGER,
      genuineness INTEGER,
      communication INTEGER,
      authenticity_score INTEGER,
      authenticity_verdict TEXT,
      explanation TEXT,
      scheduled_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS voice_samples (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      fingerprint TEXT NOT NULL,
      sample_json TEXT NOT NULL,
      media_path TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ats_integrations (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id),
      provider TEXT NOT NULL,
      webhook_secret TEXT,
      api_key_hint TEXT,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ats_events (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      provider TEXT,
      event_type TEXT,
      payload_json TEXT,
      status TEXT DEFAULT 'received',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS interview_schedule_invites (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES jobs(id),
      interviewer_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'awaiting_candidate',
      duration_minutes INTEGER DEFAULT 30,
      timezone TEXT DEFAULT 'America/New_York',
      meeting_url TEXT,
      message TEXT,
      selected_slot_id TEXT,
      confirmed_starts_at TEXT,
      confirmed_ends_at TEXT,
      declined_reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS interview_availability_slots (
      id TEXT PRIMARY KEY,
      invite_id TEXT NOT NULL REFERENCES interview_schedule_invites(id) ON DELETE CASCADE,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      booked INTEGER DEFAULT 0,
      booked_at TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      application_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      link TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS email_outbox (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      meta_json TEXT,
      status TEXT DEFAULT 'queued',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ats_writeback_queue (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      application_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS interview_responses (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      expected_context TEXT,
      body TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );
  `);

  db.prepare(
    `UPDATE organizations SET candidate_notice = COALESCE(candidate_notice, ?),
     retention_policy = COALESCE(retention_policy, ?),
     scoring_policy = COALESCE(scoring_policy, ?) WHERE candidate_notice IS NULL OR retention_policy IS NULL`
  ).run(DEFAULT_NOTICE, DEFAULT_RETENTION, 'Evidence-based heuristic scoring v1.0 — advisory only.');

  seedDemoRoleUsers();
  seedInterviewRubricsForJobs();
  seedAtsIntegrationStub();
  backfillScreeningDefaults();
  syncDefaultRubricSampleAnswers();
  syncIntelligenceJsonWithScores();
  upgradeRubricsToTenQuestions();
  backfillJobPostings();
  const keystrokeBackfill = backfillApplicationKeystrokes(db);
  if (keystrokeBackfill > 0) {
    console.log(`[migrate] Backfilled keystroke fields on ${keystrokeBackfill} application(s)`);
  }
  const pipelineReset = backfillDemoPipelineStages();
  if (pipelineReset > 0) {
    console.log(`[migrate] Reset demo pipeline_stage on ${pipelineReset} application(s) to application_review`);
  }
  ensureRubricTemplatesTable(db);
  ensureQuestionPool(db, null);
  db.prepare(
    `UPDATE organizations SET intelligence_thresholds_json = COALESCE(intelligence_thresholds_json, ?)`
  ).run(JSON.stringify(DEFAULT_INTELLIGENCE_THRESHOLDS));
  db.prepare(`UPDATE rubric_categories SET min_response_seconds = 0 WHERE min_response_seconds IS NULL OR min_response_seconds = 90`).run();

  import('./resumeBackfill.js')
    .then((m) => m.backfillResumeTexts(db))
    .then((n) => {
      if (n > 0) console.log(`[migrate] Re-parsed resume text for ${n} application(s)`);
    })
    .catch((e) => console.error('[migrate] resume backfill failed:', e.message));

  if (process.env.XPERIEVAL_ENABLE_SCENARIO_SEED === '1') {
    import('./seedScenarioDemos.js')
      .then((m) => m.seedScenarioDemos())
      .catch((e) => console.error('[seed] scenario demos failed:', e.message));
  }
}

function backfillJobPostings() {
  const jobs = db.prepare(`SELECT id, title, team, location, description, posting_json FROM jobs`).all();
  for (const job of jobs) {
    if (job.posting_json) continue;
    const posting = serializePosting({
      posting: {
        companyName: 'Xperieval Demo Co',
        department: job.team,
        summary: job.description || `Join us as ${job.title}.`,
        employmentType: 'Full-time',
        visaSponsorship: 'Case by case',
      },
      team: job.team,
      description: job.description,
    });
    db.prepare(`UPDATE jobs SET posting_json = ? WHERE id = ?`).run(JSON.stringify(posting), job.id);
  }
}

function upgradeRubricsToTenQuestions() {
  const rubrics = db.prepare(`SELECT id FROM rubric_versions`).all();
  const existing = db.prepare(
    `SELECT id FROM rubric_categories WHERE rubric_version_id = ? ORDER BY sort_order`
  );
  const update = db.prepare(
    `UPDATE rubric_categories SET name=?, weight=?, question=?, expected_evidence=?, sort_order=?,
     priority=?, keywords=?, min_response_seconds=90, max_response_seconds=300 WHERE id=?`
  );
  const insert = db.prepare(
    `INSERT INTO rubric_categories (id, rubric_version_id, name, weight, question, expected_evidence, sort_order,
     response_type, priority, min_response_seconds, max_response_seconds, keywords)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'text', ?, 90, 300, ?)`
  );
  for (const rubric of rubrics) {
    const cats = existing.all(rubric.id);
    if (cats.length >= 10) continue;
    DEFAULT_RUBRIC_QUESTIONS.forEach((q, i) => {
      if (cats[i]) {
        update.run(q.name, q.weight, q.question, q.expected_evidence, i, q.priority, q.keywords, cats[i].id);
      } else {
        insert.run(
          uuid(),
          rubric.id,
          q.name,
          q.weight,
          q.question,
          q.expected_evidence,
          i,
          q.priority,
          q.keywords
        );
      }
    });
  }
}

function syncIntelligenceJsonWithScores() {
  const rows = db
    .prepare(
      `SELECT application_id, overall, bucket, recommendation, confidence_level, tier, intelligence_json
       FROM scores WHERE intelligence_json IS NOT NULL AND intelligence_json != ''`
    )
    .all();
  const update = db.prepare('UPDATE scores SET intelligence_json = ? WHERE application_id = ?');
  for (const row of rows) {
    const patched = patchIntelligenceJsonScores(row.intelligence_json, {
      overall: row.overall,
      bucket: row.bucket,
      recommendation: row.recommendation,
      confidence_level: row.confidence_level,
      tier: row.tier,
    });
    if (patched) update.run(patched, row.application_id);
  }
}

function syncDefaultRubricSampleAnswers() {
  const update = db.prepare(
    `UPDATE rubric_categories
     SET ideal_answer = ?, expected_evidence = ?
     WHERE name = ?
       AND (
         ideal_answer IS NULL
         OR ideal_answer = expected_evidence
         OR length(ideal_answer) < 120
       )`
  );
  for (const q of DEFAULT_RUBRIC_QUESTIONS) {
    const row = rubricRowFromQuestion(q);
    update.run(row.ideal_answer, row.expected_evidence, q.name);
  }
}

function backfillScreeningDefaults() {
  db.prepare(
    `UPDATE applications SET anonymized_code = 'CAND-' || substr(id, -4)
     WHERE anonymized_code IS NULL`
  ).run();
  db.prepare(
    `UPDATE rubric_categories SET response_type = COALESCE(response_type, 'text'),
     priority = COALESCE(priority, 'mandatory'),
     min_response_seconds = COALESCE(min_response_seconds, 0),
     max_response_seconds = COALESCE(max_response_seconds, 300),
     category_type = COALESCE(category_type, 'General'),
     ideal_answer = COALESCE(ideal_answer, expected_evidence)
     WHERE response_type IS NULL OR priority IS NULL OR category_type IS NULL`
  ).run();
  db.prepare(
    `UPDATE applications SET screening_status = 'complete', completion_pct = 100,
     screening_category = 'Ready for Review'
     WHERE screening_status = 'incomplete' AND id IN (SELECT application_id FROM scores)`
  ).run();
}

function backfillDemoPipelineStages() {
  /** Demo seeds used advanced pipeline stages — reset unless recruiter moved them via audit. */
  const moved = db
    .prepare(
      `SELECT DISTINCT application_id FROM audit_events
       WHERE event_type IN ('Pipeline stage updated', 'Interview scheduled', 'Shortlisted for interview')`
    )
    .all()
    .map((r) => r.application_id);
  const apps = db
    .prepare(
      `SELECT id, pipeline_stage FROM applications
       WHERE pipeline_stage NOT IN ('application_review', 'hired', 'offer_extended') AND deleted_at IS NULL`
    )
    .all();
  const update = db.prepare(`UPDATE applications SET pipeline_stage = 'application_review' WHERE id = ?`);
  let n = 0;
  for (const app of apps) {
    if (moved.includes(app.id)) continue;
    update.run(app.id);
    n += 1;
  }
  return n;
}

function seedAtsIntegrationStub() {
  const org = db.prepare('SELECT id FROM organizations WHERE id = ?').get('org-demo');
  if (!org) return;
  db.prepare(
    `INSERT OR IGNORE INTO ats_integrations (id, org_id, provider, webhook_secret, api_key_hint, enabled, writeback_url)
     VALUES (?, ?, 'greenhouse', 'demo-webhook-secret', 'gh_••••demo', 1, ?)`
  ).run('ats-demo', org.id, 'http://127.0.0.1:3001/api/integrations/ats/writeback-receiver');
  db.prepare(
    `UPDATE ats_integrations SET writeback_url = COALESCE(writeback_url, ?) WHERE id = 'ats-demo'`
  ).run('http://127.0.0.1:3001/api/integrations/ats/writeback-receiver');
}

function seedInterviewRubricsForJobs() {
  const jobs = db.prepare('SELECT id FROM jobs').all();
  const count = db.prepare('SELECT COUNT(*) as c FROM interview_rubric_questions WHERE job_id = ?');
  const insert = db.prepare(
    `INSERT INTO interview_rubric_questions (id, job_id, question, expected_context, sort_order) VALUES (?, ?, ?, ?, ?)`
  );
  for (const job of jobs) {
    if (count.get(job.id).c > 0) continue;
    getDefaultInterviewRubric().forEach((q, i) => {
      insert.run(uuid(), job.id, q.question, q.expected_context, i);
    });
  }
}

function seedDemoRoleUsers() {
  const org = db.prepare('SELECT id FROM organizations WHERE id = ?').get('org-demo');
  if (!org) return;

  const hash = bcrypt.hashSync('demo1234', 10);
  const users = [
    ['user-hiring', 'hiring@xperieval.com', 'Jordan Lee', 'Hiring Manager'],
    ['user-recruiter', 'recruiter@xperieval.com', 'Sam Ortiz', 'Recruiter'],
    ['user-auditor', 'auditor@xperieval.com', 'Priya Nair', 'Compliance Auditor'],
  ];

  const insert = db.prepare(
    `INSERT OR IGNORE INTO users (id, org_id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const [id, email, name, role] of users) {
    insert.run(id, org.id, email, hash, name, role);
  }
}

export { DEFAULT_NOTICE, DEFAULT_RETENTION };
