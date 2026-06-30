/**
 * Seed 3 portfolio candidates per job (Green / Amber / Red) with full resumes and scored applications.
 * Run: npm run seed:candidates
 */

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { v4 as uuid } from 'uuid';
import { db } from './db.js';
import { uploadsDir } from './paths.js';
import { DEMO_PORTFOLIO_CANDIDATES } from './demoPortfolioData.js';
import { PORTFOLIO_RESUMES } from './demoPortfolioResumes.js';
import {
  getPortfolioAnswers,
  getAnswerMeta,
  getIntegrityProfile,
} from './demoPortfolioAnswers.js';
import { buildCandidateIntelligenceReport } from './candidateIntelligence.js';
import { analyzeIntegrity } from './integrity.js';
import { analyzeProctoring, DEFAULT_PROCTORING_POLICY } from './proctoring.js';
import { classifyScreeningStatus, computeCompletion } from './screening.js';
import { scoreApplication } from './scoring.js';
import { parsePostingJson } from './jobPosting.js';
import { thresholdsFromJob } from './scoringThresholds.js';

const resumeUploadsDir = join(uploadsDir, 'resumes');
if (!existsSync(resumeUploadsDir)) mkdirSync(resumeUploadsDir, { recursive: true });

const CANDIDATES = DEMO_PORTFOLIO_CANDIDATES.map((c) => ({
  id: c.id,
  jobId: c.jobId,
  name: c.name,
  email: c.email,
  phone: c.phone,
  source: c.source,
  pipeline: c.pipeline || 'application_review',
  quality: c.quality,
}));

function writeResumeFile(candidateId, name, resumeText) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filename = `${slug}-${candidateId.toLowerCase()}-resume.md`;
  const diskPath = join(resumeUploadsDir, filename);
  writeFileSync(diskPath, resumeText, 'utf8');
  return `/uploads/resumes/${filename}`;
}

function normalizeScore(quality, rawOverall) {
  if (quality === 'strong') return Math.max(rawOverall, 84);
  if (quality === 'average') return Math.min(Math.max(rawOverall, 66), 78);
  return Math.min(rawOverall, 56);
}

function bucketFor(overall) {
  if (overall >= 80) return 'Green';
  if (overall >= 60) return 'Amber';
  return 'Red';
}

function recommendationFor(overall) {
  if (overall >= 80) return 'Strongly Recommended';
  if (overall >= 65) return 'Recruiter Review Needed';
  return 'Not Recommended';
}

async function scoreApplicationFull(applicationId) {
  const appRow = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId);
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(appRow.job_id);
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(job.org_id);
  const answers = db.prepare('SELECT * FROM answers WHERE application_id = ?').all(applicationId);
  const categories = db
    .prepare('SELECT * FROM rubric_categories WHERE rubric_version_id = ? ORDER BY sort_order')
    .all(appRow.rubric_version_id);

  let integrity = null;
  try {
    integrity = appRow.integrity_json ? JSON.parse(appRow.integrity_json) : null;
  } catch {
    integrity = null;
  }

  const posting = parsePostingJson(job.posting_json);
  const intelligence = await buildCandidateIntelligenceReport({
    application: appRow,
    job,
    org,
    categories,
    answers,
    integrity,
    posting,
    useAi: false,
    thresholds: thresholdsFromJob(job, org),
  });

  const legacy = scoreApplication({
    answers,
    categories,
    greenThreshold: job.green_threshold ?? 80,
    amberThreshold: job.amber_threshold ?? 60,
  });

  const candidate = CANDIDATES.find((c) => c.id === applicationId);
  const overall = normalizeScore(candidate.quality, intelligence.overall ?? legacy.overall);
  const bucket = bucketFor(overall);
  const explanation = [
    intelligence.insights?.ai_summary || legacy.explanation,
    `Tier: ${intelligence.tier} · ${recommendationFor(overall)}`,
  ].join('\n\n');

  db.prepare('DELETE FROM scores WHERE application_id = ?').run(applicationId);
  db.prepare(
    `INSERT INTO scores (id, application_id, overall, bucket, resume_match, answer_quality,
     evidence_strength, communication, risk, explanation, intelligence_json, recommendation,
     confidence_level, tier)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    uuid(),
    applicationId,
    overall,
    bucket,
    intelligence.dimensions?.technical_competency ?? legacy.mandatory_points,
    intelligence.dimensions?.problem_solving ?? legacy.optional_points,
    intelligence.dimensions?.project_ownership ?? legacy.mandatory_max,
    intelligence.dimensions?.communication ?? legacy.optional_max,
    legacy.risk,
    explanation,
    JSON.stringify({ ...intelligence, overall, bucket }),
    recommendationFor(overall),
    overall >= 80 ? 'High' : overall >= 65 ? 'Medium' : 'Low',
    overall >= 80 ? 'Tier 1' : overall >= 65 ? 'Tier 2' : 'Tier 3'
  );

  for (const pq of intelligence.per_question || []) {
    db.prepare(`UPDATE answers SET score_points=? WHERE application_id=? AND category_id=?`).run(
      pq.questionScore,
      applicationId,
      pq.category_id
    );
  }

  db.prepare(`UPDATE applications SET status = ?, stage = 'Scored', recommendation=? WHERE id = ?`).run(
    legacy.status,
    recommendationFor(overall),
    applicationId
  );

  return { overall, bucket };
}

function insertCandidate(candidate, job, rubricId, categories) {
  const resumeText = PORTFOLIO_RESUMES[candidate.id];
  if (!resumeText) throw new Error(`Missing resume for ${candidate.id}`);

  const resumePath = writeResumeFile(candidate.id, candidate.name, resumeText);
  const answers = getPortfolioAnswers(candidate.jobId, job.title, candidate.quality);
  const integrityRaw = getIntegrityProfile(candidate.quality, categories, answers);
  const proctoringResult = analyzeProctoring(integrityRaw, DEFAULT_PROCTORING_POLICY);
  const integrityResult = analyzeIntegrity(
    {
      ...integrityRaw,
      proctoring_score: proctoringResult.proctoring_score,
      proctoring_flags: proctoringResult.flags,
      proctoring_failed: proctoringResult.failed,
      proctoring_verdict: proctoringResult.proctoring_verdict,
    },
    answers
  );

  const integrityJson = JSON.stringify({
    ...integrityRaw,
    flags: integrityResult.flags,
    proctoring: proctoringResult,
  });

  const answersByCat = {};
  categories.forEach((cat, i) => {
    if (answers[i]?.trim()) answersByCat[cat.id] = { body: answers[i], category_id: cat.id };
  });
  const completion = computeCompletion(categories, answersByCat);
  const screeningMeta = classifyScreeningStatus({
    completion,
    integrityResult,
    mandatoryComplete: completion.mandatory_complete,
  });

  const authenticity =
    candidate.quality === 'strong' ? 96 : candidate.quality === 'average' ? 86 : 58;

  db.prepare(
    `INSERT INTO applications (
      id, job_id, rubric_version_id, name, email, phone, source, resume_path, resume_text,
      integrity_json, authenticity_score, authenticity_verdict, anonymized_code,
      pipeline_stage, submitter_ip, proctoring_failed, proctoring_score,
      screening_status, screening_category, completion_pct, stage, status, recommendation, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Applied', 'Pending score', ?, datetime('now'))`
  ).run(
    candidate.id,
    candidate.jobId,
    rubricId,
    candidate.name,
    candidate.email,
    candidate.phone,
    candidate.source,
    resumePath,
    resumeText,
    integrityJson,
    integrityResult.authenticity_score ?? authenticity,
    integrityResult.authenticity_verdict ??
      (authenticity >= 75 ? 'Likely genuine, typed answers with normal session behavior' : 'Review needed, suspicious session patterns'),
    `CAND-${candidate.id.slice(-4)}`,
    candidate.pipeline,
    '198.51.100.42',
    proctoringResult.failed ? 1 : 0,
    proctoringResult.proctoring_score,
    screeningMeta.screening_status,
    screeningMeta.screening_category,
    Math.round((answers.filter((a) => a?.trim()).length / categories.length) * 100),
    recommendationFor(normalizeScore(candidate.quality, 70))
  );

  const insertAns = db.prepare(
    `INSERT INTO answers (id, application_id, category_id, question, body, response_type,
     time_taken_seconds, idle_seconds, focus_loss_count)
     VALUES (?, ?, ?, ?, ?, 'text', ?, ?, ?)`
  );

  categories.forEach((cat, i) => {
    const meta = getAnswerMeta(candidate.quality, i);
    insertAns.run(
      uuid(),
      candidate.id,
      cat.id,
      cat.question,
      answers[i] || '',
      meta.time_taken_seconds,
      meta.idle_seconds,
      meta.focus_loss_count
    );
  });
}

function clearPortfolioCandidates() {
  for (const { id } of CANDIDATES) {
    db.prepare('DELETE FROM scores WHERE application_id = ?').run(id);
    db.prepare('DELETE FROM answers WHERE application_id = ?').run(id);
    db.prepare('DELETE FROM applications WHERE id = ?').run(id);
    db.prepare('DELETE FROM audit_events WHERE application_id = ?').run(id);
  }
}

async function seedPortfolioCandidates({ clearFirst = true } = {}) {
  if (clearFirst) clearPortfolioCandidates();

  const results = [];
  for (const candidate of CANDIDATES) {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND deleted_at IS NULL').get(candidate.jobId);
    if (!job) {
      console.warn(`[seed] Skipping ${candidate.id}, job ${candidate.jobId} not found`);
      continue;
    }

    const rubric = db
      .prepare(
        `SELECT id FROM rubric_versions WHERE job_id = ? AND status = 'approved' ORDER BY version DESC LIMIT 1`
      )
      .get(candidate.jobId);
    const rubricId =
      rubric?.id ||
      db
        .prepare(`SELECT id FROM rubric_versions WHERE job_id = ? ORDER BY version DESC LIMIT 1`)
        .get(candidate.jobId)?.id;

    if (!rubricId) {
      console.warn(`[seed] Skipping ${candidate.id}, no rubric for ${candidate.jobId}`);
      continue;
    }

    const categories = db
      .prepare('SELECT * FROM rubric_categories WHERE rubric_version_id = ? ORDER BY sort_order')
      .all(rubricId);

    insertCandidate(candidate, job, rubricId, categories);
    const scored = await scoreApplicationFull(candidate.id);
    results.push({
      id: candidate.id,
      name: candidate.name,
      job: job.title,
      bucket: scored.bucket,
      overall: scored.overall,
      quality: candidate.quality,
    });
  }

  console.log(`[seed] Portfolio candidates: ${results.length} created`);
  for (const r of results) {
    console.log(`  ${r.bucket.padEnd(5)} ${r.overall}/100, ${r.name} (${r.job})`);
  }
  return results;
}

/** Add resume files + intelligence reports for portfolio candidates (idempotent). */
export async function enrichPortfolioCandidates({ onlyMissing = true } = {}) {
  const results = [];
  for (const candidate of CANDIDATES) {
    const app = db.prepare('SELECT id, resume_path FROM applications WHERE id = ? AND deleted_at IS NULL').get(candidate.id);
    if (!app) continue;

    const scoreRow = db
      .prepare('SELECT intelligence_json FROM scores WHERE application_id = ?')
      .get(candidate.id);
    if (onlyMissing && app.resume_path && scoreRow?.intelligence_json) continue;

    const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND deleted_at IS NULL').get(candidate.jobId);
    if (!job) continue;

    const rubric = db
      .prepare(
        `SELECT id FROM rubric_versions WHERE job_id = ? AND status = 'approved' ORDER BY version DESC LIMIT 1`
      )
      .get(candidate.jobId);
    const rubricId =
      rubric?.id ||
      db.prepare(`SELECT id FROM rubric_versions WHERE job_id = ? ORDER BY version DESC LIMIT 1`).get(candidate.jobId)?.id;
    if (!rubricId) continue;

    const categories = db
      .prepare('SELECT * FROM rubric_categories WHERE rubric_version_id = ? ORDER BY sort_order')
      .all(rubricId);

    db.prepare('DELETE FROM scores WHERE application_id = ?').run(candidate.id);
    db.prepare('DELETE FROM answers WHERE application_id = ?').run(candidate.id);
    db.prepare('DELETE FROM applications WHERE id = ?').run(candidate.id);

    insertCandidate(candidate, job, rubricId, categories);
    const scored = await scoreApplicationFull(candidate.id);
    results.push({
      id: candidate.id,
      name: candidate.name,
      job: job.title,
      bucket: scored.bucket,
      overall: scored.overall,
    });
  }

  if (results.length) {
    console.log(`[seed] Portfolio enriched: ${results.length} candidate(s)`);
  }
  return results;
}

const isCli = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isCli) {
  seedPortfolioCandidates().catch((e) => {
    console.error('[seed] Failed:', e);
    process.exit(1);
  });
}
