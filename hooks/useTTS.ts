/**
 * useTTS — 朗読 hook（v4：从零重写，简洁可靠）
 *
 * 架构：模块级单例 — 全局只有一个 TTS 在播放。
 * 任何组件调 stop/speak 都操作同一个播放管道。
 *
 * 流程：文本预处理 → 分句 → 并发 SSE 请求 → 按句顺序播放 PCM chunk
 * 全部走 Web Audio API，不使用 new Audio()。
 */

import { useCallback } from 'react';
import { ttsStream } from '../services/http';
import { useCreditStore } from '../stores/creditStore';

// ═══════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

function parseWavHeader(buf: Uint8Array) {
  if (buf.length < 44) return null;
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (v.getUint32(0, false) !== 0x52494646) return null; // RIFF
  if (v.getUint32(8, false) !== 0x57415645) return null; // WAVE
  const sampleRate = v.getUint32(24, true);
  let off = 36;
  while (off + 8 <= buf.length) {
    if (v.getUint32(off, false) === 0x64617461) return { sampleRate, dataOffset: off + 8 };
    off += 8 + v.getUint32(off + 4, true);
  }
  return { sampleRate, dataOffset: 44 };
}

function pcm16ToFloat32(bytes: Uint8Array): Float32Array {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = Math.floor(bytes.length / 2);
  const f = new Float32Array(n);
  for (let i = 0; i < n; i++) f[i] = v.getInt16(i * 2, true) / 32768;
  return f;
}

/** 清除不适合 TTS 朗读的内容 */
function cleanForTTS(text: string): string {
  let t = text;
  t = t.replace(/[（(][^）)]*[\u4e00-\u9fff][^）)]*[）)]/g, ''); // 中文括号翻译
  t = t.replace(/[（(]?[笑泣][）)]?/g, '');                       // 笑/泣
  t = t.replace(/[wWｗＷ]{2,}/g, '');                              // ww
  t = t.replace(/[wWｗＷ]+(?=[。！？!?\s]|$)/g, '');               // 文末 w
  t = t.replace(/草(?=[。！？!?\s]|$)/g, '');                      // 草
  t = t.replace(/[？?][！!]/g, '？');                              // ？！→？
  t = t.replace(/[！!][？?]/g, '？');                              // ！？→？
  t = t.replace(/[？?]{2,}/g, '？');
  t = t.replace(/[！!]{2,}/g, '！');
  t = t.replace(/[〜～]/g, '');                                    // 波浪线
  t = t.replace(/…+/g, '、');                                      // 省略号→停顿
  t = t.replace(/・{2,}/g, '、');
  t = t.replace(/ⓘ/g, '');
  t = t.replace(/[♪♫♬♩★☆※→←↑↓]/g, '');
  t = t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{231A}\u{231B}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2934}\u{2935}\u{2190}-\u{21FF}]+/gu, '');
  t = t.replace(/[（(][^）)]*[_^;><][^）)]*[）)]/g, '');           // 顔文字
  t = t.replace(/\s+/g, ' ').trim();
  t = t.replace(/^[、，,.]+/, '').replace(/[、，,.]+$/, '');
  return t;
}

/** 按日语句末标点分割，短片段合并 */
function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[。！？!?\n])/);
  const result: string[] = [];
  for (const s of parts) {
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
// 模块级单例
// ═══════════════════════════════════════════

let audioCtx: AudioContext | null = null;
let sessionId = 0;           // 递增，旧回调通过比对丢弃
let abortFns: Array<() => void> = [];
let sources: AudioBufferSourceNode[] = [];
let nextTime = 0;
let speaking = false;
let playingText: string | null = null;

// 每个句子的状态
interface Sent {
  chunks: Float32Array[];
  sampleRate: number;
  headerParsed: boolean;
  done: boolean;
}
let sents: Sent[] = [];
let sentIdx = 0;              // 当前播放到哪个句子
let chunkIdx: number[] = [];  // 每个句子播放到哪个 chunk
let onFinishCb: (() => void) | null = null;

// ── 停止 ──

export function stopAllTTS() {
  sessionId++;
  playingText = null;
  speaking = false;
  for (const fn of abortFns) fn();
  abortFns = [];
  for (const s of sources) {
    try { s.stop(); } catch {}
    try { s.disconnect(); } catch {}
  }
  sources = [];
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  nextTime = 0;
  sents = [];
  sentIdx = 0;
  chunkIdx = [];
  onFinishCb = null;
}

// ── 调度播放 ──

function pump(sid: number) {
  if (sid !== sessionId || !playingText) return;
  const ctx = audioCtx;
  if (!ctx) return;

  // AudioContext 还没 resume → 等
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => pump(sid));
    return;
  }

  while (sentIdx < sents.length) {
    const s = sents[sentIdx];

    // 播放这个句子中还没播的 chunk
    while (chunkIdx[sentIdx] < s.chunks.length) {
      const f32 = s.chunks[chunkIdx[sentIdx]];
      chunkIdx[sentIdx]++;
      if (f32.length === 0) continue;
      try {
        const buf = ctx.createBuffer(1, f32.length, s.sampleRate);
        buf.getChannelData(0).set(f32);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        const t = Math.max(ctx.currentTime, nextTime);
        src.start(t);
        nextTime = t + buf.duration;
        sources.push(src);
      } catch {}
    }

    // 句子的 SSE 结束了 → 可以切下一句
    if (s.done) {
      sentIdx++;
    } else {
      break; // 等更多 chunk
    }
  }

  // 全部完成
  if (sentIdx >= sents.length && sents.length > 0 && sents.every(s => s.done)) {
    const remaining = nextTime - ctx.currentTime;
    setTimeout(() => {
      if (sid === sessionId) onFinishCb?.();
    }, Math.max(remaining * 1000 + 100, 50));
  }
}

// ── 播放 ──

function globalSpeak(
  text: string,
  voice?: string,
  onDone?: () => void,
  onError?: (msg: string) => void,
) {
  // toggle：同一文本 → 停止
  if (speaking && playingText === text) {
    stopAllTTS();
    onDone?.();
    return;
  }

  stopAllTTS();
  speaking = true;

  // Free 用户 → 系统 TTS
  const membership = useCreditStore.getState().membership;
  const premium = membership === 'pro' || membership === 'max' || membership === 'admin';
  if (!premium) {
    playingText = text;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(cleanForTTS(text));
      u.lang = 'ja-JP';
      u.onend = () => { playingText = null; speaking = false; onDone?.(); };
      u.onerror = () => { playingText = null; speaking = false; onDone?.(); };
      window.speechSynthesis.speak(u);
    } else {
      playingText = null; speaking = false; onDone?.();
    }
    return;
  }

  // Premium → Web Audio
  if (!audioCtx || audioCtx.state === 'closed') audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  playingText = text;
  nextTime = audioCtx.currentTime;
  const sid = sessionId;

  const clean = cleanForTTS(text);
  if (!clean) { speaking = false; playingText = null; onDone?.(); return; }

  const sentences = splitSentences(clean);

  // 初始化句子状态
  sents = sentences.map(() => ({ chunks: [], sampleRate: 24000, headerParsed: false, done: false }));
  sentIdx = 0;
  chunkIdx = new Array(sentences.length).fill(0);

  let doneCount = 0;
  const finish = () => {
    if (sid !== sessionId) return;
    playingText = null;
    speaking = false;
    onDone?.();
  };
  onFinishCb = finish;

  // 并发发出所有句子的请求
  const newAborts: Array<() => void> = [];

  sentences.forEach((sentence, i) => {
    const abort = ttsStream(
      sentence,
      voice,
      // onChunk
      (b64) => {
        if (sid !== sessionId) return;
        const raw = base64ToBytes(b64);
        if (raw.length === 0) return;

        const s = sents[i];
        let pcm: Uint8Array;

        // 首片可能带 WAV header
        if (!s.headerParsed && raw.length >= 44 && raw[0] === 0x52 && raw[1] === 0x49) {
          const hdr = parseWavHeader(raw);
          if (hdr) { s.sampleRate = hdr.sampleRate; pcm = raw.slice(hdr.dataOffset); }
          else pcm = raw;
          s.headerParsed = true;
        } else {
          s.headerParsed = true;
          pcm = raw;
        }

        if (pcm.length < 2) return;
        const f32 = pcm16ToFloat32(pcm);
        if (f32.length > 0) {
          s.chunks.push(f32);
          pump(sid);
        }
      },
      // onDone
      () => {
        if (sid !== sessionId) return;
        sents[i].done = true;
        doneCount++;
        pump(sid); // 推进到下一句
      },
      // onError
      (err) => {
        if (sid !== sessionId) return;
        sents[i].done = true;
        doneCount++;
        pump(sid);
        // 全部失败
        if (doneCount >= sentences.length && sents.every(s => s.chunks.length === 0)) {
          speaking = false; playingText = null;
          onError?.('音声の生成に失敗しました');
          onDone?.();
        }
      },
    );
    newAborts.push(abort);
  });

  abortFns = newAborts;
}

// ═══════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════

export function useTTS() {
  const speak = useCallback((
    text: string, voice?: string, onDone?: () => void, onError?: (msg: string) => void,
  ) => globalSpeak(text, voice, onDone, onError), []);

  const stop = useCallback(() => stopAllTTS(), []);

  return { speak, stop };
}
