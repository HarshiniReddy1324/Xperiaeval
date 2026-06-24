import { extractResumeText } from './resumeParser.js';

/**
 * Re-parse stored resume files when resume_text is empty or from legacy placeholder extraction.
 */
export async function backfillResumeTexts(db) {
  const rows = db
    .prepare(
      `SELECT id, resume_path, resume_text FROM applications
       WHERE resume_path IS NOT NULL AND trim(resume_path) != ''
       AND (
         resume_text IS NULL OR trim(resume_text) = ''
         OR resume_text LIKE 'Resume uploaded:%'
         OR length(resume_text) < 40
       )`
    )
    .all();

  let updated = 0;
  for (const row of rows) {
    const fileName = String(row.resume_path).split('/').pop() || '';
    const text = await extractResumeText(row.resume_path, fileName);
    if (text && text.length >= 40) {
      db.prepare('UPDATE applications SET resume_text = ? WHERE id = ?').run(text, row.id);
      updated += 1;
    }
  }
  return updated;
}
