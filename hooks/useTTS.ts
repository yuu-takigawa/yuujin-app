/**
 * useTTS — 朗読 hook
 *
 * iOS Safari PWA 下 Web Audio API 不出声，只有 new Audio(url) 能播放。
 * 因此：分句 → 并发调 /voice/tts 拿 URL → 按顺序 new Audio(url) 播放。
 *
 * 模块级单例：全局只有一个 TTS 在播放，任何组件调 stop 都能停掉。
 */

import { useCallback } from 'react';
import { ttsStream } from '../services/http';
import { useCreditStore } from '../stores/creditStore';

// ═══════════════════════════════════════════
// 文本预处理
// ═══════════════════════════════════════════

function cleanForTTS(text: string): string {
  let t = text;
  // 1. 去括号内中文翻译
  t = t.replace(/[（(][^）)]*[\u4e00-\u9fff][^）)]*[）)]/g, '');
  // 2. 聊天特有表現
  t = t.replace(/[（(]?[笑泣][）)]?/g, '');
  t = t.replace(/[wWｗＷ]{2,}/g, '');
  t = t.replace(/[wWｗＷ]+(?=[。！？!?\s]|$)/g, '');
  t = t.replace(/草(?=[。！？!?\s]|$)/g, '');
  // 3. 特殊符号转換
  t = t.replace(/[〜～]/g, 'ー');  // 波浪线→長音符
  t = t.replace(/…+/g, '、');      // 省略号→停顿
  // 全角标点→半角（TTS 对全角标点发音不稳定）
  t = t.replace(/！/g, '!').replace(/？/g, '?').replace(/，/g, '、').replace(/：/g, ' ').replace(/；/g, '、');
  t = t.replace(/[?][!]/g, '?');
  t = t.replace(/[!][?]/g, '?');
  t = t.replace(/[?]{2,}/g, '?');
  t = t.replace(/[!]{2,}/g, '!');
  // 4. 白名单：只保留 TTS 能正确朗读的字符
  //    平仮名・片仮名・漢字・英数字・基本标点・空格
  //    平仮名・片仮名・漢字・英数字・基本标点（半角）・空格
  t = t.replace(/[^\u3040-\u309F\u30A0-\u30FFー\u4E00-\u9FFF\u3400-\u4DBFa-zA-Z0-9。、!?「」『』・ \n]/g, '');
  // 5. 清理
  t = t.replace(/\s+/g, ' ').trim();
  t = t.replace(/^[、，,.。]+/, '').replace(/[、，,.。]+$/, '');
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
// 模块级单例状态
// ═══════════════════════════════════════════

/**
 * 获取可播放的音频 URL：
 * - 缓存命中 → 服务端返回 cachedUrl（<100ms）
 * - 未缓存 → 流式收集 chunk → Blob URL（比非流式快，跳过 CDN 下载）
 */
function ttsToUrl(text: string, voice?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let done = false;
    const chunks: string[] = [];

    ttsStream(text, voice,
      (base64) => { chunks.push(base64); },
      () => {
        if (done) return;
        done = true;
        if (chunks.length === 0) { reject(new Error('no audio')); return; }
        try {
          const parts: Uint8Array[] = chunks.map(b64 => {
            const bin = atob(b64);
            const u8 = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
            return u8;
          });
          const total = parts.reduce((s, a) => s + a.length, 0);
          const merged = new Uint8Array(total);
          let off = 0;
          for (const p of parts) { merged.set(p, off); off += p.length; }
          resolve(URL.createObjectURL(new Blob([merged], { type: 'audio/wav' })));
        } catch (e) { reject(e); }
      },
      (err) => { if (!done) { done = true; reject(new Error(err)); } },
      (url) => { if (!done) { done = true; resolve(url); } }, // cachedUrl
    );
  });
}

let sessionId = 0;
let speaking = false;
let playingText: string | null = null;
let currentAudio: HTMLAudioElement | null = null;
let abortController: AbortController | null = null;

export function stopAllTTS() {
  sessionId++;
  speaking = false;
  playingText = null;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// ═══════════════════════════════════════════
// 核心播放逻辑
// ═══════════════════════════════════════════

async function globalSpeak(
  text: string,
  voice?: string,
  onDone?: () => void,
  onError?: (msg: string) => void,
  onStart?: () => void,
) {
  // toggle：同一文本 → 停止
  if (speaking && playingText === text) {
    stopAllTTS();
    onDone?.();
    return;
  }

  stopAllTTS();
  speaking = true;
  playingText = text;

  // Free 用户 → 系统 TTS
  const membership = useCreditStore.getState().membership;
  const premium = membership === 'pro' || membership === 'max' || membership === 'admin';

  if (!premium) {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(cleanForTTS(text));
      u.lang = 'ja-JP';
      u.onend = () => { speaking = false; playingText = null; onDone?.(); };
      u.onerror = () => { speaking = false; playingText = null; onDone?.(); };
      window.speechSynthesis.speak(u);
    } else {
      speaking = false; playingText = null; onDone?.();
    }
    return;
  }

  // Premium → 分句并发获取 URL，按顺序播放
  const clean = cleanForTTS(text);
  if (!clean) { speaking = false; playingText = null; onDone?.(); return; }

  const sentences = splitSentences(clean);
  const sid = sessionId;
  const controller = new AbortController();
  abortController = controller;

  try {
    // 并发请求所有句子的 URL（缓存命中秒回，未缓存走流式收集）
    const urlPromises = sentences.map(s => ttsToUrl(s, voice).catch(() => null));

    // 按顺序播放：第 i 句的 URL 到了就播，不等后面的句子
    let started = false;
    for (let i = 0; i < urlPromises.length; i++) {
      const url = await urlPromises[i];
      if (sid !== sessionId || !url) continue;

      await new Promise<void>((resolve) => {
        const audio = new Audio(url);
        currentAudio = audio;
        if (!started) { started = true; onStart?.(); }
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
        controller.signal.addEventListener('abort', () => {
          audio.pause();
          audio.src = '';
          resolve();
        });
      });
    }

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
