import { readFileSync } from 'fs';

const GROQ_TRANSCRIBE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const WHISPER_MODEL = 'whisper-large-v3-turbo';

function isPlaceholderText(text) {
  return /^\[(audio|video).*recorded/i.test((text || '').trim());
}

/** Text used for scoring: typed answer + transcript, ignoring placeholders. */
export function mergeAnswerTextForScoring(answer) {
  if (answer == null) return '';
  const { body, transcript_text } =
    typeof answer === 'string' ? { body: answer, transcript_text: '' } : answer;
  const parts = [];
  const b = (body || '').trim();
  const t = (transcript_text || '').trim();
  if (b && !isPlaceholderText(b)) parts.push(b);
  if (t && !isPlaceholderText(t) && t !== b) parts.push(t);
  if (parts.length) return parts.join('\n\n');
  if (t) return t;
  if (b) return b;
  return '';
}

export async function transcribeAudioBuffer(buffer, { filename = 'answer.webm', mimetype = 'audio/webm' } = {}) {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key || !buffer?.length) return { text: null, provider: 'none' };

  try {
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mimetype }), filename);
    form.append('model', process.env.GROQ_WHISPER_MODEL || WHISPER_MODEL);
    form.append('language', 'en');
    form.append('response_format', 'json');

    const res = await fetch(GROQ_TRANSCRIBE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn('[transcribe]', res.status, err.slice(0, 200));
      return { text: null, provider: 'groq', error: err };
    }

    const data = await res.json();
    const text = (data.text || '').trim() || null;
    return { text, provider: 'groq', model: data.model || WHISPER_MODEL };
  } catch (e) {
    console.warn('[transcribe]', e.message);
    return { text: null, provider: 'groq', error: e.message };
  }
}

export async function transcribeAudioFile(filePath, mimetype = 'audio/webm') {
  const buf = readFileSync(filePath);
  const ext = mimetype.includes('video') ? 'webm' : 'webm';
  return transcribeAudioBuffer(buf, { filename: `answer.${ext}`, mimetype });
}

/**
 * Process uploaded screening media: transcribe audio/video audio track for scoring.
 */
export async function transcribeUploadedMedia(mediaFile, { typedBody = '' } = {}) {
  if (!mediaFile?.path) return { transcript: null, provider: 'none' };

  const mime = mediaFile.mimetype || 'audio/webm';
  const isVideo = mime.startsWith('video/');
  const buf = readFileSync(mediaFile.path);

  const { text, provider, error } = await transcribeAudioBuffer(buf, {
    filename: mediaFile.originalname || (isVideo ? 'answer.webm' : 'answer.webm'),
    mimetype: isVideo ? 'audio/webm' : mime,
  });

  if (text) {
    return { transcript: text, provider, scoredFrom: 'transcript' };
  }

  const typed = (typedBody || '').trim();
  if (typed && !isPlaceholderText(typed)) {
    return {
      transcript: typed,
      provider: provider || 'typed_fallback',
      scoredFrom: 'typed',
      warning: error ? 'Audio transcription unavailable; scored from typed text.' : undefined,
    };
  }

  const durationHint = buf.length > 5000 ? 'substantive audio response' : 'brief audio response';
  return {
    transcript: null,
    provider: 'none',
    scoredFrom: 'none',
    warning:
      provider === 'none' && !process.env.GROQ_API_KEY
        ? `Audio saved (${durationHint}). Set GROQ_API_KEY for automatic transcription and scoring.`
        : `Audio saved (${durationHint}). Transcription failed, recruiter can listen and score manually.`,
  };
}
