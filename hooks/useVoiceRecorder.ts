/**
 * useVoiceRecorder — 語音録音 + 転写 Hook
 *
 * Platform.OS === 'web':
 *   Web Speech API（ブラウザ内蔵、サーバー不要）
 *   対応: Chrome / Edge / Safari(iOS 15+)
 *
 * Platform.OS === 'ios' | 'android':
 *   expo-av で録音 → バックエンド /voice/transcribe へアップロード
 *
 * state: 'idle' | 'recording' | 'processing'
 * startRecording: 押下時に呼ぶ（権限申請 → 録音開始）
 * stopRecording:  離手時に呼ぶ（録音停止 → 転写 → テキスト返却）
 */

import { useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { API_BASE_URL, getToken } from '../services/http';

export type VoiceState = 'idle' | 'recording' | 'processing';

interface UseVoiceRecorderOptions {
  onTranscribed: (text: string) => void;
  onError?: (message: string) => void;
}

// ─── Web Speech API 実装 ─────────────────────────────────────────────────────

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

function useWebVoiceRecorder({ onTranscribed, onError }: UseVoiceRecorderOptions) {
  const [state, setState] = useState<VoiceState>('idle');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startRecording = useCallback(async () => {
    if (state !== 'idle') return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onError?.('このブラウザは音声入力に対応していません。Chrome または Safari をお試しください。');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      if (transcript) {
        onTranscribed(transcript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') {
        onError?.('音声が検出されませんでした。もう一度お試しください。');
      } else if (event.error === 'not-allowed') {
        onError?.('マイクのアクセスが拒否されました。ブラウザの設定を確認してください。');
      } else {
        onError?.(`音声認識エラー: ${event.error}`);
      }
      setState('idle');
    };

    recognition.onend = () => {
      setState('idle');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState('recording');
  }, [state, onTranscribed, onError]);

  const stopRecording = useCallback(async () => {
    if (recognitionRef.current && state === 'recording') {
      recognitionRef.current.stop();
      setState('processing');
    }
  }, [state]);

  const cancelRecording = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setState('idle');
  }, []);

  return { state, startRecording, stopRecording, cancelRecording };
}

// ─── Native (expo-av) 実装 ───────────────────────────────────────────────────

function useNativeVoiceRecorder({ onTranscribed, onError }: UseVoiceRecorderOptions) {
  const [state, setState] = useState<VoiceState>('idle');
  // Dynamic import to avoid loading expo-av on Web
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recordingRef = useRef<any>(null);

  const startRecording = useCallback(async () => {
    if (state !== 'idle') return;

    try {
      const { Audio } = await import('expo-av');
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
      const { Audio } = await import('expo-av');
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      if (!uri) throw new Error('No URI');

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
      const { Audio } = await import('expo-av');
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch { /* ignore */ }
    recordingRef.current = null;
    setState('idle');
  }, []);

  return { state, startRecording, stopRecording, cancelRecording };
}

// ─── 統合エクスポート ─────────────────────────────────────────────────────────

export function useVoiceRecorder(options: UseVoiceRecorderOptions) {
  // React Hooks は条件分岐できないため、両方を常に呼ぶ。
  // Platform.OS は実行時に固定された定数なので安全。
  const webRecorder = useWebVoiceRecorder(options);
  const nativeRecorder = useNativeVoiceRecorder(options);

  return Platform.OS === 'web' ? webRecorder : nativeRecorder;
}
