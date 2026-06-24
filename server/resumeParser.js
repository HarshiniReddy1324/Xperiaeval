/**
 * Resume file → plain text extraction (PDF, DOCX, TXT, MD).
 */

import { readFileSync, existsSync } from 'fs';
import mammoth from 'mammoth';
import { extractText, getDocumentProxy } from 'unpdf';

const MAX_CHARS = 50000;

function extOf(name = '') {
  const lower = String(name).toLowerCase();
  const dot = lower.lastIndexOf('.');
  return dot >= 0 ? lower.slice(dot) : '';
}

async function extractPdf(buffer) {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return String(text || '').trim();
}

async function extractDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return String(result.value || '').trim();
}

/**
 * Extract resume text from an uploaded file (async — PDF/DOCX supported).
 */
export async function extractResumeText(filePath, originalName = '') {
  if (!filePath || !existsSync(filePath)) return '';

  const ext = extOf(originalName || filePath);
  try {
    const buffer = readFileSync(filePath);

    if (ext === '.txt' || ext === '.md') {
      return buffer.toString('utf8').slice(0, MAX_CHARS).trim();
    }
    if (ext === '.pdf') {
      const text = await extractPdf(buffer);
      return text.slice(0, MAX_CHARS);
    }
    if (ext === '.docx' || ext === '.doc') {
      const text = await extractDocx(buffer);
      return text.slice(0, MAX_CHARS);
    }

    // Unknown extension — try UTF-8 read
    const asText = buffer.toString('utf8');
    if (asText && !/[\x00-\x08]/.test(asText.slice(0, 200))) {
      return asText.slice(0, MAX_CHARS).trim();
    }
    return '';
  } catch (err) {
    console.error('[resumeParser] extract failed:', originalName, err.message);
    return '';
  }
}

/** Sync helper — text/md only; use extractResumeText for PDF/DOCX. */
export function extractResumeTextSync(filePath, originalName = '') {
  if (!filePath || !existsSync(filePath)) return '';
  const ext = extOf(originalName || filePath);
  if (ext !== '.txt' && ext !== '.md') return '';
  try {
    return readFileSync(filePath, 'utf8').slice(0, MAX_CHARS).trim();
  } catch {
    return '';
  }
}
