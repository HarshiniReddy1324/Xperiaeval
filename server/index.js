import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import { randomBytes } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db, slugify } from './db.js';
import { buildCorsMiddleware } from './corsConfig.js';
import { uploadsDir } from './paths.js';
import { authMiddleware, signToken, hashPassword, comparePassword, requireRole, createApiKeyMiddleware } from './auth.js';
import { logAudit } from './audit.js';
import { scoreApplication, extractResumeText, getMethodology } from './scoring.js';
import { DEFAULT_RUBRIC_QUESTIONS, validateRubricCategories, rubricRowFromQuestion } from './defaultRubric.js';
import { normalizeRubricCategories, validateRubricQuestions, MIN_RUBRIC_QUESTIONS } from './rubricWeights.js';
import { resolveApplicationSource } from './applicationSource.js';
import {
  parsePostingJson,
  serializePosting,
  buildPublicJobPayload,
} from './jobPosting.js';
import { analyzeIntegrity } from './integrity.js';
import { runBackgroundCheck } from './backgroundCheck.js';
import { parseTranscript, getDefaultInterviewRubric } from './interviewNotetaker.js';
import { scoreInterview } from './interviewScoring.js';
import {
  computeCompletion,
  classifyScreeningStatus,
  generateAnonymizedCode,
  anonymizeApplication,
  buildScreeningMetrics,
  parseKeywords,
  keywordMatchScore,
  analyzePerAnswerIntegrity,
} from './screening.js';
import { buildDashboardAnalytics, buildJobTableRows, buildPositionKpis, sinceFromRange, daysFromRange, sqliteRangeModifier } from './dashboardAnalytics.js';
import {
  summarizeExperienceScores,
  summarizeExperienceScoresForDashboard,
  buildQualityTrend,
  buildJobExperienceIntelligence,
  buildReportsExperienceAnalytics,
} from './experienceAnalytics.js';
import { ensureDemoPortfolio } from './ensureDemoPortfolio.js';
import { normalizeProductMode, hasHiringFeatures, hasIntelligenceFeatures, requireOrgProductFeature } from './productMode.js';
import { assertPilotAction, getPilotSnapshot, pilotDatesForNewOrg } from './pilotProgram.js';
import {
  disconnectOrgConnector,
  getOrgConnectorConfig,
  listConnectorCatalog,
  listConnectorEvents,
  listOrgConnectors,
  saveOrgConnector,
  testOrgConnector,
} from './connectors/service.js';
import {
  autoSyncWorkflowOnShortlist,
  syncConfluenceForCandidate,
  syncJiraForCandidate,
  syncSlackForCandidate,
} from './connectors/atlassianSync.js';
import { getIntegrationHealth, listUnifiedIntegrationActivity } from './integrationsActivity.js';
import { getOrgOnboardingStatus } from './onboarding.js';
import { createApiKey, listApiKeys, revokeApiKey, resolveApiKey } from './apiKeys.js';
import { runIntelligenceEvaluation, listRecentEvaluations } from './intelligenceApi.js';
import { resolveJobForAts, upsertApplicationFromAts } from './atsIngest.js';
import { buildApplicantInsights } from './applicantInsights.js';
import { buildScreeningAnalytics } from './screeningAnalytics.js';
import { buildResumeValidation } from './resumeValidation.js';
import { buildHiddenGemAssessment } from './hiddenGem.js';
import { buildIntegritySignals } from './integritySignals.js';
import { buildBehavioralSignals } from './behavioralSignals.js';
import { buildExperienceFit } from './experienceFit.js';
import { buildFollowUpQuestions } from './followUpQuestions.js';
import { enrichAnswersWithTiming } from './responseTiming.js';
import { analyzeEnvironmentSignals } from './environmentSignals.js';
import { analyzeMultiVoice } from './multiVoiceDetection.js';
import { processWritebackQueue, deliverWriteback } from './atsWriteback.js';
import { fingerprintAudio, compareFingerprints, fingerprintFromStored } from './voiceVerification.js';
import { normalizeAtsPayload, buildWritebackPayload } from './atsAdapter.js';
import { llmConfigured, interviewAnalysisWithLlm } from './llm.js';
import {
  createScheduleInvite,
  candidateBookSlot,
  interviewerConfirmSchedule,
  interviewerDeclineSchedule,
  formatInvitePayload,
  getScheduleInviteForApplication,
} from './scheduleHandlers.js';
import { createNotification, listNotifications, getUnreadCount } from './notifications.js';
import { getIdentityPolicy, applyIdentityView, shouldMaskMaterials } from './identityAccess.js';
import { signAssetPath, serveSignedAsset } from './assetAccess.js';
import {
  getVoiceSampleForApplication,
  indexVoiceFromApplication,
  saveVoiceSampleUpload,
  compareVoiceUpload,
} from './voiceHandlers.js';
import { transcribeUploadedMedia, mergeAnswerTextForScoring } from './audioTranscription.js';
import {
  buildCandidateIntelligenceReport,
  parseIntelligenceReport,
  patchIntelligenceJsonScores,
} from './candidateIntelligence.js';
import {
  parseThresholdsJson,
  thresholdsFromJob,
  thresholdsFromOrg,
  validateThresholds,
  DEFAULT_INTELLIGENCE_THRESHOLDS,
} from './scoringThresholds.js';
import {
  listQuestionPool,
  poolItemsToRubricCategories,
  ensureQuestionPool,
  repairQuestionPoolIfEmpty,
  POOL_DEPARTMENTS,
  POOL_LEVELS,
  createQuestion,
  updateQuestion,
  archiveQuestion,
  exportQuestionPool,
  importQuestionPool,
} from './questionPool.js';
import {
  ensureRubricTemplatesTable,
  listTemplates,
  getTemplate,
  saveTemplateFromCategories,
  saveTemplateFromQuestions,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  listTemplateVersions,
  recordTemplateApplication,
  exportTemplates,
  importTemplates,
  saveTemplateFromPoolIds,
} from './rubricTemplates.js';
import { isDeiBlindMode } from './identityAccess.js';
import {
  parseProctoringPolicy,
  analyzeProctoring,
  shouldRejectSubmission,
  checkIpDuplicate,
  normalizeIntegrityPayload,
  DEFAULT_PROCTORING_POLICY,
} from './proctoring.js';
import {
  softDeleteJob,
  softDeleteApplication,
  restoreJob,
  restoreApplication,
  permanentDeleteJob,
  permanentDeleteApplication,
  listTrash,
  trashCount,
  SQL_JOB_ACTIVE,
  SQL_APP_ACTIVE_A,
  SQL_JOB_ACTIVE_J,
} from './softDelete.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const apiKeyAuth = createApiKeyMiddleware(db, resolveApiKey);
const requireHiring = requireOrgProductFeature(db, 'hiring');
const requireIntelligence = requireOrgProductFeature(db, 'intelligence');
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.use(buildCorsMiddleware());
app.use(express.json({ limit: '2mb' }));

app.get('/api/assets', (req, res) => {
  serveSignedAsset(db, req.query, res);
});

app.get('/uploads/*', (_req, res) => {
  res.status(404).json({ error: 'Direct upload access is disabled. Use signed application asset links.' });
});

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => cb(null, `${uuid()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

function updateScreeningMeta(applicationId, categories) {
  const appRow = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId);
  const answers = db.prepare('SELECT * FROM answers WHERE application_id = ?').all(applicationId);
  const answersByCat = {};
  for (const a of answers) answersByCat[a.category_id] = a;

  let integrityResult = { authenticity_score: appRow.authenticity_score, flags: [] };
  if (appRow.integrity_json) {
    try {
      const parsed = JSON.parse(appRow.integrity_json);
      integrityResult = analyzeIntegrity(parsed, answers.map((x) => x.body || x.transcript_text || ''));
    } catch {
      /* keep stored scores */
    }
  }

  const completion = computeCompletion(categories, answersByCat);
  const classification = classifyScreeningStatus({
    completion,
    integrityResult,
    mandatoryComplete: completion.mandatory_complete,
  });

  db.prepare(
    `UPDATE applications SET screening_status=?, screening_category=?, completion_pct=?,
     recommendation=? WHERE id=?`
  ).run(
    classification.screening_status,
    classification.screening_category,
    completion.completion_pct,
    classification.recommendation,
    applicationId
  );

  queueAtsWriteback(applicationId);
  return { completion, ...classification };
}

function queueAtsWriteback(applicationId) {
  const appRow = db
    .prepare(
      `SELECT a.*, j.org_id FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = ?`
    )
    .get(applicationId);
  if (!appRow) return;
  const integration = db
    .prepare('SELECT id, writeback_url FROM ats_integrations WHERE org_id = ? AND enabled = 1 LIMIT 1')
    .get(appRow.org_id);
  if (!integration) return;
  const score = db.prepare('SELECT * FROM scores WHERE application_id = ?').get(applicationId);
  if (!score || score.overall == null) return;
  let experienceFit = null;
  let behavioralSignals = null;
  try {
    const report = score?.intelligence_json ? JSON.parse(score.intelligence_json) : null;
    experienceFit = report?.experience_fit;
    behavioralSignals = report?.behavioral
      ? buildBehavioralSignals(
          appRow.integrity_json ? JSON.parse(appRow.integrity_json) : null,
          report.behavioral,
          appRow
        )
      : null;
  } catch {
    /* optional */
  }
  const payload = buildWritebackPayload({
    application: appRow,
    score,
    screening: {
      screening_status: appRow.screening_status,
      completion_pct: appRow.completion_pct,
      recommendation: appRow.recommendation,
    },
    experienceFit,
    behavioralSignals,
  });

  const payloadJson = JSON.stringify(payload);
  const existing = db
    .prepare(
      `SELECT id FROM ats_writeback_queue
       WHERE application_id = ? AND status IN ('pending', 'failed', 'queued')
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(applicationId);

  if (existing) {
    db.prepare(
      `UPDATE ats_writeback_queue SET payload_json = ?, status = 'pending', last_error = NULL WHERE id = ?`
    ).run(payloadJson, existing.id);
  } else {
    db.prepare(
      `INSERT INTO ats_writeback_queue (id, org_id, application_id, payload_json) VALUES (?, ?, ?, ?)`
    ).run(uuid(), appRow.org_id, applicationId, payloadJson);
  }

  processWritebackQueue(db, { orgId: appRow.org_id, limit: 5 }).catch(() => {});
}

function getApprovedRubric(jobId) {
  return db
    .prepare(
      `SELECT rv.* FROM rubric_versions rv
       WHERE rv.job_id = ? AND rv.status = 'approved'
       ORDER BY rv.version DESC LIMIT 1`
    )
    .get(jobId);
}

function getRubricCategories(rubricVersionId) {
  return db
    .prepare(
      `SELECT * FROM rubric_categories WHERE rubric_version_id = ? ORDER BY sort_order`
    )
    .all(rubricVersionId);
}

function getClientBaseUrl(req) {
  const origin = req?.headers?.origin || req?.headers?.referer;
  if (origin) {
    try {
      const u = new URL(origin);
      return `${u.protocol}//${u.host}`;
    } catch {
      /* fall through */
    }
  }
  return process.env.PUBLIC_APP_URL || 'http://localhost:5173';
}

function jobIsFilled(jobId, stage) {
  if (['Filled', 'Closed', 'Hired'].includes(stage)) return true;
  const row = db
    .prepare(
      `SELECT 1 FROM applications
       WHERE job_id = ? AND deleted_at IS NULL
         AND pipeline_stage IN ('hired', 'offer_extended') LIMIT 1`
    )
    .get(jobId);
  return Boolean(row);
}

function jobStats(jobId) {
  const rows = db
    .prepare(
      `SELECT s.bucket, COUNT(*) as c FROM applications a
       LEFT JOIN scores s ON s.application_id = a.id
       WHERE a.job_id = ? AND a.deleted_at IS NULL GROUP BY s.bucket`
    )
    .all(jobId);
  const total = db
    .prepare('SELECT COUNT(*) as c FROM applications WHERE job_id = ? AND deleted_at IS NULL')
    .get(jobId).c;
  const stats = { applicants: total, green: 0, amber: 0, red: 0, unscored: 0 };
  for (const r of rows) {
    if (r.bucket === 'Green') stats.green = r.c;
    else if (r.bucket === 'Amber') stats.amber = r.c;
    else if (r.bucket === 'Red') stats.red = r.c;
    else stats.unscored += r.c;
  }
  const unscored = db
    .prepare(
      `SELECT COUNT(*) as c FROM applications a
       LEFT JOIN scores s ON s.application_id = a.id
       WHERE a.job_id = ? AND a.deleted_at IS NULL AND s.id IS NULL`
    )
    .get(jobId).c;
  stats.unscored = unscored;
  return stats;
}

async function runScoring(applicationId, actorName = 'System') {
  const appRow = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId);
  if (!appRow) return null;

  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(appRow.job_id);
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(job.org_id);
  const answers = db.prepare('SELECT * FROM answers WHERE application_id = ?').all(applicationId);
  const rubricId =
    appRow.rubric_version_id || getApprovedRubric(appRow.job_id)?.id;
  const categories = rubricId
    ? db.prepare('SELECT * FROM rubric_categories WHERE rubric_version_id = ?').all(rubricId)
    : [];

  let integrity = null;
  try {
    integrity = appRow.integrity_json ? JSON.parse(appRow.integrity_json) : null;
  } catch {
    integrity = null;
  }

  const posting = parsePostingJson(job.posting_json);
  let followUpAnswers = null;
  try {
    followUpAnswers = appRow.follow_up_json ? JSON.parse(appRow.follow_up_json) : null;
  } catch {
    followUpAnswers = null;
  }

  const intelligence = await buildCandidateIntelligenceReport({
    application: appRow,
    job,
    org,
    categories,
    answers,
    integrity,
    posting,
    useAi: true,
    thresholds: thresholdsFromJob(job, org),
    followUpAnswers,
  });

  const experienceMismatch = intelligence.experience_fit?.employment_mismatch ? 1 : 0;

  const legacy = scoreApplication({
    answers,
    categories,
    greenThreshold: job.green_threshold,
    amberThreshold: job.amber_threshold,
  });

  const resumeValidationForGem = buildResumeValidation({
    resumeText: appRow.resume_text,
    jobTitle: job.title,
    jobKeywords: categories.flatMap((c) => parseKeywords(c.keywords)),
    job,
    posting,
  });

  const hiddenGem = buildHiddenGemAssessment({
    applicationScore: {
      overall: intelligence.overall ?? legacy.overall,
      bucket: intelligence.bucket ?? legacy.bucket,
      mandatory_points: legacy.mandatory_points,
      mandatory_max: legacy.mandatory_max,
    },
    resumeValidation: resumeValidationForGem,
    integrity: integrity
      ? { ...integrity, authenticity_score: appRow.authenticity_score }
      : { authenticity_score: appRow.authenticity_score },
  });

  const overall = intelligence.overall ?? legacy.overall;
  const bucket = intelligence.bucket ?? legacy.bucket;
  const reportForStorage = {
    ...intelligence,
    overall,
    bucket,
    recommendation: intelligence.recommendation,
    confidence_level: intelligence.confidence_level,
    tier: intelligence.tier,
    hidden_gem: hiddenGem,
    scored_at: new Date().toISOString(),
  };
  const intelligenceJson = JSON.stringify(reportForStorage);
  const explanation = [
    intelligence.insights?.ai_summary || legacy.explanation,
    `Tier: ${intelligence.tier} · ${intelligence.recommendation}`,
  ].join('\n\n');

  const existing = db.prepare('SELECT id FROM scores WHERE application_id = ?').get(applicationId);
  if (existing) {
    db.prepare(
      `UPDATE scores SET overall=?, bucket=?, resume_match=?, answer_quality=?,
       evidence_strength=?, communication=?, risk=?, explanation=?, intelligence_json=?,
       recommendation=?, confidence_level=?, tier=?, created_at=datetime('now')
       WHERE application_id=?`
    ).run(
      overall,
      bucket,
      intelligence.dimensions?.technical_competency ?? legacy.mandatory_points,
      intelligence.dimensions?.problem_solving ?? legacy.optional_points,
      intelligence.dimensions?.project_ownership ?? legacy.mandatory_max,
      intelligence.dimensions?.communication ?? legacy.optional_max,
      legacy.risk,
      explanation,
      intelligenceJson,
      intelligence.recommendation,
      intelligence.confidence_level,
      intelligence.tier,
      applicationId
    );
  } else {
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
      intelligence.dimensions?.technical_competency ?? 0,
      intelligence.dimensions?.problem_solving ?? 0,
      intelligence.dimensions?.project_ownership ?? 0,
      intelligence.dimensions?.communication ?? 0,
      legacy.risk,
      explanation,
      intelligenceJson,
      intelligence.recommendation,
      intelligence.confidence_level,
      intelligence.tier
    );
  }

  for (const pq of intelligence.per_question || []) {
    db.prepare(`UPDATE answers SET score_points=? WHERE application_id=? AND category_id=?`).run(
      pq.questionScore,
      applicationId,
      pq.category_id
    );
  }

  db.prepare(`UPDATE applications SET status = ?, stage = 'Scored', recommendation=?, hidden_gem=?, experience_mismatch=? WHERE id = ?`).run(
    legacy.status,
    intelligence.recommendation,
    hiddenGem.isHiddenGem ? 1 : 0,
    experienceMismatch,
    applicationId
  );

  updateScreeningMeta(applicationId, categories);

  queueAtsWriteback(applicationId);

  logAudit({
    orgId: job.org_id,
    jobId: job.id,
    applicationId,
    actorName,
    eventType: 'Candidate intelligence scored',
    description: `${applicationId} intelligence ${overall}/100 (${intelligence.tier}), ${intelligence.recommendation}`,
  });

  logAudit({
    orgId: job.org_id,
    jobId: job.id,
    applicationId,
    actorName: 'System',
    eventType: 'Protected data excluded',
    description: 'Protected attributes excluded from score inputs',
  });

  return { ...legacy, overall, bucket, intelligence };
}

function pilotBlocked(res, err) {
  if (err?.code === 'PILOT_LIMIT') {
    res.status(403).json({ error: err.message, pilot: err.pilot });
    return true;
  }
  return false;
}

// ——— Auth ———
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, orgName, product_mode } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const orgId = uuid();
  const userId = uuid();
  const mode = normalizeProductMode(product_mode || 'both');
  const { pilot_started_at, pilot_ends_at } = pilotDatesForNewOrg();
  db.prepare(
    `INSERT INTO organizations (id, name, product_mode, plan_tier, pilot_started_at, pilot_ends_at)
     VALUES (?, ?, ?, 'pilot', ?, ?)`
  ).run(orgId, orgName || `${name}'s Organization`, mode, pilot_started_at, pilot_ends_at);
  db.prepare(
    `INSERT INTO users (id, org_id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?, 'Admin')`
  ).run(userId, orgId, email.toLowerCase(), hashPassword(password), name);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const token = signToken(user);
  logAudit({ orgId, actorId: userId, actorName: name, eventType: 'Organization created', description: `New pilot workspace: ${orgName || name}` });
  const pilot = getPilotSnapshot(db, db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId));
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.org_id,
      productMode: mode,
      hasHiring: hasHiringFeatures(mode),
      hasIntelligence: hasIntelligenceFeatures(mode),
      pilot,
    },
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get((email || '').toLowerCase());
  if (!user || !comparePassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = signToken(user);
  const org = db.prepare('SELECT id, product_mode, plan_tier, pilot_started_at, pilot_ends_at, pilot_limits_json FROM organizations WHERE id = ?').get(user.org_id);
  const productMode = normalizeProductMode(org?.product_mode);
  const pilot = getPilotSnapshot(db, org);
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.org_id,
      productMode,
      hasHiring: hasHiringFeatures(productMode),
      hasIntelligence: hasIntelligenceFeatures(productMode),
      pilot,
    },
  });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, email, name, role, org_id FROM users WHERE id = ?').get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const org = db
    .prepare('SELECT id, name, product_mode, embed_allowed_origins, plan_tier, pilot_started_at, pilot_ends_at, pilot_limits_json FROM organizations WHERE id = ?')
    .get(user.org_id);
  const productMode = normalizeProductMode(org?.product_mode);
  const pilot = getPilotSnapshot(db, org);
  res.json({
    ...user,
    orgId: user.org_id,
    orgName: org?.name,
    productMode,
    hasHiring: hasHiringFeatures(productMode),
    hasIntelligence: hasIntelligenceFeatures(productMode),
    embedAllowedOrigins: org?.embed_allowed_origins || '*',
    pilot,
  });
});

// ——— Dashboard ———
app.get('/api/dashboard', authMiddleware, requireHiring, (req, res) => {
  const range = req.query.range || '30d';
  const rangeModifier = sqliteRangeModifier(range);
  const since = sinceFromRange(range, db);
  const days = daysFromRange(range);

  const jobs = db
    .prepare(`SELECT * FROM jobs WHERE org_id = ? AND ${SQL_JOB_ACTIVE} ORDER BY created_at DESC`)
    .all(req.user.orgId);
  const enriched = jobs.map((j) => {
    const owner = j.owner_id ? db.prepare('SELECT name FROM users WHERE id = ?').get(j.owner_id) : null;
    return { ...j, owner: owner?.name || 'Unassigned', ...jobStats(j.id) };
  });
  const totals = enriched.reduce(
    (acc, j) => ({
      applicants: acc.applicants + j.applicants,
      green: acc.green + j.green,
      amber: acc.amber + j.amber,
      red: acc.red + j.red,
    }),
    { applicants: 0, green: 0, amber: 0, red: 0 }
  );
  const screening = buildScreeningMetrics(req.user.orgId, db);
  const analytics = buildDashboardAnalytics(req.user.orgId, db, enriched, { since, days, range, rangeModifier });
  const hiredJobIds = db
    .prepare(
      `SELECT DISTINCT a.job_id FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE j.org_id = ? AND j.deleted_at IS NULL AND a.deleted_at IS NULL
         AND a.pipeline_stage IN ('hired', 'offer_extended')`
    )
    .all(req.user.orgId)
    .map((r) => r.job_id);
  const kpiCards = buildPositionKpis(enriched, { hiredJobIds });
  const appsInRange = db
    .prepare(
      `SELECT a.id, a.job_id, a.authenticity_score, s.overall, s.bucket
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       LEFT JOIN scores s ON s.application_id = a.id
       WHERE j.org_id = ? AND j.deleted_at IS NULL AND a.deleted_at IS NULL
         AND datetime(a.created_at) >= datetime('now', ?)`
    )
    .all(req.user.orgId, rangeModifier);
  const jobTable = buildJobTableRows(enriched, appsInRange);
  const recommendations = db
    .prepare(
      `       SELECT a.id, a.anonymized_code, a.recommendation, a.screening_category, a.hidden_gem,
              s.overall, s.bucket, s.tier, s.recommendation as hiring_recommendation, s.confidence_level
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       LEFT JOIN scores s ON s.application_id = a.id
       WHERE j.org_id = ? AND ${SQL_JOB_ACTIVE_J} AND ${SQL_APP_ACTIVE_A}
         AND datetime(a.created_at) >= datetime('now', ?)
         AND a.screening_status = 'complete' AND s.overall IS NOT NULL
       ORDER BY a.hidden_gem DESC, s.overall DESC LIMIT 8`
    )
    .all(req.user.orgId, rangeModifier)
    .map((r) => ({
      id: r.id,
      display_name: r.anonymized_code || r.id,
      recommendation: r.hiring_recommendation || r.recommendation,
      tier: r.tier,
      confidence_level: r.confidence_level,
      score: r.overall,
      bucket: r.bucket,
      hidden_gem: r.hidden_gem === 1,
    }));

  const pendingSchedule = db
    .prepare(
      `SELECT COUNT(*) as c FROM interview_schedule_invites i
       JOIN applications a ON a.id = i.application_id
       JOIN jobs j ON j.id = a.job_id
       WHERE j.org_id = ? AND ${SQL_JOB_ACTIVE_J} AND ${SQL_APP_ACTIVE_A} AND i.status = 'awaiting_interviewer'`
    )
    .get(req.user.orgId).c;

  const pendingScheduleList = db
    .prepare(
      `SELECT a.id, a.anonymized_code, a.name, i.confirmed_starts_at, i.timezone, j.title as job_title
       FROM interview_schedule_invites i
       JOIN applications a ON a.id = i.application_id
       JOIN jobs j ON j.id = a.job_id
       WHERE j.org_id = ? AND ${SQL_JOB_ACTIVE_J} AND ${SQL_APP_ACTIVE_A} AND i.status = 'awaiting_interviewer'
       ORDER BY i.updated_at DESC LIMIT 10`
    )
    .all(req.user.orgId);

  res.json({
    jobs: enriched,
    totals,
    screening,
    analytics: {
      ...analytics,
      experienceIntelligence: summarizeExperienceScoresForDashboard(db, req.user.orgId, rangeModifier),
      qualityTrend: buildQualityTrend(db, req.user.orgId, 6),
    },
    kpiCards,
    jobTable,
    recommendations,
    dateRange: { range, since, days, label: analytics.dateRange?.label },
    pendingSchedule,
    pendingScheduleList,
    trashCount: trashCount(db, req.user.orgId),
    onboarding: getOrgOnboardingStatus(db, req.user.orgId),
  });
});

// ——— Trash / recover ———
app.get('/api/trash', authMiddleware, (req, res) => {
  res.json(listTrash(db, req.user.orgId));
});

app.post('/api/jobs/:id/restore', authMiddleware, (req, res) => {
  const job = db
    .prepare(`SELECT * FROM jobs WHERE id = ? AND org_id = ? AND deleted_at IS NOT NULL`)
    .get(req.params.id, req.user.orgId);
  if (!job) return res.status(404).json({ error: 'Position not in trash' });
  restoreJob(db, job.id);
  logAudit({
    orgId: req.user.orgId,
    jobId: job.id,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'Job restored',
    description: `Restored job ${job.id}, ${job.title}`,
  });
  res.json({ ok: true, message: 'Position and its applications restored' });
});

app.post('/api/applications/:id/restore', authMiddleware, (req, res) => {
  const appRow = db
    .prepare(
      `SELECT a.*, j.org_id, j.title as job_title, j.deleted_at as job_deleted
       FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE a.id = ? AND j.org_id = ? AND a.deleted_at IS NOT NULL`
    )
    .get(req.params.id, req.user.orgId);
  if (!appRow) return res.status(404).json({ error: 'Application not in trash' });
  if (appRow.job_deleted) {
    return res.status(400).json({ error: 'Restore the position first, this application was removed with the position posting.' });
  }
  restoreApplication(db, appRow.id);
  logAudit({
    orgId: req.user.orgId,
    jobId: appRow.job_id,
    applicationId: appRow.id,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'Application restored',
    description: `Restored ${appRow.name} (${appRow.id}) for ${appRow.job_title}`,
  });
  res.json({ ok: true, message: 'Application restored' });
});

app.delete('/api/jobs/:id/permanent', authMiddleware, requireRole('Admin', 'Recruiter'), (req, res) => {
  const job = db
    .prepare(`SELECT * FROM jobs WHERE id = ? AND org_id = ? AND deleted_at IS NOT NULL`)
    .get(req.params.id, req.user.orgId);
  if (!job) return res.status(404).json({ error: 'Position not in trash' });
  permanentDeleteJob(db, job.id);
  logAudit({
    orgId: req.user.orgId,
    jobId: job.id,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'Job permanently deleted',
    description: `Purged job ${job.id}, ${job.title}`,
  });
  res.json({ ok: true, message: 'Position permanently deleted' });
});

app.delete('/api/applications/:id/permanent', authMiddleware, requireRole('Admin', 'Recruiter'), (req, res) => {
  const appRow = db
    .prepare(
      `SELECT a.*, j.org_id, j.title as job_title FROM applications a
       JOIN jobs j ON j.id = a.job_id WHERE a.id = ? AND j.org_id = ? AND a.deleted_at IS NOT NULL`
    )
    .get(req.params.id, req.user.orgId);
  if (!appRow) return res.status(404).json({ error: 'Application not in trash' });
  permanentDeleteApplication(db, appRow.id);
  logAudit({
    orgId: req.user.orgId,
    jobId: appRow.job_id,
    applicationId: appRow.id,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'Application permanently deleted',
    description: `Purged ${appRow.name} (${appRow.id})`,
  });
  res.json({ ok: true, message: 'Application permanently deleted' });
});

// ——— Jobs ———
app.get('/api/jobs', authMiddleware, (req, res) => {
  const jobs = db
    .prepare(`SELECT * FROM jobs WHERE org_id = ? AND ${SQL_JOB_ACTIVE} ORDER BY created_at DESC`)
    .all(req.user.orgId);
  res.json(
    jobs.map((j) => {
      const owner = j.owner_id ? db.prepare('SELECT name FROM users WHERE id = ?').get(j.owner_id) : null;
      return { ...j, owner: owner?.name, is_filled: jobIsFilled(j.id, j.stage), ...jobStats(j.id) };
    })
  );
});

function attachPosting(job, org) {
  if (!job) return null;
  const posting = parsePostingJson(job.posting_json);
  const base = process.env.PUBLIC_APP_URL || 'http://localhost:5173';
  return {
    ...job,
    posting,
    applyUrl: `${base}/apply/${job.slug}`,
    careersUrl: `${base}/careers/${job.slug}`,
    orgName: org?.name,
  };
}

app.post('/api/jobs', authMiddleware, requireHiring, (req, res) => {
  const { title, team, location, description, stage, position_level, posting, green_threshold, amber_threshold } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.user.orgId);
  try {
    assertPilotAction(db, org, 'create_position');
  } catch (err) {
    if (pilotBlocked(res, err)) return;
    throw err;
  }
  const th = thresholdsFromOrg(org);
  const id = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
  const slug = `${slugify(title)}-${id.toLowerCase()}`;
  const postingData = serializePosting({ posting, team, description });
  db.prepare(
    `INSERT INTO jobs (id, org_id, title, team, location, stage, position_level, owner_id, slug, description, posting_json,
     green_threshold, amber_threshold)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    req.user.orgId,
    title,
    postingData.department || team || '',
    location || '',
    stage || 'Draft',
    position_level || 'entry',
    req.user.sub,
    slug,
    postingData.summary || description || '',
    JSON.stringify(postingData),
    green_threshold ?? th.bucket.green,
    amber_threshold ?? th.bucket.amber
  );
  const rubricId = uuid();
  db.prepare(`INSERT INTO rubric_versions (id, job_id, version, status) VALUES (?, ?, 1, 'draft')`).run(
    rubricId,
    id
  );
  const insertCat = db.prepare(
    `INSERT INTO rubric_categories (id, rubric_version_id, name, weight, question, expected_evidence, sort_order,
     response_type, priority, min_response_seconds, max_response_seconds, keywords, category_type, ideal_answer)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  DEFAULT_RUBRIC_QUESTIONS.forEach((q, i) => {
    const row = rubricRowFromQuestion(q);
    insertCat.run(
      uuid(),
      rubricId,
      q.name,
      q.weight,
      q.question,
      row.expected_evidence,
      i,
      'text',
      q.priority,
      90,
      300,
      q.keywords,
      q.category_type || 'General',
      row.ideal_answer
    );
  });
  logAudit({
    orgId: req.user.orgId,
    jobId: id,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'Job created',
    description: `Job ${id}, ${title} created`,
  });
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  res.status(201).json({ ...attachPosting(job, org), ...jobStats(id) });
});

app.get('/api/jobs/:id', authMiddleware, (req, res) => {
  const job = db.prepare(`SELECT * FROM jobs WHERE id = ? AND org_id = ? AND ${SQL_JOB_ACTIVE}`).get(req.params.id, req.user.orgId);
  if (!job) return res.status(404).json({ error: 'Position not found' });
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.user.orgId);
  const owner = job.owner_id ? db.prepare('SELECT name FROM users WHERE id = ?').get(job.owner_id) : null;
  const draftRubric = db.prepare('SELECT * FROM rubric_versions WHERE job_id = ? AND status = ?').get(job.id, 'draft');
  const rubric =
    draftRubric ||
    getApprovedRubric(job.id) ||
    db.prepare('SELECT * FROM rubric_versions WHERE job_id = ? ORDER BY version DESC LIMIT 1').get(job.id);
  const categories = rubric ? getRubricCategories(rubric.id) : [];
  res.json({ ...attachPosting(job, org), owner: owner?.name, rubric, categories, ...jobStats(job.id), experienceIntelligence: buildJobExperienceIntelligence(db, job.id) });
});

app.patch('/api/jobs/:id', authMiddleware, requireHiring, (req, res) => {
  const job = db.prepare(`SELECT * FROM jobs WHERE id = ? AND org_id = ? AND ${SQL_JOB_ACTIVE}`).get(req.params.id, req.user.orgId);
  if (!job) return res.status(404).json({ error: 'Position not found' });
  const { title, team, location, stage, position_level, description, green_threshold, amber_threshold, posting } = req.body;
  let postingJson = job.posting_json;
  if (posting !== undefined) {
    postingJson = JSON.stringify(serializePosting({ posting, team, description }));
  }
  const summary =
    posting !== undefined ? parsePostingJson(postingJson).summary : description;
  if (posting !== undefined) {
    db.prepare(
      `UPDATE jobs SET title=COALESCE(?,title), team=COALESCE(?,team), location=COALESCE(?,location),
       stage=COALESCE(?,stage), position_level=COALESCE(?,position_level), description=COALESCE(?,description),
       green_threshold=COALESCE(?,green_threshold), amber_threshold=COALESCE(?,amber_threshold),
       posting_json=? WHERE id=?`
    ).run(title, team, location, stage, position_level, summary, green_threshold, amber_threshold, postingJson, job.id);
  } else {
    db.prepare(
      `UPDATE jobs SET title=COALESCE(?,title), team=COALESCE(?,team), location=COALESCE(?,location),
       stage=COALESCE(?,stage), position_level=COALESCE(?,position_level), description=COALESCE(?,description),
       green_threshold=COALESCE(?,green_threshold), amber_threshold=COALESCE(?,amber_threshold)
       WHERE id=?`
    ).run(title, team, location, stage, position_level, description, green_threshold, amber_threshold, job.id);
  }
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.user.orgId);
  res.json(attachPosting(db.prepare('SELECT * FROM jobs WHERE id = ?').get(job.id), org));
});

app.delete('/api/jobs/:id', authMiddleware, requireHiring, (req, res) => {
  const job = db
    .prepare(`SELECT * FROM jobs WHERE id = ? AND org_id = ? AND ${SQL_JOB_ACTIVE}`)
    .get(req.params.id, req.user.orgId);
  if (!job) return res.status(404).json({ error: 'Position not found' });
  softDeleteJob(db, job.id);
  logAudit({
    orgId: req.user.orgId,
    jobId: job.id,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'Job moved to trash',
    description: `Moved job ${job.id}, ${job.title} to trash`,
  });
  res.json({ ok: true, message: 'Position moved to trash. Recover it from Trash within your retention period.' });
});

// ——— Rubric ———
app.get('/api/jobs/:id/rubric', authMiddleware, (req, res) => {
  const job = db.prepare(`SELECT * FROM jobs WHERE id = ? AND org_id = ? AND ${SQL_JOB_ACTIVE}`).get(req.params.id, req.user.orgId);
  if (!job) return res.status(404).json({ error: 'Position not found' });
  const rubric = db.prepare('SELECT * FROM rubric_versions WHERE job_id = ? ORDER BY version DESC LIMIT 1').get(job.id);
  const categories = rubric ? getRubricCategories(rubric.id) : [];
  res.json({ rubric, categories });
});

app.put('/api/jobs/:id/rubric', authMiddleware, (req, res) => {
  const job = db.prepare(`SELECT * FROM jobs WHERE id = ? AND org_id = ? AND ${SQL_JOB_ACTIVE}`).get(req.params.id, req.user.orgId);
  if (!job) return res.status(404).json({ error: 'Position not found' });
  let rubric = db.prepare('SELECT * FROM rubric_versions WHERE job_id = ? AND status = ?').get(job.id, 'draft');
  if (!rubric) {
    const latest = db.prepare('SELECT MAX(version) as v FROM rubric_versions WHERE job_id = ?').get(job.id);
    const version = (latest?.v || 0) + 1;
    const rubricId = uuid();
    db.prepare(`INSERT INTO rubric_versions (id, job_id, version, status) VALUES (?, ?, ?, 'draft')`).run(
      rubricId,
      job.id,
      version
    );
    rubric = db.prepare('SELECT * FROM rubric_versions WHERE id = ?').get(rubricId);
  }
  if (rubric.status === 'approved') {
    return res.status(400).json({ error: 'Approved rubrics cannot be edited. Create a new version.' });
  }
  db.prepare('DELETE FROM rubric_categories WHERE rubric_version_id = ?').run(rubric.id);
  const { categories } = req.body;
  const normalized = normalizeRubricCategories(categories || []);
  const validation = validateRubricQuestions(normalized);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }
  const insertCat = db.prepare(
    `INSERT INTO rubric_categories (id, rubric_version_id, name, weight, question, expected_evidence, sort_order,
     response_type, priority, min_response_seconds, max_response_seconds, keywords, category_type, ideal_answer)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  normalized.forEach((c, i) => {
    const keywords =
      typeof c.keywords === 'string' ? c.keywords : c.keywords ? JSON.stringify(c.keywords) : '';
    insertCat.run(
      uuid(),
      rubric.id,
      c.name,
      c.weight,
      c.question,
      c.expected_evidence || '',
      i,
      c.response_type || 'text',
      c.priority || 'mandatory',
      c.min_response_seconds || 90,
      c.max_response_seconds || 300,
      keywords,
      c.category_type || 'General',
      c.ideal_answer || c.expected_evidence || ''
    );
  });
  res.json({ rubric, categories: getRubricCategories(rubric.id) });
});

app.get('/api/question-pool/meta', authMiddleware, (_req, res) => {
  res.json({ departments: POOL_DEPARTMENTS, levels: POOL_LEVELS });
});

app.get('/api/question-pool', authMiddleware, (req, res) => {
  try {
    repairQuestionPoolIfEmpty(db);
    const { department, level, search } = req.query;
    const items = listQuestionPool(db, {
      orgId: req.user.orgId,
      department,
      level,
      search,
    }).map((item) => ({
      ...item,
      source_label:
        item.org_id == null
          ? 'System'
          : item.source_type === 'template'
            ? `Template${item.source_template_name ? `: ${item.source_template_name}` : ''}`
            : 'Org',
    }));
    res.json({ items, count: items.length });
  } catch (e) {
    console.error('[question-pool]', e);
    res.status(500).json({ error: e.message || 'Failed to load question pool' });
  }
});

app.get('/api/question-pool/export', authMiddleware, (req, res) => {
  res.json({ items: exportQuestionPool(db, req.user.orgId) });
});

app.post('/api/question-pool/import', authMiddleware, (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items array is required' });
  const results = importQuestionPool(db, req.user.orgId, items, req.user.sub);
  res.status(201).json({ results, message: `Added ${results.added.length}, linked ${results.linked.length}` });
});

app.post('/api/question-pool', authMiddleware, (req, res) => {
  const result = createQuestion(db, req.user.orgId, req.body, req.user.sub);
  if (result.error) return res.status(400).json({ error: result.error, existing: result.existing });
  res.status(201).json({ id: result.id, message: 'Question added to library' });
});

app.put('/api/question-pool/:id', authMiddleware, (req, res) => {
  const result = updateQuestion(db, req.params.id, req.user.orgId, req.body);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ id: result.id, message: 'Question updated' });
});

app.delete('/api/question-pool/:id', authMiddleware, (req, res) => {
  const result = archiveQuestion(db, req.params.id, req.user.orgId);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ message: 'Question archived' });
});

// ——— Rubric templates ———
app.get('/api/rubric-templates', authMiddleware, (req, res) => {
  ensureRubricTemplatesTable(db);
  res.json({ templates: listTemplates(db, req.user.orgId) });
});

app.get('/api/rubric-templates/export', authMiddleware, (req, res) => {
  ensureRubricTemplatesTable(db);
  res.json({ templates: exportTemplates(db, req.user.orgId) });
});

app.post('/api/rubric-templates/import', authMiddleware, (req, res) => {
  ensureRubricTemplatesTable(db);
  const { templates } = req.body;
  if (!Array.isArray(templates) || !templates.length) {
    return res.status(400).json({ error: 'templates array is required' });
  }
  const results = importTemplates(db, req.user.orgId, templates, req.user.sub);
  res.status(201).json({ results, message: `Imported ${results.filter((r) => r.id).length} template(s)` });
});

app.get('/api/rubric-templates/:id', authMiddleware, (req, res) => {
  ensureRubricTemplatesTable(db);
  const tpl = getTemplate(db, req.params.id, req.user.orgId);
  if (!tpl) return res.status(404).json({ error: 'Template not found' });
  res.json({ template: tpl });
});

app.get('/api/rubric-templates/:id/versions', authMiddleware, (req, res) => {
  ensureRubricTemplatesTable(db);
  const versions = listTemplateVersions(db, req.params.id, req.user.orgId);
  if (!versions.length) return res.status(404).json({ error: 'Template not found' });
  res.json({ versions });
});

app.post('/api/rubric-templates', authMiddleware, (req, res) => {
  ensureRubricTemplatesTable(db);
  const { job_id, name, description, department, experience_level, questions, sync_to_library } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Template name is required' });

  let result;
  if (job_id) {
    const job = db.prepare(`SELECT id, title FROM jobs WHERE id = ? AND org_id = ?`).get(job_id, req.user.orgId);
    if (!job) return res.status(404).json({ error: 'Position not found' });
    const rubric = db.prepare('SELECT * FROM rubric_versions WHERE job_id = ? ORDER BY version DESC LIMIT 1').get(job.id);
    if (!rubric) return res.status(400).json({ error: 'No screening configured for this position' });
    const categories = getRubricCategories(rubric.id);
    result = saveTemplateFromCategories(db, {
      orgId: req.user.orgId,
      name: name.trim(),
      description: description || `From ${job.title}`,
      department,
      experience_level,
      categories,
      createdBy: req.user.sub,
      syncToLibrary: sync_to_library !== false,
    });
  } else if (Array.isArray(questions) && questions.length) {
    result = saveTemplateFromQuestions(db, {
      orgId: req.user.orgId,
      name: name.trim(),
      description,
      department,
      experience_level,
      questions,
      createdBy: req.user.sub,
      syncToLibrary: sync_to_library !== false,
    });
  } else {
    return res.status(400).json({ error: 'Provide job_id or questions array' });
  }

  if (result.error) return res.status(400).json({ error: result.error });
  logAudit({
    orgId: req.user.orgId,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'Rubric template saved',
    description: `Template "${name}" created`,
  });
  res.status(201).json({
    id: result.id,
    version: result.version,
    librarySync: result.librarySync,
    message: 'Template saved',
  });
});

app.post('/api/rubric-templates/from-pool', authMiddleware, (req, res) => {
  ensureRubricTemplatesTable(db);
  const { name, description, department, experience_level, pool_ids: poolIds } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Template name is required' });
  if (!Array.isArray(poolIds) || poolIds.length < MIN_RUBRIC_QUESTIONS) {
    return res.status(400).json({ error: `Select at least ${MIN_RUBRIC_QUESTIONS} question from the library` });
  }
  const placeholders = poolIds.map(() => '?').join(',');
  const items = db
    .prepare(`SELECT * FROM question_pool WHERE id IN (${placeholders}) AND (org_id IS NULL OR org_id = ?) AND (archived IS NULL OR archived = 0)`)
    .all(...poolIds, req.user.orgId);
  if (items.length < MIN_RUBRIC_QUESTIONS) return res.status(400).json({ error: 'Some selected questions were not found' });

  const result = saveTemplateFromPoolIds(db, {
    orgId: req.user.orgId,
    name: name.trim(),
    description,
    department,
    experience_level,
    poolItems: items,
    createdBy: req.user.sub,
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.status(201).json({ id: result.id, message: `Template "${name}" created from library` });
});

app.put('/api/rubric-templates/:id', authMiddleware, (req, res) => {
  ensureRubricTemplatesTable(db);
  const { name, description, department, experience_level, questions, sync_to_library } = req.body;
  const result = updateTemplate(db, req.params.id, req.user.orgId, {
    name,
    description,
    department,
    experience_level,
    questions,
    syncToLibrary: sync_to_library !== false,
    updatedBy: req.user.sub,
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ id: result.id, librarySync: result.librarySync, message: 'Template updated' });
});

app.post('/api/rubric-templates/:id/duplicate', authMiddleware, (req, res) => {
  ensureRubricTemplatesTable(db);
  const { name } = req.body;
  const result = duplicateTemplate(db, req.params.id, req.user.orgId, name, req.user.sub);
  if (result.error) return res.status(400).json({ error: result.error });
  res.status(201).json({ id: result.id, message: 'Template duplicated' });
});

app.delete('/api/rubric-templates/:id', authMiddleware, (req, res) => {
  ensureRubricTemplatesTable(db);
  const result = deleteTemplate(db, req.params.id, req.user.orgId);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json({ message: 'Template deleted' });
});

app.post('/api/jobs/:id/rubric/from-template/:templateId', authMiddleware, (req, res) => {
  const job = db.prepare(`SELECT * FROM jobs WHERE id = ? AND org_id = ? AND ${SQL_JOB_ACTIVE}`).get(req.params.id, req.user.orgId);
  if (!job) return res.status(404).json({ error: 'Position not found' });
  const tpl = getTemplate(db, req.params.templateId, req.user.orgId);
  if (!tpl) return res.status(404).json({ error: 'Template not found' });

  let rubric = db.prepare('SELECT * FROM rubric_versions WHERE job_id = ? AND status = ?').get(job.id, 'draft');
  if (!rubric) {
    const latest = db.prepare('SELECT MAX(version) as v FROM rubric_versions WHERE job_id = ?').get(job.id);
    const rubricId = uuid();
    db.prepare(`INSERT INTO rubric_versions (id, job_id, version, status) VALUES (?, ?, ?, 'draft')`).run(
      rubricId,
      job.id,
      (latest?.v || 0) + 1
    );
    rubric = db.prepare('SELECT * FROM rubric_versions WHERE id = ?').get(rubricId);
  }
  if (rubric.status === 'approved') {
    return res.status(400).json({ error: 'Cannot replace approved rubric' });
  }

  db.prepare('DELETE FROM rubric_categories WHERE rubric_version_id = ?').run(rubric.id);
  const normalized = normalizeRubricCategories(
    tpl.questions.map((c) => ({
      ...c,
      priority: c.priority || 'mandatory',
    }))
  );
  const insertCat = db.prepare(
    `INSERT INTO rubric_categories (id, rubric_version_id, name, weight, question, expected_evidence, sort_order,
     response_type, priority, min_response_seconds, max_response_seconds, keywords, category_type, ideal_answer)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  normalized.forEach((c, i) => {
    insertCat.run(
      uuid(),
      rubric.id,
      c.name,
      c.weight,
      c.question,
      c.expected_evidence || '',
      i,
      c.response_type || 'text',
      c.priority || 'mandatory',
      c.min_response_seconds || 90,
      c.max_response_seconds || 300,
      c.keywords || '',
      c.category_type || 'General',
      c.ideal_answer || c.expected_evidence || ''
    );
  });

  logAudit({
    orgId: req.user.orgId,
    jobId: job.id,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'Rubric from template',
    description: `Applied template "${tpl.name}" to ${job.title}`,
  });
  recordTemplateApplication(db, tpl.id, job.id, req.user.sub);

  res.json({ rubric, categories: getRubricCategories(rubric.id), message: `Applied template "${tpl.name}"` });
});

app.post('/api/jobs/:id/rubric/from-pool', authMiddleware, (req, res) => {
  const job = db.prepare(`SELECT * FROM jobs WHERE id = ? AND org_id = ? AND ${SQL_JOB_ACTIVE}`).get(req.params.id, req.user.orgId);
  if (!job) return res.status(404).json({ error: 'Position not found' });
  const { pool_ids: poolIds } = req.body;
  if (!Array.isArray(poolIds) || poolIds.length < MIN_RUBRIC_QUESTIONS) {
    return res.status(400).json({ error: `Select at least ${MIN_RUBRIC_QUESTIONS} question from the pool` });
  }
  const placeholders = poolIds.map(() => '?').join(',');
  const items = db
    .prepare(
      `SELECT * FROM question_pool WHERE id IN (${placeholders}) AND (org_id IS NULL OR org_id = ?)`
    )
    .all(...poolIds, req.user.orgId);
  if (items.length < MIN_RUBRIC_QUESTIONS) return res.status(400).json({ error: 'Some selected questions were not found' });

  let rubric = db.prepare('SELECT * FROM rubric_versions WHERE job_id = ? AND status = ?').get(job.id, 'draft');
  if (!rubric) {
    const latest = db.prepare('SELECT MAX(version) as v FROM rubric_versions WHERE job_id = ?').get(job.id);
    const rubricId = uuid();
    db.prepare(`INSERT INTO rubric_versions (id, job_id, version, status) VALUES (?, ?, ?, 'draft')`).run(
      rubricId,
      job.id,
      (latest?.v || 0) + 1
    );
    rubric = db.prepare('SELECT * FROM rubric_versions WHERE id = ?').get(rubricId);
  }
  if (rubric.status === 'approved') {
    return res.status(400).json({ error: 'Cannot replace an approved rubric. Create a new rubric version first.' });
  }

  const categories = poolItemsToRubricCategories(items);

  db.prepare('DELETE FROM rubric_categories WHERE rubric_version_id = ?').run(rubric.id);
  const insertCat = db.prepare(
    `INSERT INTO rubric_categories (id, rubric_version_id, name, weight, question, expected_evidence, sort_order,
     response_type, priority, min_response_seconds, max_response_seconds, keywords, category_type, ideal_answer)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  categories.forEach((c, i) => {
    insertCat.run(
      uuid(),
      rubric.id,
      c.name,
      c.weight,
      c.question,
      c.expected_evidence,
      i,
      c.response_type || 'text',
      c.priority,
      c.min_response_seconds || 90,
      c.max_response_seconds || 300,
      c.keywords,
      c.category_type || 'General',
      c.ideal_answer || c.expected_evidence
    );
  });

  logAudit({
    orgId: req.user.orgId,
    jobId: job.id,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'Rubric from question pool',
    description: `Applied ${items.length} pool questions to ${job.title}`,
  });

  res.json({ rubric, categories: getRubricCategories(rubric.id), message: 'Screening questions applied from pool' });
});

app.post('/api/jobs/:id/rubric/revise', authMiddleware, (req, res) => {
  const job = db.prepare(`SELECT * FROM jobs WHERE id = ? AND org_id = ? AND ${SQL_JOB_ACTIVE}`).get(req.params.id, req.user.orgId);
  if (!job) return res.status(404).json({ error: 'Position not found' });

  let draft = db.prepare('SELECT * FROM rubric_versions WHERE job_id = ? AND status = ?').get(job.id, 'draft');
  if (draft) {
    return res.json({
      rubric: draft,
      categories: getRubricCategories(draft.id),
      message: `Draft v${draft.version} already exists, continue editing`,
    });
  }

  const source = db
    .prepare('SELECT * FROM rubric_versions WHERE job_id = ? ORDER BY version DESC LIMIT 1')
    .get(job.id);
  if (!source) return res.status(400).json({ error: 'No screening found for this position' });

  const latest = db.prepare('SELECT MAX(version) as v FROM rubric_versions WHERE job_id = ?').get(job.id);
  const rubricId = uuid();
  db.prepare(`INSERT INTO rubric_versions (id, job_id, version, status) VALUES (?, ?, ?, 'draft')`).run(
    rubricId,
    job.id,
    (latest?.v || 0) + 1
  );

  const sourceCats = getRubricCategories(source.id);
  const insertCat = db.prepare(
    `INSERT INTO rubric_categories (id, rubric_version_id, name, weight, question, expected_evidence, sort_order,
     response_type, priority, min_response_seconds, max_response_seconds, keywords, category_type, ideal_answer)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  sourceCats.forEach((c, i) => {
    insertCat.run(
      uuid(),
      rubricId,
      c.name,
      c.weight,
      c.question,
      c.expected_evidence,
      i,
      c.response_type || 'text',
      c.priority || 'mandatory',
      c.min_response_seconds || 90,
      c.max_response_seconds || 300,
      c.keywords,
      c.category_type || 'General',
      c.ideal_answer || c.expected_evidence
    );
  });

  const rubric = db.prepare('SELECT * FROM rubric_versions WHERE id = ?').get(rubricId);
  logAudit({
    orgId: req.user.orgId,
    jobId: job.id,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'Rubric revised',
    description: `Created draft v${rubric.version} from ${source.status} v${source.version} for ${job.title}`,
  });

  res.json({
    rubric,
    categories: getRubricCategories(rubric.id),
    message: `Draft v${rubric.version} created from approved v${source.version}`,
  });
});

app.post('/api/jobs/:id/rubric/approve', authMiddleware, (req, res) => {
  const job = db.prepare(`SELECT * FROM jobs WHERE id = ? AND org_id = ? AND ${SQL_JOB_ACTIVE}`).get(req.params.id, req.user.orgId);
  if (!job) return res.status(404).json({ error: 'Position not found' });
  const rubric = db.prepare('SELECT * FROM rubric_versions WHERE job_id = ? ORDER BY version DESC LIMIT 1').get(job.id);
  if (!rubric) return res.status(400).json({ error: 'No rubric found' });
  const cats = getRubricCategories(rubric.id);
  const validation = validateRubricCategories(cats);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }
  db.prepare(
    `UPDATE rubric_versions SET status='approved', approved_by=?, approved_at=datetime('now') WHERE id=?`
  ).run(req.user.sub, rubric.id);
  if (job.stage === 'Draft') {
    db.prepare(`UPDATE jobs SET stage='Open' WHERE id=?`).run(job.id);
  }
  logAudit({
    orgId: req.user.orgId,
    jobId: job.id,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'Rubric approved',
    description: `${job.id} rubric v${rubric.version} approved before candidate scoring`,
  });
  res.json({ rubric: db.prepare('SELECT * FROM rubric_versions WHERE id = ?').get(rubric.id), categories: cats });
});

// ——— Public careers posting ———
app.get('/api/public/careers/:slug', (req, res) => {
  const job = db.prepare(`SELECT * FROM jobs WHERE slug = ? AND ${SQL_JOB_ACTIVE}`).get(req.params.slug);
  if (!job) return res.status(404).json({ error: 'Position not found' });
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(job.org_id);
  const base = process.env.PUBLIC_APP_URL || `${req.protocol}://${req.get('host')?.replace(':3001', ':5173') || 'http://localhost:5173'}`;
  res.json(buildPublicJobPayload(job, org, base));
});

// ——— Public apply ———
app.get('/api/public/jobs/:slug', (req, res) => {
  const job = db
    .prepare(
      `SELECT id, title, team, location, description, slug, org_id, candidate_notice_override FROM jobs WHERE slug = ? AND ${SQL_JOB_ACTIVE}`
    )
    .get(req.params.slug);
  if (!job) return res.status(404).json({ error: 'Position not found' });
  const rubric = getApprovedRubric(job.id);
  if (!rubric) return res.status(400).json({ error: 'This position is not accepting applications yet' });
  const categories = getRubricCategories(rubric.id);
  const org = db
    .prepare(
      `SELECT name, candidate_notice, require_typed_answers, track_session_integrity, require_screening_complete,
              proctoring_policy_json FROM organizations WHERE id = (SELECT org_id FROM jobs WHERE id = ?)`
    )
    .get(job.id);
  const proctoringPolicy = parseProctoringPolicy(org);
  res.json({
    job,
    categories: categories.map((c, i) => ({
      id: c.id,
      question: c.question,
      response_type: c.response_type || 'text',
      sort_order: i,
      optional: c.priority === 'optional',
    })),
    orgName: org?.name,
    candidateNotice: job.candidate_notice_override || org?.candidate_notice,
    requireTypedAnswers: !!org?.require_typed_answers || proctoringPolicy.block_copy_paste,
    trackIntegrity: proctoringPolicy.enabled,
    proctoringPolicy,
    requireScreeningComplete: !!org?.require_screening_complete,
    allowAudioAnswers: true,
  });
});

app.get('/api/public/embed-config/:slug', (req, res) => {
  const job = db
    .prepare(`SELECT id, title, slug, org_id FROM jobs WHERE slug = ? AND ${SQL_JOB_ACTIVE}`)
    .get(req.params.slug);
  if (!job) return res.status(404).json({ error: 'Position not found' });
  const org = db
    .prepare('SELECT name, embed_allowed_origins, product_mode FROM organizations WHERE id = ?')
    .get(job.org_id);
  res.json({
    orgName: org?.name,
    productMode: normalizeProductMode(org?.product_mode),
    allowedOrigins: org?.embed_allowed_origins || '*',
    job: { id: job.id, title: job.title, slug: job.slug },
    applyPath: `/embed/apply/${job.slug}`,
  });
});

app.post('/api/public/jobs/:slug/fit-preview', upload.single('resume'), async (req, res) => {
  const job = db.prepare(`SELECT * FROM jobs WHERE slug = ? AND ${SQL_JOB_ACTIVE}`).get(req.params.slug);
  if (!job) return res.status(404).json({ error: 'Position not found' });
  const rubric = getApprovedRubric(job.id);
  if (!rubric) return res.status(400).json({ error: 'Position not open' });

  let resumeText = req.body?.resumeText || '';
  if (req.file?.path) {
    resumeText = (await extractResumeText(req.file.path, req.file.originalname)) || resumeText;
  }

  const posting = parsePostingJson(job.posting_json);
  const categories = getRubricCategories(rubric.id);
  const jobKeywords = categories.flatMap((c) => parseKeywords(c.keywords));

  const resumeValidation = buildResumeValidation({
    resumeText,
    jobTitle: job.title,
    jobKeywords,
    job,
    posting,
  });

  const followUpQuestions = buildFollowUpQuestions({
    experienceFit: resumeValidation.experienceFit,
    domainMatrix: resumeValidation.domainMatrix,
    resumeValidation,
  });

  res.json({
    experienceFit: resumeValidation.experienceFit,
    domainMatrix: resumeValidation.domainMatrix,
    resumeConfidence: resumeValidation.confidence,
    followUpQuestions,
    requiresFollowUp: followUpQuestions.length > 0,
  });
});

app.post('/api/public/jobs/:slug/apply', upload.any(), async (req, res) => {
  try {
  const job = db.prepare(`SELECT * FROM jobs WHERE slug = ? AND ${SQL_JOB_ACTIVE}`).get(req.params.slug);
  if (!job) return res.status(404).json({ error: 'Position not found' });
  const rubric = getApprovedRubric(job.id);
  if (!rubric) return res.status(400).json({ error: 'Position not open for applications' });

  const { name, email, phone, utm_source: utmSource, utm_medium: utmMedium, ref, channel } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

  const source = resolveApplicationSource({
    utmSource,
    utmMedium,
    ref,
    referrer: req.headers.referer || req.headers.referrer,
    channel: channel === 'embed' ? 'embed' : 'careers',
  });

  const files = req.files || [];
  const resumeFile = files.find((f) => f.fieldname === 'resume') || files.find((f) => f.fieldname === 'file');
  const applicationId = `XP-${Math.floor(1000 + Math.random() * 9000)}`;
  const anonymizedCode = generateAnonymizedCode(applicationId);
  const resumePath = resumeFile?.path || null;
  const resumeText = resumeFile?.path
    ? await extractResumeText(resumePath, resumeFile?.originalname)
    : '';

  const orgRow = db.prepare('SELECT * FROM organizations WHERE id = ?').get(job.org_id);
  try {
    assertPilotAction(db, orgRow, 'add_candidate');
  } catch (err) {
    if (pilotBlocked(res, err)) return;
    throw err;
  }
  const proctoringPolicy = parseProctoringPolicy(orgRow);

  let integrityData = null;
  try {
    integrityData = req.body.integrity ? JSON.parse(req.body.integrity) : null;
  } catch {
    integrityData = null;
  }

  if (integrityData?.environment) {
    const envAnalysis = analyzeEnvironmentSignals(integrityData.environment);
    integrityData.environment_analysis = envAnalysis;
    integrityData.vm_suspected = envAnalysis.vm_suspected;
    if (envAnalysis.flags?.length) {
      integrityData.flags = [...new Set([...(integrityData.flags || []), ...envAnalysis.flags])];
    }
  }

  let followUpPayload = null;
  try {
    followUpPayload = req.body.follow_up ? JSON.parse(req.body.follow_up) : null;
  } catch {
    followUpPayload = null;
  }

  const submitterIp =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    null;

  let answersParsed = [];
  try {
    answersParsed = JSON.parse(req.body.answers || '[]');
  } catch {
    answersParsed = [];
  }

  const categories = getRubricCategories(rubric.id);
  const answerBodies = [];
  const answerMeta = [];

  for (const cat of categories) {
    const match = answersParsed.find((a) => a.category_id === cat.id || a.categoryId === cat.id);
    const body = match?.body || req.body[`answer_${cat.id}`] || '';
    answerBodies.push(body);
    answerMeta.push({
      sort_order: cat.sort_order,
      body,
      idle_seconds: match?.idle_seconds || 0,
      focus_loss_count: match?.focus_loss_count || 0,
      time_taken_seconds: match?.time_taken_seconds || 0,
      min_seconds: 0,
      max_seconds: cat.max_response_seconds || 300,
    });
  }

  const perAnswerFlags = analyzePerAnswerIntegrity(answerMeta, integrityData?.fields);
  const ipDuplicate =
    proctoringPolicy.track_ip_duplicates &&
    checkIpDuplicate(db, job.id, submitterIp, proctoringPolicy.ip_duplicate_window_hours || 24);
  if (integrityData && ipDuplicate) integrityData.ip_duplicate = true;

  const proctoringResult = analyzeProctoring(integrityData, proctoringPolicy);
  const rejectMsg = shouldRejectSubmission(proctoringResult, proctoringPolicy);
  if (rejectMsg) {
    return res.status(403).json({ error: rejectMsg, proctoring: proctoringResult });
  }

  const integrityResult = analyzeIntegrity(
    {
      ...integrityData,
      proctoring_score: proctoringResult.proctoring_score,
      proctoring_flags: proctoringResult.flags,
      proctoring_failed: proctoringResult.failed,
      proctoring_verdict: proctoringResult.proctoring_verdict,
    },
    answerBodies
  );
  integrityResult.proctoring_score = proctoringResult.proctoring_score;
  integrityResult.proctoring_verdict = proctoringResult.proctoring_verdict;
  integrityResult.proctoring_failed = proctoringResult.failed;

  if (perAnswerFlags.flags.length) {
    integrityResult.flags = [...new Set([...(integrityResult.flags || []), ...perAnswerFlags.flags])];
    integrityResult.authenticity_score = Math.max(
      0,
      integrityResult.authenticity_score - Math.min(30, perAnswerFlags.risk)
    );
  }

  const postingForFit = parsePostingJson(job.posting_json);
  const preFit = buildExperienceFit({ resumeText, job, posting: postingForFit });

  db.prepare(
    `INSERT INTO applications (id, job_id, rubric_version_id, name, email, phone, source, resume_path, resume_text,
     integrity_json, authenticity_score, authenticity_verdict, anonymized_code, pipeline_stage,
     submitter_ip, proctoring_failed, proctoring_score, follow_up_json, experience_mismatch)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'application_review', ?, ?, ?, ?, ?)`
  ).run(
    applicationId,
    job.id,
    rubric.id,
    name,
    email,
    phone || '',
    source,
    resumePath ? `/uploads/${resumeFile.filename}` : null,
    resumeText,
    integrityData
      ? JSON.stringify({
          ...integrityData,
          flags: integrityResult.flags,
          per_answer: answerMeta,
          proctoring: proctoringResult,
          submitter_ip: submitterIp,
        })
      : null,
    integrityResult.authenticity_score,
    integrityResult.authenticity_verdict,
    anonymizedCode,
    submitterIp,
    proctoringResult.failed ? 1 : 0,
    proctoringResult.proctoring_score,
    followUpPayload ? JSON.stringify(followUpPayload) : null,
    preFit.employment_mismatch ? 1 : 0
  );

  const insertAnswer = db.prepare(
    `INSERT INTO answers (id, application_id, category_id, question, body, response_type, media_path,
     time_taken_seconds, idle_seconds, focus_loss_count, keywords_matched, transcript_text)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let voiceStored = null;
  for (const cat of categories) {
    const match = answersParsed.find((a) => a.category_id === cat.id || a.categoryId === cat.id);
    const body = match?.body || '';
    const mediaFile = files.find((f) => f.fieldname === `media_${cat.id}`);
    let mediaPath = null;
    let transcriptText = null;
    let responseType = match?.response_type || cat.response_type || 'text';

    if (mediaFile) {
      mediaPath = `/uploads/${mediaFile.filename}`;
      const mime = mediaFile.mimetype || 'audio/webm';
      const isAudioLike = mime.startsWith('audio/') || mime.startsWith('video/');

      if (isAudioLike) {
        try {
          const buf = readFileSync(mediaFile.path);
          const fp = fingerprintAudio(buf, mime);
          if (fp && !voiceStored) {
            voiceStored = fp;
            db.prepare(
              `INSERT INTO voice_samples (id, application_id, fingerprint, sample_json, media_path)
               VALUES (?, ?, ?, ?, ?)`
            ).run(uuid(), applicationId, fp.fingerprint, JSON.stringify(fp), mediaPath);
            db.prepare(`UPDATE applications SET voice_fingerprint=? WHERE id=?`).run(
              JSON.stringify(fp),
              applicationId
            );
          }
        } catch {
          /* fingerprint optional */
        }

        const tx = await transcribeUploadedMedia(mediaFile, { typedBody: body });
        if (tx.transcript) transcriptText = tx.transcript;
        responseType = body && !/^\[(audio|video)/i.test(body) ? 'text+audio' : 'audio';
      }
    }

    const scoredText = mergeAnswerTextForScoring({ body, transcript_text: transcriptText });
    const km = keywordMatchScore(scoredText, parseKeywords(cat.keywords));
    const storedBody =
      body && !/^\[(audio|video).*recorded/i.test(body)
        ? body
        : transcriptText || (mediaPath ? '[Audio answer, see recording]' : '');

    insertAnswer.run(
      uuid(),
      applicationId,
      cat.id,
      cat.question,
      storedBody,
      responseType,
      mediaPath,
      match?.time_taken_seconds || 0,
      match?.idle_seconds || 0,
      match?.focus_loss_count || 0,
      km.matched,
      transcriptText
    );
  }

  let multiVoiceResult = null;
  for (const cat of categories) {
    const match = answersParsed.find((a) => a.category_id === cat.id || a.categoryId === cat.id);
    const ansRow = db
      .prepare('SELECT transcript_text, body FROM answers WHERE application_id=? AND category_id=?')
      .get(applicationId, cat.id);
    const transcript = ansRow?.transcript_text || '';
    const clientAnalysis = match?.audio_analysis || integrityData?.audio_analysis?.[cat.id];
    const mv = analyzeMultiVoice({ transcript, clientAnalysis });
    if (mv.risk === 'high' || (mv.risk === 'medium' && multiVoiceResult?.risk !== 'high')) {
      multiVoiceResult = mv;
    }
  }
  if (multiVoiceResult && multiVoiceResult.risk !== 'low' && integrityData) {
    const merged = {
      ...integrityData,
      multi_voice: multiVoiceResult,
      flags: [...new Set([...(integrityData.flags || []), 'multi_voice_risk'])],
    };
    db.prepare(`UPDATE applications SET integrity_json=? WHERE id=?`).run(
      JSON.stringify(merged),
      applicationId
    );
  }

  const screeningMeta = updateScreeningMeta(applicationId, categories);
  const result = await runScoring(applicationId);

  logAudit({
    orgId: job.org_id,
    jobId: job.id,
    applicationId,
    actorName: name,
    eventType: 'Application submitted',
    description: `${name} completed screening for ${job.title} (${screeningMeta.screening_status})`,
  });
  if (integrityResult.authenticity_score !== null && integrityResult.authenticity_score < 75) {
    logAudit({
      orgId: job.org_id,
      jobId: job.id,
      applicationId,
      actorName: 'System',
      eventType: 'Integrity alert',
      description: `${integrityResult.authenticity_verdict} (score ${integrityResult.authenticity_score})`,
    });
  }
  if (screeningMeta.screening_status === 'ai_used') {
    logAudit({
      orgId: job.org_id,
      jobId: job.id,
      applicationId,
      actorName: 'System',
      eventType: 'AI Used flagged',
      description: 'Candidate moved to AI Used review category',
    });
  }

  res.status(201).json({
    applicationId,
    screening: screeningMeta,
    anonymizedCode,
    message: 'Application submitted successfully. The hiring team will review your responses.',
  });
  } catch (err) {
    console.error('[apply]', err);
    res.status(500).json({ error: err.message || 'Application failed to save' });
  }
});

// ——— Applications ———
app.get('/api/applications', authMiddleware, (req, res) => {
  const { jobId, bucket, pipeline, screening, integrity, hiddenGem } = req.query;
  const orgRow = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.user.orgId);
  const viewer = req.user;

  let sql = `SELECT a.id, a.name, a.email, a.source, a.status, a.pipeline_stage, a.created_at,
      a.authenticity_score, a.authenticity_verdict, a.screening_status, a.screening_category,
      a.completion_pct, a.anonymized_code, a.identity_revealed, a.recommendation, a.hidden_gem,
      a.job_id,
      s.overall as application_score, s.bucket as application_bucket,
      s.recommendation, s.confidence_level, s.tier,
      i.overall as interview_score, i.bucket as interview_bucket, i.status as interview_status,
      si.status as schedule_status, si.confirmed_starts_at as schedule_time,
      j.title as job_title
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    LEFT JOIN scores s ON s.application_id = a.id
    LEFT JOIN interview_sessions i ON i.id = (
      SELECT id FROM interview_sessions WHERE application_id = a.id ORDER BY created_at DESC LIMIT 1
    )
    LEFT JOIN interview_schedule_invites si ON si.id = (
      SELECT id FROM interview_schedule_invites
      WHERE application_id = a.id AND status != 'cancelled'
      ORDER BY
        CASE status WHEN 'awaiting_interviewer' THEN 0 WHEN 'confirmed' THEN 1 WHEN 'awaiting_candidate' THEN 2 ELSE 3 END,
        datetime(updated_at) DESC LIMIT 1
    )
    WHERE j.org_id = ? AND ${SQL_JOB_ACTIVE_J} AND ${SQL_APP_ACTIVE_A}`;
  const params = [req.user.orgId];
  if (jobId) {
    sql += ' AND a.job_id = ?';
    params.push(jobId);
  }
  if (bucket) {
    sql += ' AND s.bucket = ?';
    params.push(bucket);
  }
  if (pipeline === 'interviewing') {
    sql += ` AND (
      a.pipeline_stage IN ('shortlisted_interview', 'interview_scheduled', 'interview_completed', 'interview_pending')
      OR EXISTS (
        SELECT 1 FROM interview_schedule_invites si2
        WHERE si2.application_id = a.id
          AND si2.status IN ('awaiting_candidate', 'awaiting_interviewer', 'confirmed')
      )
    )`;
  } else if (pipeline === 'selected') {
    sql += ` AND a.pipeline_stage IN ('offer_extended', 'hired', 'final_review')`;
  } else if (pipeline) {
    sql += ' AND a.pipeline_stage = ?';
    params.push(pipeline);
  }
  if (screening) {
    sql += ' AND a.screening_status = ?';
    params.push(screening);
  }
  if (integrity === 'flagged') {
    sql += ` AND (
      a.screening_status = 'ai_used'
      OR a.proctoring_failed = 1
      OR (a.authenticity_score IS NOT NULL AND a.authenticity_score < 75)
    )`;
  }
  if (hiddenGem === '1') {
    sql += ' AND a.hidden_gem = 1';
  }
  sql += ' ORDER BY COALESCE(s.overall, -1) DESC, a.created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(
    rows.map((r) => {
      const policy = getIdentityPolicy(viewer, r, orgRow);
      const row = {
        ...r,
        score: r.application_score,
        bucket: r.application_bucket,
        identityPolicy: policy,
      };
      if (policy.anonymized) {
        row.name = r.anonymized_code || generateAnonymizedCode(r.id);
        row.email = 'hidden@screening.local';
        row.anonymized = true;
      }
      return row;
    })
  );
});

app.get('/api/applications/compare', authMiddleware, (req, res) => {
  const ids = (req.query.ids || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length < 2 || ids.length > 4) {
    return res.status(400).json({ error: 'Provide 2–4 application ids via ?ids=id1,id2' });
  }
  const orgRow = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.user.orgId);
  const candidates = [];
  for (const id of ids) {
    const payload = getApplicationPayload(id, req.user.orgId, req.user);
    if (!payload) continue;
    const intel = parseIntelligenceReport(
      db.prepare('SELECT intelligence_json, overall, bucket, tier, recommendation FROM scores WHERE application_id = ?').get(id)
    );
    candidates.push({
      id,
      application: payload.application,
      score: payload.applicationScore,
      intelligence: intel || payload.intelligenceReport,
      job_title: payload.application?.job_title,
    });
  }
  if (candidates.length < 2) return res.status(404).json({ error: 'Could not load enough candidates' });
  const jobIds = new Set(
    candidates.map((c) => db.prepare('SELECT job_id FROM applications WHERE id = ?').get(c.id)?.job_id).filter(Boolean)
  );
  if (jobIds.size > 1) {
    return res.status(400).json({ error: 'Compare candidates from the same position only.' });
  }
  const jobId = [...jobIds][0];
  res.json({ candidates, job_id: jobId, org_dei_mode: isDeiBlindMode(orgRow) });
});

app.get('/api/applications/:id', authMiddleware, (req, res) => {
  const payload = getApplicationPayload(req.params.id, req.user.orgId, req.user);
  if (!payload) return res.status(404).json({ error: 'Application not found' });
  res.json(payload);
});

app.post('/api/applications/:id/notes', authMiddleware, (req, res) => {
  const appRow = db
    .prepare(
      `SELECT a.*, j.org_id, j.id as job_id FROM applications a
       JOIN jobs j ON j.id = a.job_id WHERE a.id = ? AND j.org_id = ?`
    )
    .get(req.params.id, req.user.orgId);
  if (!appRow) return res.status(404).json({ error: 'Not found' });
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'Note body required' });
  const noteId = uuid();
  db.prepare(`INSERT INTO reviewer_notes (id, application_id, user_id, body) VALUES (?, ?, ?, ?)`).run(
    noteId,
    appRow.id,
    req.user.sub,
    body.trim()
  );
  logAudit({
    orgId: req.user.orgId,
    jobId: appRow.job_id,
    applicationId: appRow.id,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'Reviewer note',
    description: body.trim().slice(0, 200),
  });
  const payload = getApplicationPayload(req.params.id, req.user.orgId, req.user);
  res.status(201).json({ message: 'Note saved', ...payload });
});

function getInterviewRubric(jobId) {
  return db
    .prepare('SELECT * FROM interview_rubric_questions WHERE job_id = ? ORDER BY sort_order')
    .all(jobId);
}

function getLatestInterviewSession(applicationId) {
  return db
    .prepare(
      `SELECT * FROM interview_sessions WHERE application_id = ? ORDER BY created_at DESC LIMIT 1`
    )
    .get(applicationId);
}

function runInterviewScoring(sessionId) {
  const session = db.prepare('SELECT * FROM interview_sessions WHERE id = ?').get(sessionId);
  if (!session) return null;

  const appRow = db.prepare('SELECT * FROM applications WHERE id = ?').get(session.application_id);
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(session.job_id);
  const responses = db
    .prepare('SELECT * FROM interview_responses WHERE session_id = ? ORDER BY sort_order')
    .all(sessionId);
  const answers = db.prepare('SELECT body FROM answers WHERE application_id = ?').all(appRow.id);
  const applicationText = [appRow.resume_text, ...answers.map((a) => a.body)].filter(Boolean).join('\n');

  const result = scoreInterview({
    responses,
    jobTitle: job.title,
    applicationText,
    greenThreshold: job.green_threshold,
    amberThreshold: job.amber_threshold,
  });

  db.prepare(
    `UPDATE interview_sessions SET status='completed', overall=?, bucket=?, depth=?, relevance=?,
     genuineness=?, communication=?, authenticity_score=?, authenticity_verdict=?, explanation=?,
     completed_at=datetime('now') WHERE id=?`
  ).run(
    result.overall,
    result.bucket,
    result.depth,
    result.relevance,
    result.genuineness,
    result.communication,
    result.authenticity_score,
    result.authenticity_verdict,
    result.explanation,
    sessionId
  );

  db.prepare(`UPDATE applications SET pipeline_stage='interview_completed', status='Interview scored' WHERE id=?`).run(
    appRow.id
  );

  return { ...result, sessionId };
}

function formatInterviewPayload(session) {
  if (!session) return null;
  const responses = db
    .prepare('SELECT * FROM interview_responses WHERE session_id = ? ORDER BY sort_order')
    .all(session.id);
  return {
    id: session.id,
    status: session.status,
    scheduled_at: session.scheduled_at,
    completed_at: session.completed_at,
    transcript: session.transcript,
    score: session.overall != null
      ? {
          overall: session.overall,
          bucket: session.bucket,
          depth: session.depth,
          relevance: session.relevance,
          genuineness: session.genuineness,
          communication: session.communication,
          authenticity_score: session.authenticity_score,
          authenticity_verdict: session.authenticity_verdict,
          explanation: session.explanation,
        }
      : null,
    responses,
  };
}

function getApplicationPayload(applicationId, orgId, user = null) {
  const appRow = db
    .prepare(
      `SELECT a.id, a.job_id, a.rubric_version_id, a.name, a.email, a.phone, a.source,
              a.resume_path, a.resume_text, a.stage, a.status, a.pipeline_stage, a.created_at,
              a.integrity_json, a.authenticity_score, a.authenticity_verdict,
              a.screening_status, a.screening_category, a.completion_pct, a.anonymized_code,
              a.identity_revealed, a.recommendation, a.voice_fingerprint, a.integrations_json,
              j.title as job_title, j.org_id, j.team, j.description as job_description, j.posting_json
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = ? AND j.org_id = ? AND ${SQL_JOB_ACTIVE_J} AND ${SQL_APP_ACTIVE_A}`
    )
    .get(applicationId, orgId);
  if (!appRow) return null;
  const scoreRow = db.prepare('SELECT * FROM scores WHERE application_id = ?').get(appRow.id);
  const answers = db.prepare('SELECT * FROM answers WHERE application_id = ? ORDER BY rowid').all(appRow.id);
  const notes = db
    .prepare(
      `SELECT n.*, u.name as author FROM reviewer_notes n
       LEFT JOIN users u ON u.id = n.user_id WHERE n.application_id = ? ORDER BY n.created_at DESC`
    )
    .all(appRow.id);
  const bgRow = db.prepare('SELECT * FROM background_checks WHERE application_id = ?').get(appRow.id);
  const interviewSession = getLatestInterviewSession(appRow.id);
  const interviewRubric = getInterviewRubric(appRow.job_id);

  let integrity = null;
  if (appRow.integrity_json) {
    try {
      integrity = normalizeIntegrityPayload(JSON.parse(appRow.integrity_json), appRow);
    } catch {
      integrity = null;
    }
  }
  let backgroundCheck = null;
  if (bgRow) {
    try {
      backgroundCheck = { ...JSON.parse(bgRow.report_json), id: bgRow.id, created_at: bgRow.created_at };
    } catch {
      backgroundCheck = { id: bgRow.id, overall_status: bgRow.overall_status, summary: bgRow.summary };
    }
  }

  let scoreBreakdown = null;
  let explanationText = scoreRow?.explanation || '';
  if (scoreRow?.explanation?.includes('"per_question"')) {
    const parts = scoreRow.explanation.split('\n\n');
    explanationText = parts[0] || scoreRow.explanation;
    try {
      scoreBreakdown = JSON.parse(parts[parts.length - 1]);
    } catch {
      scoreBreakdown = null;
    }
  }

  const intelligenceReport = parseIntelligenceReport(scoreRow);

  const rubricCategories = appRow.rubric_version_id
    ? getRubricCategories(appRow.rubric_version_id)
    : [];
  const legacyRubric =
    rubricCategories.length > 0
      ? scoreApplication({ answers, categories: rubricCategories })
      : scoreBreakdown;

  const applicationScore = scoreRow
    ? {
        overall: scoreRow.overall,
        bucket: scoreRow.bucket,
        mandatory_points: legacyRubric?.mandatory_points ?? scoreBreakdown?.mandatory_points,
        optional_points: legacyRubric?.optional_points ?? scoreBreakdown?.optional_points,
        mandatory_max: legacyRubric?.mandatory_max ?? 70,
        optional_max: legacyRubric?.optional_max ?? 30,
        risk: scoreRow.risk,
        explanation: explanationText,
        per_question: legacyRubric?.per_question ?? scoreBreakdown?.per_question,
        recommendation: scoreRow.recommendation || intelligenceReport?.recommendation,
        confidence_level: scoreRow.confidence_level || intelligenceReport?.confidence_level,
        tier: scoreRow.tier || intelligenceReport?.tier,
        stage: 'application',
      }
    : null;

  const orgRow = db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId);
  const viewer = user || { role: 'Hiring Manager' };
  let appView = applyIdentityView(viewer, appRow, orgRow);
  const maskMaterials = shouldMaskMaterials(viewer, appRow, orgRow);
  if (!maskMaterials && appView.resume_path) {
    appView = { ...appView, resume_path: signAssetPath(orgId, appView.resume_path) };
  }

  const voiceVerificationRaw = getVoiceSampleForApplication(appRow.id);
  const voiceVerification = maskMaterials
    ? voiceVerificationRaw
      ? { ...voiceVerificationRaw, media_path: null, pending_media_path: null, fingerprint: null }
      : null
    : voiceVerificationRaw
      ? {
          ...voiceVerificationRaw,
          fingerprint: null,
          media_path: voiceVerificationRaw.media_path
            ? signAssetPath(orgId, voiceVerificationRaw.media_path)
            : null,
          pending_media_path: voiceVerificationRaw.pending_media_path
            ? signAssetPath(orgId, voiceVerificationRaw.pending_media_path)
            : null,
        }
      : null;

  const schedulingInvite = getScheduleInviteForApplication(appRow.id);
  const schedulingRaw = formatInvitePayload(
    schedulingInvite,
    process.env.PUBLIC_APP_URL || 'http://localhost:5173'
  );
  const scheduling = schedulingRaw ? (({ token, ...safe }) => safe)(schedulingRaw) : null;

  const activity = db
    .prepare(
      `SELECT event_type, description, actor_name, created_at FROM audit_events
       WHERE application_id = ? ORDER BY created_at DESC LIMIT 25`
    )
    .all(appRow.id);

  const pendingScheduleAction = scheduling?.status === 'awaiting_interviewer';

  let connectorLinks = {};
  if (appRow.integrations_json) {
    try {
      connectorLinks = JSON.parse(appRow.integrations_json);
    } catch {
      connectorLinks = {};
    }
  }

  const jobKeywords = rubricCategories.flatMap((c) => {
    try {
      return c.keywords ? String(c.keywords).split(/[,;]/).map((k) => k.trim()).filter(Boolean) : [];
    } catch {
      return [];
    }
  });
  const resumeValidation = maskMaterials
    ? null
    : buildResumeValidation({
        resumeText: appRow.resume_text,
        jobTitle: appRow.job_title,
        jobKeywords,
        job: { title: appRow.job_title, team: appRow.team, description: appRow.job_description },
        posting: parsePostingJson(appRow.posting_json),
      });

  const integritySignals = buildIntegritySignals(integrity, appRow);
  const fieldLabels = {};
  answers.forEach((a, i) => {
    if (!a.category_id) return;
    const q = String(a.question || '').trim();
    fieldLabels[a.category_id] =
      q.length > 80 ? `Q${i + 1}: ${q.slice(0, 80)}…` : q ? `Q${i + 1}: ${q}` : `Question ${i + 1}`;
  });
  rubricCategories.forEach((c, i) => {
    if (fieldLabels[c.id]) return;
    const q = String(c.question || c.name || '').trim();
    fieldLabels[c.id] =
      q.length > 80 ? `Q${i + 1}: ${q.slice(0, 80)}…` : q ? `Q${i + 1}: ${q}` : `Question ${i + 1}`;
  });
  const behavioralSignals = buildBehavioralSignals(
    integrity,
    intelligenceReport?.behavioral,
    appRow,
    { fieldLabels, fieldOrder: answers.map((a) => a.category_id).filter(Boolean) }
  );

  const hiddenGemAssessment =
    intelligenceReport?.hidden_gem ||
    buildHiddenGemAssessment({
      applicationScore,
      resumeValidation,
      integrity: integrity
        ? { ...integrity, authenticity_score: appRow.authenticity_score }
        : { authenticity_score: appRow.authenticity_score },
    });

  const maskedAnswers = maskMaterials
    ? answers.map((a) => ({
        ...a,
        body: a.body?.length > 80 ? `${a.body.slice(0, 80)}… [hidden until identity unlock]` : a.body,
        transcript_text: null,
        media_path: null,
      }))
    : answers.map((a) => ({
        ...a,
        media_path: a.media_path ? signAssetPath(orgId, a.media_path) : null,
      }));
  const answersWithTiming = enrichAnswersWithTiming(maskedAnswers, rubricCategories);

  let integrityOut = integrity
    ? { ...integrity, authenticity_score: appRow.authenticity_score, authenticity_verdict: appRow.authenticity_verdict }
    : appRow.authenticity_score
      ? { authenticity_score: appRow.authenticity_score, authenticity_verdict: appRow.authenticity_verdict }
      : null;
  if (maskMaterials && integrityOut) {
    const { submitter_ip, ...rest } = integrityOut;
    integrityOut = rest;
  }

  return {
    application: appView,
    identityPolicy: appView.identityPolicy || getIdentityPolicy(viewer, appRow, orgRow),
    materialsMasked: maskMaterials,
    answers: answersWithTiming,
    notes,
    screening: {
      status: appRow.screening_status,
      category: appRow.screening_category,
      completion_pct: appRow.completion_pct,
      recommendation: appRow.recommendation,
    },
    voiceVerification,
    integrity: integrityOut,
    score: applicationScore,
    applicationScore,
    intelligenceReport,
    candidateIntelligence: intelligenceReport,
    backgroundCheck,
    resumeValidation,
    integritySignals,
    behavioralSignals,
    experienceFit: resumeValidation?.experienceFit || intelligenceReport?.experience_fit,
    hiddenGem: hiddenGemAssessment,
    scheduling,
    pendingScheduleAction,
    activity,
    connectorLinks,
    llm_enabled: llmConfigured(),
  };
}

app.patch('/api/applications/:id', authMiddleware, async (req, res) => {
  const appRow = db
    .prepare(
      `SELECT a.*, j.org_id, j.id as job_id FROM applications a
       JOIN jobs j ON j.id = a.job_id WHERE a.id = ? AND j.org_id = ?`
    )
    .get(req.params.id, req.user.orgId);
  if (!appRow) return res.status(404).json({ error: 'Not found' });
  const { stage, status, override_bucket, override_note, pipeline_stage } = req.body;
  if (pipeline_stage) {
    db.prepare('UPDATE applications SET pipeline_stage=? WHERE id=?').run(pipeline_stage, appRow.id);
    const orgRow = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.user.orgId);
    if (
      isDeiBlindMode(orgRow) &&
      ['shortlisted_interview', 'interview_scheduled', 'interview_completed', 'final_review'].includes(
        pipeline_stage
      )
    ) {
      db.prepare(
        `UPDATE applications SET identity_revealed=1, identity_revealed_by=?, identity_revealed_at=datetime('now') WHERE id=?`
      ).run(req.user.sub, appRow.id);
    }
    const statusByPipeline = {
      shortlisted_interview: 'Shortlisted for interview',
      interview_scheduled: 'Interview scheduled',
      interview_completed: 'Interview completed',
      rejected: 'Not advancing',
      final_review: 'Final review',
      application_review: 'Application review',
    };
    if (statusByPipeline[pipeline_stage]) {
      db.prepare('UPDATE applications SET status=? WHERE id=?').run(statusByPipeline[pipeline_stage], appRow.id);
    }
    logAudit({
      orgId: req.user.orgId,
      jobId: appRow.job_id,
      applicationId: appRow.id,
      actorId: req.user.sub,
      actorName: req.user.name,
      eventType: 'Pipeline updated',
      description: `Pipeline stage → ${pipeline_stage}`,
    });

    if (pipeline_stage === 'shortlisted_interview') {
      try {
        await autoSyncWorkflowOnShortlist(db, req.user.orgId, appRow.id);
      } catch (err) {
        console.warn('Atlassian shortlist sync:', err.message);
      }
    }
  }
  if (override_bucket) {
    if (!override_note?.trim()) {
      return res.status(400).json({ error: 'Override requires a reviewer note' });
    }
    const scoreRow = db.prepare('SELECT intelligence_json FROM scores WHERE application_id = ?').get(appRow.id);
    const patchedJson = patchIntelligenceJsonScores(scoreRow?.intelligence_json, { bucket: override_bucket });
    db.prepare(
      `UPDATE scores SET bucket=?, intelligence_json=COALESCE(?, intelligence_json) WHERE application_id=?`
    ).run(override_bucket, patchedJson, appRow.id);
    const statusMap = {
      Green: 'Ready for hiring team',
      Amber: 'Needs reviewer note',
      Red: 'Do not auto-reject',
    };
    db.prepare('UPDATE applications SET status=? WHERE id=?').run(statusMap[override_bucket] || appRow.status, appRow.id);
    db.prepare(`INSERT INTO reviewer_notes (id, application_id, user_id, body) VALUES (?, ?, ?, ?)`).run(
      uuid(),
      appRow.id,
      req.user.sub,
      `Bucket override to ${override_bucket}: ${override_note}`
    );
    logAudit({
      orgId: req.user.orgId,
      jobId: appRow.job_id,
      applicationId: appRow.id,
      actorId: req.user.sub,
      actorName: req.user.name,
      eventType: 'Bucket override',
      description: `Changed bucket to ${override_bucket}: ${override_note}`,
    });
  }
  if (stage) db.prepare('UPDATE applications SET stage=? WHERE id=?').run(stage, appRow.id);
  if (status) db.prepare('UPDATE applications SET status=? WHERE id=?').run(status, appRow.id);
  const payload = getApplicationPayload(req.params.id, req.user.orgId, req.user);
  res.json({ message: override_bucket ? `Bucket updated to ${override_bucket}` : 'Updated', ...payload });
});

app.delete('/api/applications/:id', authMiddleware, (req, res) => {
  const appRow = db
    .prepare(
      `SELECT a.*, j.org_id, j.title as job_title FROM applications a
       JOIN jobs j ON j.id = a.job_id WHERE a.id = ? AND j.org_id = ? AND ${SQL_APP_ACTIVE_A} AND ${SQL_JOB_ACTIVE_J}`
    )
    .get(req.params.id, req.user.orgId);
  if (!appRow) return res.status(404).json({ error: 'Not found' });
  softDeleteApplication(db, appRow.id);
  logAudit({
    orgId: req.user.orgId,
    jobId: appRow.job_id,
    applicationId: appRow.id,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'Application moved to trash',
    description: `Moved ${appRow.name} (${appRow.id}) to trash from ${appRow.job_title}`,
  });
  res.json({ ok: true, message: 'Application moved to trash. Recover it from Trash anytime.' });
});

app.post('/api/applications/:id/rescore', authMiddleware, async (req, res) => {
  const appRow = db
    .prepare(
      `SELECT a.id FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE a.id = ? AND j.org_id = ?`
    )
    .get(req.params.id, req.user.orgId);
  if (!appRow) return res.status(404).json({ error: 'Not found' });
  try {
    await runScoring(req.params.id, req.user.name);
    const payload = getApplicationPayload(req.params.id, req.user.orgId, req.user);
    res.json({ message: 'Application re-scored', score: payload.score, ...payload });
  } catch (e) {
    console.error('[rescore]', e);
    res.status(500).json({ error: e.message || 'Re-score failed' });
  }
});

app.post('/api/applications/:id/background-check', authMiddleware, (req, res) => {
  const appRow = db
    .prepare(
      `SELECT a.*, j.title as job_title, j.org_id FROM applications a
       JOIN jobs j ON j.id = a.job_id WHERE a.id = ? AND j.org_id = ?`
    )
    .get(req.params.id, req.user.orgId);
  if (!appRow) return res.status(404).json({ error: 'Application not found' });

  const scoreRow = db.prepare('SELECT bucket FROM scores WHERE application_id = ?').get(appRow.id);
  if (!scoreRow || scoreRow.bucket !== 'Green') {
    return res.status(400).json({
      error: 'Background verification is available only for Green-bucket candidates. Advance or override bucket first.',
    });
  }

  const answers = db.prepare('SELECT * FROM answers WHERE application_id = ?').all(appRow.id);
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(appRow.job_id);
  const report = runBackgroundCheck({ application: appRow, answers, job });

  const existing = db.prepare('SELECT id FROM background_checks WHERE application_id = ?').get(appRow.id);
  if (existing) {
    db.prepare(
      `UPDATE background_checks SET overall_status=?, confidence=?, summary=?, report_json=?, requested_by=?, created_at=datetime('now') WHERE application_id=?`
    ).run(report.overall_status, report.confidence, report.summary, JSON.stringify(report), req.user.sub, appRow.id);
  } else {
    db.prepare(
      `INSERT INTO background_checks (id, application_id, overall_status, confidence, summary, report_json, requested_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(uuid(), appRow.id, report.overall_status, report.confidence, report.summary, JSON.stringify(report), req.user.sub);
  }

  logAudit({
    orgId: req.user.orgId,
    jobId: appRow.job_id,
    applicationId: appRow.id,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'Background check',
    description: `Verification ${report.overall_status} (${report.confidence}% confidence)`,
  });

  const payload = getApplicationPayload(req.params.id, req.user.orgId, req.user);
  res.status(201).json({ message: 'Background check complete', backgroundCheck: report, ...payload });
});

app.get('/api/jobs/:id/interview-rubric', authMiddleware, (req, res) => {
  const job = db.prepare(`SELECT id FROM jobs WHERE id = ? AND org_id = ? AND ${SQL_JOB_ACTIVE}`).get(req.params.id, req.user.orgId);
  if (!job) return res.status(404).json({ error: 'Position not found' });
  res.json({ questions: getInterviewRubric(job.id) });
});

app.post('/api/applications/:id/schedule/invite', authMiddleware, (req, res) => {
  const appRow = db
    .prepare(
      `SELECT a.*, j.org_id, j.title as job_title FROM applications a
       JOIN jobs j ON j.id = a.job_id WHERE a.id = ? AND j.org_id = ?`
    )
    .get(req.params.id, req.user.orgId);
  if (!appRow) return res.status(404).json({ error: 'Not found' });

  const scheduling = createScheduleInvite({
    applicationId: appRow.id,
    jobId: appRow.job_id,
    orgId: req.user.orgId,
    interviewerId: req.user.sub,
    interviewerName: req.user.name,
    slots: req.body.slots,
    durationMinutes: req.body.duration_minutes,
    timezone: req.body.timezone,
    meetingUrl: req.body.meeting_url || req.body.meetingUrl,
    message: req.body.message,
    baseUrl: getClientBaseUrl(req),
  });

  const payload = getApplicationPayload(req.params.id, req.user.orgId, req.user);
  res.status(201).json({
    message: appRow.email
      ? `Scheduling invite emailed to ${appRow.email}`
      : 'Scheduling invite created, no applicant email on file',
    scheduling,
    candidate_email: appRow.email,
    email_sent: Boolean(appRow.email),
    ...payload,
  });
});

app.post('/api/applications/:id/schedule/confirm', authMiddleware, (req, res) => {
  const appRow = db
    .prepare(
      `SELECT a.id FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE a.id = ? AND j.org_id = ?`
    )
    .get(req.params.id, req.user.orgId);
  if (!appRow) return res.status(404).json({ error: 'Not found' });

  const result = interviewerConfirmSchedule(req.params.id, req.user.sub, req.user.name, req.user.orgId);
  if (result.error) return res.status(result.status).json({ error: result.error });

  const payload = getApplicationPayload(req.params.id, req.user.orgId, req.user);
  res.json({ message: result.message, calendar_ics: result.calendar_ics, ...payload });
});

app.post('/api/applications/:id/schedule/decline', authMiddleware, (req, res) => {
  const appRow = db
    .prepare(
      `SELECT a.id FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE a.id = ? AND j.org_id = ?`
    )
    .get(req.params.id, req.user.orgId);
  if (!appRow) return res.status(404).json({ error: 'Not found' });

  const result = interviewerDeclineSchedule(
    req.params.id,
    req.user.sub,
    req.user.name,
    req.user.orgId,
    req.body.reason
  );
  if (result.error) return res.status(result.status).json({ error: result.error });

  const payload = getApplicationPayload(req.params.id, req.user.orgId, req.user);
  res.json({ message: result.message, ...payload });
});

app.post('/api/applications/:id/interview/schedule', authMiddleware, (req, res) => {
  const appRow = db
    .prepare(
      `SELECT a.*, j.org_id FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE a.id = ? AND j.org_id = ?`
    )
    .get(req.params.id, req.user.orgId);
  if (!appRow) return res.status(404).json({ error: 'Not found' });
  const scheduling = createScheduleInvite({
    applicationId: appRow.id,
    jobId: appRow.job_id,
    orgId: req.user.orgId,
    interviewerId: req.user.sub,
    interviewerName: req.user.name,
    slots: req.body.slots,
    durationMinutes: req.body.duration_minutes,
    timezone: req.body.timezone,
    meetingUrl: req.body.meeting_url,
    message: req.body.message,
    baseUrl: getClientBaseUrl(req),
  });
  const payload = getApplicationPayload(req.params.id, req.user.orgId, req.user);
  res.status(201).json({ message: 'Scheduling invite created', scheduling, ...payload });
});

app.get('/api/public/schedule/:token', (req, res) => {
  const row = db
    .prepare(
      `SELECT i.*, u.name as interviewer_name FROM interview_schedule_invites i
       LEFT JOIN users u ON u.id = i.interviewer_id WHERE i.token = ?`
    )
    .get(req.params.token);
  if (!row) return res.status(404).json({ error: 'Scheduling link not found or expired' });

  const app = db.prepare('SELECT name, email FROM applications WHERE id = ?').get(row.application_id);
  const job = db.prepare('SELECT title, team, location FROM jobs WHERE id = ?').get(row.job_id);

  res.json({
    candidate_name: app?.name,
    job,
    invite: formatInvitePayload(row, getClientBaseUrl(req)),
  });
});

app.post('/api/public/schedule/:token/book', (req, res) => {
  const { slot_id } = req.body;
  if (!slot_id) return res.status(400).json({ error: 'slot_id required' });
  const result = candidateBookSlot(req.params.token, slot_id);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json({
    message: 'Time selected! The interviewer will confirm shortly. You will receive confirmation when accepted.',
    invite: result.invite,
  });
});

app.get('/api/notifications', authMiddleware, (req, res) => {
  const items = listNotifications(req.user.sub, req.user.orgId);
  res.json({
    unread: getUnreadCount(req.user.sub, req.user.orgId),
    items,
  });
});

app.patch('/api/notifications/read-all', authMiddleware, (req, res) => {
  db.prepare(`UPDATE notifications SET read=1 WHERE user_id=? AND org_id=?`).run(req.user.sub, req.user.orgId);
  res.json({ ok: true });
});

app.patch('/api/notifications/:id/read', authMiddleware, (req, res) => {
  db.prepare(`UPDATE notifications SET read=1 WHERE id=? AND user_id=?`).run(req.params.id, req.user.sub);
  res.json({ ok: true });
});

app.get('/api/system/llm-status', authMiddleware, (_req, res) => {
  res.json({
    configured: llmConfigured(),
    provider: llmConfigured() ? 'groq' : 'heuristic-only',
    hint: 'Set GROQ_API_KEY in .env for LLM + RAG-enhanced scoring (free tier at console.groq.com)',
  });
});

app.post('/api/applications/:id/interview/complete', authMiddleware, (req, res) => {
  const appRow = db
    .prepare(
      `SELECT a.*, j.org_id, j.title as job_title FROM applications a
       JOIN jobs j ON j.id = a.job_id WHERE a.id = ? AND j.org_id = ?`
    )
    .get(req.params.id, req.user.orgId);
  if (!appRow) return res.status(404).json({ error: 'Not found' });

  const { transcript, responses: manualResponses } = req.body;
  const rubric = getInterviewRubric(appRow.job_id);
  let pairs = [];

  if (Array.isArray(manualResponses) && manualResponses.length) {
    pairs = manualResponses.map((r, i) => ({
      question: r.question,
      body: r.body || '',
      expected_context: r.expected_context || rubric[i]?.expected_context || '',
      sort_order: i,
    }));
  } else if (transcript?.trim()) {
    pairs = parseTranscript(transcript, rubric);
  } else {
    return res.status(400).json({ error: 'Provide transcript text or manual Q&A responses' });
  }

  if (!pairs.length) {
    return res.status(400).json({ error: 'Could not extract interview Q&A from transcript' });
  }

  let session = getLatestInterviewSession(appRow.id);
  if (!session || session.status === 'completed') {
    const sessionId = uuid();
    db.prepare(
      `INSERT INTO interview_sessions (id, application_id, job_id, status, interviewer_id, transcript)
       VALUES (?, ?, ?, 'in_progress', ?, ?)`
    ).run(sessionId, appRow.id, appRow.job_id, req.user.sub, transcript || null);
    session = db.prepare('SELECT * FROM interview_sessions WHERE id = ?').get(sessionId);
  } else {
    db.prepare(`UPDATE interview_sessions SET transcript=?, status='in_progress' WHERE id=?`).run(
      transcript || session.transcript,
      session.id
    );
  }

  db.prepare('DELETE FROM interview_responses WHERE session_id = ?').run(session.id);
  const insertResp = db.prepare(
    `INSERT INTO interview_responses (id, session_id, question, expected_context, body, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const p of pairs) {
    insertResp.run(uuid(), session.id, p.question, p.expected_context || '', p.body, p.sort_order ?? 0);
  }

  const result = runInterviewScoring(session.id);

  logAudit({
    orgId: req.user.orgId,
    jobId: appRow.job_id,
    applicationId: appRow.id,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'Interview scored',
    description: `Interview score ${result.overall}/100 (${result.bucket})`,
  });

  const payload = getApplicationPayload(req.params.id, req.user.orgId, req.user);
  res.json({
    message: `Interview scored: ${result.overall}/100 (${result.bucket})`,
    interviewResult: result,
    ...payload,
  });
});

app.post('/api/applications/:id/reveal-identity', authMiddleware, requireRole('Admin', 'Hiring Manager'), (req, res) => {
  const appRow = db
    .prepare(
      `SELECT a.*, j.org_id FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE a.id = ? AND j.org_id = ?`
    )
    .get(req.params.id, req.user.orgId);
  if (!appRow) return res.status(404).json({ error: 'Not found' });

  const orgRow = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.user.orgId);
  const policy = getIdentityPolicy(req.user, appRow, orgRow);
  if (!policy.canReveal) {
    return res.status(403).json({
      error: policy.reason || 'Identity cannot be revealed at this stage for your role',
    });
  }

  db.prepare(
    `UPDATE applications SET identity_revealed=1, identity_revealed_by=?, identity_revealed_at=datetime('now') WHERE id=?`
  ).run(req.user.sub, appRow.id);

  logAudit({
    orgId: req.user.orgId,
    jobId: appRow.job_id,
    applicationId: appRow.id,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'Identity revealed',
    description: `${req.user.role} unlocked candidate identity before/at final stage`,
  });

  const payload = getApplicationPayload(req.params.id, req.user.orgId, req.user);
  res.json({ message: 'Identity revealed, full profile now visible to authorized hiring team', ...payload });
});

app.post('/api/applications/:id/voice-sample/index', authMiddleware, (req, res) => {
  const appRow = db
    .prepare(
      `SELECT a.id FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE a.id = ? AND j.org_id = ?`
    )
    .get(req.params.id, req.user.orgId);
  if (!appRow) return res.status(404).json({ error: 'Not found' });

  const result = indexVoiceFromApplication(appRow.id);
  if (result.error) return res.status(400).json({ error: result.error });

  const payload = getApplicationPayload(req.params.id, req.user.orgId, req.user);
  res.json({ message: 'Voice reference indexed from screening audio', voice: result, ...payload });
});

app.post('/api/applications/:id/voice-sample/upload', authMiddleware, upload.single('audio'), (req, res) => {
  const appRow = db
    .prepare(
      `SELECT a.id FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE a.id = ? AND j.org_id = ?`
    )
    .get(req.params.id, req.user.orgId);
  if (!appRow) return res.status(404).json({ error: 'Not found' });
  if (!req.file) return res.status(400).json({ error: 'Upload an audio file' });

  const result = saveVoiceSampleUpload(appRow.id, req.file.path, req.file.filename);
  if (result.error) return res.status(400).json({ error: result.error });

  const payload = getApplicationPayload(req.params.id, req.user.orgId, req.user);
  res.json({ message: 'Reference voice sample saved', ...payload });
});

app.post('/api/applications/:id/voice-verify', authMiddleware, upload.single('audio'), (req, res) => {
  const appRow = db
    .prepare(
      `SELECT a.*, j.org_id FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE a.id = ? AND j.org_id = ?`
    )
    .get(req.params.id, req.user.orgId);
  if (!appRow) return res.status(404).json({ error: 'Not found' });
  if (!req.file) return res.status(400).json({ error: 'Upload or record audio to compare' });

  const buf = readFileSync(req.file.path);
  const result = compareVoiceUpload(appRow.id, buf, req.file.mimetype || 'audio/webm');
  if (result.error) return res.status(400).json({ error: result.error });

  logAudit({
    orgId: req.user.orgId,
    applicationId: appRow.id,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'Voice verification',
    description: `${result.comparison.verdict} (${result.comparison.match_score}%)`,
  });

  res.json({ comparison: result.comparison });
});

app.get('/api/integrations/ats', authMiddleware, requireIntelligence, requireRole('Admin', 'Recruiter', 'Hiring Manager', 'Compliance Auditor'), (req, res) => {
  const integrations = db
    .prepare(
      'SELECT id, provider, api_key_hint, enabled, created_at, writeback_url, webhook_secret FROM ats_integrations WHERE org_id = ?'
    )
    .all(req.user.orgId);
  const events = db
    .prepare('SELECT id, provider, event_type, status, created_at FROM ats_events WHERE org_id = ? ORDER BY created_at DESC LIMIT 20')
    .all(req.user.orgId);
  const writeback = db
    .prepare(
      `SELECT w.id, w.application_id, w.status, w.created_at, w.sent_at, w.last_error, w.attempts,
              a.anonymized_code
       FROM ats_writeback_queue w
       JOIN applications a ON a.id = w.application_id
       WHERE w.org_id = ? ORDER BY w.created_at DESC LIMIT 20`
    )
    .all(req.user.orgId);
  const base = (process.env.PUBLIC_APP_URL || process.env.VITE_APP_URL || '').replace(/\/$/, '') || '';
  const webhookPath = '/api/integrations/ats/webhook';
  res.json({
    webhook_url: base ? `${base}${webhookPath}` : webhookPath,
    health: getIntegrationHealth(db, req.user.orgId),
    integrations: integrations.map((i) => ({
      id: i.id,
      provider: i.provider,
      api_key_hint: i.api_key_hint,
      enabled: i.enabled,
      created_at: i.created_at,
      writeback_url: i.writeback_url || null,
      has_webhook_secret: Boolean(i.webhook_secret),
    })),
    recent_events: events,
    writeback_queue: writeback,
  });
});

function publicWebhookUrl() {
  const base = (process.env.PUBLIC_APP_URL || process.env.VITE_APP_URL || '').replace(/\/$/, '');
  const path = '/api/integrations/ats/webhook';
  return base ? `${base}${path}` : path;
}

app.post('/api/integrations/ats', authMiddleware, requireIntelligence, requireRole('Admin'), (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.user.orgId);
  try {
    assertPilotAction(db, org, 'integrations');
  } catch (err) {
    if (pilotBlocked(res, err)) return;
    throw err;
  }
  const existing = db.prepare('SELECT id FROM ats_integrations WHERE org_id = ? LIMIT 1').get(req.user.orgId);
  if (existing) {
    return res.status(400).json({ error: 'An ATS connection already exists. Disconnect it first or edit the existing one.' });
  }
  const provider = String(req.body?.provider || 'generic').toLowerCase();
  if (!['greenhouse', 'lever', 'generic'].includes(provider)) {
    return res.status(400).json({ error: 'Provider must be greenhouse, lever, or generic' });
  }
  const id = uuid();
  const webhookSecret = `xpr_${randomBytes(24).toString('hex')}`;
  db.prepare(
    `INSERT INTO ats_integrations (id, org_id, provider, webhook_secret, api_key_hint, enabled)
     VALUES (?, ?, ?, ?, ?, 1)`
  ).run(id, req.user.orgId, provider, webhookSecret, `${provider}_connection`);
  logAudit({
    orgId: req.user.orgId,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'ATS connected',
    description: `Created ${provider} webhook integration`,
  });
  res.status(201).json({
    id,
    provider,
    enabled: true,
    webhook_secret: webhookSecret,
    webhook_url: publicWebhookUrl(),
  });
});

app.post('/api/integrations/ats/test', authMiddleware, requireIntelligence, requireRole('Admin', 'Recruiter'), async (req, res) => {
  const integration = db
    .prepare('SELECT * FROM ats_integrations WHERE org_id = ? AND enabled = 1 LIMIT 1')
    .get(req.user.orgId);
  if (!integration) {
    return res.status(404).json({ error: 'Create an ATS connection first.' });
  }
  const provider = integration.provider || 'generic';
  const normalized = normalizeAtsPayload(provider, {
    candidate: { id: `test-${Date.now()}`, name: 'Test Candidate', email: 'test@example.com' },
    job_id: 'REQ-1001',
    job_title: 'Senior Software Engineer',
    stage: 'applied',
  });
  const eventId = uuid();
  db.prepare(
    `INSERT INTO ats_events (id, org_id, provider, event_type, payload_json, status)
     VALUES (?, ?, ?, ?, ?, 'received')`
  ).run(eventId, req.user.orgId, normalized.provider, normalized.stage || 'candidate.updated', JSON.stringify(normalized));

  let ingest = null;
  try {
    const job = resolveJobForAts(db, req.user.orgId, {
      job_external_id: normalized.job_external_id,
      job_title: 'Senior Software Engineer',
      provider: normalized.provider,
    });
    const baseUrl = process.env.PUBLIC_APP_URL || process.env.VITE_APP_URL || 'http://localhost:5173';
    ingest = upsertApplicationFromAts(db, req.user.orgId, job, normalized, baseUrl);
    db.prepare(`UPDATE ats_events SET status = 'ingested' WHERE id = ?`).run(eventId);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Test ingest failed' });
  }

  res.json({
    ok: true,
    ingest: ingest
      ? { application_id: ingest.application.id, created: ingest.created }
      : null,
  });
});

app.get('/api/integrations/activity', authMiddleware, requireIntelligence, requireRole('Admin', 'Recruiter', 'Hiring Manager', 'Compliance Auditor'), (req, res) => {
  res.json(listUnifiedIntegrationActivity(db, req.user.orgId, 40));
});

app.post('/api/integrations/ats/webhook', (req, res) => {
  const secret = req.headers['x-webhook-secret'];
  if (!secret) {
    return res.status(401).json({ error: 'Missing X-Webhook-Secret header' });
  }
  const provider = req.headers['x-ats-provider'] || req.body?.provider || 'generic';
  const integration = db
    .prepare('SELECT * FROM ats_integrations WHERE webhook_secret = ? AND enabled = 1')
    .get(secret);
  if (!integration) {
    return res.status(401).json({ error: 'Invalid webhook secret, configure ATS integration in Xperieval' });
  }
  const orgId = integration.org_id;
  const normalized = normalizeAtsPayload(provider, req.body);
  const eventId = uuid();
  db.prepare(
    `INSERT INTO ats_events (id, org_id, provider, event_type, payload_json, status)
     VALUES (?, ?, ?, ?, ?, 'received')`
  ).run(eventId, orgId, normalized.provider, normalized.stage || 'candidate.updated', JSON.stringify(normalized));

  let ingest = null;
  try {
    const job = resolveJobForAts(db, orgId, {
      job_external_id: normalized.job_external_id,
      job_title: req.body?.job_title || req.body?.job?.title,
      provider: normalized.provider,
    });
    const baseUrl = process.env.PUBLIC_APP_URL || process.env.VITE_APP_URL || 'http://localhost:5173';
    ingest = upsertApplicationFromAts(db, orgId, job, normalized, baseUrl);
    db.prepare(`UPDATE ats_events SET status = 'ingested' WHERE id = ?`).run(eventId);
  } catch (err) {
    console.warn('ATS ingest:', err.message);
  }

  res.status(202).json({
    received: true,
    event_id: eventId,
    normalized,
    ingest: ingest
      ? {
          application_id: ingest.application.id,
          job_id: ingest.job.id,
          created: ingest.created,
          screening_url: ingest.screening_url,
        }
      : null,
  });
});

app.post('/api/integrations/ats/writeback/:applicationId', authMiddleware, requireIntelligence, requireRole('Admin', 'Recruiter'), async (req, res) => {
  const appRow = db
    .prepare(
      `SELECT a.id FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE a.id = ? AND j.org_id = ?`
    )
    .get(req.params.applicationId, req.user.orgId);
  if (!appRow) return res.status(404).json({ error: 'Not found' });
  queueAtsWriteback(appRow.id);
  const row = db
    .prepare(
      `SELECT * FROM ats_writeback_queue WHERE application_id = ? ORDER BY created_at DESC LIMIT 1`
    )
    .get(appRow.id);
  if (row) {
    const result = await deliverWriteback(db, {
      ...row,
      ...db.prepare('SELECT provider, writeback_url, writeback_api_key, webhook_secret FROM ats_integrations WHERE org_id = ? AND enabled = 1 LIMIT 1').get(req.user.orgId),
    });
    return res.json({ queued: true, delivery: result });
  }
  res.json({ queued: false });
});

app.post('/api/integrations/ats/process-queue', authMiddleware, requireIntelligence, requireRole('Admin', 'Recruiter'), async (req, res) => {
  const results = await processWritebackQueue(db, { orgId: req.user.orgId, limit: 25 });
  res.json({ processed: results.length, results });
});

app.post('/api/integrations/ats/writeback-receiver', (req, res) => {
  const eventId = uuid();
  const orgId = req.headers['x-org-id'] || 'org-demo';
  db.prepare(
    `INSERT INTO ats_events (id, org_id, provider, event_type, payload_json, status)
     VALUES (?, ?, ?, 'writeback.received', ?, 'acknowledged')`
  ).run(eventId, orgId, req.headers['x-ats-provider'] || 'greenhouse', JSON.stringify(req.body || {}));
  res.status(200).json({ received: true, event_id: eventId });
});

app.patch('/api/integrations/ats/:integrationId', authMiddleware, requireIntelligence, requireRole('Admin'), (req, res) => {
  const row = db
    .prepare('SELECT * FROM ats_integrations WHERE id = ? AND org_id = ?')
    .get(req.params.integrationId, req.user.orgId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const { writeback_url, writeback_api_key, enabled } = req.body;
  db.prepare(
    `UPDATE ats_integrations SET writeback_url=COALESCE(?, writeback_url),
     writeback_api_key=COALESCE(?, writeback_api_key), enabled=COALESCE(?, enabled) WHERE id=?`
  ).run(
    writeback_url ?? null,
    writeback_api_key ?? null,
    enabled != null ? (enabled ? 1 : 0) : null,
    row.id
  );
  res.json({ ok: true });
});

// ——— Workplace connectors (Jira, Slack, GitHub, etc.) ———
app.get('/api/connectors', authMiddleware, requireIntelligence, requireRole('Admin', 'Recruiter', 'Hiring Manager', 'Compliance Auditor'), (req, res) => {
  res.json(listOrgConnectors(db, req.user.orgId));
});

app.get('/api/connectors/catalog', authMiddleware, requireIntelligence, requireRole('Admin', 'Recruiter', 'Hiring Manager', 'Compliance Auditor'), (_req, res) => {
  res.json(listConnectorCatalog());
});

app.get('/api/connectors/events/recent', authMiddleware, requireIntelligence, requireRole('Admin', 'Recruiter', 'Hiring Manager', 'Compliance Auditor'), (req, res) => {
  res.json(listConnectorEvents(db, req.user.orgId));
});

app.get('/api/connectors/:provider', authMiddleware, requireIntelligence, requireRole('Admin', 'Recruiter'), (req, res) => {
  const row = getOrgConnectorConfig(db, req.user.orgId, req.params.provider);
  if (!row) return res.status(404).json({ error: 'Connector not configured' });
  res.json(row);
});

app.put('/api/connectors/:provider', authMiddleware, requireIntelligence, requireRole('Admin', 'Recruiter'), async (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.user.orgId);
  try {
    assertPilotAction(db, org, 'workflow_connectors');
  } catch (err) {
    if (pilotBlocked(res, err)) return;
    throw err;
  }
  try {
    const saved = await saveOrgConnector(db, req.user.orgId, req.params.provider, req.body?.config || req.body, {
      actorId: req.user.sub,
      actorName: req.user.name,
    });
    logAudit({
      orgId: req.user.orgId,
      actorId: req.user.sub,
      actorName: req.user.name,
      eventType: 'Connector connected',
      description: `${req.params.provider} connected`,
    });
    res.json(saved);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message, detail: err.detail });
  }
});

app.post('/api/connectors/:provider/test', authMiddleware, requireIntelligence, requireRole('Admin', 'Recruiter'), async (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.user.orgId);
  try {
    assertPilotAction(db, org, 'workflow_connectors');
  } catch (err) {
    if (pilotBlocked(res, err)) return;
    throw err;
  }
  try {
    const result = await testOrgConnector(db, req.user.orgId, req.params.provider, req.body?.config || null);
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message, detail: err.detail });
  }
});

app.delete('/api/connectors/:provider', authMiddleware, requireIntelligence, requireRole('Admin', 'Recruiter'), (req, res) => {
  const result = disconnectOrgConnector(db, req.user.orgId, req.params.provider, {
    actorId: req.user.sub,
    actorName: req.user.name,
  });
  logAudit({
    orgId: req.user.orgId,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'Connector disconnected',
    description: `${req.params.provider} disconnected`,
  });
  res.json(result);
});

app.post('/api/connectors/jira/candidates/:applicationId', authMiddleware, requireIntelligence, requireRole('Admin', 'Recruiter'), async (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.user.orgId);
  try {
    assertPilotAction(db, org, 'workflow_connectors');
  } catch (err) {
    if (pilotBlocked(res, err)) return;
    throw err;
  }
  try {
    const result = await syncJiraForCandidate(db, req.user.orgId, req.params.applicationId, {
      force: !!req.body?.force,
    });
    logAudit({
      orgId: req.user.orgId,
      applicationId: req.params.applicationId,
      actorId: req.user.sub,
      actorName: req.user.name,
      eventType: 'Jira issue created',
      description: result.issue_key || result.skipped ? 'Linked existing Jira issue' : 'Jira sync',
    });
    const payload = getApplicationPayload(req.params.applicationId, req.user.orgId, req.user);
    res.json({ ...result, ...payload });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message, detail: err.detail });
  }
});

app.post('/api/connectors/confluence/candidates/:applicationId', authMiddleware, requireIntelligence, requireRole('Admin', 'Recruiter'), async (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.user.orgId);
  try {
    assertPilotAction(db, org, 'workflow_connectors');
  } catch (err) {
    if (pilotBlocked(res, err)) return;
    throw err;
  }
  try {
    const result = await syncConfluenceForCandidate(db, req.user.orgId, req.params.applicationId, {
      force: !!req.body?.force,
    });
    logAudit({
      orgId: req.user.orgId,
      applicationId: req.params.applicationId,
      actorId: req.user.sub,
      actorName: req.user.name,
      eventType: 'Confluence page published',
      description: result.page_id || result.skipped ? 'Linked Confluence page' : 'Confluence sync',
    });
    const payload = getApplicationPayload(req.params.applicationId, req.user.orgId, req.user);
    res.json({ ...result, ...payload });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message, detail: err.detail });
  }
});

app.post('/api/connectors/slack/candidates/:applicationId', authMiddleware, requireIntelligence, requireRole('Admin', 'Recruiter'), async (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.user.orgId);
  try {
    assertPilotAction(db, org, 'workflow_connectors');
  } catch (err) {
    if (pilotBlocked(res, err)) return;
    throw err;
  }
  try {
    const result = await syncSlackForCandidate(db, req.user.orgId, req.params.applicationId, {
      force: !!req.body?.force,
    });
    logAudit({
      orgId: req.user.orgId,
      applicationId: req.params.applicationId,
      actorId: req.user.sub,
      actorName: req.user.name,
      eventType: 'Slack notification sent',
      description: 'Shortlist notification posted to Slack',
    });
    const payload = getApplicationPayload(req.params.applicationId, req.user.orgId, req.user);
    res.json({ ...result, ...payload });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message, detail: err.detail });
  }
});

app.get('/api/methodology', authMiddleware, (_req, res) => {
  res.json(getMethodology());
});

// ——— Xperieval Intelligence API ———
app.get('/api/intelligence/dashboard', authMiddleware, requireIntelligence, requireRole('Admin', 'Recruiter', 'Hiring Manager', 'Compliance Auditor'), (req, res) => {
  const orgId = req.user.orgId;
  const org = db.prepare('SELECT product_mode, name FROM organizations WHERE id = ?').get(orgId);
  const recentEvaluations = listRecentEvaluations(db, orgId, 12);
  const apiKeys = listApiKeys(db, orgId).filter((k) => k.active);
  const atsEvents = db
    .prepare(
      `SELECT id, provider, event_type, status, created_at FROM ats_events WHERE org_id = ? ORDER BY datetime(created_at) DESC LIMIT 8`
    )
    .all(orgId);
  const atsCandidatesSynced = db
    .prepare(
      `SELECT COUNT(*) as c FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE j.org_id = ? AND a.deleted_at IS NULL AND a.external_id IS NOT NULL`
    )
    .get(orgId).c;
  const evaluationsTotal = db
    .prepare(`SELECT COUNT(*) as c FROM intelligence_evaluations WHERE org_id = ?`)
    .get(orgId).c;
  const evalRows = db
    .prepare(
      `SELECT result_json FROM intelligence_evaluations WHERE org_id = ? ORDER BY datetime(created_at) DESC LIMIT 200`
    )
    .all(orgId);
  const apiScored = evalRows
    .map((row) => {
      try {
        const r = JSON.parse(row.result_json);
        return r?.overall != null ? { overall: r.overall, bucket: r.bucket } : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const apiSummary = summarizeExperienceScores(apiScored);
  res.json({
    product_mode: normalizeProductMode(org?.product_mode),
    org_name: org?.name,
    api_keys_active: apiKeys.length,
    ats_candidates_synced: atsCandidatesSynced,
    evaluations_total: evaluationsTotal,
    recent_evaluations: recentEvaluations,
    api_summary: apiSummary,
    ats_events: atsEvents,
    endpoints: {
      evaluate: '/api/v1/evaluate',
      webhook: '/api/integrations/ats/webhook',
    },
  });
});

app.get('/api/intelligence/api-keys', authMiddleware, requireIntelligence, requireRole('Admin', 'Recruiter', 'Hiring Manager', 'Compliance Auditor'), (req, res) => {
  res.json(listApiKeys(db, req.user.orgId));
});

app.post('/api/intelligence/api-keys', authMiddleware, requireIntelligence, requireRole('Admin', 'Recruiter'), (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.user.orgId);
  try {
    assertPilotAction(db, org, 'api_keys');
  } catch (err) {
    if (pilotBlocked(res, err)) return;
    throw err;
  }
  const { name, scopes } = req.body;
  const created = createApiKey(db, req.user.orgId, { name: name || 'Production', scopes });
  logAudit({
    orgId: req.user.orgId,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'API key created',
    description: `Intelligence API key "${created.name}" (${created.key_prefix}…)`,
  });
  res.status(201).json(created);
});

app.delete('/api/intelligence/api-keys/:id', authMiddleware, requireIntelligence, requireRole('Admin', 'Recruiter'), (req, res) => {
  const ok = revokeApiKey(db, req.user.orgId, req.params.id);
  if (!ok) return res.status(404).json({ error: 'Key not found' });
  logAudit({
    orgId: req.user.orgId,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'API key revoked',
    description: `Revoked Intelligence API key ${req.params.id}`,
  });
  res.json({ revoked: true });
});

app.post('/api/v1/evaluate', apiKeyAuth, requireIntelligence, async (req, res) => {
  try {
    const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.user.orgId);
    assertPilotAction(db, org, 'add_candidate');
    const result = await runIntelligenceEvaluation(db, req.user.orgId, req.body);
    logAudit({
      orgId: req.user.orgId,
      actorId: null,
      actorName: 'API Key',
      eventType: 'Intelligence evaluation',
      description: `API evaluate ${result.experience_score ?? 'N/A'} for ${req.body.candidate_name || 'candidate'}`,
    });
    res.json(result);
  } catch (err) {
    if (pilotBlocked(res, err)) return;
    res.status(400).json({ error: err.message || 'Evaluation failed' });
  }
});

// ——— Pilot program ———
app.get('/api/pilot', authMiddleware, requireRole('Admin', 'Recruiter'), (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.user.orgId);
  res.json(getPilotSnapshot(db, org));
});

app.post('/api/pilot/request-upgrade', authMiddleware, requireRole('Admin', 'Recruiter'), (req, res) => {
  const { target_plan, message } = req.body;
  const plan = target_plan === 'enterprise' ? 'enterprise' : 'team';
  logAudit({
    orgId: req.user.orgId,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'Pilot upgrade requested',
    description: `Requested upgrade to ${plan}${message ? `: ${message}` : ''}`,
  });
  res.json({
    ok: true,
    message: 'Upgrade request recorded. Our team will contact you within one business day.',
    target_plan: plan,
  });
});

// ——— Settings ———
app.get('/api/settings', authMiddleware, requireRole('Admin', 'Recruiter'), (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.user.orgId);
  const thresholds = thresholdsFromOrg(org);
  res.json({ ...org, intelligence_thresholds: thresholds });
});

app.patch('/api/settings', authMiddleware, requireRole('Admin', 'Recruiter'), (req, res) => {
  if (req.body.intelligence_thresholds) {
    const v = validateThresholds(req.body.intelligence_thresholds);
    if (!v.ok) return res.status(400).json({ error: v.error });
    req.body.intelligence_thresholds_json = JSON.stringify(req.body.intelligence_thresholds);
    const b = req.body.intelligence_thresholds.bucket;
    if (b?.green != null) req.body.default_green_threshold = b.green;
    if (b?.amber != null) req.body.default_amber_threshold = b.amber;
    delete req.body.intelligence_thresholds;
  }
  if (req.body.product_mode !== undefined) {
    req.body.product_mode = normalizeProductMode(req.body.product_mode);
  }
  const fields = [
    'name',
    'candidate_notice',
    'retention_policy',
    'scheduling_enabled',
    'scheduling_url',
    'default_green_threshold',
    'default_amber_threshold',
    'intelligence_thresholds_json',
    'scoring_policy',
    'require_typed_answers',
    'track_session_integrity',
    'dei_blind_until_shortlist',
    'anonymize_screening',
    'proctoring_policy_json',
    'product_mode',
    'embed_allowed_origins',
  ];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(req.body[f]);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  values.push(req.user.orgId);
  db.prepare(`UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  logAudit({
    orgId: req.user.orgId,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'Settings updated',
    description: 'Organization settings changed',
  });
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.user.orgId);
  res.json({ ...org, intelligence_thresholds: thresholdsFromOrg(org) });
});

// ——— Team / Access ———
app.get('/api/users', authMiddleware, requireRole('Admin', 'Compliance Auditor'), (req, res) => {
  const users = db
    .prepare('SELECT id, email, name, role, created_at FROM users WHERE org_id = ? ORDER BY created_at')
    .all(req.user.orgId);
  res.json(users);
});

app.post('/api/users', authMiddleware, requireRole('Admin'), (req, res) => {
  const { email, name, role, password } = req.body;
  if (!email || !name || !role || !password) {
    return res.status(400).json({ error: 'Email, name, role, and password required' });
  }
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.user.orgId);
  try {
    assertPilotAction(db, org, 'add_user');
  } catch (err) {
    if (pilotBlocked(res, err)) return;
    throw err;
  }
  const validRoles = ['Admin', 'Hiring Manager', 'Recruiter', 'External Recruiter', 'Compliance Auditor'];
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already in use' });
  const userId = uuid();
  db.prepare(
    `INSERT INTO users (id, org_id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(userId, req.user.orgId, email.toLowerCase(), hashPassword(password), name, role);
  logAudit({
    orgId: req.user.orgId,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'User invited',
    description: `${name} added as ${role}`,
  });
  res.status(201).json({ id: userId, email, name, role });
});

app.patch('/api/users/:id', authMiddleware, requireRole('Admin'), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND org_id = ?').get(req.params.id, req.user.orgId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { role, name } = req.body;
  if (role) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, user.id);
  if (name) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, user.id);
  logAudit({
    orgId: req.user.orgId,
    actorId: req.user.sub,
    actorName: req.user.name,
    eventType: 'User updated',
    description: `Updated ${user.email}${role ? ` → ${role}` : ''}`,
  });
  res.json(db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(user.id));
});

// ——— Reports ———
app.get('/api/reports', authMiddleware, requireRole('Admin', 'Hiring Manager', 'Recruiter', 'Compliance Auditor'), (req, res) => {
  const orgId = req.user.orgId;
  const bucketDist = db
    .prepare(
      `SELECT s.bucket, COUNT(*) as count FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN scores s ON s.application_id = a.id
       WHERE j.org_id = ? AND j.deleted_at IS NULL AND a.deleted_at IS NULL GROUP BY s.bucket`
    )
    .all(orgId);

  const byJob = db
    .prepare(
      `SELECT j.id, j.title, COUNT(a.id) as applicants,
       SUM(CASE WHEN s.bucket='Green' THEN 1 ELSE 0 END) as green,
       SUM(CASE WHEN s.bucket='Amber' THEN 1 ELSE 0 END) as amber,
       SUM(CASE WHEN s.bucket='Red' THEN 1 ELSE 0 END) as red,
       ROUND(AVG(s.overall), 1) as avg_score
       FROM jobs j LEFT JOIN applications a ON a.job_id = j.id AND a.deleted_at IS NULL
       LEFT JOIN scores s ON s.application_id = a.id
       WHERE j.org_id = ? AND j.deleted_at IS NULL GROUP BY j.id`
    )
    .all(orgId);

  const integritySummary = db
    .prepare(
      `SELECT
         SUM(CASE WHEN authenticity_score >= 75 THEN 1 ELSE 0 END) as genuine,
         SUM(CASE WHEN authenticity_score >= 50 AND authenticity_score < 75 THEN 1 ELSE 0 END) as review,
         SUM(CASE WHEN authenticity_score < 50 THEN 1 ELSE 0 END) as high_risk,
         ROUND(AVG(authenticity_score), 1) as avg_authenticity
       FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE j.org_id = ? AND j.deleted_at IS NULL AND a.deleted_at IS NULL AND authenticity_score IS NOT NULL`
    )
    .get(orgId);

  const recentApps = db
    .prepare(
      `SELECT date(a.created_at) as day, COUNT(*) as count FROM applications a
       JOIN jobs j ON j.id = a.job_id WHERE j.org_id = ? AND j.deleted_at IS NULL AND a.deleted_at IS NULL
       GROUP BY date(a.created_at) ORDER BY day DESC LIMIT 14`
    )
    .all(orgId);

  const stageCounts = db
    .prepare(
      `SELECT COALESCE(a.pipeline_stage, a.stage, 'unknown') as stage, COUNT(*) as count FROM applications a
       JOIN jobs j ON j.id = a.job_id WHERE j.org_id = ? AND j.deleted_at IS NULL AND a.deleted_at IS NULL
       GROUP BY COALESCE(a.pipeline_stage, a.stage, 'unknown')`
    )
    .all(orgId);

  const insightsJobId =
    typeof req.query.insightsJobId === 'string' ? req.query.insightsJobId : undefined;
  const applicantInsights = buildApplicantInsights(db, orgId, insightsJobId);
  const screeningAnalytics = buildScreeningAnalytics(db, orgId);

  const experienceAnalytics = buildReportsExperienceAnalytics(db, orgId);

  res.json({
    bucketDist,
    byJob,
    integritySummary,
    recentApps,
    stageCounts,
    applicantInsights,
    screeningAnalytics,
    experienceAnalytics,
  });
});

app.get(
  '/api/reports/applicant-insights',
  authMiddleware,
  requireRole('Admin', 'Hiring Manager', 'Recruiter', 'Compliance Auditor'),
  (req, res) => {
    const jobId = typeof req.query.jobId === 'string' ? req.query.jobId : undefined;
    res.json(buildApplicantInsights(db, req.user.orgId, jobId));
  }
);

// ——— Audit ———
app.get('/api/audit', authMiddleware, (req, res) => {
  const limit = Math.min(500, Math.max(50, parseInt(req.query.limit, 10) || 200));
  const eventType = typeof req.query.eventType === 'string' ? req.query.eventType.trim() : '';
  const jobId = typeof req.query.jobId === 'string' ? req.query.jobId.trim() : '';
  const applicationId = typeof req.query.applicationId === 'string' ? req.query.applicationId.trim() : '';

  let sql = `SELECT * FROM audit_events WHERE org_id = ?`;
  const params = [req.user.orgId];
  if (eventType) {
    sql += ` AND event_type LIKE ?`;
    params.push(`%${eventType}%`);
  }
  if (jobId) {
    sql += ` AND job_id = ?`;
    params.push(jobId);
  }
  if (applicationId) {
    sql += ` AND application_id = ?`;
    params.push(applicationId);
  }
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);

  const events = db.prepare(sql).all(...params);
  res.json(events);
});

app.get('/api/roles', (_req, res) => {
  res.json([
    { role: 'Hiring Manager', description: 'View scorecards, explanations, reviewer notes, and decision recommendations.' },
    { role: 'Recruiter', description: 'Manage positions, applications, communication, stages, and candidate data.' },
    { role: 'External Recruiter', description: 'Submit candidates and view only submitted applicants.' },
    { role: 'Compliance Auditor', description: 'View scoring versions, logs, overrides, reports, and exports.' },
    { role: 'Admin', description: 'Configure users, permissions, integrations, retention, and scoring policies.' },
  ]);
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Serve Vite build in production
const distPath = join(__dirname, '..', 'dist');
const WEB_PORT = process.env.WEB_PORT || 5173;

// Redirect browser routes to the web app in dev (API is port 3001, app is 5173)
app.get('/apply/:slug', (req, res) => {
  if (existsSync(distPath)) {
    return res.sendFile(join(distPath, 'index.html'));
  }
  res.redirect(`http://localhost:${WEB_PORT}/apply/${req.params.slug}`);
});

app.get('/', (req, res) => {
  const portalUrl = process.env.PUBLIC_APP_URL || `http://localhost:${process.env.WEB_PORT || 5173}`;
  if (existsSync(distPath)) {
    return res.sendFile(join(distPath, 'index.html'));
  }
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Xperieval API</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:520px;margin:48px auto;padding:0 24px;color:#0f172a;line-height:1.6}
    h1{font-size:1.5rem} a{color:#2563eb} code{background:#f1f5f9;padding:2px 8px;border-radius:6px}
    .box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin-top:24px}
  </style>
</head>
<body>
  <h1>Xperieval API server</h1>
  <p>Backend API for the Xperieval portal. The recruiter UI is hosted separately (Vercel).</p>
  <div class="box">
    <p><strong>Recruiter portal</strong><br/>
    <a href="${portalUrl}">${portalUrl}</a></p>
    <p><strong>API health check</strong><br/>
    <a href="/api/health">/api/health</a> → <code>{"ok":true}</code></p>
  </div>
</body>
</html>`);
});

if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(distPath, 'index.html'));
  });
}

try {
  ensureDemoPortfolio();
} catch (e) {
  console.error('[seed] demo portfolio failed:', e.message);
}

app.listen(PORT, '0.0.0.0', () => {
  ensureQuestionPool(db, null);
  ensureRubricTemplatesTable(db);
  console.log(`Xperieval API running at http://localhost:${PORT}`);
  setInterval(() => {
    processWritebackQueue(db, { limit: 10 }).catch(() => {});
  }, 30000);
});
