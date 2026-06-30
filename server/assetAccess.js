import { createHmac, timingSafeEqual } from 'crypto';
import { join, normalize } from 'path';
import { createReadStream, existsSync } from 'fs';
import { uploadsDir } from './paths.js';

const ASSET_TTL_SEC = 60 * 60;

function assetSecret() {
  return process.env.JWT_SECRET || process.env.ASSET_SIGNING_SECRET || 'xperieval-dev-secret-change-in-production';
}

function normalizeUploadPath(path) {
  if (!path || typeof path !== 'string') return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith('/uploads/')) return null;
  return trimmed.replace(/\/+/g, '/');
}

export function canOrgAccessAsset(db, orgId, uploadPath) {
  const path = normalizeUploadPath(uploadPath);
  if (!path) return false;

  const resumeHit = db
    .prepare(
      `SELECT a.id FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE j.org_id = ? AND a.deleted_at IS NULL AND a.resume_path = ? LIMIT 1`
    )
    .get(orgId, path);
  if (resumeHit) return true;

  const answerHit = db
    .prepare(
      `SELECT a.id FROM answers ans
       JOIN applications a ON a.id = ans.application_id
       JOIN jobs j ON j.id = a.job_id
       WHERE j.org_id = ? AND a.deleted_at IS NULL AND ans.media_path = ? LIMIT 1`
    )
    .get(orgId, path);
  if (answerHit) return true;

  const voiceHit = db
    .prepare(
      `SELECT a.id FROM voice_samples v
       JOIN applications a ON a.id = v.application_id
       JOIN jobs j ON j.id = a.job_id
       WHERE j.org_id = ? AND a.deleted_at IS NULL AND v.media_path = ? LIMIT 1`
    )
    .get(orgId, path);
  return !!voiceHit;
}

export function signAssetPath(orgId, uploadPath) {
  const path = normalizeUploadPath(uploadPath);
  if (!path || !orgId) return null;
  const exp = Math.floor(Date.now() / 1000) + ASSET_TTL_SEC;
  const payload = `${path}|${orgId}|${exp}`;
  const sig = createHmac('sha256', assetSecret()).update(payload).digest('hex');
  const qs = new URLSearchParams({
    path,
    org: orgId,
    exp: String(exp),
    sig,
  });
  return `/api/assets?${qs.toString()}`;
}

export function verifyAssetRequest(db, { path, org, exp, sig }) {
  const uploadPath = normalizeUploadPath(path);
  if (!uploadPath || !org || !exp || !sig) return null;
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Math.floor(Date.now() / 1000)) return null;
  const payload = `${uploadPath}|${org}|${expNum}`;
  const expected = createHmac('sha256', assetSecret()).update(payload).digest('hex');
  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  if (!canOrgAccessAsset(db, org, uploadPath)) return null;
  return uploadPath;
}

export function serveSignedAsset(db, query, res) {
  const uploadPath = verifyAssetRequest(db, query);
  if (!uploadPath) {
    res.status(403).json({ error: 'Invalid or expired asset link' });
    return;
  }
  const rel = uploadPath.replace(/^\/uploads\//, '');
  const filePath = normalize(join(uploadsDir, rel));
  if (!filePath.startsWith(normalize(uploadsDir)) || !existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  res.sendFile(filePath);
}
