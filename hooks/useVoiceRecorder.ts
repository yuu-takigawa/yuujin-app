/**
 * useVoiceRecorder — 语音录制 + 上传转写 Hook
 *
 * 使用方式：
 *   const { state, startRecording, stopRecording } = useVoiceRecorder({
 *     onTranscribed: (text) => setText(text),
 *   });
 *
 * state: 'idle' | 'recording' | 'processing'
 * startRecording: 按住时调用（申请权限 → 开始录音）
 * stopRecording:  松手时调用（停止录音 → 上传 → 返回文本）
 */

import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { API_BASE_URL, getToken } from '../services/http';

export type VoiceState = 'idle' | 'recording' | 'processing';

interface UseVoiceRecorderOptions {
  onTranscribed: (text: string) => void;
  onError?: (message: string) => void;
}

export function useVoiceRecorder({ onTranscribed, onError }: UseVoiceRecorderOptions) {
  const [state, setState] = useState<VoiceState>('idle');
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = useCallback(async () => {
    if (state !== 'idle') return;

    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        onError?.('マイクのアクセスが拒否されました');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setState('recording');
    } catch {
      onError?.('録音の開始に失敗しました');
    }
  }, [state, onError]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current || state !== 'recording') return;

    setState('processing');
    const recording = recordingRef.current;
    recordingRef.current = null;

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      if (!uri) throw new Error('No URI');

      // 构造 multipart/form-data 上传
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'voice.m4a',
      } as unknown as Blob);
      formData.append('language', 'ja');

      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/voice/transcribe`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.success && json.data?.text) {
        onTranscribed(json.data.text);
      } else {
        throw new Error(json.error || '認識に失敗しました');
      }
    } catch (err) {
      onError?.((err as Error).message || '音声認識に失敗しました');
    } finally {
      setState('idle');
    }
  }, [state, onTranscribed, onError]);

  const cancelRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch { /* ignore */ }
    recordingRef.current = null;
    setState('idle');
  }, []);

  return { state, startRecording, stopRecording, cancelRecording };
}
