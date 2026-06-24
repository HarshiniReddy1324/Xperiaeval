import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Video, Type } from 'lucide-react';
import { Button } from './ui';
import { useAnswerSessionMetrics } from '../hooks/useScreeningTimer';

export function ScreeningQuestion({
  category,
  index,
  total,
  value,
  onChange,
  proctoring,
  proctoringPolicy,
  onMediaBlob,
  allowAudioRecord = false,
}) {
  const trackIntegrity = proctoringPolicy?.enabled;
  const rubricType = category.response_type || 'text';
  const forceAudioOnly = rubricType === 'audio' && !allowAudioRecord;
  const forceVideoOnly = rubricType === 'video' && !allowAudioRecord;
  const showText = !forceAudioOnly && !forceVideoOnly;
  const showAudioRecord = allowAudioRecord || rubricType === 'audio';
  const showVideoRecord = rubricType === 'video' && !allowAudioRecord;

  const [recording, setRecording] = useState(false);
  const [mediaPreview, setMediaPreview] = useState(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const { elapsed, getMetrics } = useAnswerSessionMetrics(true);

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    };
  }, []);

  useEffect(() => {
    setMediaPreview(null);
    setRecording(false);
  }, [category.id]);

  useEffect(() => {
    onChange({
      metrics: { ...getMetrics(), live_elapsed_seconds: elapsed },
    });
  }, [elapsed, getMetrics, onChange]);

  const startRecord = async (mode) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === 'video',
      });
      const mime = mode === 'video' ? 'video/webm' : 'audio/webm';
      const rec = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mime) ? mime : undefined,
      });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        if (mediaPreview) URL.revokeObjectURL(mediaPreview);
        setMediaPreview(URL.createObjectURL(blob));
        onMediaBlob?.(blob, mode);
        const existingBody = (value?.body || '').trim();
        const placeholder = `[${mode} response recorded]`;
        onChange({
          body: existingBody && !/^\[(audio|video)/i.test(existingBody) ? existingBody : placeholder,
          response_type: mode,
          has_audio: mode === 'audio',
          metrics: getMetrics(),
        });
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      alert('Microphone access is required to record your answer.');
    }
  };

  const stopRecord = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setRecording(false);
  };

  const clearRecording = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    onMediaBlob?.(null, null);
    const body = (value?.body || '').replace(/^\[(audio|video).*recorded\]/i, '').trim();
    onChange({ body, response_type: 'text', has_audio: false, metrics: getMetrics() });
  };

  const bindProctoring = (fieldId) => {
    if (!trackIntegrity || !proctoring) return {};
    return {
      onFocus: () => proctoring.onFieldFocus(fieldId),
      onBlur: () => proctoring.onFieldBlur(fieldId),
      onKeyDown: (e) => proctoring.onFieldKeyDown(fieldId, e),
      onBeforeInput: (e) => proctoring.onFieldBeforeInput(fieldId, e),
      onContextMenu: (e) => proctoring.onFieldContextMenu(e),
    };
  };

  return (
    <div className={`screeningQuestion${trackIntegrity ? ' proctoredField' : ''}`}>
      <div className="screeningMeta">
        <span>
          Question {index + 1} of {total}
        </span>
        {category.optional && <span className="priorityTag optional">Optional</span>}
      </div>
      <h3>{category.question}</h3>

      {showText && (
        <div className={`answerModeBlock${recording ? ' answerModeBlock--recording' : ''}`}>
          <p className="answerModeLabel">
            <Type size={14} /> Type your answer
          </p>
          <textarea
            required={!category.optional && !showAudioRecord}
            rows={6}
            className="applyField"
            placeholder="Type your answer here."
            value={
              /^\[(audio|video).*recorded\]/i.test(value?.body || '')
                ? ''
                : value?.body || ''
            }
            onChange={(e) => {
              proctoring?.onFieldChange?.(category.id, e.target.value);
              onChange({
                body: e.target.value,
                response_type: value?.has_audio ? 'text+audio' : 'text',
                has_audio: value?.has_audio,
                metrics: { ...getMetrics(), live_elapsed_seconds: elapsed },
              });
            }}
            {...bindProctoring(category.id)}
          />
        </div>
      )}

      {showAudioRecord && showText && <div className="answerModeDivider">or</div>}

      {showAudioRecord && (
        <div className="answerModeBlock mediaBlock">
          <p className="answerModeLabel">
            <Mic size={14} /> Record your answer {forceAudioOnly ? '(required)' : '(optional — or instead of typing)'}
          </p>
          {!recording ? (
            <div className="mediaActions">
              <Button type="button" onClick={() => startRecord('audio')}>
                <Mic size={16} /> {mediaPreview ? 'Re-record' : 'Start recording'}
              </Button>
              {mediaPreview && (
                <Button type="button" variant="outline" onClick={clearRecording}>
                  Remove recording
                </Button>
              )}
            </div>
          ) : (
            <div className="recordingLive">
              <span className="recDot" />
              <span>Recording…</span>
              <Button type="button" variant="outline" onClick={stopRecord}>
                <Square size={16} /> Stop
              </Button>
            </div>
          )}
          {mediaPreview && (
            <audio src={mediaPreview} controls className="mediaPlayer" />
          )}
        </div>
      )}

      {showVideoRecord && (
        <div className="mediaBlock">
          <p className="muted">Record a short video answer.</p>
          {!recording ? (
            <Button type="button" onClick={() => startRecord('video')}>
              <Video size={16} /> Start video
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={stopRecord}>
              <Square size={16} /> Stop video
            </Button>
          )}
          {mediaPreview && <video src={mediaPreview} controls className="mediaPlayer" />}
        </div>
      )}
    </div>
  );
}
