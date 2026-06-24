import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import { db } from './db.js';
import { fingerprintAudio, fingerprintFromStored, compareFingerprints } from './voiceVerification.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, '..', 'uploads');

function resolveUploadPath(mediaPath) {
  if (!mediaPath) return null;
  const name = mediaPath.replace(/^\/uploads\//, '');
  const full = join(uploadsDir, name);
  return existsSync(full) ? full : null;
}

export function getVoiceSampleForApplication(applicationId) {
  const row = db.prepare('SELECT * FROM voice_samples WHERE application_id = ? LIMIT 1').get(applicationId);
  if (row) {
    return {
      has_sample: true,
      id: row.id,
      media_path: row.media_path,
      fingerprint: fingerprintFromStored(row.sample_json),
      source: 'indexed',
      created_at: row.created_at,
    };
  }

  const audioAnswer = db
    .prepare(
      `SELECT media_path, response_type FROM answers
       WHERE application_id = ? AND media_path IS NOT NULL ORDER BY rowid LIMIT 1`
    )
    .get(applicationId);

  if (audioAnswer?.media_path) {
    return {
      has_sample: false,
      pending_media_path: audioAnswer.media_path,
      source: 'answer_media',
      hint: 'Audio on file — click “Index voice from screening” to enable verification',
    };
  }

  return { has_sample: false, source: 'none' };
}

export function indexVoiceFromApplication(applicationId) {
  const audioAnswers = db
    .prepare(
      `SELECT media_path FROM answers WHERE application_id = ? AND media_path IS NOT NULL ORDER BY rowid`
    )
    .all(applicationId);

  let mediaPath = null;
  let buf = null;
  let mime = 'audio/webm';

  for (const a of audioAnswers) {
    const path = resolveUploadPath(a.media_path);
    if (!path) continue;
    try {
      buf = readFileSync(path);
      mediaPath = a.media_path;
      mime = path.endsWith('.wav') ? 'audio/wav' : 'audio/webm';
      break;
    } catch {
      /* next */
    }
  }

  if (!buf) {
    return {
      error:
        'No audio file found. Use an apply flow with an audio question, or upload a reference sample below.',
    };
  }

  const fp = fingerprintAudio(buf, mime);
  if (!fp) return { error: 'Could not fingerprint audio' };

  const existing = db.prepare('SELECT id FROM voice_samples WHERE application_id = ?').get(applicationId);
  if (existing) {
    db.prepare(
      `UPDATE voice_samples SET fingerprint=?, sample_json=?, media_path=? WHERE application_id=?`
    ).run(fp.fingerprint, JSON.stringify(fp), mediaPath, applicationId);
  } else {
    db.prepare(
      `INSERT INTO voice_samples (id, application_id, fingerprint, sample_json, media_path)
       VALUES (?, ?, ?, ?, ?)`
    ).run(uuid(), applicationId, fp.fingerprint, JSON.stringify(fp), mediaPath);
  }

  db.prepare(`UPDATE applications SET voice_fingerprint=? WHERE id=?`).run(JSON.stringify(fp), applicationId);
  return { fingerprint: fp, media_path: mediaPath, indexed: true };
}

export function saveVoiceSampleUpload(applicationId, filePath, filename) {
  const buf = readFileSync(filePath);
  const mime = (filename || '').endsWith('.wav') ? 'audio/wav' : 'audio/webm';
  const fp = fingerprintAudio(buf, mime);
  if (!fp) return { error: 'Invalid audio file' };

  const mediaPath = `/uploads/${filename}`;
  const existing = db.prepare('SELECT id FROM voice_samples WHERE application_id = ?').get(applicationId);

  if (existing) {
    db.prepare(
      `UPDATE voice_samples SET fingerprint=?, sample_json=?, media_path=? WHERE application_id=?`
    ).run(fp.fingerprint, JSON.stringify(fp), mediaPath, applicationId);
  } else {
    db.prepare(
      `INSERT INTO voice_samples (id, application_id, fingerprint, sample_json, media_path)
       VALUES (?, ?, ?, ?, ?)`
    ).run(uuid(), applicationId, fp.fingerprint, JSON.stringify(fp), mediaPath);
  }

  db.prepare(`UPDATE applications SET voice_fingerprint=? WHERE id=?`).run(JSON.stringify(fp), applicationId);
  return { fingerprint: fp, media_path: mediaPath };
}

export function compareVoiceUpload(applicationId, compareBuffer, mimeType) {
  let sample = getVoiceSampleForApplication(applicationId);
  if (!sample.has_sample && sample.pending_media_path) {
    const indexed = indexVoiceFromApplication(applicationId);
    if (indexed.error) return { error: indexed.error };
    sample = getVoiceSampleForApplication(applicationId);
  }

  let stored = sample.fingerprint;
  if (!stored) {
    const app = db.prepare('SELECT voice_fingerprint FROM applications WHERE id = ?').get(applicationId);
    stored = fingerprintFromStored(app?.voice_fingerprint);
  }
  if (!stored) {
    return { error: 'No voice reference. Index from screening or upload a reference sample first.' };
  }

  const current = fingerprintAudio(compareBuffer, mimeType);
  return { stored, current, comparison: compareFingerprints(stored, current) };
}
