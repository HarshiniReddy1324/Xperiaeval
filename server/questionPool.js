import { v4 as uuid } from 'uuid';
import { normalizeRubricCategories } from './rubricWeights.js';

/**
 * Curated screening question library by department & experience level.
 * org_id NULL = system library available to all tenants.
 */

export const POOL_DEPARTMENTS = ['HR', 'Engineering', 'Product', 'Design', 'Sales', 'Operations', 'General'];
export const POOL_LEVELS = ['Entry', 'Mid', 'Senior', 'Lead', 'All'];

export const SYSTEM_QUESTION_POOL = [
  // —— HR / Behavioral ——
  { department: 'HR', experience_level: 'All', category_type: 'Behavioral', name: 'Conflict resolution', priority: 'mandatory', question: 'Describe a time you resolved a conflict between teammates. What was your role and the outcome?', expected_evidence: 'Specific situation, actions taken, measurable result.', keywords: 'conflict,mediate,resolve,team,outcome' },
  { department: 'HR', experience_level: 'All', category_type: 'Behavioral', name: 'Feedback delivery', priority: 'mandatory', question: 'How do you give difficult feedback while maintaining trust?', expected_evidence: 'Framework, example, empathy, follow-up.', keywords: 'feedback,trust,communication,coach' },
  { department: 'HR', experience_level: 'Mid', category_type: 'Behavioral', name: 'Culture contribution', priority: 'optional', question: 'How have you shaped team culture or morale in a past role?', expected_evidence: 'Initiatives, behaviors, impact on retention or engagement.', keywords: 'culture,morale,team,engagement' },
  { department: 'HR', experience_level: 'Senior', category_type: 'Leadership', name: 'Performance management', priority: 'mandatory', question: 'Walk us through how you manage underperformance on your team.', expected_evidence: 'Process, documentation, support plan, results.', keywords: 'performance,PIP,coach,manage' },
  { department: 'HR', experience_level: 'All', category_type: 'Motivation', name: 'Why this company', priority: 'optional', question: 'What attracts you to our organization and this role specifically?', expected_evidence: 'Research-backed, role-aligned; not generic.', keywords: 'motivation,mission,role,company' },

  // —— Engineering ——
  { department: 'Engineering', experience_level: 'Entry', category_type: 'Technical', name: 'Fundamentals', priority: 'mandatory', question: 'Explain a technical concept you learned recently and how you applied it.', expected_evidence: 'Clear explanation, learning path, small project or exercise.', keywords: 'learn,apply,concept,code' },
  { department: 'Engineering', experience_level: 'Entry', category_type: 'Problem Solving', name: 'Debugging approach', priority: 'mandatory', question: 'Describe how you debugged a bug end-to-end. What tools and steps did you use?', expected_evidence: 'Reproduce, isolate, fix, test, prevent recurrence.', keywords: 'debug,log,test,fix' },
  { department: 'Engineering', experience_level: 'Mid', category_type: 'Technical', name: 'API design', priority: 'mandatory', question: 'How do you design REST or GraphQL APIs for reliability and versioning?', expected_evidence: 'Contracts, errors, idempotency, observability.', keywords: 'API,REST,GraphQL,versioning,design' },
  { department: 'Engineering', experience_level: 'Mid', category_type: 'Technical', name: 'System design basics', priority: 'mandatory', question: 'Design a simplified version of a system you have worked on (API, data store, scaling).', expected_evidence: 'Components, trade-offs, bottlenecks, monitoring.', keywords: 'design,API,scale,trade-off' },
  { department: 'Engineering', experience_level: 'Mid', category_type: 'Problem Solving', name: 'Production bug', priority: 'mandatory', question: 'Describe a production bug you diagnosed and fixed. What was your debugging process?', expected_evidence: 'Reproduce, logs, root cause, fix, prevention.', keywords: 'debug,production,RCA,fix' },
  { department: 'Engineering', experience_level: 'Mid', category_type: 'Communication', name: 'Technical explanation', priority: 'optional', question: 'Explain a technical concept to a non-technical stakeholder. What approach did you use?', expected_evidence: 'Analogies, outcomes, no jargon overload.', keywords: 'communicate,stakeholder,explain' },
  { department: 'Engineering', experience_level: 'Mid', category_type: 'Project Experience', name: 'Owned feature', priority: 'mandatory', question: 'Tell us about a feature you owned from design through production.', expected_evidence: 'Requirements, implementation, rollout, metrics.', keywords: 'owned,shipped,feature,production' },
  { department: 'Engineering', experience_level: 'Senior', category_type: 'Technical', name: 'Architecture decisions', priority: 'mandatory', question: 'Describe a significant architecture decision you drove. What alternatives did you consider?', expected_evidence: 'Context, options, decision criteria, long-term impact.', keywords: 'architecture,decision,trade-off,scale' },
  { department: 'Engineering', experience_level: 'Senior', category_type: 'Problem Solving', name: 'Incident response', priority: 'mandatory', question: 'Walk through a production incident you led or heavily contributed to resolving.', expected_evidence: 'Timeline, comms, mitigation, postmortem, prevention.', keywords: 'incident,on-call,postmortem,RCA' },
  { department: 'Engineering', experience_level: 'Senior', category_type: 'Technical', name: 'Kubernetes / cloud', priority: 'optional', question: 'Describe your hands-on experience running workloads in Kubernetes or similar orchestration.', expected_evidence: 'Clusters, deployments, observability, failures handled.', keywords: 'kubernetes,k8s,docker,deploy,cloud' },
  { department: 'Engineering', experience_level: 'Lead', category_type: 'Leadership', name: 'Tech leadership', priority: 'mandatory', question: 'How do you set technical direction for a team while staying hands-on?', expected_evidence: 'Standards, reviews, mentoring, delivery balance.', keywords: 'lead,mentor,direction,standards' },
  { department: 'Engineering', experience_level: 'Lead', category_type: 'Project Experience', name: 'Cross-team delivery', priority: 'mandatory', question: 'Describe delivering a large initiative across multiple teams.', expected_evidence: 'Planning, dependencies, alignment, outcomes.', keywords: 'cross-team,delivery,program,align' },

  // —— Product ——
  { department: 'Product', experience_level: 'Mid', category_type: 'Problem Solving', name: 'Prioritization', priority: 'mandatory', question: 'How do you prioritize a backlog when everything seems urgent?', expected_evidence: 'Framework, stakeholders, data, trade-offs.', keywords: 'prioritize,backlog,roadmap,stakeholder' },
  { department: 'Product', experience_level: 'Senior', category_type: 'Project Experience', name: 'Product launch', priority: 'mandatory', question: 'Describe a product launch you led and how you measured success.', expected_evidence: 'Discovery, GTM, metrics, iteration.', keywords: 'launch,metrics,GTM,iteration' },
  { department: 'Product', experience_level: 'All', category_type: 'Communication', name: 'Stakeholder alignment', priority: 'mandatory', question: 'Tell us about aligning engineering and business on a contentious decision.', expected_evidence: 'Facilitation, data, compromise, outcome.', keywords: 'stakeholder,align,trade-off' },

  // —— Design ——
  { department: 'Design', experience_level: 'Mid', category_type: 'Project Experience', name: 'Design process', priority: 'mandatory', question: 'Walk through your design process for a recent project from research to handoff.', expected_evidence: 'Research, iterations, validation, dev collaboration.', keywords: 'research,prototype,handoff,usability' },
  { department: 'Design', experience_level: 'Senior', category_type: 'Communication', name: 'Design critique', priority: 'optional', question: 'How do you handle pushback on design decisions from product or engineering?', expected_evidence: 'Evidence, principles, collaboration, outcomes.', keywords: 'critique,feedback,collaborate' },

  // —— Sales ——
  { department: 'Sales', experience_level: 'Entry', category_type: 'Communication', name: 'Discovery call', priority: 'mandatory', question: 'How do you structure a first discovery call with a new prospect?', expected_evidence: 'Questions, listening, qualification, next steps.', keywords: 'discovery,prospect,qualify,pipeline' },
  { department: 'Sales', experience_level: 'Senior', category_type: 'Behavioral', name: 'Deal recovery', priority: 'mandatory', question: 'Describe turning around a deal that was at risk of being lost.', expected_evidence: 'Diagnosis, actions, close, lessons.', keywords: 'deal,close,recover,revenue' },

  // —— Operations ——
  { department: 'Operations', experience_level: 'Mid', category_type: 'Problem Solving', name: 'Process improvement', priority: 'mandatory', question: 'Describe a process you improved and the measurable impact.', expected_evidence: 'Before/after, metrics, tooling, adoption.', keywords: 'process,efficiency,metrics,improve' },

  // —— General (default 10-style) ——
  { department: 'General', experience_level: 'All', category_type: 'Project Experience', name: 'Role-relevant experience', priority: 'mandatory', question: 'Summarize your professional experience most relevant to this role.', expected_evidence: 'Concrete roles, tenure, domain fit, and scope.', keywords: 'experience,role,responsibilities,scope' },
  { department: 'General', experience_level: 'All', category_type: 'Project Experience', name: 'Ownership example', priority: 'mandatory', question: 'Describe a project or initiative you personally owned from start to finish.', expected_evidence: 'Clear ownership, actions, constraints, outcome.', keywords: 'owned,led,delivered,shipped' },
  { department: 'General', experience_level: 'All', category_type: 'Behavioral', name: 'Measurable impact', priority: 'mandatory', question: 'What measurable results did you achieve in your most recent role?', expected_evidence: 'Metrics, percentages, revenue, users, time saved.', keywords: 'metrics,impact,results,growth' },
  { department: 'General', experience_level: 'All', category_type: 'Communication', name: 'Stakeholder management', priority: 'mandatory', question: 'How do you handle conflicting priorities from multiple stakeholders?', expected_evidence: 'Prioritization framework, communication, trade-offs.', keywords: 'stakeholder,prioritize,align' },
  { department: 'General', experience_level: 'All', category_type: 'Problem Solving', name: 'Difficult decision', priority: 'mandatory', question: 'Tell us about a difficult decision you made and how you reached it.', expected_evidence: 'Context, options, reasoning, result.', keywords: 'decision,trade-off,analysis' },
  { department: 'General', experience_level: 'All', category_type: 'Technical', name: 'Skills & tools', priority: 'mandatory', question: 'Describe the skills, tools, or methods you use daily that apply to this role.', expected_evidence: 'Specific tools, depth, seniority fit.', keywords: 'tools,technical,skills,methods' },
  { department: 'General', experience_level: 'All', category_type: 'Motivation', name: 'Career motivation', priority: 'mandatory', question: 'Why are you interested in this type of role at this point in your career?', expected_evidence: 'Thoughtful, role-specific motivation.', keywords: 'motivation,career,growth' },
  { department: 'General', experience_level: 'All', category_type: 'Project Experience', name: 'Extra achievement', priority: 'optional', question: 'Share a professional achievement you are proud of that we have not asked about.', expected_evidence: 'Specificity and impact if answered.', keywords: 'achievement,impact,proud' },
  { department: 'General', experience_level: 'All', category_type: 'Communication', name: 'Collaboration', priority: 'optional', question: 'How do you prefer to work with teammates across different functions?', expected_evidence: 'Cross-functional examples.', keywords: 'collaborate,cross-functional,team' },
  { department: 'General', experience_level: 'All', category_type: 'General', name: 'Anything else', priority: 'optional', question: 'Is there anything else you would like the hiring team to know?', expected_evidence: 'Relevance and authenticity if provided.', keywords: 'additional,context' },
];

export function ensureQuestionPool(db, orgId = null) {
  const count =
    orgId == null
      ? db.prepare('SELECT COUNT(*) as c FROM question_pool WHERE org_id IS NULL').get().c
      : db.prepare('SELECT COUNT(*) as c FROM question_pool WHERE org_id = ?').get(orgId).c;
  if (count > 0) return count;
  seedQuestionPool(db, orgId);
  const after =
    orgId == null
      ? db.prepare('SELECT COUNT(*) as c FROM question_pool WHERE org_id IS NULL').get().c
      : db.prepare('SELECT COUNT(*) as c FROM question_pool WHERE org_id = ?').get(orgId).c;
  return after;
}

/** Re-seed system library if empty (e.g. after a bad migration). */
export function repairQuestionPoolIfEmpty(db) {
  const systemCount = db.prepare('SELECT COUNT(*) as c FROM question_pool WHERE org_id IS NULL').get().c;
  if (systemCount === 0) {
    seedQuestionPool(db, null);
    return true;
  }
  return false;
}

export function seedQuestionPool(db, orgId = null) {
  const exists =
    orgId == null
      ? db.prepare('SELECT COUNT(*) as c FROM question_pool WHERE org_id IS NULL').get().c
      : db.prepare('SELECT COUNT(*) as c FROM question_pool WHERE org_id = ?').get(orgId).c;
  if (exists > 0) return;

  const insert = db.prepare(
    `INSERT INTO question_pool (id, org_id, department, experience_level, category_type, name, question,
     expected_evidence, keywords, default_priority, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  SYSTEM_QUESTION_POOL.forEach((q, i) => {
    insert.run(
      uuid(),
      orgId,
      q.department,
      q.experience_level,
      q.category_type,
      q.name,
      q.question,
      q.expected_evidence,
      q.keywords,
      q.priority,
      i
    );
  });
}

export function listQuestionPool(db, { orgId, department, level, search }) {
  ensureQuestionPool(db, null);
  const oid = orgId || 'org-demo';
  let sql = `SELECT * FROM question_pool WHERE (org_id IS NULL OR org_id = ?)`;
  const params = [oid];
  if (department && department !== 'All') {
    sql += ' AND department = ?';
    params.push(department);
  }
  if (level && level !== 'All') {
    sql += ' AND (experience_level = ? OR experience_level = ?)';
    params.push(level, 'All');
  }
  if (search?.trim()) {
    sql += ' AND (name LIKE ? OR question LIKE ? OR keywords LIKE ?)';
    const q = `%${search.trim()}%`;
    params.push(q, q, q);
  }
  sql += ' AND (archived IS NULL OR archived = 0)';
  sql += ' ORDER BY department, experience_level, sort_order';
  return db.prepare(sql).all(...params);
}

/** Build rubric rows from pool selections, uses all selected questions. */
export function poolItemsToRubricCategories(items) {
  const questions = items.map((q) => {
    const sample = q.ideal_answer || q.expected_evidence || '';
    return {
      name: q.name,
      question: q.question,
      expected_evidence: sample.slice(0, 280),
      ideal_answer: sample,
      category_type: q.category_type || 'General',
      response_type: 'text',
      priority: q.default_priority === 'optional' ? 'optional' : 'mandatory',
      max_response_seconds: 300,
      keywords: q.keywords || '',
      pool_id: q.id,
    };
  });
  return normalizeRubricCategories(questions);
}

export function normalizeQuestionText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findSimilarQuestion(db, orgId, department, questionText) {
  const norm = normalizeQuestionText(questionText);
  if (!norm) return null;
  const items = listQuestionPool(db, { orgId, department: department || undefined });
  return (
    items.find((q) => normalizeQuestionText(q.question) === norm) ||
    items.find((q) => {
      const qn = normalizeQuestionText(q.question);
      return qn.includes(norm) || norm.includes(qn);
    }) ||
    null
  );
}

export function getQuestionPoolItem(db, id, orgId) {
  return db
    .prepare(`SELECT * FROM question_pool WHERE id = ? AND (org_id IS NULL OR org_id = ?)`)
    .get(id, orgId);
}

export function createQuestion(db, orgId, data, createdBy) {
  const similar = findSimilarQuestion(db, orgId, data.department, data.question);
  if (similar) return { error: 'Similar question already exists in library', existing: similar };

  const id = uuid();
  db.prepare(
    `INSERT INTO question_pool
     (id, org_id, department, experience_level, category_type, name, question, expected_evidence, ideal_answer,
      keywords, default_priority, sort_order, source_type, source_template_id, source_template_name, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'org', NULL, NULL, ?)`
  ).run(
    id,
    orgId,
    data.department,
    data.experience_level || 'All',
    data.category_type || 'General',
    data.name,
    data.question,
    (data.expected_evidence || data.ideal_answer || '').slice(0, 280),
    data.ideal_answer || data.expected_evidence || '',
    data.keywords || '',
    data.default_priority || 'mandatory',
    data.sort_order || 0,
    createdBy
  );
  return { id };
}

export function updateQuestion(db, id, orgId, data) {
  const row = db.prepare(`SELECT * FROM question_pool WHERE id = ? AND org_id = ?`).get(id, orgId);
  if (!row) return { error: 'Question not found or not editable (system library is read-only)' };

  db.prepare(
    `UPDATE question_pool SET department = ?, experience_level = ?, category_type = ?, name = ?, question = ?,
     expected_evidence = ?, ideal_answer = ?, keywords = ?, default_priority = ?, updated_at = datetime('now')
     WHERE id = ? AND org_id = ?`
  ).run(
    data.department ?? row.department,
    data.experience_level ?? row.experience_level,
    data.category_type ?? row.category_type,
    data.name ?? row.name,
    data.question ?? row.question,
    (data.expected_evidence || data.ideal_answer || row.expected_evidence || '').slice(0, 280),
    data.ideal_answer ?? row.ideal_answer ?? row.expected_evidence ?? '',
    data.keywords ?? row.keywords ?? '',
    data.default_priority ?? row.default_priority ?? 'mandatory',
    id,
    orgId
  );
  return { id };
}

export function archiveQuestion(db, id, orgId) {
  const row = db.prepare(`SELECT * FROM question_pool WHERE id = ? AND org_id = ?`).get(id, orgId);
  if (!row) return { error: 'Question not found or not deletable' };
  db.prepare(`UPDATE question_pool SET archived = 1, updated_at = datetime('now') WHERE id = ?`).run(id);
  return { ok: true };
}

/** Add template/job questions to org library with dedupe. */
export function upsertQuestionsFromCategories(
  db,
  { orgId, categories, department, experienceLevel, sourceTemplateId, sourceTemplateName, createdBy }
) {
  const results = { added: [], linked: [], skipped: [] };
  for (const c of categories) {
    if (!c.question?.trim()) {
      results.skipped.push({ name: c.name, reason: 'empty' });
      continue;
    }
    const similar = findSimilarQuestion(db, orgId, department, c.question);
    if (similar) {
      results.linked.push({ name: c.name, poolId: similar.id, question: similar.question });
      continue;
    }
    const id = uuid();
    db.prepare(
      `INSERT INTO question_pool
       (id, org_id, department, experience_level, category_type, name, question, expected_evidence, ideal_answer,
        keywords, default_priority, sort_order, source_type, source_template_id, source_template_name, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'template', ?, ?, ?)`
    ).run(
      id,
      orgId,
      department || 'General',
      experienceLevel || 'All',
      c.category_type || 'General',
      c.name,
      c.question,
      (c.expected_evidence || c.ideal_answer || '').slice(0, 280),
      c.ideal_answer || c.expected_evidence || '',
      c.keywords || '',
      c.priority === 'optional' ? 'optional' : 'mandatory',
      c.sort_order || 0,
      sourceTemplateId || null,
      sourceTemplateName || null,
      createdBy
    );
    results.added.push({ id, name: c.name });
  }
  return results;
}

export function exportQuestionPool(db, orgId) {
  return db
    .prepare(
      `SELECT department, experience_level, category_type, name, question, expected_evidence, ideal_answer,
              keywords, default_priority, sort_order, source_type
       FROM question_pool WHERE org_id = ? AND (archived IS NULL OR archived = 0)
       ORDER BY department, experience_level, sort_order`
    )
    .all(orgId);
}

export function importQuestionPool(db, orgId, items, createdBy) {
  const results = { added: [], linked: [], errors: [] };
  for (const item of items || []) {
    const similar = findSimilarQuestion(db, orgId, item.department, item.question);
    if (similar) {
      results.linked.push({ name: item.name, poolId: similar.id });
      continue;
    }
    const created = createQuestion(db, orgId, item, createdBy);
    if (created.error) results.errors.push({ name: item.name, error: created.error });
    else results.added.push({ id: created.id, name: item.name });
  }
  return results;
}
