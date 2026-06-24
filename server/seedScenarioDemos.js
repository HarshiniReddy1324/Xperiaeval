/**
 * Demo scenario seed: entry-level role + three contrasting candidate profiles.
 * Idempotent — safe to run on every server start.
 */

import { v4 as uuid } from 'uuid';
import { db, slugify } from './db.js';
import { DEFAULT_RUBRIC_QUESTIONS, rubricRowFromQuestion } from './defaultRubric.js';
import { scoreApplication } from './scoring.js';
import { buildCandidateIntelligenceReport } from './candidateIntelligence.js';
import { analyzeIntegrity } from './integrity.js';
import { analyzeProctoring } from './proctoring.js';
import { classifyScreeningStatus, computeCompletion } from './screening.js';
import { parsePostingJson } from './jobPosting.js';
import { thresholdsFromJob } from './scoringThresholds.js';
import { DEFAULT_PROCTORING_POLICY } from './proctoring.js';
import {
  ELENA_VASQUEZ_RESUME,
  ELENA_VASQUEZ_ANSWERS,
  ELENA_VASQUEZ_INTEGRITY,
  ELENA_VASQUEZ_ANSWER_META,
  buildElenaIntegrityFields,
} from './scenarioGreenAssociatePm.js';

const SCENARIO_SEED_VERSION = 2;
const SCENARIO_SEED_MARKER = 'scenario-seed-version';

const ENTRY_JOB_ID = 'REQ-2215';
const ENTRY_RUBRIC_ID = 'rub-2215-v1';
const SENIOR_JOB_ID = 'REQ-2204';
const SENIOR_RUBRIC_ID = 'rub-2204-v1';

const ENTRY_LEVEL_POSTING = {
  companyName: 'Xperieval Demo Co',
  employmentType: 'Full-time',
  salaryMin: '72000',
  salaryMax: '92000',
  salaryCurrency: 'USD',
  visaSponsorship: 'Not available for this role',
  department: 'Product',
  aboutCompany:
    'Xperieval builds evidence-based hiring software that helps teams evaluate candidates fairly and at scale. We combine structured rubrics, advisory scoring, and human-in-the-loop decisions so recruiters can focus on judgment, not guesswork.',
  summary:
    'We are hiring an Associate Product Manager to support discovery, delivery, and measurement for our core applicant screening workflow. This is an entry-level role designed for high-potential early-career talent who want structured mentorship while owning real product outcomes.',
  responsibilities: [
    'Partner with a senior PM to run discovery interviews, synthesize themes, and draft problem statements',
    'Write clear user stories, acceptance criteria, and release notes for engineering sprints',
    'Track funnel metrics (apply completion, time-on-task, drop-off) and propose experiments',
    'Coordinate with design on wireframes and usability tests for candidate-facing flows',
    'Maintain the product backlog, document decisions, and communicate status to stakeholders',
    'Support beta launches, gather customer feedback, and iterate on onboarding improvements',
    'Participate in sprint rituals, retrospectives, and quarterly roadmap planning',
  ],
  requiredQualifications: [
    '0–2 years of product, business analysis, or related internship experience',
    'Bachelor\'s degree in Business, Computer Science, Design, or equivalent practical experience',
    'Strong written communication and comfort working with cross-functional partners',
    'Basic familiarity with agile delivery (sprints, backlogs, user stories)',
    'Demonstrated curiosity about user problems — coursework, internships, or side projects count',
  ],
  preferredQualifications: [
    'Internship or co-op experience at a B2B SaaS company',
    'Exposure to analytics tools (Amplitude, Mixpanel, or Google Analytics)',
    'Familiarity with Figma, Jira, or similar product/design tooling',
    'Interest in HR tech, recruiting workflows, or assessment design',
  ],
  techStack: ['React', 'Node.js', 'Figma', 'Jira', 'Amplitude', 'SQL', 'Notion', 'Google Workspace'],
  benefits: [
    'Competitive entry-level salary with annual performance review',
    'Medical, dental, and vision insurance (100% employee premium covered)',
    '401(k) with 4% company match after 90 days',
    '12 weeks paid parental leave',
    '$1,500 annual learning stipend (courses, books, conferences)',
    'Hybrid work: 2 days/week in Chicago HQ, flexible hours',
    'Dedicated mentor (Senior PM) for first 12 months',
  ],
  hiringProcess: [
    'Online application with structured screening questions (~45 minutes)',
    'Recruiter phone screen (20 minutes)',
    'Product exercise: review a funnel dashboard and propose one improvement (take-home, 2 hours max)',
    'Hiring manager interview (45 minutes)',
    'Team panel: collaboration and communication focus (30 minutes)',
    'References and offer',
  ],
  equalOpportunity:
    'Xperieval is an equal opportunity employer. We welcome applicants of all backgrounds and do not discriminate on the basis of race, color, religion, sex, sexual orientation, gender identity, national origin, disability, veteran status, or any other protected characteristic.',
  recruiterName: 'Sam Ortiz',
  recruiterEmail: 'talent@xperieval.com',
};

const SCENARIO_CANDIDATES = [
  {
    id: 'XP-2010',
    jobId: ENTRY_JOB_ID,
    rubricId: ENTRY_RUBRIC_ID,
    name: 'Jordan Rivera',
    email: 'jordan.rivera@example.com',
    phone: '312-555-0142',
    source: 'University Career Fair',
    pipeline_stage: 'application_review',
    resume:
      'Jordan Rivera — Associate Product Manager candidate. B.S. Business Analytics, University of Illinois (2024). Product analyst internship at PayFlow (fintech startup, 10 weeks): user research, Amplitude dashboards, sprint support. Campus product club president. Skills: Figma, Jira, SQL basics, Google Sheets, user interviews.',
    integrity: {
      started_at: Date.now() - 2400000,
      focus_loss_count: 1,
      hidden_time_seconds: 30,
      paste_attempts: 0,
      copy_attempts: 0,
      total_time_seconds: 2100,
      fullscreen_entered: true,
      fullscreen_exit_count: 0,
      fields: {},
    },
    answerMeta: [
      { time_taken_seconds: 180, idle_seconds: 5, focus_loss_count: 0 },
      { time_taken_seconds: 220, idle_seconds: 8, focus_loss_count: 0 },
      { time_taken_seconds: 195, idle_seconds: 4, focus_loss_count: 0 },
      { time_taken_seconds: 210, idle_seconds: 6, focus_loss_count: 1 },
      { time_taken_seconds: 175, idle_seconds: 3, focus_loss_count: 0 },
      { time_taken_seconds: 160, idle_seconds: 2, focus_loss_count: 0 },
      { time_taken_seconds: 140, idle_seconds: 4, focus_loss_count: 0 },
      { time_taken_seconds: 90, idle_seconds: 0, focus_loss_count: 0 },
      { time_taken_seconds: 0, idle_seconds: 0, focus_loss_count: 0 },
      { time_taken_seconds: 0, idle_seconds: 0, focus_loss_count: 0 },
    ],
    answers: [
      'I graduated in 2024 with a Business Analytics degree and completed a product analyst internship at PayFlow, where I supported onboarding work for eight weeks — user interviews, funnel notes, and sprint tasks alongside the PM.',
      'I owned our internship capstone on email verification in onboarding: I gathered requirements from support tickets, built Amplitude funnels, and presented three friction hypotheses to the PM and design lead with specific examples.',
      'During the internship I improved onboarding completion by 12% over eight weeks and reduced verify-email drop-off because I tested shorter copy and a clearer progress indicator in our prototype with measurable results.',
      'When design wanted multi-step KYC and engineering wanted a lighter MVP, I documented both options with effort and user impact estimates, then facilitated a prioritization session to align stakeholders on trade-offs and communicate the decision.',
      'I recommended shipping the lighter email-verification MVP first because funnel data showed most users abandoned before heavy KYC — therefore we validated the hypothesis in two weeks and avoided rework with a clear result.',
      'I use Figma for wireframe review, Jira for sprint tasks, Google Sheets for roadmaps, and SQL for basic funnel queries with guidance from our data analyst; I also document user interview notes in Notion for the team.',
      'I want to grow into a product owner role at a company that invests in early-career PMs with mentorship and real ownership — your Associate PM posting matches my experience level and career growth goals at this stage.',
      'I led our campus product club and organized two hackathons with 80+ participants, which taught me to coordinate volunteers and sponsors under deadlines — a professional achievement I am proud of outside work.',
      'I collaborate with teammates through shared docs and weekly syncs, though I am still building depth in executive stakeholder management compared to senior PMs on the team.',
      '',
    ],
    scenarioNote: 'Entry-level applicant — solid intern background, scores Amber (mixed fit).',
  },
  {
    id: 'XP-2011',
    jobId: SENIOR_JOB_ID,
    rubricId: SENIOR_RUBRIC_ID,
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    phone: '415-555-0198',
    source: 'LinkedIn',
    pipeline_stage: 'application_review',
    resume:
      'Priya Sharma — Associate Product Manager, 2 years at BloomDesk (seed-stage workflow SaaS). Prior: Business Analyst at regional bank (1 year). MBA coursework (evenings, incomplete). Skills listed: Jira, Google Sheets, user interviews. No people management title; no Senior PM or platform architecture experience on resume.',
    integrity: {
      started_at: Date.now() - 3600000,
      focus_loss_count: 0,
      hidden_time_seconds: 15,
      paste_attempts: 0,
      copy_attempts: 0,
      total_time_seconds: 3200,
      fullscreen_entered: true,
      fullscreen_exit_count: 0,
      fields: {},
    },
    answerMeta: Array(10).fill({ time_taken_seconds: 280, idle_seconds: 4, focus_loss_count: 0 }),
    answers: [
      'I have two years as Associate PM at BloomDesk plus one year as a business analyst — I led feature delivery end-to-end but my resume title is still Associate PM, so I have less senior tenure than this posting describes on paper.',
      'I owned our approval-routing launch from discovery through GA: first I ran 18 customer interviews, then I wrote the PRD, ran a beta with five design partners, and led weekly ship reviews with engineering and customer success until launch.',
      'I architected and deployed the routing module rollout: I cut median approval cycle time by 41%, I increased weekly active teams by 28%, and I added $1.1M ARR in two quarters because I owned SQL funnel analysis in Amplitude, pricing experiments, and onboarding fixes with 89% gross retention.',
      'When sales wanted enterprise SSO in the same sprint as the routing MVP, I built a decision memo comparing revenue risk vs delivery risk, facilitated alignment with sales, legal, and eng leads, and therefore sequenced SSO to Q2 with documented trade-offs and a clear result for stakeholders.',
      'I chose event-driven notifications over nightly batch jobs because ops leaders needed sub-minute alerts — I accepted higher ops complexity after load tests showed p95 under 400ms, which was a difficult technical trade-off I led with platform engineering using a documented hypothesis and rollback plan.',
      'I use SQL, Amplitude, Figma, and Jira daily; I write PRDs and executive decision docs; I run architecture reviews with engineering and build REST API requirements for integrations — specific tools and methods I apply every week in my current role at BloomDesk.',
      'I am interested in this Senior PM role because I have run 0-to-1 and 1-to-N motions in a small team and want a growth-stage product where I can scale those habits, even though my formal experience level is below the typical 5+ years required on the job description.',
      'I won BloomDesk\'s Customer Obsession award because I rebuilt our onboarding checklist after I shadowed 12 support calls and cut time-to-first-value by 35% — a professional achievement I led outside the routing launch with measurable impact.',
      'I collaborate across functions through shared Slack triage, async Loom walkthroughs, and fortnightly roadmap reviews — for example I partner with design early on problem framing before we commit engineering capacity to a solution.',
      'I can start in four weeks and can share a redacted PRD sample from the routing launch; my resume understates scope because I was promoted internally without a title change to Senior PM yet, which is why my years of experience look lighter than my actual ownership.',
    ],
    scenarioNote: 'Under-experienced on resume vs Senior PM role, but exceptionally strong screening answers.',
  },
  {
    id: 'XP-2012',
    jobId: SENIOR_JOB_ID,
    rubricId: SENIOR_RUBRIC_ID,
    name: 'Marcus Chen',
    email: 'marcus.chen@example.com',
    phone: '206-555-0177',
    source: 'Employee Referral',
    pipeline_stage: 'application_review',
    resume:
      'Marcus Chen — Senior Product Manager, 9 years B2B SaaS. Currently Senior PM at CloudLedger (fintech). Led platform analytics SKU from beta to $6M ARR. Managed squads of 14 across eng, design, and data. Expertise: roadmap, pricing, Amplitude, SQL, stakeholder management, enterprise retention. MBA, Northwestern Kellogg.',
    integrity: {
      started_at: Date.now() - 1800000,
      focus_loss_count: 14,
      hidden_time_seconds: 520,
      paste_attempts: 9,
      copy_attempts: 6,
      right_click_attempts: 4,
      shortcut_blocked_count: 3,
      fullscreen_entered: true,
      fullscreen_exit_count: 5,
      total_time_seconds: 980,
      keystroke_anomaly: true,
      fields: {
        'cat-1': { keystrokes: 45, chars_final: 380, focus_seconds: 8, paste_blocked: 2 },
        'cat-2': { keystrokes: 38, chars_final: 420, focus_seconds: 6, paste_blocked: 2 },
        'cat-3': { keystrokes: 52, chars_final: 395, focus_seconds: 10, paste_blocked: 1 },
        'cat-4': { keystrokes: 41, chars_final: 360, focus_seconds: 7, paste_blocked: 2 },
        'cat-5': { keystrokes: 35, chars_final: 340, focus_seconds: 5, paste_blocked: 1 },
        'cat-6': { keystrokes: 48, chars_final: 310, focus_seconds: 9, paste_blocked: 1 },
        'cat-7': { keystrokes: 30, chars_final: 280, focus_seconds: 6, paste_blocked: 0 },
      },
    },
    answerMeta: [
      { time_taken_seconds: 45, idle_seconds: 120, focus_loss_count: 3 },
      { time_taken_seconds: 38, idle_seconds: 95, focus_loss_count: 2 },
      { time_taken_seconds: 42, idle_seconds: 110, focus_loss_count: 2 },
      { time_taken_seconds: 40, idle_seconds: 88, focus_loss_count: 2 },
      { time_taken_seconds: 35, idle_seconds: 100, focus_loss_count: 2 },
      { time_taken_seconds: 48, idle_seconds: 75, focus_loss_count: 1 },
      { time_taken_seconds: 32, idle_seconds: 90, focus_loss_count: 2 },
      { time_taken_seconds: 0, idle_seconds: 0, focus_loss_count: 0 },
      { time_taken_seconds: 0, idle_seconds: 0, focus_loss_count: 0 },
      { time_taken_seconds: 0, idle_seconds: 0, focus_loss_count: 0 },
    ],
    answers: [
      'I have nine years in B2B SaaS product management across analytics, billing, and platform products — most recently Senior PM at CloudLedger where I led a platform analytics squad of 14 engineers, designers, and data analysts.',
      'I owned our analytics platform launch end-to-end: first I led discovery with 24 enterprise customers, then I ran the beta program, owned pricing inputs, and led cross-functional rituals through GA with documented milestones.',
      'I delivered measurable impact: I reduced time-to-insight by 38%, I added $6.1M ARR in 14 months, and I held 94% net revenue retention on the new SKU because I led onboarding and expansion plays with NPS up 11 points.',
      'When sales demanded custom SSO and engineering needed stability work, I prioritized using an impact × urgency matrix, documented trade-offs in a decision memo, and aligned legal and sales in one review to communicate the result.',
      'I chose event-driven architecture over batch pipelines because real-time alerts drove a 12-point NPS lift — therefore I accepted ops complexity after load tests showed p95 under 350ms, a difficult decision I led with platform engineering.',
      'I use SQL, Amplitude, Figma, and Jira daily, and I write PRDs and executive decision docs for quarterly business reviews with finance and customer success — tools and methods central to my Senior PM work at CloudLedger.',
      'I want to lead product discipline at a growth-stage hiring-tech company where I can apply 0-to-1 and scale motions with measurable outcomes, which is why I am interested in this Senior PM role at this stage of my career.',
      '',
      '',
      '',
    ],
    scenarioNote: 'Perfect resume, mandatory-only answers, heavy tab switches and paste attempts.',
  },
  {
    id: 'XP-2013',
    jobId: ENTRY_JOB_ID,
    rubricId: ENTRY_RUBRIC_ID,
    name: 'Elena Vasquez',
    email: 'elena.vasquez@example.com',
    phone: '773-555-0284',
    source: 'Direct Apply',
    pipeline_stage: 'shortlisted_interview',
    resume: ELENA_VASQUEZ_RESUME,
    integrity: {
      ...ELENA_VASQUEZ_INTEGRITY,
      fields: buildElenaIntegrityFields(ELENA_VASQUEZ_ANSWERS),
    },
    answerMeta: ELENA_VASQUEZ_ANSWER_META,
    answers: ELENA_VASQUEZ_ANSWERS,
    scenarioNote: 'Green-bucket Associate PM — 2-page resume, strong answers, perfect session authenticity.',
  },
];

function ensureEntryLevelJob(orgId, adminId) {
  const exists = db.prepare('SELECT id FROM jobs WHERE id = ?').get(ENTRY_JOB_ID);
  if (exists) return;

  const slug = `${slugify('Associate Product Manager')}-${ENTRY_JOB_ID.toLowerCase()}`;
  const description = ENTRY_LEVEL_POSTING.summary;

  db.prepare(
    `INSERT INTO jobs (id, org_id, title, team, location, stage, owner_id, slug, description, posting_json, green_threshold, amber_threshold)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 80, 60)`
  ).run(
    ENTRY_JOB_ID,
    orgId,
    'Associate Product Manager',
    'Product',
    'Chicago, IL (Hybrid)',
    'Open',
    adminId,
    slug,
    description,
    JSON.stringify(ENTRY_LEVEL_POSTING)
  );

  db.prepare(
    `INSERT INTO rubric_versions (id, job_id, version, status, approved_by, approved_at)
     VALUES (?, ?, 1, 'approved', ?, datetime('now'))`
  ).run(ENTRY_RUBRIC_ID, ENTRY_JOB_ID, adminId);

  const insertCat = db.prepare(
    `INSERT INTO rubric_categories (id, rubric_version_id, name, weight, question, expected_evidence, sort_order,
     response_type, priority, min_response_seconds, max_response_seconds, keywords, category_type, ideal_answer)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'text', ?, 90, 300, ?, ?, ?)`
  );

  DEFAULT_RUBRIC_QUESTIONS.forEach((q, i) => {
    const row = rubricRowFromQuestion(q);
    insertCat.run(
      `cat-el-${i + 1}`,
      ENTRY_RUBRIC_ID,
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
    uuid(),
    orgId,
    ENTRY_JOB_ID,
    adminId,
    'System',
    'Rubric approved',
    'REQ-2215 Associate PM rubric v1 approved for entry-level demo scenarios'
  );
}

async function scoreScenarioApplication(applicationId) {
  const appRow = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId);
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(appRow.job_id);
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(job.org_id);
  const answers = db.prepare('SELECT * FROM answers WHERE application_id = ?').all(applicationId);
  const rubricId = appRow.rubric_version_id;
  const categories = db
    .prepare('SELECT * FROM rubric_categories WHERE rubric_version_id = ? ORDER BY sort_order')
    .all(rubricId);

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

  const overall = intelligence.overall ?? legacy.overall;
  const bucket = intelligence.bucket ?? legacy.bucket;
  const explanation = [
    intelligence.insights?.ai_summary || legacy.explanation,
    `Tier: ${intelligence.tier} · ${intelligence.recommendation}`,
  ].join('\n\n');

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
    JSON.stringify(intelligence),
    intelligence.recommendation,
    intelligence.confidence_level,
    intelligence.tier
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
    intelligence.recommendation,
    applicationId
  );

  return { overall, bucket, legacy, intelligence };
}

function resetScenarioCandidates() {
  for (const { id } of SCENARIO_CANDIDATES) {
    db.prepare('DELETE FROM scores WHERE application_id = ?').run(id);
    db.prepare('DELETE FROM answers WHERE application_id = ?').run(id);
    db.prepare('DELETE FROM applications WHERE id = ?').run(id);
    db.prepare('DELETE FROM audit_events WHERE application_id = ?').run(id);
  }
}

function insertScenarioCandidate(candidate) {

  const cats = db
    .prepare('SELECT * FROM rubric_categories WHERE rubric_version_id = ? ORDER BY sort_order')
    .all(candidate.rubricId);

  const answerBodies = candidate.answers.map((body, i) => body || '');
  const proctoringPolicy = DEFAULT_PROCTORING_POLICY;
  const proctoringResult = analyzeProctoring(candidate.integrity, proctoringPolicy);
  const integrityResult = analyzeIntegrity(
    {
      ...candidate.integrity,
      proctoring_score: proctoringResult.proctoring_score,
      proctoring_flags: proctoringResult.flags,
      proctoring_failed: proctoringResult.failed,
      proctoring_verdict: proctoringResult.proctoring_verdict,
    },
    answerBodies
  );

  const integrityJson = JSON.stringify({
    ...candidate.integrity,
    flags: integrityResult.flags,
    proctoring: proctoringResult,
    scenario: candidate.scenarioNote,
  });

  const mandatoryCount = cats.filter((c) => c.priority !== 'optional').length;
  const optionalCount = cats.filter((c) => c.priority === 'optional').length;
  let mandatoryAnswered = 0;
  let optionalAnswered = 0;
  candidate.answers.forEach((body, i) => {
    if (!body?.trim()) return;
    if (cats[i]?.priority === 'optional') optionalAnswered += 1;
    else mandatoryAnswered += 1;
  });
  const totalQ = mandatoryCount + optionalCount;
  const completionPct = Math.round(((mandatoryAnswered + optionalAnswered) / totalQ) * 100);

  const answersByCat = {};
  cats.forEach((cat, i) => {
    if (candidate.answers[i]?.trim()) {
      answersByCat[cat.id] = { body: candidate.answers[i], category_id: cat.id };
    }
  });
  const completion = computeCompletion(cats, answersByCat);
  const screeningMeta = classifyScreeningStatus({
    completion,
    integrityResult,
    mandatoryComplete: completion.mandatory_complete,
  });
  const screeningStatus = screeningMeta.screening_status;
  const screeningCategory = screeningMeta.screening_category;

  db.prepare(
    `INSERT INTO applications (
      id, job_id, rubric_version_id, name, email, phone, source, resume_text,
      integrity_json, authenticity_score, authenticity_verdict, anonymized_code,
      pipeline_stage, submitter_ip, proctoring_failed, proctoring_score,
      screening_status, screening_category, completion_pct, stage, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Applied', 'Pending score', datetime('now'))`
  ).run(
    candidate.id,
    candidate.jobId,
    candidate.rubricId,
    candidate.name,
    candidate.email,
    candidate.phone || '',
    candidate.source,
    candidate.resume,
    integrityJson,
    integrityResult.authenticity_score,
    integrityResult.authenticity_verdict,
    `CAND-${candidate.id.slice(-4)}`,
    candidate.pipeline_stage,
    '198.51.100.42',
    proctoringResult.failed ? 1 : 0,
    proctoringResult.proctoring_score,
    screeningStatus,
    screeningCategory,
    completionPct
  );

  const insertAns = db.prepare(
    `INSERT INTO answers (id, application_id, category_id, question, body, response_type,
     time_taken_seconds, idle_seconds, focus_loss_count)
     VALUES (?, ?, ?, ?, ?, 'text', ?, ?, ?)`
  );

  cats.forEach((cat, i) => {
    const meta = candidate.answerMeta?.[i] || {};
    insertAns.run(
      uuid(),
      candidate.id,
      cat.id,
      cat.question,
      candidate.answers[i] || '',
      meta.time_taken_seconds ?? 0,
      meta.idle_seconds ?? 0,
      meta.focus_loss_count ?? 0
    );
  });

  return candidate.id;
}

function scenarioSeedUpToDate() {
  const row = db.prepare('SELECT description FROM audit_events WHERE id = ?').get(SCENARIO_SEED_MARKER);
  return row?.description === String(SCENARIO_SEED_VERSION);
}

function markScenarioSeedDone(orgId) {
  db.prepare(
    `INSERT INTO audit_events (id, org_id, actor_name, event_type, description)
     VALUES (?, ?, 'System', 'Scenario seed', ?)
     ON CONFLICT(id) DO UPDATE SET description = excluded.description`
  ).run(SCENARIO_SEED_MARKER, orgId, String(SCENARIO_SEED_VERSION));
}

export async function seedScenarioDemos() {
  const org = db.prepare('SELECT id FROM organizations LIMIT 1').get();
  if (!org) return;

  const admin = db.prepare(`SELECT id FROM users WHERE role = 'Admin' LIMIT 1`).get();
  ensureEntryLevelJob(org.id, admin?.id || 'user-admin');

  if (scenarioSeedUpToDate()) return;

  resetScenarioCandidates();

  const results = [];
  for (const candidate of SCENARIO_CANDIDATES) {
    const appId = insertScenarioCandidate(candidate);
    const scored = await scoreScenarioApplication(appId);
    results.push({
      id: appId,
      name: candidate.name,
      job: candidate.jobId,
      bucket: scored.bucket,
      overall: scored.overall,
      authenticity: db.prepare('SELECT authenticity_score FROM applications WHERE id = ?').get(appId)
        ?.authenticity_score,
      scenario: candidate.scenarioNote,
    });

    db.prepare(
      `INSERT INTO audit_events (id, org_id, job_id, application_id, actor_name, event_type, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      uuid(),
      org.id,
      candidate.jobId,
      appId,
      'System',
      'Scenario demo seeded',
      `${candidate.name}: ${candidate.scenarioNote} — scored ${scored.overall}/100 (${scored.bucket})`
    );
  }

  if (results.length) {
    markScenarioSeedDone(org.id);
    console.log('[seed] Scenario demo candidates:', results);
  }
}
