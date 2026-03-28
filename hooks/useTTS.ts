/**
 * useTTS — 朗読 hook
 *
 * 基于 628f0b9（验证能工作的版本），仅做以下最小改动：
 * 1. 导出 stopAllTTS() 供页面 cleanup（模块级函数，停全局 AudioContext）
 * 2. 移除 cachedUrl 逻辑（服务端不再返回）
 * 3. 增强文本预处理（去波浪线、连续标点等）
 */

import { useRef, useCallback } from 'react';
import { ttsStream } from '../services/http';
import { useCreditStore } from '../stores/creditStore';

// ─── 工具函数 ───

function isPremiumTier(): boolean {
  const membership = useCreditStore.getState().membership;
  return membership === 'pro' || membership === 'max' || membership === 'admin';
}

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function parseWavHeader(buf: Uint8Array): {
  sampleRate: number; channels: number; bitsPerSample: number; dataOffset: number;
} | null {
  if (buf.length < 44) return null;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (view.getUint32(0, false) !== 0x52494646) return null;
  if (view.getUint32(8, false) !== 0x57415645) return null;
  const channels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);
  let offset = 36;
  while (offset + 8 <= buf.length) {
    const chunkId = view.getUint32(offset, false);
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === 0x64617461) {
      return { sampleRate, channels, bitsPerSample, dataOffset: offset + 8 };
    }
    offset += 8 + chunkSize;
  }
  return { sampleRate, channels, bitsPerSample, dataOffset: 44 };
}

function pcm16ToFloat32(bytes: Uint8Array): Float32Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const numSamples = Math.floor(bytes.length / 2);
  const float32 = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}

function preprocessForTTS(text: string): string {
  let t = text;
  t = t.replace(/[（(][^）)]*[\u4e00-\u9fff][^）)]*[）)]/g, '');
  t = t.replace(/[（(]?[笑泣][）)]?/g, '');
  t = t.replace(/[wWｗＷ]{2,}/g, '');
  t = t.replace(/[wWｗＷ]+(?=[。！？!?\s]|$)/g, '');
  t = t.replace(/草(?=[。！？!?\s]|$)/g, '');
  t = t.replace(/[？?][！!]/g, '？');
  t = t.replace(/[！!][？?]/g, '？');
  t = t.replace(/[？?]{2,}/g, '？');
  t = t.replace(/[！!]{2,}/g, '！');
  t = t.replace(/[〜～]/g, '');
  t = t.replace(/…+/g, '、');
  t = t.replace(/・{2,}/g, '、');
  t = t.replace(/ⓘ/g, '');
  t = t.replace(/[♪♫♬♩★☆※→←↑↓]/g, '');
  t = t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{231A}\u{231B}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2934}\u{2935}\u{2190}-\u{21FF}]+/gu, '');
  t = t.replace(/[（(][^）)]*[_^;><][^）)]*[）)]/g, '');
  t = t.replace(/\s+/g, ' ').trim();
  t = t.replace(/^[、，,.]+/, '').replace(/[、，,.]+$/, '');
  return t;
}

function splitSentences(text: string): string[] {
  const raw = text.split(/(?<=[。！？!?\n])/);
  const result: string[] = [];
  for (const s of raw) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if (result.length > 0 && trimmed.length < 5) {
      result[result.length - 1] += s;
    } else {
      result.push(s);
    }
  }
  return result.length > 0 ? result : [text];
}

// ─── 全局 AudioContext ───

let sharedAudioCtx: AudioContext | null = null;

function getOrCreateAudioContext(): AudioContext {
  if (sharedAudioCtx && sharedAudioCtx.state !== 'closed') return sharedAudioCtx;
  sharedAudioCtx = new AudioContext();
  return sharedAudioCtx;
}

function ensureAudioContextResumed(): AudioContext {
  const ctx = getOrCreateAudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// ─── 全局停止（供页面 cleanup 使用） ───

/** 停止全局 TTS — 关闭 AudioContext，停止所有 SSE */
export function stopAllTTS() {
  // 关闭 AudioContext → 所有已调度的 source 立即停止
  if (sharedAudioCtx && sharedAudioCtx.state !== 'closed') {
    sharedAudioCtx.close().catch(() => {});
    sharedAudioCtx = null;
  }
  // 停止系统 TTS
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// ─── 每个句子的流式状态 ───

interface SentenceState {
  chunks: Float32Array[];
  sampleRate: number;
  headerParsed: boolean;
  done: boolean;
  error: boolean;
}

// ─── Hook（组件级实例，useRef 保证状态隔离） ───

export function useTTS() {
  const nextTimeRef = useRef(0);
  const abortFnsRef = useRef<Array<() => void>>([]);
  const playingTextRef = useRef<string | null>(null);
  const speakingRef = useRef(false);
  const allSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const sentenceStatesRef = useRef<SentenceState[]>([]);
  const playingSentenceRef = useRef(0);
  const playedChunksRef = useRef<number[]>([]);
  const onFinishRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    playingTextRef.current = null;
    speakingRef.current = false;
    for (const abort of abortFnsRef.current) abort();
    abortFnsRef.current = [];
    for (const src of allSourcesRef.current) {
      try { src.stop(); } catch {}
      try { src.disconnect(); } catch {}
    }
    allSourcesRef.current = [];
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    nextTimeRef.current = 0;
    sentenceStatesRef.current = [];
    playingSentenceRef.current = 0;
    playedChunksRef.current = [];
    onFinishRef.current = null;
  }, []);

  const schedulePlayback = useCallback((audioCtx: AudioContext, text: string) => {
    if (playingTextRef.current !== text) return;

    // iOS Safari: 等 AudioContext resume
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => schedulePlayback(audioCtx, text));
      return;
    }

    const states = sentenceStatesRef.current;
    const played = playedChunksRef.current;

    while (playingSentenceRef.current < states.length) {
      const idx = playingSentenceRef.current;
      const state = states[idx];

      for (let i = played[idx]; i < state.chunks.length; i++) {
        const float32 = state.chunks[i];
        if (float32.length === 0) continue;
        try {
          const buffer = audioCtx.createBuffer(1, float32.length, state.sampleRate);
          buffer.getChannelData(0).set(float32);
          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(audioCtx.destination);
          const startAt = Math.max(audioCtx.currentTime, nextTimeRef.current);
          source.start(startAt);
          nextTimeRef.current = startAt + buffer.duration;
          allSourcesRef.current.push(source);
        } catch {}
        played[idx] = i + 1;
      }

      if (state.done || state.error) {
        playingSentenceRef.current = idx + 1;
      } else {
        break;
      }
    }

    if (playingSentenceRef.current >= states.length && states.every(s => s.done || s.error)) {
      onFinishRef.current?.();
    }
  }, []);

  const speak = useCallback((
    text: string,
    voice?: string,
    onDone?: () => void,
    onError?: (msg: string) => void,
  ) => {
    // toggle
    if (speakingRef.current && playingTextRef.current === text) {
      stop();
      onDone?.();
      return;
    }

    stop();
    speakingRef.current = true;

    // Free 用户
    if (!isPremiumTier()) {
      playingTextRef.current = text;
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(preprocessForTTS(text));
        utterance.lang = 'ja-JP';
        utterance.onend = () => { playingTextRef.current = null; speakingRef.current = false; onDone?.(); };
        utterance.onerror = () => { playingTextRef.current = null; speakingRef.current = false; onDone?.(); };
        window.speechSynthesis.speak(utterance);
      } else {
        playingTextRef.current = null; speakingRef.current = false; onDone?.();
      }
      return;
    }

    // Premium
    const audioCtx = ensureAudioContextResumed();
    playingTextRef.current = text;
    nextTimeRef.current = audioCtx.currentTime;

    const cleanText = preprocessForTTS(text);
    if (!cleanText) {
      speakingRef.current = false; playingTextRef.current = null; onDone?.();
      return;
    }
    const sentences = splitSentences(cleanText);

    const states: SentenceState[] = sentences.map(() => ({
      chunks: [], sampleRate: 24000, headerParsed: false, done: false, error: false,
    }));
    sentenceStatesRef.current = states;
    playingSentenceRef.current = 0;
    playedChunksRef.current = new Array(sentences.length).fill(0);

    let completedCount = 0;
    let finished = false;
    const finishPlayback = () => {
      if (finished || playingTextRef.current !== text) return;
      finished = true;
      playingTextRef.current = null;
      speakingRef.current = false;
      onDone?.();
    };
    onFinishRef.current = finishPlayback;

    const checkAllDone = () => {
      completedCount++;
      if (completedCount < sentences.length) return;
      const remaining = nextTimeRef.current - audioCtx.currentTime;
      if (remaining > 0.05) {
        setTimeout(finishPlayback, remaining * 1000 + 200);
      } else {
        finishPlayback();
      }
    };

    const aborts: Array<() => void> = [];

    sentences.forEach((sentence, sentIdx) => {
      const abort = ttsStream(
        sentence,
        voice,
        // onChunk
        (base64) => {
          if (playingTextRef.current !== text) return;
          const bytes = base64ToBytes(base64);
          if (bytes.length === 0) return;

          let pcmBytes: Uint8Array;
          const state = states[sentIdx];

          const hasWavHeader = bytes.length >= 44 &&
            bytes[0] === 0x52 && bytes[1] === 0x49 &&
            bytes[2] === 0x46 && bytes[3] === 0x46;

          if (hasWavHeader) {
            const header = parseWavHeader(bytes);
            if (header) {
              state.sampleRate = header.sampleRate;
              pcmBytes = bytes.slice(header.dataOffset);
            } else {
              pcmBytes = bytes;
            }
            state.headerParsed = true;
          } else {
            if (!state.headerParsed) state.headerParsed = true;
            pcmBytes = bytes;
          }

          if (pcmBytes.length < 2) return;
          const float32 = pcm16ToFloat32(pcmBytes);
          if (float32.length === 0) return;

          state.chunks.push(float32);
          schedulePlayback(audioCtx, text);
        },
        // onDone
        () => {
          states[sentIdx].done = true;
          schedulePlayback(audioCtx, text);
          checkAllDone();
        },
        // onError
        (err) => {
          states[sentIdx].error = true;
          states[sentIdx].done = true;
          schedulePlayback(audioCtx, text);
          checkAllDone();
        },
      );
      aborts.push(abort);
    });

    abortFnsRef.current = aborts;
  }, [stop, schedulePlayback]);

  return { speak, stop };
}
