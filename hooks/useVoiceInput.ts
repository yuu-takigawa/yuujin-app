/**
 * useVoiceInput — 语音输入 hook
 *
 * 录音 → 上传到 /voice/transcribe → 返回识别文本
 *
 * 平台策略：
 *   Web:          原生 MediaRecorder API
 *   iOS/Android:  expo-av Audio.Recording
 */

import { useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { transcribeAudio, transcribeAudioBlob } from '../services/http';

export type VoiceInputState = 'idle' | 'recording' | 'transcribing';

interface UseVoiceInputOptions {
  language?: string;
  onResult?: (text: string) => void;
  onError?: (message: string) => void;
}

function getSupportedWebMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const mime of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return '';
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const { language = 'ja' } = options;
  const [state, setState] = useState<VoiceInputState>('idle');

  const stateRef = useRef<VoiceInputState>('idle');
  const onResultRef = useRef(options.onResult);
  onResultRef.current = options.onResult;
  const onErrorRef = useRef(options.onError);
  onErrorRef.current = options.onError;
  const busyRef = useRef(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef('');
  const nativeRecordingRef = useRef<Audio.Recording | null>(null);

  const set = useCallback((s: VoiceInputState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  const toggleRecording = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      if (stateRef.current === 'idle') {
        // ── 开始录音 ──
        if (Platform.OS === 'web') {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
          });
          const mimeType = getSupportedWebMimeType();
          const mr = mimeType
            ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64000 })
            : new MediaRecorder(stream, { audioBitsPerSecond: 64000 });

          const chunks: Blob[] = [];
          chunksRef.current = chunks;
          mimeTypeRef.current = mr.mimeType || mimeType || 'audio/mp4';
          mr.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };

          mr.start();
          mediaRecorderRef.current = mr;
          mediaStreamRef.current = stream;
          set('recording');
        } else {
          const { granted } = await Audio.requestPermissionsAsync();
          if (!granted) { onErrorRef.current?.('mic_permission'); return; }
          await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
          const recording = new Audio.Recording();
          await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
          await recording.startAsync();
          nativeRecordingRef.current = recording;
          set('recording');
        }
      } else if (stateRef.current === 'recording') {
        // ── 停止录音 + 转写 ──
        set('transcribing');

        if (Platform.OS === 'web') {
          const mr = mediaRecorderRef.current;
          const stream = mediaStreamRef.current;
          const chunks = chunksRef.current;
          const mime = mimeTypeRef.current;
          mediaRecorderRef.current = null;
          mediaStreamRef.current = null;

          if (!mr || mr.state === 'inactive') {
            stream?.getTracks().forEach((t) => t.stop());
            set('idle');
            onErrorRef.current?.('no_recording');
            return;
          }

          const blob = await new Promise<Blob>((resolve) => {
            const timer = setTimeout(() => {
              stream?.getTracks().forEach((t) => t.stop());
              resolve(new Blob(chunks, { type: mime }));
            }, 5000);

            mr.addEventListener('stop', () => {
              clearTimeout(timer);
              stream?.getTracks().forEach((t) => t.stop());
              resolve(new Blob(chunks, { type: mime }));
            }, { once: true });

            mr.stop();
          });

          if (blob.size === 0) {
            set('idle');
            onErrorRef.current?.('empty_result');
            return;
          }

          const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
          const mimeSimple = mime.split(';')[0] || 'audio/webm';
          const result = await transcribeAudioBlob(blob, mimeSimple, `recording.${ext}`, language);

          if (result.text.trim()) {
            onResultRef.current?.(result.text.trim());
          } else {
            onErrorRef.current?.('empty_result');
          }
          set('idle');
        } else {
          const recording = nativeRecordingRef.current;
          nativeRecordingRef.current = null;
          if (!recording) { set('idle'); return; }

          await recording.stopAndUnloadAsync();
          await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
          const uri = recording.getURI();
          if (!uri) { set('idle'); onErrorRef.current?.('no_recording'); return; }

          const result = await transcribeAudio(uri, 'audio/m4a', language);
          if (result.text.trim()) {
            onResultRef.current?.(result.text.trim());
          } else {
            onErrorRef.current?.('empty_result');
          }
          set('idle');
        }
      }
    } catch (err) {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
      mediaStreamRef.current = null;
      set('idle');
      onErrorRef.current?.('transcribe_failed');
    } finally {
      busyRef.current = false;
    }
  }, [language, set]);

  return {
    state,
    isRecording: state === 'recording',
    isTranscribing: state === 'transcribing',
    toggleRecording,
  };
}
