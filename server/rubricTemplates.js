import { v4 as uuid } from 'uuid';

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
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

export function listTemplates(db, orgId) {
  return db
    .prepare(
      `SELECT id, org_id, name, description, department, experience_level, created_by, created_at, questions_json
       FROM rubric_templates WHERE org_id = ? ORDER BY created_at DESC`
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
  return { ...row, questions: JSON.parse(row.questions_json || '[]') };
}

export function saveTemplateFromCategories(db, { orgId, name, description, department, experience_level, categories, createdBy }) {
  const mandatory = categories.filter((c) => (c.priority || 'mandatory') !== 'optional');
  const optional = categories.filter((c) => c.priority === 'optional');
  if (mandatory.length !== 7 || optional.length !== 3) {
    return { error: 'Template requires exactly 7 mandatory and 3 optional questions' };
  }
  const questions = categories.map((c, i) => ({
    name: c.name,
    weight: c.weight || 10,
    question: c.question,
    expected_evidence: c.expected_evidence || '',
    ideal_answer: c.ideal_answer || c.expected_evidence || '',
    category_type: c.category_type || 'General',
    response_type: c.response_type || 'text',
    priority: c.priority || (i < 7 ? 'mandatory' : 'optional'),
    max_response_seconds: c.max_response_seconds || 300,
    keywords: c.keywords || '',
    sort_order: i,
  }));
  const id = uuid();
  db.prepare(
    `INSERT INTO rubric_templates (id, org_id, name, description, department, experience_level, questions_json, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    orgId,
    name,
    description || '',
    department || '',
    experience_level || 'All',
    JSON.stringify(questions),
    createdBy
  );
  return { id, questions };
}

export function applyTemplateToJob(db, { templateId, jobId, orgId, insertCategoryFn }) {
  const tpl = getTemplate(db, templateId, orgId);
  if (!tpl) return { error: 'Template not found' };
  return { template: tpl, questions: tpl.questions };
}
