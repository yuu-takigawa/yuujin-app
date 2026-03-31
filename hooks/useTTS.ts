/**
 * useTTS — 朗読 hook
 *
 * 整段文字送一次 TTS 流式生成（音调连贯），自适应分段播放（秒读）。
 * 缓存命中时直接播 URL，未命中时从 PCM 流中截取首段先播，
 * 剩余 PCM 拼成一段跟播，通常只有一次切换。
 *
 * 模块级单例：全局只有一个 TTS 在播放。
 */

import { useCallback } from 'react';
import { ttsStream } from '../services/http';
import { useCreditStore } from '../stores/creditStore';

// ═══════════════════════════════════════════
// 文本预处理
// ═══════════════════════════════════════════

function cleanForTTS(text: string): string {
  let t = text;
  t = t.replace(/[（(][^）)]*[\u4e00-\u9fff][^）)]*[）)]/g, '');
  t = t.replace(/[（(]?[笑泣][）)]?/g, '');
  t = t.replace(/[wWｗＷ]{2,}/g, '');
  t = t.replace(/[wWｗＷ]+(?=[。！？!?\s]|$)/g, '');
  t = t.replace(/草(?=[。！？!?\s]|$)/g, '');
  t = t.replace(/[〜～]/g, 'ー');
  t = t.replace(/…+/g, '、');
  t = t.replace(/！/g, '!').replace(/？/g, '?').replace(/，/g, '、').replace(/：/g, ' ').replace(/；/g, '、');
  t = t.replace(/[?][!]/g, '?');
  t = t.replace(/[!][?]/g, '?');
  t = t.replace(/[?]{2,}/g, '?');
  t = t.replace(/[!]{2,}/g, '!');
  t = t.replace(/[^\u3040-\u309F\u30A0-\u30FFー\u4E00-\u9FFF\u3400-\u4DBFa-zA-Z0-9。、!?「」『』・ \n]/g, '');
  t = t.replace(/\s+/g, ' ').trim();
  t = t.replace(/^[、，,.。]+/, '').replace(/[、，,.。]+$/, '');
  return t;
}

// ═══════════════════════════════════════════
// PCM → WAV
// ═══════════════════════════════════════════

const TTS_SAMPLE_RATE = 24000;
const BYTES_PER_SECOND = TTS_SAMPLE_RATE * 2; // 16bit mono

function pcmToWavBlob(pcm: Uint8Array): Blob {
  const dataSize = pcm.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buffer);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + dataSize, true); w(8, 'WAVE');
  w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, TTS_SAMPLE_RATE, true);
  v.setUint32(28, BYTES_PER_SECOND, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, dataSize, true);
  new Uint8Array(buffer, 44).set(pcm);
  return new Blob([buffer], { type: 'audio/wav' });
}

/** 对 PCM 首尾做 3ms 微淡入淡出（仅消除裁切点的微小不连续） */
function applyFade(pcm: Uint8Array): Uint8Array {
  const buf = new ArrayBuffer(pcm.length);
  const out = new Uint8Array(buf);
  out.set(pcm);
  const view = new DataView(buf);
  const totalSamples = buf.byteLength / 2;
  const fadeSamples = Math.min(Math.floor(TTS_SAMPLE_RATE * 0.003), Math.floor(totalSamples / 2)); // 3ms ≈ 72 samples
  for (let i = 0; i < fadeSamples; i++) {
    const gain = i / fadeSamples;
    const offIn = i * 2;
    view.setInt16(offIn, Math.round(view.getInt16(offIn, true) * gain), true);
    const offOut = (totalSamples - 1 - i) * 2;
    view.setInt16(offOut, Math.round(view.getInt16(offOut, true) * gain), true);
  }
  return out;
}

function b64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

// ═══════════════════════════════════════════
// 全局状态
// ═══════════════════════════════════════════

let sessionId = 0;
let speaking = false;
let playingText: string | null = null;
let sharedAudio: HTMLAudioElement | null = null;
let abortController: AbortController | null = null;
let cancelTtsStream: (() => void) | null = null;

function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio && typeof Audio !== 'undefined') sharedAudio = new Audio();
  return sharedAudio!;
}

export function stopAllTTS() {
  sessionId++;
  speaking = false;
  playingText = null;
  if (sharedAudio) {
    sharedAudio.pause();
    sharedAudio.removeAttribute('src');
    sharedAudio.load();
  }
  if (abortController) { abortController.abort(); abortController = null; }
  if (cancelTtsStream) { cancelTtsStream(); cancelTtsStream = null; }
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
}

// ═══════════════════════════════════════════
// Audio 播放（volume 遮蔽切换爆破音）
// ═══════════════════════════════════════════

function playUrl(audio: HTMLAudioElement, url: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;
    const done = () => { if (!resolved) { resolved = true; resolve(); } };
    audio.onended = done;
    audio.onerror = done;
    signal.addEventListener('abort', () => { audio.pause(); done(); }, { once: true });
    audio.volume = 1;
    audio.src = url;
    audio.play().catch(done);
  });
}

// ═══════════════════════════════════════════
// 核心播放
// ═══════════════════════════════════════════

async function globalSpeak(
  text: string,
  voice?: string,
  onDone?: () => void,
  onError?: (msg: string) => void,
  onStart?: () => void,
) {
  if (speaking && playingText === text) { stopAllTTS(); onDone?.(); return; }

  stopAllTTS();
  speaking = true;
  playingText = text;

  const membership = useCreditStore.getState().membership;
  const premium = membership === 'pro' || membership === 'max' || membership === 'admin';

  if (!premium) {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(cleanForTTS(text));
      u.lang = 'ja-JP';
      u.onend = () => { speaking = false; playingText = null; onDone?.(); };
      u.onerror = () => { speaking = false; playingText = null; onDone?.(); };
      window.speechSynthesis.speak(u);
    } else { speaking = false; playingText = null; onDone?.(); }
    return;
  }

  const clean = cleanForTTS(text);
  if (!clean) { speaking = false; playingText = null; onDone?.(); return; }

  const sid = sessionId;
  const controller = new AbortController();
  abortController = controller;
  const audio = getSharedAudio();

  // ─── 播放队列 + 流式收集 ───
  const queue: string[] = [];       // 可播放的 URL（blob: 或 https:）
  let streamDone = false;
  let pcmChunks: Uint8Array[] = [];
  let pcmBytes = 0;
  let firstSegmentFlushed = false;
  let wakePlayer: (() => void) | null = null;

  const flushPcm = () => {
    if (pcmChunks.length === 0) return;
    const total = new Uint8Array(pcmBytes);
    let off = 0;
    for (const c of pcmChunks) { total.set(c, off); off += c.length; }
    pcmChunks = [];
    pcmBytes = 0;
    const faded = applyFade(total);
    queue.push(URL.createObjectURL(pcmToWavBlob(faded)));
    wakePlayer?.();
  };

  // 首段阈值：0.5 秒 PCM（快速启播）
  const FIRST_THRESHOLD = BYTES_PER_SECOND * 0.5;

  cancelTtsStream = ttsStream(clean, voice,
    (base64) => {
      const chunk = b64ToUint8(base64);
      pcmChunks.push(chunk);
      pcmBytes += chunk.length;
      // 首段：够 0.5 秒就立即切出来播
      if (!firstSegmentFlushed && pcmBytes >= FIRST_THRESHOLD) {
        firstSegmentFlushed = true;
        flushPcm();
      }
    },
    () => {
      // 流结束：把剩余 PCM 全部 flush
      streamDone = true;
      flushPcm();
      wakePlayer?.();
    },
    (err) => { streamDone = true; wakePlayer?.(); },
    (cachedUrl) => {
      // 缓存命中：整段音频一个 URL，直接进队列
      streamDone = true;
      queue.push(cachedUrl);
      wakePlayer?.();
    },
  );

  // ─── 播放循环 ───
  try {
    let started = false;
    while (sid === sessionId) {
      // 队列空但有已积累的 PCM → 立即 flush 出来播，不等流结束
      if (queue.length === 0 && pcmBytes > 0) {
        flushPcm();
      }

      if (queue.length > 0) {
        const url = queue.shift()!;
        if (!started) { started = true; onStart?.(); }
        await playUrl(audio, url, controller.signal);
        if (queue.length === 0 && streamDone && pcmBytes === 0) break;
      } else if (streamDone) {
        break;
      } else {
        // 等待新数据入队
        await new Promise<void>((r) => { wakePlayer = r; });
        wakePlayer = null;
      }
    }
  } catch { /* abort */ }

  if (sid === sessionId) {
    speaking = false;
    playingText = null;
    onDone?.();
  }
}

// ═══════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════

export function useTTS() {
  const speak = useCallback((
    text: string, voice?: string, onDone?: () => void, onError?: (msg: string) => void, onStart?: () => void,
  ) => { globalSpeak(text, voice, onDone, onError, onStart); }, []);
  const stop = useCallback(() => { stopAllTTS(); }, []);
  return { speak, stop };
}
