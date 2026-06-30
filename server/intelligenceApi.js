/**
 * Xperieval Intelligence API, evaluate candidates without full Hiring workflow.
 */

import { v4 as uuid } from 'uuid';
import { buildCandidateIntelligenceReport } from './candidateIntelligence.js';
import { thresholdsFromOrg } from './scoringThresholds.js';

export function ensureIntelligenceEvaluationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS intelligence_evaluations (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      external_id TEXT,
      source TEXT DEFAULT 'api',
      job_title TEXT,
      candidate_name TEXT,
      payload_json TEXT,
      result_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_intel_eval_org ON intelligence_evaluations(org_id);
  `);
}

function syntheticCategories(questions = []) {
  return questions.map((q, i) => ({
    id: q.id || `q-${i}`,
    name: q.name || `Question ${i + 1}`,
    question: q.question || q.text || '',
    ideal_answer: q.ideal_answer || '',
    expected_evidence: q.expected_evidence || '',
    keywords: q.keywords || '',
    category_type: q.category_type || 'General',
    priority: q.priority || 'mandatory',
    weight: 10,
  }));
}

function syntheticAnswers(questions = [], answers = []) {
  const byId = new Map(answers.map((a) => [a.question_id || a.category_id, a]));
  return questions.map((q, i) => {
    const id = q.id || `q-${i}`;
    const match = byId.get(id) || answers[i];
    return {
      category_id: id,
      body: match?.answer || match?.body || match?.text || '',
      transcript_text: match?.transcript || null,
      response_seconds: match?.response_seconds || 120,
    };
  });
}

/** Run intelligence scoring from an API payload (no persisted application required). */
export async function evaluateCandidatePayload({ org, job, application, categories, answers, integrity }) {
  const report = await buildCandidateIntelligenceReport({
    application,
    job,
    org,
    categories,
    answers,
    integrity: integrity || {},
    posting: job?.posting || {},
    useAi: true,
    thresholds: thresholdsFromOrg(org),
  });
  return report;
}

export async function runIntelligenceEvaluation(db, orgId, body) {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId);
  if (!org) throw new Error('Organization not found');

  const {
    candidate_name,
    candidate_email,
    external_id,
    job_title,
    job_description,
    resume_text,
    questions = [],
    answers = [],
    integrity = {},
  } = body;

  const categories = syntheticCategories(questions);
  const answerRows = syntheticAnswers(categories, answers);

  const job = {
    title: job_title || 'Role',
    description: job_description || '',
    green_threshold: org.default_green_threshold ?? 80,
    amber_threshold: org.default_amber_threshold ?? 60,
    posting: { summary: job_description || '' },
  };

  const application = {
    id: external_id || uuid(),
    name: candidate_name || 'Candidate',
    email: candidate_email || '',
    resume_text: resume_text || '',
  };

  const report = await evaluateCandidatePayload({
    org,
    job,
    application,
    categories,
    answers: answerRows,
    integrity,
  });

  const evalId = uuid();
  db.prepare(
    `INSERT INTO intelligence_evaluations (id, org_id, external_id, source, job_title, candidate_name, payload_json, result_json)
     VALUES (?, ?, ?, 'api', ?, ?, ?, ?)`
  ).run(
    evalId,
    orgId,
    external_id || null,
    job_title || null,
    candidate_name || null,
    JSON.stringify({ job_title, candidate_name, external_id, answer_count: answers.length }),
    JSON.stringify(report)
  );

  return {
    evaluation_id: evalId,
    experience_score: report.overall,
    bucket: report.bucket,
    tier: report.tier,
    recommendation: report.recommendation,
    confidence_level: report.confidence_level,
    dimensions: report.dimensions,
    explainability: report.explainability,
    experience_fit: report.experience_fit,
    scored_at: report.scored_at,
    report_url: null,
  };
}

export function listRecentEvaluations(db, orgId, limit = 12) {
  return db
    .prepare(
      `SELECT id, external_id, job_title, candidate_name, result_json, created_at
       FROM intelligence_evaluations WHERE org_id = ? ORDER BY datetime(created_at) DESC LIMIT ?`
    )
    .all(orgId, limit)
    .map((row) => {
      let score = null;
      let bucket = null;
      try {
        const r = JSON.parse(row.result_json);
        score = r.overall;
        bucket = r.bucket;
      } catch {
        /* ignore */
      }
      return {
        id: row.id,
        external_id: row.external_id,
        job_title: row.job_title,
        candidate_name: row.candidate_name,
        experience_score: score,
        bucket,
        created_at: row.created_at,
      };
    });
}
