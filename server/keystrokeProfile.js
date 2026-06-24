/**
 * Synthetic + real keystroke field profiles for demo seeding and backfill.
 */

function answerMetaForQuality(quality, index) {
  if (quality === 'strong') {
    return { time_taken_seconds: 200 + index * 12, idle_seconds: 4 };
  }
  if (quality === 'average') {
    return { time_taken_seconds: 140 + index * 8, idle_seconds: 12 };
  }
  return { time_taken_seconds: 70 + index * 5, idle_seconds: 30 };
}

function humanIntervals(count, baseMs = 98, spreadMs = 42) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const jitter = (Math.random() - 0.5) * spreadMs;
    out.push(Math.max(42, Math.round(baseMs + jitter)));
  }
  return out;
}

function roboticIntervals(count, fixedMs = 108) {
  return Array.from({ length: count }, () => fixedMs);
}

function inferQualityFromIntegrity(integrity = {}, authenticityScore = null) {
  if (integrity.keystroke_anomaly || (authenticityScore != null && authenticityScore < 62)) return 'weak';
  if ((authenticityScore != null && authenticityScore < 88) || (integrity.focus_loss_count || 0) >= 3) {
    return 'average';
  }
  return 'strong';
}

/**
 * Build per-question keystroke telemetry from answer bodies.
 */
export function buildKeystrokeFields(categories = [], answers = [], quality = 'strong') {
  const fields = {};
  const keystroke_intervals = [];

  categories.forEach((cat, i) => {
    const body = typeof answers[i] === 'string' ? answers[i] : answers[i]?.body || '';
    const chars = body.length;
    if (chars < 16) return;

    const meta = answerMetaForQuality(quality, i);
    const focusSec = Math.max(12, (meta.time_taken_seconds || 120) - (meta.idle_seconds || 0));
    let keystrokes;
    let key_intervals_ms;

    if (quality === 'weak') {
      keystrokes = Math.round(chars * 0.36);
      key_intervals_ms = roboticIntervals(Math.min(72, keystrokes));
    } else if (quality === 'average') {
      keystrokes = Math.round(chars * 0.94);
      key_intervals_ms = humanIntervals(Math.min(90, keystrokes), 91, 38);
    } else {
      keystrokes = Math.round(chars * 1.06);
      key_intervals_ms = humanIntervals(Math.min(110, keystrokes), 104, 52);
    }

    fields[cat.id] = {
      keystrokes,
      chars_final: chars,
      focus_seconds: focusSec,
      paste_blocked: quality === 'weak' && i % 3 === 0 ? 1 : 0,
      key_intervals_ms,
    };
    keystroke_intervals.push(...key_intervals_ms.slice(0, 24));
  });

  return { fields, keystroke_intervals };
}

/**
 * Backfill empty integrity.fields on existing applications from stored answers.
 */
export function backfillApplicationKeystrokes(db) {
  const apps = db
    .prepare(
      `SELECT a.id, a.integrity_json, a.authenticity_score, a.rubric_version_id, a.job_id
       FROM applications a WHERE a.integrity_json IS NOT NULL AND a.deleted_at IS NULL`
    )
    .all();

  const getCategories = db.prepare(
    `SELECT id, name, question FROM rubric_categories WHERE rubric_version_id = ? ORDER BY sort_order`
  );
  const getAnswers = db.prepare(
    `SELECT category_id, body FROM answers WHERE application_id = ? ORDER BY rowid`
  );
  const updateIntegrity = db.prepare(`UPDATE applications SET integrity_json = ? WHERE id = ?`);

  let updated = 0;
  for (const app of apps) {
    let integrity;
    try {
      integrity = JSON.parse(app.integrity_json);
    } catch {
      continue;
    }
    if (integrity.fields && Object.keys(integrity.fields).length > 0) continue;

    const rubricId =
      app.rubric_version_id ||
      db.prepare(`SELECT id FROM rubric_versions WHERE job_id = ? AND status = 'approved' ORDER BY version DESC LIMIT 1`).get(app.job_id)?.id;
    if (!rubricId) continue;

    const categories = getCategories.all(rubricId);
    const answerRows = getAnswers.all(app.id);
    const answers = categories.map((cat) => answerRows.find((a) => a.category_id === cat.id)?.body || '');
    const quality = inferQualityFromIntegrity(integrity, app.authenticity_score);
    const { fields, keystroke_intervals } = buildKeystrokeFields(categories, answers, quality);

    if (!Object.keys(fields).length) continue;

    updateIntegrity.run(
      JSON.stringify({
        ...integrity,
        fields,
        keystroke_intervals,
        keystroke_anomaly: quality === 'weak' ? true : integrity.keystroke_anomaly,
      }),
      app.id
    );
    updated += 1;
  }
  return updated;
}
