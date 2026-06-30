/**
 * Idempotent demo portfolio seed — 7 jobs, 21 scored candidates.
 * Runs automatically on API startup; INSERT OR IGNORE keeps production DBs in sync.
 */

import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { db, slugify } from './db.js';
import { DEFAULT_RUBRIC_QUESTIONS, rubricRowFromQuestion } from './defaultRubric.js';
import { scoreApplication } from './scoring.js';
import {
  DEMO_PORTFOLIO_CANDIDATES,
  DEMO_PORTFOLIO_JOBS,
  DEMO_PORTFOLIO_MARKER,
} from './demoPortfolioData.js';

const ORG_ID = 'org-demo';
const ADMIN_ID = 'user-admin';

export function portfolioApplicationCount() {
  return db
    .prepare(
      `SELECT COUNT(*) as c FROM applications
       WHERE deleted_at IS NULL AND id LIKE 'APP-%'`
    )
    .get().c;
}

export function needsDemoPortfolioSeed() {
  if (process.env.XPERIEVAL_SKIP_DEMO_PORTFOLIO === '1') return false;
  const hasMeta = db
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'app_meta'`)
    .get();
  if (hasMeta) {
    const marker = db.prepare('SELECT value FROM app_meta WHERE key = ?').get('demo_portfolio_marker');
    if (
      marker?.value === DEMO_PORTFOLIO_MARKER &&
      portfolioApplicationCount() >= DEMO_PORTFOLIO_CANDIDATES.length
    ) {
      const jobCount = db
        .prepare(`SELECT COUNT(*) as c FROM jobs WHERE deleted_at IS NULL AND id LIKE 'JOB-%'`)
        .get().c;
      if (jobCount >= DEMO_PORTFOLIO_JOBS.length) return false;
    }
  }
  const jobCount = db
    .prepare(`SELECT COUNT(*) as c FROM jobs WHERE deleted_at IS NULL AND id LIKE 'JOB-%'`)
    .get().c;
  return jobCount < DEMO_PORTFOLIO_JOBS.length || portfolioApplicationCount() < DEMO_PORTFOLIO_CANDIDATES.length;
}

function ensureMetaTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function ensureBaseOrg() {
  const existing = db.prepare('SELECT id FROM organizations WHERE id = ?').get(ORG_ID);
  if (!existing) {
    db.prepare('INSERT INTO organizations (id, name) VALUES (?, ?)').run(ORG_ID, 'Xperieval Demo Co');
  }
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(ADMIN_ID);
  if (!user) {
    const hash = bcrypt.hashSync('demo1234', 10);
    db.prepare(
      `INSERT INTO users (id, org_id, email, password_hash, name, role)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(ADMIN_ID, ORG_ID, 'demo@xperieval.com', hash, 'Maya Chen', 'Admin');
  }
}

function ensureRubric(jobId, index) {
  const existing = db
    .prepare(`SELECT id FROM rubric_versions WHERE job_id = ? AND status = 'approved' ORDER BY version DESC LIMIT 1`)
    .get(jobId);
  if (existing) return existing.id;

  const rubricId = `RUB-${jobId}-${index}`;
  db.prepare(
    `INSERT INTO rubric_versions (id, job_id, version, status, approved_by, approved_at, created_at)
     VALUES (?, ?, 1, 'approved', ?, datetime('now'), datetime('now'))`
  ).run(rubricId, jobId, ADMIN_ID);

  const insertCat = db.prepare(
    `INSERT INTO rubric_categories (
      id, rubric_version_id, name, weight, question, expected_evidence, sort_order,
      response_type, priority, min_response_seconds, max_response_seconds, keywords, category_type, ideal_answer
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'text', ?, 90, 300, ?, ?, ?)`
  );
  DEFAULT_RUBRIC_QUESTIONS.forEach((q, i) => {
    const row = rubricRowFromQuestion(q);
    insertCat.run(
      `RUB-${jobId}-CAT-${i + 1}`,
      rubricId,
      q.name,
      q.weight,
      q.question,
      row.expected_evidence,
      i,
      q.priority || (i < 7 ? 'mandatory' : 'optional'),
      q.keywords || '',
      q.category_type || 'General',
      row.ideal_answer
    );
  });
  return rubricId;
}

function buildAnswers(candidate, categories, title) {
  const base = [
    `I have direct experience relevant to the ${title} role and can clearly explain measurable outcomes from my recent work.`,
    `I owned delivery from discovery through launch, including stakeholder alignment, implementation planning, and communication.`,
    `I improved key business metrics and can map my decisions to measurable outcomes and repeatable team processes.`,
    `I prioritize using impact and urgency with clear trade-offs, and I document decisions so teams can move quickly.`,
    `For difficult trade-offs, I evaluate risk, align with cross-functional partners, and choose an approach with rollback plans.`,
    `I use analytics and workflow tools daily and collaborate with engineering, design, and operations to execute reliably.`,
    `This role aligns with my career goals and domain focus, and I am motivated by long-term ownership and accountability.`,
    `One achievement I am proud of is improving team execution quality while raising trust with internal stakeholders.`,
    `I communicate clearly with technical and non-technical audiences and proactively remove blockers before they escalate.`,
    `I can start quickly and provide references or work samples that validate the impact and responsibilities listed on my resume.`,
  ];

  if (candidate.quality === 'average') {
    return base.map((txt, idx) =>
      idx > 6
        ? txt.slice(0, 85)
        : txt.replace('measurable outcomes', 'practical improvements').replace('rollback plans', 'shared plans')
    );
  }
  if (candidate.quality === 'weak') {
    return categories.map((c, idx) => {
      if (idx > 5) return idx % 2 ? '' : 'I am still learning this area and improving through hands-on practice.';
      return 'I have some experience and can contribute with support from the team while I ramp up.';
    });
  }
  return base.map((txt, idx) =>
    `${txt} ${idx < 6 ? 'In prior roles, I worked cross-functionally and delivered against clear goals.' : ''}`.trim()
  );
}

function insertPortfolioData() {
  const insertJob = db.prepare(
    `INSERT OR IGNORE INTO jobs (
      id, org_id, title, team, location, stage, position_level, owner_id, slug, description,
      green_threshold, amber_threshold, posting_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 80, 60, ?, datetime('now'))`
  );
  const insertApp = db.prepare(
    `INSERT OR IGNORE INTO applications (
      id, job_id, rubric_version_id, name, email, phone, source, resume_text,
      stage, status, created_at, integrity_json, authenticity_score, authenticity_verdict,
      pipeline_stage, screening_status, screening_category, completion_pct, anonymized_code,
      submitter_ip, proctoring_failed, proctoring_score, recommendation
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Scored', ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertAnswer = db.prepare(
    `INSERT INTO answers (id, application_id, category_id, question, body, response_type, time_taken_seconds, idle_seconds, focus_loss_count)
     VALUES (?, ?, ?, ?, ?, 'text', ?, ?, ?)`
  );
  const insertScore = db.prepare(
    `INSERT OR IGNORE INTO scores (
      id, application_id, overall, bucket, resume_match, answer_quality,
      evidence_strength, communication, risk, explanation, recommendation, confidence_level, tier
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let jobsAdded = 0;
  let candidatesAdded = 0;

  for (const [idx, job] of DEMO_PORTFOLIO_JOBS.entries()) {
    const slug = `${slugify(job.title)}-${job.id.toLowerCase()}`;
    const posting = {
      companyName: 'Xperieval Demo Co',
      department: job.team,
      summary: `Hiring ${job.title} to support enterprise-scale hiring workflows and data-driven decisioning.`,
      employmentType: 'Full-time',
    };
    const before = db.prepare('SELECT id FROM jobs WHERE id = ?').get(job.id);
    insertJob.run(
      job.id,
      ORG_ID,
      job.title,
      job.team,
      job.location,
      job.stage,
      job.position_level || 'entry',
      ADMIN_ID,
      slug,
      `Join Xperieval as a ${job.title} and help improve quality and speed of talent decisions.`,
      JSON.stringify(posting)
    );
    if (!before) jobsAdded += 1;

    const rubricId = ensureRubric(job.id, idx + 1);
    const categories = db
      .prepare('SELECT * FROM rubric_categories WHERE rubric_version_id = ? ORDER BY sort_order')
      .all(rubricId);
    const people = DEMO_PORTFOLIO_CANDIDATES.filter((c) => c.jobId === job.id);

    for (const candidate of people) {
      const exists = db.prepare('SELECT id FROM applications WHERE id = ?').get(candidate.id);
      if (exists) continue;

      const answers = buildAnswers(candidate, categories, job.title);
      const integrityJson = JSON.stringify({
        focus_loss_count: candidate.integrity.focus_loss_count,
        paste_attempts: candidate.integrity.paste_attempts,
        hidden_time_seconds: candidate.integrity.focus_loss_count * 22,
        total_time_seconds: 2100,
      });
      const screeningStatus = candidate.integrity.paste_attempts >= 3 ? 'ai_used' : 'complete';
      const completion = Math.round((answers.filter((a) => a && a.trim()).length / categories.length) * 100);

      const answerRows = categories.map((cat, i) => ({
        category_id: cat.id,
        question: cat.question,
        body: answers[i] || '',
      }));
      const score = scoreApplication({
        answers: answerRows,
        categories,
        greenThreshold: 80,
        amberThreshold: 60,
      });
      const normalizedOverall =
        candidate.quality === 'strong'
          ? Math.max(score.overall, 84)
          : candidate.quality === 'average'
            ? Math.min(Math.max(score.overall, 66), 78)
            : Math.min(score.overall, 56);
      const normalizedBucket =
        normalizedOverall >= 80 ? 'Green' : normalizedOverall >= 60 ? 'Amber' : 'Red';
      const recommendation =
        normalizedOverall >= 80
          ? 'Strongly Recommended'
          : normalizedOverall >= 65
            ? 'Recruiter Review Needed'
            : 'Not Recommended';

      insertApp.run(
        candidate.id,
        job.id,
        rubricId,
        candidate.name,
        candidate.email,
        candidate.phone,
        candidate.source,
        candidate.resume,
        score.status || 'Scored',
        integrityJson,
        candidate.authenticity,
        candidate.authenticity >= 75 ? 'verified' : candidate.authenticity >= 50 ? 'review' : 'flagged',
        candidate.pipeline,
        screeningStatus,
        screeningStatus === 'ai_used' ? 'AI usage detected' : 'Ready for Review',
        completion,
        `CAND-${candidate.id.slice(-4)}`,
        '198.51.100.42',
        candidate.integrity.focus_loss_count >= 6 ? 1 : 0,
        Math.max(20, 100 - candidate.integrity.focus_loss_count * 10 - candidate.integrity.paste_attempts * 8),
        recommendation
      );

      answerRows.forEach((a, i) => {
        insertAnswer.run(
          uuid(),
          candidate.id,
          a.category_id,
          a.question,
          a.body,
          120 + i * 8,
          i % 3,
          candidate.integrity.focus_loss_count > 2 ? 1 : 0
        );
      });

      insertScore.run(
        uuid(),
        candidate.id,
        normalizedOverall,
        normalizedBucket,
        score.mandatory_points,
        score.optional_points,
        score.mandatory_max,
        score.optional_max,
        score.risk || 'Low',
        score.explanation || `Auto-scored ${candidate.name}`,
        recommendation,
        normalizedOverall >= 80 ? 'High' : normalizedOverall >= 65 ? 'Medium' : 'Low',
        normalizedOverall >= 80 ? 'Tier 1' : normalizedOverall >= 65 ? 'Tier 2' : 'Tier 3'
      );
      candidatesAdded += 1;
    }
  }

  return { jobsAdded, candidatesAdded };
}

/** Keep demo portfolio activity inside dashboard date ranges on long-lived production DBs. */
export function refreshStaleDemoTimestamps() {
  if (process.env.XPERIEVAL_SKIP_DEMO_PORTFOLIO === '1') return 0;

  const stale = db
    .prepare(
      `SELECT a.id FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE j.org_id = ? AND j.deleted_at IS NULL AND a.deleted_at IS NULL
         AND datetime(a.created_at) < datetime('now', '-30 days')
       ORDER BY a.id`
    )
    .all(ORG_ID);

  if (!stale.length) return 0;

  const updateApp = db.prepare(`UPDATE applications SET created_at = datetime('now', ?) WHERE id = ?`);
  const updateScore = db.prepare(
    `UPDATE scores SET created_at = datetime('now', ?) WHERE application_id = ?`
  );

  const run = db.transaction(() => {
    stale.forEach((row, i) => {
      const offset = `-${1 + (i % 28)} days`;
      updateApp.run(offset, row.id);
      updateScore.run(offset, row.id);
    });
    db.prepare(
      `UPDATE jobs SET created_at = datetime('now', '-14 days')
       WHERE org_id = ? AND deleted_at IS NULL AND datetime(created_at) < datetime('now', '-30 days')`
    ).run(ORG_ID);
  });

  run();
  return stale.length;
}

export function ensureDemoPortfolio() {
  ensureMetaTable();

  let result = { skipped: false, jobsAdded: 0, candidatesAdded: 0 };
  const run = db.transaction(() => {
    ensureBaseOrg();
    result = insertPortfolioData();
    db.prepare(
      `INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run('demo_portfolio_marker', DEMO_PORTFOLIO_MARKER);
  });
  run();

  if (result.jobsAdded > 0 || result.candidatesAdded > 0) {
    console.log(
      `[seed] Demo portfolio synced — ${result.jobsAdded} job(s), ${result.candidatesAdded} candidate(s) added (${portfolioApplicationCount()} total portfolio apps)`
    );
  }

  const refreshed = refreshStaleDemoTimestamps();
  if (refreshed > 0) {
    console.log(`[seed] Refreshed activity dates on ${refreshed} demo application(s) for dashboard ranges`);
  }

  return { ...result, timestampsRefreshed: refreshed };
}
