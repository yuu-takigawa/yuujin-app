/**
 * useTTS — 朗読 hook
 *
 * - 单句 → 一个请求，不重复
 * - 多句 → 第一句 + 剩余并行请求，第一句先播，200ms 交叠切换
 * - 缓存通过 ttsStream 的 cachedUrl 回调自然生效
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

function splitFirstSentence(text: string): [string, string] {
  const m = text.match(/^(.+?[。!?])(.+)$/s);
  if (m && m[1].length >= 5 && m[2].trim().length >= 5) {
    return [m[1], m[2].trim()];
  }
  return [text, ''];
}

// ═══════════════════════════════════════════
// PCM → WAV blob URL
// ═══════════════════════════════════════════

const TTS_SAMPLE_RATE = 24000;
const BYTES_PER_SECOND = TTS_SAMPLE_RATE * 2;

const SILENCE_MS = 400;
const SILENCE_BYTES = Math.floor(TTS_SAMPLE_RATE * (SILENCE_MS / 1000)) * 2;

function pcmToWavBlobUrl(pcm: Uint8Array, prependSilence = false): string {
  const silenceSize = prependSilence ? SILENCE_BYTES : 0;
  const dataSize = silenceSize + pcm.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buffer);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + dataSize, true); w(8, 'WAVE');
  w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, TTS_SAMPLE_RATE, true);
  v.setUint32(28, BYTES_PER_SECOND, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, dataSize, true);
  new Uint8Array(buffer, 44 + silenceSize).set(pcm);
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

function b64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

// ═══════════════════════════════════════════
// ttsStream → Promise<url>
// ═══════════════════════════════════════════

function ttsToUrl(text: string, voice?: string, prependSilence = false): { promise: Promise<string>; cancel: () => void } {
  let cancelStream: (() => void) | null = null;
  const promise = new Promise<string>((resolve, reject) => {
    let done = false;
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    cancelStream = ttsStream(text, voice,
      (base64) => { const c = b64ToUint8(base64); chunks.push(c); totalBytes += c.length; },
      () => {
        if (done) return; done = true;
        if (chunks.length === 0) { reject(new Error('no audio')); return; }
        const pcm = new Uint8Array(totalBytes);
        let off = 0;
        for (const c of chunks) { pcm.set(c, off); off += c.length; }
        resolve(pcmToWavBlobUrl(pcm, prependSilence));
      },
      (err) => { if (!done) { done = true; reject(new Error(err)); } },
      (cachedUrl) => { if (!done) { done = true; resolve(cachedUrl); } },
    );
  });
  return { promise, cancel: () => cancelStream?.() };
}

// ═══════════════════════════════════════════
// 全局状态
// ═══════════════════════════════════════════

let sessionId = 0;
let speaking = false;
let playingText: string | null = null;
let sharedAudio: HTMLAudioElement | null = null;
let sharedAudio2: HTMLAudioElement | null = null;
let cancelFns: (() => void)[] = [];

// 1 秒静音 WAV blob URL，用于预热第二条管线
let silentWavUrl: string | null = null;
function getSilentWavUrl(): string {
  if (!silentWavUrl) {
    const samples = TTS_SAMPLE_RATE; // 1 秒
    silentWavUrl = pcmToWavBlobUrl(new Uint8Array(samples * 2));
  }
  return silentWavUrl;
}

function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio && typeof Audio !== 'undefined') sharedAudio = new Audio();
  return sharedAudio!;
}

function getSharedAudio2(): HTMLAudioElement {
  if (!sharedAudio2 && typeof Audio !== 'undefined') sharedAudio2 = new Audio();
  return sharedAudio2!;
}

/** 预热 audio2：播放静音，让系统音频硬件保持活跃 */
function warmUpAudio2() {
  const a2 = getSharedAudio2();
  a2.volume = 0;
  a2.src = getSilentWavUrl();
  a2.play().catch(() => {});
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
  if (sharedAudio2) {
    sharedAudio2.pause();
    sharedAudio2.removeAttribute('src');
  }
  for (const fn of cancelFns) fn();
  cancelFns = [];
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
}

function playUrl(audio: HTMLAudioElement, url: string, sid: number): Promise<void> {
  return new Promise((resolve) => {
    if (sid !== sessionId) { resolve(); return; }
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.volume = 1;
    audio.src = url;
    audio.play().catch(() => resolve());
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
  const sid = sessionId;

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

  const t0 = Date.now();
  console.warn(`[TTS] 请求开始 t=0ms, 文本长度=${clean.length}`);

  try {
    const audio = getSharedAudio();

    // 立即播放静音预热硬件管线（在用户手势上下文内，趁 TTS 网络请求期间预热）
    audio.volume = 0;
    audio.src = getSilentWavUrl();
    audio.play().catch(() => {});
    const [first, rest] = splitFirstSentence(clean);

    if (!rest) {
      // ── 单句：一个请求 ──
      const { promise, cancel } = ttsToUrl(clean, voice);
      cancelFns.push(cancel);
      const url = await promise;
      if (sid !== sessionId) return;
      console.warn(`[TTS] 音频就绪 t=${Date.now() - t0}ms (单段)`);
      onStart?.();
      audio.onplaying = () => console.warn(`[TTS] 开始出声 t=${Date.now() - t0}ms`);
      await playUrl(audio, url, sid);
    } else {
      // ── 多句：第一句 + 剩余并行请求 ──
      console.warn(`[TTS] 分句: 第一句=${first.length}字, 剩余=${rest.length}字`);
      const req1 = ttsToUrl(first, voice);
      const req2 = ttsToUrl(rest, voice, true); // 剩余段前加 200ms 静音
      cancelFns.push(req1.cancel, req2.cancel);

      // 等第一句就绪 → 立即播
      const url1 = await req1.promise;
      if (sid !== sessionId) return;
      console.warn(`[TTS] 第一句就绪 t=${Date.now() - t0}ms`);
      onStart?.();

      // 全局第二 Audio 元素
      const audio2 = getSharedAudio2();
      audio2.volume = 0;
      let launchPromise: Promise<void> | null = null;

      // 播第一句，结束前 400ms 启动第二条管线
      await new Promise<void>((resolve) => {
        if (sid !== sessionId) { resolve(); return; }
        let launched = false;

        const launchSecond = () => {
          if (launched || sid !== sessionId) return;
          launched = true;
          launchPromise = (async () => {
            try {
              const url2 = await req2.promise;
              if (sid !== sessionId) return;
              console.warn(`[TTS] 剩余就绪 t=${Date.now() - t0}ms, 预启动第二管线`);
              audio2.src = url2;
              audio2.play().catch(() => {});
              // 等静音前缀播完后，50ms 线性渐入音量
              setTimeout(() => {
                if (sid !== sessionId) return;
                const RAMP_MS = 50;
                const rampStart = performance.now();
                const ramp = () => {
                  if (sid !== sessionId) return;
                  const elapsed = performance.now() - rampStart;
                  if (elapsed >= RAMP_MS) { audio2.volume = 1; return; }
                  audio2.volume = elapsed / RAMP_MS;
                  requestAnimationFrame(ramp);
                };
                requestAnimationFrame(ramp);
              }, SILENCE_MS);
            } catch { /* ignore */ }
          })();
        };

        const checkTime = () => {
          if (sid !== sessionId || audio.paused || audio.ended) return;
          const dur = audio.duration;
          const cur = audio.currentTime;
          if (isFinite(dur) && dur > 0) {
            const remaining = (dur - cur) * 1000;
            if (remaining <= SILENCE_MS && !launched) {
              console.warn(`[TTS] 提前启动第二管线 remaining=${remaining.toFixed(0)}ms t=${Date.now() - t0}ms`);
              launchSecond();
            }
          }
          if (!audio.ended) requestAnimationFrame(checkTime);
        };

        audio.onplaying = () => {
          console.warn(`[TTS] 开始出声 t=${Date.now() - t0}ms`);
          warmUpAudio2(); // 预热第二管线硬件
          requestAnimationFrame(checkTime);
        };
        audio.onended = () => {
          console.warn(`[TTS] 第一句播完 t=${Date.now() - t0}ms`);
          if (!launched) launchSecond();
          resolve();
        };
        audio.onerror = () => resolve();
        audio.volume = 1;
        audio.src = url1;
        audio.play().catch(() => resolve());
      });

      if (sid !== sessionId) { audio2.pause(); return; }

      // 等 launchSecond 完成
      if (launchPromise) await launchPromise;
      if (sid !== sessionId) { audio2.pause(); return; }

      // 等第二段播完
      if (audio2.src && !audio2.ended) {
        await new Promise<void>((resolve) => {
          audio2.onended = () => resolve();
          audio2.onerror = () => resolve();
          if (audio2.ended) resolve();
        });
      }
      // audio2 保持常驻，不销毁
    }

    console.warn(`[TTS] 播放结束 t=${Date.now() - t0}ms`);

    if (sid === sessionId) {
      speaking = false;
      playingText = null;
      onDone?.();
    }
  } catch (err) {
    if (sid === sessionId) {
      speaking = false;
      playingText = null;
      onError?.(err instanceof Error ? err.message : '音声の生成に失敗しました');
      onDone?.();
    }
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
