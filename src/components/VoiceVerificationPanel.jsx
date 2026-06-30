import React, { useRef, useState } from 'react';
import { Mic, Square, Upload, RefreshCw } from 'lucide-react';
import { api, getToken } from '../api/client';
import { apiUrl, assetUrl } from '../api/base.js';
import { Button } from './ui';

export function VoiceVerificationPanel({ applicationId, voiceVerification, onUpdated }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const indexFromScreening = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api(`/applications/${applicationId}/voice-sample/index`, { method: 'POST' });
      onUpdated?.(res);
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const uploadReference = async (file) => {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append('audio', file);
    try {
      const res = await fetch(apiUrl(`/api/applications/${applicationId}/voice-sample/upload`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdated?.(data);
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const startRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecordedBlob(new Blob(chunksRef.current, { type: 'audio/webm' }));
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setResult({ error: 'Microphone access required' });
    }
  };

  const stopRecord = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const compare = async (blobOrFile) => {
    if (!blobOrFile) {
      setResult({ error: 'Record or upload audio to compare' });
      return;
    }
    setLoading(true);
    setResult(null);
    const fd = new FormData();
    fd.append('audio', blobOrFile, 'compare.webm');
    try {
      const res = await fetch(apiUrl(`/api/applications/${applicationId}/voice-verify`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.comparison);
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const hasSample = voiceVerification?.has_sample;
  const pending = voiceVerification?.pending_media_path;

  return (
    <div className="voicePanel">
      {!hasSample && !pending && (
        <>
          <p className="muted">
            No voice reference yet. Either: (1) candidate answers an <strong>audio</strong> screening question, or
            (2) upload a reference clip below.
          </p>
          <label className="uploadLabel">
            <Upload size={16} /> Upload reference voice sample
            <input type="file" accept="audio/*" hidden onChange={(e) => uploadReference(e.target.files[0])} />
          </label>
        </>
      )}

      {!hasSample && pending && (
        <>
          <p className="muted">{voiceVerification.hint}</p>
          <Button onClick={indexFromScreening} disabled={loading}>
            <RefreshCw size={16} /> {loading ? 'Indexing…' : 'Index voice from screening'}
          </Button>
          <audio src={pending} controls className="mediaPlayer" />
        </>
      )}

      {hasSample && (
        <>
          <p className="success">Reference voice on file ({voiceVerification.source})</p>
          {voiceVerification.media_path && (
            <audio src={assetUrl(voiceVerification.media_path)} controls className="mediaPlayer" />
          )}

          <p className="muted">Record a new clip (simulates live interview) or upload to compare:</p>
          <div className="row">
            {!recording ? (
              <Button type="button" variant="outline" onClick={startRecord}>
                <Mic size={16} /> Record compare clip
              </Button>
            ) : (
              <Button type="button" onClick={stopRecord}>
                <Square size={16} /> Stop
              </Button>
            )}
            <label className="uploadLabel btn outline">
              <Upload size={16} /> Upload clip
              <input type="file" accept="audio/*" hidden onChange={(e) => compare(e.target.files[0])} />
            </label>
            {recordedBlob && (
              <Button type="button" onClick={() => compare(recordedBlob)} disabled={loading}>
                {loading ? 'Comparing…' : 'Compare recording'}
              </Button>
            )}
          </div>

          {recordedBlob && <audio src={URL.createObjectURL(recordedBlob)} controls className="mediaPlayer" />}
        </>
      )}

      {result?.error && <p className="error">{result.error}</p>}
      {result?.verdict && (
        <div className={`voiceResult ${result.match_score >= 80 ? 'ok' : result.match_score >= 55 ? 'warn' : 'bad'}`}>
          <strong>{result.verdict}</strong>
          <p>Match score: {result.match_score}%</p>
          <small>Demo fingerprint: same recording ≈ 100%; different speaker scores lower.</small>
        </div>
      )}
    </div>
  );
}
