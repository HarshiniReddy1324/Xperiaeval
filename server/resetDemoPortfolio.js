import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { db, slugify } from './db.js';
import { DEFAULT_RUBRIC_QUESTIONS, rubricRowFromQuestion } from './defaultRubric.js';
import { scoreApplication } from './scoring.js';

const ORG_ID = 'org-demo';
const ADMIN_ID = 'user-admin';

const JOBS = [
  { id: 'JOB-INTERN-001', title: 'Software Engineering Intern', team: 'Engineering', location: 'Austin, TX', stage: 'Open' },
  { id: 'JOB-ASSOC-001', title: 'Associate Product Manager', team: 'Product', location: 'Chicago, IL', stage: 'Screening' },
  { id: 'JOB-MID-001', title: 'Data Analyst II', team: 'Analytics', location: 'Remote (US)', stage: 'Hiring Team Review' },
  { id: 'JOB-SENIOR-001', title: 'Senior Product Manager', team: 'Product', location: 'New York, NY', stage: 'Interviewing' },
  { id: 'JOB-STAFF-001', title: 'Staff Data Engineer', team: 'Data Platform', location: 'Seattle, WA', stage: 'Screening' },
  { id: 'JOB-DIRECTOR-001', title: 'Director, Talent Operations', team: 'People Ops', location: 'San Francisco, CA', stage: 'Draft' },
];

const CANDIDATES = [
  {
    id: 'APP-INT-1001',
    jobId: 'JOB-INTERN-001',
    name: 'Aarav Mehta',
    email: 'aarav.mehta@example.com',
    phone: '512-555-0101',
    source: 'Sample data',
    pipeline: 'shortlisted_interview',
    quality: 'strong',
    authenticity: 96,
    integrity: { focus_loss_count: 0, paste_attempts: 0 },
    resume:
      'Aarav Mehta | B.S. Computer Science (2026), UT Austin. SWE Intern at FinNest (Summer 2025): built React dashboard module, improved API response caching and reduced page latency by 18%. Projects: distributed key-value store in Go, interview scheduler with Node/SQLite. Skills: JavaScript, TypeScript, React, Node.js, Python, SQL, GitHub Actions.',
  },
  {
    id: 'APP-INT-1002',
    jobId: 'JOB-INTERN-001',
    name: 'Nora Fields',
    email: 'nora.fields@example.com',
    phone: '512-555-0102',
    source: 'Sample data',
    pipeline: 'application_review',
    quality: 'average',
    authenticity: 84,
    integrity: { focus_loss_count: 1, paste_attempts: 0 },
    resume:
      'Nora Fields | B.S. Information Systems (2026), Texas State University. QA + automation intern at retail startup: wrote Cypress smoke tests and bug reports. Coursework in databases, web apps, and systems design. Skills: JavaScript basics, SQL, Postman, Jira, Figma.',
  },
  {
    id: 'APP-INT-1003',
    jobId: 'JOB-INTERN-001',
    name: 'Ethan Cole',
    email: 'ethan.cole@example.com',
    phone: '512-555-0103',
    source: 'Sample data',
    pipeline: 'application_review',
    quality: 'weak',
    authenticity: 62,
    integrity: { focus_loss_count: 4, paste_attempts: 2 },
    resume:
      'Ethan Cole | Self-taught developer. Built small websites for local clubs and basic todo app in React. Looking for first internship to gain production experience. Skills: HTML/CSS, JavaScript, beginner React.',
  },
  {
    id: 'APP-ASC-2001',
    jobId: 'JOB-ASSOC-001',
    name: 'Elena Vasquez',
    email: 'elena.vasquez@example.com',
    phone: '773-555-0201',
    source: 'Sample data',
    pipeline: 'shortlisted_interview',
    quality: 'strong',
    authenticity: 98,
    integrity: { focus_loss_count: 0, paste_attempts: 0 },
    resume:
      'Elena Vasquez | B.A. Economics, Northwestern (2024). Product Analyst Intern at BeaconHire: owned candidate funnel tracking in Amplitude, coordinated discovery interviews, and helped ship application form improvements that increased completion rate by 14%. Skills: SQL, Figma, Jira, product writing, stakeholder communication.',
  },
  {
    id: 'APP-ASC-2002',
    jobId: 'JOB-ASSOC-001',
    name: 'Jordan Rivera',
    email: 'jordan.rivera@example.com',
    phone: '773-555-0202',
    source: 'Sample data',
    pipeline: 'application_review',
    quality: 'average',
    authenticity: 89,
    integrity: { focus_loss_count: 1, paste_attempts: 0 },
    resume:
      'Jordan Rivera | B.S. Business Analytics, UIUC (2024). Product internship at PayFlow (10 weeks): user research, sprint support, dashboard updates. Led campus product club and organized two student hackathons.',
  },
  {
    id: 'APP-ASC-2003',
    jobId: 'JOB-ASSOC-001',
    name: 'Mina Patel',
    email: 'mina.patel@example.com',
    phone: '773-555-0203',
    source: 'Sample data',
    pipeline: 'application_review',
    quality: 'weak',
    authenticity: 58,
    integrity: { focus_loss_count: 6, paste_attempts: 3 },
    resume:
      'Mina Patel | Product coordinator with 1.5 years startup experience supporting backlog and QA tracking. Assisted PMs with release notes and analytics requests. Tools: Jira, Sheets, Trello.',
  },
  {
    id: 'APP-MID-3001',
    jobId: 'JOB-MID-001',
    name: 'Sofia Nguyen',
    email: 'sofia.nguyen@example.com',
    phone: '646-555-0301',
    source: 'Sample data',
    pipeline: 'interview_scheduled',
    quality: 'strong',
    authenticity: 95,
    integrity: { focus_loss_count: 0, paste_attempts: 0 },
    resume:
      'Sofia Nguyen | Data Analyst II with 4 years experience (e-commerce + SaaS). At NorthSquare, redesigned executive KPI model, built dbt marts, and reduced reporting lag from 2 days to 3 hours. SQL and BI specialist with A/B test and funnel analysis ownership.',
  },
  {
    id: 'APP-MID-3002',
    jobId: 'JOB-MID-001',
    name: 'Caleb Morris',
    email: 'caleb.morris@example.com',
    phone: '646-555-0302',
    source: 'Sample data',
    pipeline: 'application_review',
    quality: 'average',
    authenticity: 86,
    integrity: { focus_loss_count: 1, paste_attempts: 0 },
    resume:
      'Caleb Morris | BI Analyst with 3 years in healthcare operations. Built Tableau dashboards and recurring SQL reports for clinical staffing and patient throughput. Comfortable translating business questions into metrics.',
  },
  {
    id: 'APP-MID-3003',
    jobId: 'JOB-MID-001',
    name: 'Liam Torres',
    email: 'liam.torres@example.com',
    phone: '646-555-0303',
    source: 'Sample data',
    pipeline: 'application_review',
    quality: 'weak',
    authenticity: 67,
    integrity: { focus_loss_count: 3, paste_attempts: 1 },
    resume:
      'Liam Torres | Reporting analyst at local nonprofit. Maintains monthly spreadsheets and basic dashboards. Limited SQL depth but interested in growing into product analytics.',
  },
  {
    id: 'APP-SNR-4001',
    jobId: 'JOB-SENIOR-001',
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    phone: '212-555-0401',
    source: 'Sample data',
    pipeline: 'final_review',
    quality: 'strong',
    authenticity: 91,
    integrity: { focus_loss_count: 0, paste_attempts: 0 },
    resume:
      'Priya Sharma | Product leader with 7 years in B2B SaaS. Senior PM at BloomDesk: launched approvals and analytics modules, grew attached ARR by $4.7M, and improved retention by 9 points. Prior experience in fintech operations and customer discovery. Tools: SQL, Amplitude, Figma, Jira.',
  },
  {
    id: 'APP-SNR-4002',
    jobId: 'JOB-SENIOR-001',
    name: 'Marcus Chen',
    email: 'marcus.chen@example.com',
    phone: '212-555-0402',
    source: 'Sample data',
    pipeline: 'shortlisted_interview',
    quality: 'average',
    authenticity: 74,
    integrity: { focus_loss_count: 4, paste_attempts: 2 },
    resume:
      'Marcus Chen | Senior PM, 9 years SaaS. Led platform analytics rollout and enterprise roadmap planning. Strong technical fluency in data products and API integrations. MBA, Northwestern Kellogg.',
  },
  {
    id: 'APP-SNR-4003',
    jobId: 'JOB-SENIOR-001',
    name: 'Olivia Grant',
    email: 'olivia.grant@example.com',
    phone: '212-555-0403',
    source: 'Sample data',
    pipeline: 'application_review',
    quality: 'weak',
    authenticity: 52,
    integrity: { focus_loss_count: 8, paste_attempts: 4 },
    resume:
      'Olivia Grant | Product manager with 3 years at two startups. Experience includes feature tickets and stakeholder meetings, but limited ownership of roadmap strategy, experimentation, and commercial outcomes.',
  },
  {
    id: 'APP-STF-5001',
    jobId: 'JOB-STAFF-001',
    name: 'Daniel Okafor',
    email: 'daniel.okafor@example.com',
    phone: '206-555-0501',
    source: 'Sample data',
    pipeline: 'interview_scheduled',
    quality: 'strong',
    authenticity: 94,
    integrity: { focus_loss_count: 0, paste_attempts: 0 },
    resume:
      'Daniel Okafor | Staff Data Engineer, 10 years. Built event-driven data platform on Kafka + Snowflake serving 45 product squads. Reduced pipeline failures by 63% and cut compute cost by 27% with tiered storage strategy. Led architecture guild and mentoring program.',
  },
  {
    id: 'APP-STF-5002',
    jobId: 'JOB-STAFF-001',
    name: 'Grace Kim',
    email: 'grace.kim@example.com',
    phone: '206-555-0502',
    source: 'Sample data',
    pipeline: 'application_review',
    quality: 'average',
    authenticity: 88,
    integrity: { focus_loss_count: 1, paste_attempts: 0 },
    resume:
      'Grace Kim | Senior Data Engineer with 6 years in ad-tech and fintech. Built Airflow ETL, maintained dbt models, and collaborated with analytics teams on trusted metrics. Strong Python, SQL, and cloud fundamentals.',
  },
  {
    id: 'APP-STF-5003',
    jobId: 'JOB-STAFF-001',
    name: 'Noah Bennett',
    email: 'noah.bennett@example.com',
    phone: '206-555-0503',
    source: 'Sample data',
    pipeline: 'application_review',
    quality: 'weak',
    authenticity: 61,
    integrity: { focus_loss_count: 5, paste_attempts: 2 },
    resume:
      'Noah Bennett | Data engineer with 2 years ETL maintenance experience. Comfortable with SQL and troubleshooting dashboards; limited architecture ownership at scale.',
  },
  {
    id: 'APP-DIR-6001',
    jobId: 'JOB-DIRECTOR-001',
    name: 'Vanessa Brooks',
    email: 'vanessa.brooks@example.com',
    phone: '415-555-0601',
    source: 'Sample data',
    pipeline: 'interview_completed',
    quality: 'strong',
    authenticity: 93,
    integrity: { focus_loss_count: 0, paste_attempts: 0 },
    resume:
      'Vanessa Brooks | Director of Talent Operations with 12 years experience scaling hiring systems in hypergrowth SaaS. Built structured interviewing program across 1,100 hires/year, reduced time-to-fill by 24%, and led ATS migration with 98% adoption in six months.',
  },
  {
    id: 'APP-DIR-6002',
    jobId: 'JOB-DIRECTOR-001',
    name: 'Henry Walsh',
    email: 'henry.walsh@example.com',
    phone: '415-555-0602',
    source: 'Sample data',
    pipeline: 'final_review',
    quality: 'average',
    authenticity: 85,
    integrity: { focus_loss_count: 1, paste_attempts: 0 },
    resume:
      'Henry Walsh | Senior Recruiting Operations Manager with 8 years leading process redesign, SLA governance, and analytics for distributed recruiting teams. Built dashboarding framework used by TA leadership and finance.',
  },
  {
    id: 'APP-DIR-6003',
    jobId: 'JOB-DIRECTOR-001',
    name: 'Chloe Diaz',
    email: 'chloe.diaz@example.com',
    phone: '415-555-0603',
    source: 'Sample data',
    pipeline: 'application_review',
    quality: 'weak',
    authenticity: 55,
    integrity: { focus_loss_count: 7, paste_attempts: 3 },
    resume:
      'Chloe Diaz | Recruiting coordinator and operations specialist (3 years). Good coordination skills and scheduler administration, but limited enterprise-level process ownership and analytics leadership.',
  },
];

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

function softResetDemoData() {
  const now = new Date().toISOString();
  db.prepare(`UPDATE applications SET deleted_at = ? WHERE deleted_at IS NULL`).run(now);
  db.prepare(`UPDATE jobs SET deleted_at = ? WHERE deleted_at IS NULL`).run(now);
  db.prepare(`DELETE FROM scores WHERE application_id IN (SELECT id FROM applications WHERE deleted_at IS NOT NULL)`).run();
  db.prepare(`DELETE FROM answers WHERE application_id IN (SELECT id FROM applications WHERE deleted_at IS NOT NULL)`).run();
}

function hardCleanupSeedArtifacts() {
  db.prepare(`DELETE FROM applications WHERE id LIKE 'APP-%'`).run();
  db.prepare(`DELETE FROM jobs WHERE id LIKE 'JOB-%'`).run();
}

function createRubric(jobId, index) {
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
  return base.map((txt, idx) => `${txt} ${idx < 6 ? 'In prior roles, I worked cross-functionally and delivered against clear goals.' : ''}`.trim());
}

function insertJobsAndCandidates() {
  const insertJob = db.prepare(
    `INSERT INTO jobs (
      id, org_id, title, team, location, stage, owner_id, slug, description,
      green_threshold, amber_threshold, posting_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 80, 60, ?, datetime('now'))`
  );
  const insertApp = db.prepare(
    `INSERT INTO applications (
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
    `INSERT INTO scores (
      id, application_id, overall, bucket, resume_match, answer_quality,
      evidence_strength, communication, risk, explanation, recommendation, confidence_level, tier
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const [idx, job] of JOBS.entries()) {
    const slug = `${slugify(job.title)}-${job.id.toLowerCase()}`;
    const posting = {
      companyName: 'Xperieval Demo Co',
      department: job.team,
      summary: `Hiring ${job.title} to support enterprise-scale hiring workflows and data-driven decisioning.`,
      employmentType: 'Full-time',
    };
    insertJob.run(
      job.id,
      ORG_ID,
      job.title,
      job.team,
      job.location,
      job.stage,
      ADMIN_ID,
      slug,
      `Join Xperieval as a ${job.title} and help improve quality and speed of talent decisions.`,
      JSON.stringify(posting)
    );
    const rubricId = createRubric(job.id, idx + 1);

    const categories = db
      .prepare('SELECT * FROM rubric_categories WHERE rubric_version_id = ? ORDER BY sort_order')
      .all(rubricId);
    const people = CANDIDATES.filter((c) => c.jobId === job.id);
    for (const candidate of people) {
      const answers = buildAnswers(candidate, categories, job.title);
      const integrityJson = JSON.stringify({
        focus_loss_count: candidate.integrity.focus_loss_count,
        paste_attempts: candidate.integrity.paste_attempts,
        hidden_time_seconds: candidate.integrity.focus_loss_count * 22,
        total_time_seconds: 2100,
      });
      const screeningStatus =
        candidate.integrity.paste_attempts >= 3 ? 'ai_used' : 'complete';
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
        normalizedOverall >= 80 ? 'Strongly Recommended' : normalizedOverall >= 65 ? 'Recruiter Review Needed' : 'Not Recommended';

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
    }
  }
}

const run = db.transaction(() => {
  ensureBaseOrg();
  softResetDemoData();
  hardCleanupSeedArtifacts();
  insertJobsAndCandidates();
});

run();
console.log(`[seed] Reset complete. Jobs: ${JOBS.length}, candidates: ${CANDIDATES.length}`);
