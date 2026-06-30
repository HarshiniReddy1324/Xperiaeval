import { v4 as uuid } from 'uuid';
import { upsertQuestionsFromCategories, poolItemsToRubricCategories } from './questionPool.js';
import { normalizeRubricCategories, validateRubricQuestions } from './rubricWeights.js';

export function ensureRubricTemplatesTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rubric_templates (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id),
      name TEXT NOT NULL,
      description TEXT,
      department TEXT,
      experience_level TEXT,
      questions_json TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      parent_template_id TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS rubric_template_applications (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES rubric_templates(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      applied_by TEXT,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function normalizeQuestions(categories) {
  const mapped = categories.map((c, i) => ({
    name: c.name,
    question: c.question,
    expected_evidence: (c.expected_evidence || c.ideal_answer || '').slice(0, 280),
    ideal_answer: c.ideal_answer || c.expected_evidence || '',
    category_type: c.category_type || 'General',
    response_type: c.response_type || 'text',
    priority: c.priority || 'mandatory',
    max_response_seconds: c.max_response_seconds || 300,
    keywords: c.keywords || '',
    pool_id: c.pool_id || null,
    sort_order: i,
  }));
  return normalizeRubricCategories(mapped);
}

function validateTemplateQuestions(questions) {
  const result = validateRubricQuestions(questions);
  return result.ok ? null : result.error;
}

export function listTemplates(db, orgId) {
  return db
    .prepare(
      `SELECT t.id, t.org_id, t.name, t.description, t.department, t.experience_level,
              t.created_by, t.created_at, t.updated_at, t.version, t.parent_template_id, t.questions_json,
              (SELECT COUNT(*) FROM rubric_template_applications a WHERE a.template_id = t.id) AS usage_count
       FROM rubric_templates t
       WHERE t.org_id = ?
       ORDER BY COALESCE(t.updated_at, t.created_at) DESC, t.created_at DESC`
    )
    .all(orgId)
    .map((r) => ({
      ...r,
      question_count: JSON.parse(r.questions_json || '[]').length,
      questions_json: undefined,
    }));
}

export function getTemplate(db, id, orgId) {
  const row = db.prepare(`SELECT * FROM rubric_templates WHERE id = ? AND org_id = ?`).get(id, orgId);
  if (!row) return null;
  const usage_count = db
    .prepare(`SELECT COUNT(*) as c FROM rubric_template_applications WHERE template_id = ?`)
    .get(id).c;
  return {
    ...row,
    questions: JSON.parse(row.questions_json || '[]'),
    usage_count,
    questions_json: undefined,
  };
}

export function listTemplateVersions(db, templateId, orgId) {
  const root = getTemplate(db, templateId, orgId);
  if (!root) return [];
  const chain = [];
  let current = root;
  while (current?.parent_template_id) {
    const parent = getTemplate(db, current.parent_template_id, orgId);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  const descendants = db
    .prepare(
      `SELECT id FROM rubric_templates WHERE org_id = ? AND parent_template_id = ?
       ORDER BY version ASC`
    )
    .all(orgId, templateId)
    .map((r) => getTemplate(db, r.id, orgId))
    .filter(Boolean);
  return [...chain, root, ...descendants];
}

export function saveTemplateFromCategories(db, opts) {
  return saveTemplateFromQuestions(db, {
    ...opts,
    questions: normalizeQuestions(opts.categories || []),
  });
}

export function saveTemplateFromQuestions(
  db,
  {
    orgId,
    name,
    description,
    department,
    experience_level,
    questions,
    categories,
    createdBy,
    parentTemplateId = null,
    syncToLibrary = true,
  }
) {
  const normalized = normalizeQuestions(questions || categories || []);
  const err = validateTemplateQuestions(normalized);
  if (err) return { error: err };

  const version = parentTemplateId
    ? (db.prepare(`SELECT MAX(version) as v FROM rubric_templates WHERE parent_template_id = ? OR id = ?`).get(
        parentTemplateId,
        parentTemplateId
      )?.v || 0) + 1
    : 1;

  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO rubric_templates
     (id, org_id, name, description, department, experience_level, questions_json, version, parent_template_id, created_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    orgId,
    name.trim(),
    description || '',
    department || '',
    experience_level || 'All',
    JSON.stringify(normalized),
    version,
    parentTemplateId,
    createdBy,
    now
  );

  let librarySync = null;
  if (syncToLibrary) {
    librarySync = upsertQuestionsFromCategories(db, {
      orgId,
      categories: normalized,
      department: department || 'General',
      experienceLevel: experience_level || 'All',
      sourceTemplateId: id,
      sourceTemplateName: name.trim(),
      createdBy,
    });
  }

  return { id, questions: normalized, version, librarySync };
}

export function updateTemplate(db, id, orgId, { name, description, department, experience_level, questions, syncToLibrary = true, updatedBy }) {
  const existing = getTemplate(db, id, orgId);
  if (!existing) return { error: 'Template not found' };

  const normalized = normalizeQuestions(questions || existing.questions);
  const err = validateTemplateQuestions(normalized);
  if (err) return { error: err };

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE rubric_templates
     SET name = ?, description = ?, department = ?, experience_level = ?, questions_json = ?, updated_at = ?
     WHERE id = ? AND org_id = ?`
  ).run(
    name?.trim() || existing.name,
    description ?? existing.description ?? '',
    department ?? existing.department ?? '',
    experience_level ?? existing.experience_level ?? 'All',
    JSON.stringify(normalized),
    now,
    id,
    orgId
  );

  let librarySync = null;
  if (syncToLibrary) {
    librarySync = upsertQuestionsFromCategories(db, {
      orgId,
      categories: normalized,
      department: department ?? existing.department ?? 'General',
      experienceLevel: experience_level ?? existing.experience_level ?? 'All',
      sourceTemplateId: id,
      sourceTemplateName: name?.trim() || existing.name,
      createdBy: updatedBy,
    });
  }

  return { id, questions: normalized, librarySync };
}

export function duplicateTemplate(db, id, orgId, newName, createdBy) {
  const tpl = getTemplate(db, id, orgId);
  if (!tpl) return { error: 'Template not found' };
  return saveTemplateFromQuestions(db, {
    orgId,
    name: newName?.trim() || `${tpl.name} (copy)`,
    description: tpl.description,
    department: tpl.department,
    experience_level: tpl.experience_level,
    questions: tpl.questions,
    createdBy,
    parentTemplateId: tpl.id,
    syncToLibrary: true,
  });
}

export function deleteTemplate(db, id, orgId) {
  const row = db.prepare(`SELECT id FROM rubric_templates WHERE id = ? AND org_id = ?`).get(id, orgId);
  if (!row) return { error: 'Template not found' };
  db.prepare(`DELETE FROM rubric_template_applications WHERE template_id = ?`).run(id);
  db.prepare(`DELETE FROM rubric_templates WHERE id = ?`).run(id);
  return { ok: true };
}

export function recordTemplateApplication(db, templateId, jobId, appliedBy) {
  db.prepare(
    `INSERT INTO rubric_template_applications (id, template_id, job_id, applied_by) VALUES (?, ?, ?, ?)`
  ).run(uuid(), templateId, jobId, appliedBy);
}

export function getTemplateUsageForJob(db, jobId) {
  return db
    .prepare(
      `SELECT a.*, t.name as template_name
       FROM rubric_template_applications a
       JOIN rubric_templates t ON t.id = a.template_id
       WHERE a.job_id = ?
       ORDER BY a.applied_at DESC`
    )
    .all(jobId);
}

export function exportTemplates(db, orgId) {
  return listTemplates(db, orgId).map((t) => {
    const full = getTemplate(db, t.id, orgId);
    return {
      name: full.name,
      description: full.description,
      department: full.department,
      experience_level: full.experience_level,
      version: full.version,
      questions: full.questions,
    };
  });
}

export function importTemplates(db, orgId, templates, createdBy) {
  const results = [];
  for (const tpl of templates || []) {
    const result = saveTemplateFromQuestions(db, {
      orgId,
      name: tpl.name,
      description: tpl.description,
      department: tpl.department,
      experience_level: tpl.experience_level,
      questions: tpl.questions,
      createdBy,
      syncToLibrary: true,
    });
    results.push(result);
  }
  return results;
}

export function saveTemplateFromPoolIds(db, { orgId, name, description, department, experience_level, poolItems, createdBy }) {
  const questions = poolItemsToRubricCategories(poolItems);

  return saveTemplateFromQuestions(db, {
    orgId,
    name,
    description,
    department,
    experience_level,
    questions,
    createdBy,
    syncToLibrary: false,
  });
}
