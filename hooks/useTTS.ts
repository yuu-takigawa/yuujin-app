/**
 * useTTS — 朗読 hook（v3：模块级单例 + 分句并发 + 顺序播放）
 *
 * 所有 useTTS() 实例共享同一个播放管道（模块级状态）。
 * 任何组件调 stop() 都会停掉全局正在播放的 TTS。
 * 退出页面时调 stopAllTTS() 清理。
 *
 * Premium (Pro/Max/Admin):
 *   1. 文本按日语句子分割
 *   2. 所有句子同时发出 TTS-stream 请求（并发网络）
 *   3. 播放队列严格按句子顺序
 *
 * Free: 浏览器系统 TTS (Web Speech API)
 */

import { useCallback } from 'react';
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
    if (view.getUint32(offset, false) === 0x64617461) {
      return { sampleRate, channels, bitsPerSample, dataOffset: offset + 8 };
    }
    offset += 8 + view.getUint32(offset + 4, true);
  }
  return { sampleRate, channels, bitsPerSample, dataOffset: 44 };
}

function pcm16ToFloat32(bytes: Uint8Array): Float32Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = Math.floor(bytes.length / 2);
  const f = new Float32Array(n);
  for (let i = 0; i < n; i++) f[i] = view.getInt16(i * 2, true) / 32768;
  return f;
}

// ─── TTS 文本预处理 ───

function preprocessForTTS(text: string): string {
  let t = text;
  t = t.replace(/[（(][^）)]*[\u4e00-\u9fff][^）)]*[）)]/g, '');
  t = t.replace(/[（(]?笑[）)]?/g, '');
  t = t.replace(/[（(]?泣[）)]?/g, '');
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
  t = t.replace(/[♪♫♬♩]/g, '');
  t = t.replace(/[★☆※→←↑↓]/g, '');
  t = t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{231A}\u{231B}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2934}\u{2935}\u{2190}-\u{21FF}]+/gu, '');
  t = t.replace(/[（(][^）)]*[_^;><][^）)]*[）)]/g, '');
  t = t.replace(/\s+/g, ' ').trim();
  t = t.replace(/^[、，,.\s]+/, '').replace(/[、，,.\s]+$/, '');
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

// ═══════════════════════════════════════════
// 模块级单例状态 — 所有 useTTS 实例共享
// ═══════════════════════════════════════════

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

interface SentenceState {
  chunks: Float32Array[];
  sampleRate: number;
  headerParsed: boolean;
  done: boolean;
  error: boolean;
  cachedUrl?: string;
  cachedFetching?: boolean;
}

// 模块级播放状态
let g_sessionId = 0;
let g_nextTime = 0;
let g_playingText: string | null = null;
let g_speaking = false;
let g_abortFns: Array<() => void> = [];
let g_allSources: AudioBufferSourceNode[] = [];
let g_allAudioElems: HTMLAudioElement[] = [];
let g_states: SentenceState[] = [];
let g_playingSentence = 0;
let g_playedChunks: number[] = [];
let g_onFinish: (() => void) | null = null;

/** 全局停止 TTS — 任何组件/页面离开时调用 */
export function stopAllTTS() {
  g_sessionId++;
  g_playingText = null;
  g_speaking = false;
  for (const abort of g_abortFns) abort();
  g_abortFns = [];
  for (const src of g_allSources) {
    try { src.stop(); } catch { /* ok */ }
    try { src.disconnect(); } catch { /* ok */ }
  }
  g_allSources = [];
  for (const audio of g_allAudioElems) {
    try { audio.pause(); audio.src = ''; } catch { /* ok */ }
  }
  g_allAudioElems = [];
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  g_nextTime = 0;
  g_states = [];
  g_playingSentence = 0;
  g_playedChunks = [];
  g_onFinish = null;
}

function schedulePlayback(audioCtx: AudioContext, text: string, sid: number) {
  if (sid !== g_sessionId || g_playingText !== text) {
    console.log('[TTS] schedulePlayback SKIP: sid', sid, '!= g_sid', g_sessionId, 'or text mismatch');
    return;
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => schedulePlayback(audioCtx, text, sid));
    return;
  }

  while (g_playingSentence < g_states.length) {
    const idx = g_playingSentence;
    const state = g_states[idx];

    // 缓存命中：Audio 元素播放
    if (state.cachedUrl && !state.cachedFetching) {
      state.cachedFetching = true;
      const audio = new Audio(state.cachedUrl);
      g_allAudioElems.push(audio);
      audio.onended = () => { state.done = true; schedulePlayback(audioCtx, text, sid); };
      audio.onerror = () => { state.done = true; state.error = true; schedulePlayback(audioCtx, text, sid); };
      audio.play().catch(() => { state.done = true; state.error = true; schedulePlayback(audioCtx, text, sid); });
      break;
    }
    if (state.cachedUrl && !state.done) break;

    // 流式：播放 chunk
    for (let i = g_playedChunks[idx]; i < state.chunks.length; i++) {
      const float32 = state.chunks[i];
      if (float32.length === 0) continue;
      try {
        const buffer = audioCtx.createBuffer(1, float32.length, state.sampleRate);
        buffer.getChannelData(0).set(float32);
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        const startAt = Math.max(audioCtx.currentTime, g_nextTime);
        source.start(startAt);
        g_nextTime = startAt + buffer.duration;
        g_allSources.push(source);
      } catch { /* skip */ }
      g_playedChunks[idx] = i + 1;
    }

    if (state.done || state.error) {
      g_playingSentence = idx + 1;
    } else {
      break;
    }
  }

  if (g_playingSentence >= g_states.length && g_states.every(s => s.done || s.error)) {
    g_onFinish?.();
  }
}

function globalSpeak(
  text: string,
  voice?: string,
  onDone?: () => void,
  onError?: (msg: string) => void,
) {
  console.log('[TTS] globalSpeak called, text:', text.slice(0, 30), 'g_speaking:', g_speaking, 'g_playingText:', g_playingText?.slice(0, 20));

  // toggle：同一文本再次点击 → 停止
  if (g_speaking && g_playingText === text) {
    console.log('[TTS] toggle stop');
    stopAllTTS();
    onDone?.();
    return;
  }

  stopAllTTS();
  g_speaking = true;
  console.log('[TTS] sessionId:', g_sessionId, 'premium:', isPremiumTier());

  // Free 用户：系统 TTS
  if (!isPremiumTier()) {
    g_playingText = text;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(preprocessForTTS(text));
      utterance.lang = 'ja-JP';
      utterance.onend = () => { g_playingText = null; g_speaking = false; onDone?.(); };
      utterance.onerror = () => { g_playingText = null; g_speaking = false; onError?.('音声の再生に失敗しました'); onDone?.(); };
      window.speechSynthesis.speak(utterance);
    } else {
      g_playingText = null; g_speaking = false;
      onError?.('このブラウザは音声合成に対応していません');
      onDone?.();
    }
    return;
  }

  // Premium：分句并发 + 顺序播放
  const audioCtx = ensureAudioContextResumed();
  g_playingText = text;
  g_nextTime = audioCtx.currentTime;
  const sid = g_sessionId;

  const cleanText = preprocessForTTS(text);
  if (!cleanText) {
    g_speaking = false; g_playingText = null; onDone?.();
    return;
  }
  const sentences = splitSentences(cleanText);
  console.log('[TTS] sentences:', sentences.length, sentences.map(s => s.slice(0, 20)));

  g_states = sentences.map(() => ({
    chunks: [], sampleRate: 24000, headerParsed: false, done: false, error: false,
  }));
  g_playingSentence = 0;
  g_playedChunks = new Array(sentences.length).fill(0);

  let completedCount = 0;
  let finished = false;

  const finishPlayback = () => {
    if (finished || g_playingText !== text) return;
    finished = true;
    g_playingText = null;
    g_speaking = false;
    onDone?.();
  };
  g_onFinish = finishPlayback;

  const checkAllDone = () => {
    completedCount++;
    if (completedCount < sentences.length) return;
    const hasCachedPlaying = g_states.some(s => s.cachedUrl && !s.done && !s.error);
    if (hasCachedPlaying) return;
    const remaining = g_nextTime - audioCtx.currentTime;
    if (remaining > 0.05) {
      setTimeout(finishPlayback, remaining * 1000 + 200);
    } else {
      finishPlayback();
    }
  };

  const checkAllError = () => {
    if (g_states.every(s => s.error)) {
      g_playingText = null; g_speaking = false;
      onError?.('音声の生成に失敗しました');
      onDone?.();
    }
  };

  const aborts: Array<() => void> = [];

  sentences.forEach((sentence, sentIdx) => {
    const abort = ttsStream(
      sentence,
      voice,
      (base64) => {
        if (sid !== g_sessionId || g_playingText !== text) { console.log('[TTS] chunk SKIP sid/text mismatch'); return; }
        const bytes = base64ToBytes(base64);
        if (bytes.length === 0) return;
        console.log('[TTS] chunk received, sent#', sentIdx, 'bytes:', bytes.length);
        let pcmBytes: Uint8Array;
        const state = g_states[sentIdx];
        const hasWav = bytes.length >= 44 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
        if (hasWav) {
          const header = parseWavHeader(bytes);
          if (header) { state.sampleRate = header.sampleRate; pcmBytes = bytes.slice(header.dataOffset); }
          else { pcmBytes = bytes; }
          state.headerParsed = true;
        } else {
          if (!state.headerParsed) state.headerParsed = true;
          pcmBytes = bytes;
        }
        if (pcmBytes.length < 2) return;
        const float32 = pcm16ToFloat32(pcmBytes);
        if (float32.length === 0) return;
        state.chunks.push(float32);
        schedulePlayback(audioCtx, text, sid);
      },
      () => {
        console.log('[TTS] onDone sent#', sentIdx, 'sid:', sid, 'g_sid:', g_sessionId, 'cached:', !!g_states[sentIdx]?.cachedUrl);
        if (sid !== g_sessionId) return;
        if (!g_states[sentIdx].cachedUrl) g_states[sentIdx].done = true;
        schedulePlayback(audioCtx, text, sid);
        checkAllDone();
      },
      (err) => {
        if (sid !== g_sessionId) return;
        g_states[sentIdx].error = true;
        g_states[sentIdx].done = true;
        schedulePlayback(audioCtx, text, sid);
        checkAllError();
        checkAllDone();
      },
      (url) => {
        console.log('[TTS] cachedUrl sent#', sentIdx, 'url:', url?.slice(0, 60));
        if (sid !== g_sessionId) return;
        g_states[sentIdx].cachedUrl = url;
        schedulePlayback(audioCtx, text, sid);
      },
    );
    aborts.push(abort);
  });

  g_abortFns = aborts;
}

// ═══════════════════════════════════════════
// Hook — 薄封装，返回稳定的 speak/stop
// ═══════════════════════════════════════════

export function useTTS() {
  const speak = useCallback((
    text: string,
    voice?: string,
    onDone?: () => void,
    onError?: (msg: string) => void,
  ) => {
    globalSpeak(text, voice, onDone, onError);
  }, []);

  const stop = useCallback(() => {
    stopAllTTS();
  }, []);

  return { speak, stop };
}
