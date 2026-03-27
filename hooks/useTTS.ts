/**
 * useTTS — 朗読 hook（v2：分句并发 + 顺序播放）
 *
 * Premium (Pro/Max/Admin):
 *   1. 文本按日语句子分割
 *   2. 所有句子同时发出 TTS-stream 请求（并发网络）
 *   3. 播放队列严格按句子顺序：当前句子的 chunk 到即播，
 *      句子结束后立即切到下一句已缓冲的 chunk
 *
 * Free: 浏览器系统 TTS (Web Speech API)
 */

import { useRef, useCallback } from 'react';
import { ttsStream } from '../services/http';
import { useCreditStore } from '../stores/creditStore';

// ─── 工具函数 ───

function isPremiumTier(): boolean {
  const membership = useCreditStore.getState().membership;
  return membership === 'pro' || membership === 'max' || membership === 'admin';
}

/** base64 → Uint8Array */
function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** 解析 WAV 头部 */
function parseWavHeader(buf: Uint8Array): {
  sampleRate: number; channels: number; bitsPerSample: number; dataOffset: number;
} | null {
  if (buf.length < 44) return null;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (view.getUint32(0, false) !== 0x52494646) return null; // "RIFF"
  if (view.getUint32(8, false) !== 0x57415645) return null; // "WAVE"
  const channels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);
  let offset = 36;
  while (offset + 8 <= buf.length) {
    const chunkId = view.getUint32(offset, false);
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === 0x64617461) { // "data"
      return { sampleRate, channels, bitsPerSample, dataOffset: offset + 8 };
    }
    offset += 8 + chunkSize;
  }
  return { sampleRate, channels, bitsPerSample, dataOffset: 44 };
}

/** PCM Int16 LE → Float32 */
function pcm16ToFloat32(bytes: Uint8Array): Float32Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const numSamples = Math.floor(bytes.length / 2);
  const float32 = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}

/**
 * TTS 文本预处理 — 清除不适合朗读的内容
 * 1. 括号内的中文翻译（N5/初心者向け）: 「いい天気だね！（天气真好！）」→「いい天気だね！」
 * 2. Emoji
 * 3. 「笑」「w」「草」等テキスト表現（念のため）
 */
function preprocessForTTS(text: string): string {
  let t = text;
  // 括号内的中文（全角/半角括号）— 匹配含中文字符的括号内容
  t = t.replace(/[（(][^）)]*[\u4e00-\u9fff][^）)]*[）)]/g, '');
  // Emoji（Unicode emoji 范围）
  t = t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]+/gu, '');
  // 文末「笑」「w」「W」「草」（仅清理独立出现的）
  t = t.replace(/[（(]?笑[）)]?/g, '');
  t = t.replace(/[wWｗＷ]+(?=[。！？!?\s]|$)/g, '');
  t = t.replace(/草(?=[。！？!?\s]|$)/g, '');
  // 清理多余空格
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

/**
 * 日语分句 — 按句末标点分割，保留标点
 * 短句（< 5 字符）合并到前一句，避免过度碎片化
 */
function splitSentences(text: string): string[] {
  const raw = text.split(/(?<=[。！？!?\n])/);
  const result: string[] = [];
  for (const s of raw) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    // 短片段合并到前一句
    if (result.length > 0 && trimmed.length < 5) {
      result[result.length - 1] += s;
    } else {
      result.push(s);
    }
  }
  // 如果分句结果只有 1 句或文本很短，直接返回整段
  return result.length > 0 ? result : [text];
}

// ─── 全局 AudioContext ───

let sharedAudioCtx: AudioContext | null = null;

function getOrCreateAudioContext(): AudioContext {
  if (sharedAudioCtx && sharedAudioCtx.state !== 'closed') {
    return sharedAudioCtx;
  }
  sharedAudioCtx = new AudioContext();
  return sharedAudioCtx;
}

/** 必须在用户手势同步栈内调用（iOS Safari 要求） */
function ensureAudioContextResumed(): AudioContext {
  const ctx = getOrCreateAudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// ─── 每个句子的流式状态 ───

interface SentenceState {
  chunks: Float32Array[];  // 已解码的 PCM 数据
  sampleRate: number;
  headerParsed: boolean;
  done: boolean;           // SSE 流结束
  error: boolean;
  /** 缓存命中时的 URL（用 Audio 元素播放） */
  cachedUrl?: string;
  cachedAudio?: HTMLAudioElement;
}

// ─── Hook ───

export function useTTS() {
  // 播放调度器状态
  const nextTimeRef = useRef(0);
  const abortFnsRef = useRef<Array<() => void>>([]);
  const playingTextRef = useRef<string | null>(null);
  const speakingRef = useRef(false);
  // 追踪所有已调度的 AudioBufferSourceNode，stop 时全部断开
  const allSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  // 分句播放队列状态
  const sentenceStatesRef = useRef<SentenceState[]>([]);
  const playingSentenceRef = useRef(0);
  const playedChunksRef = useRef<number[]>([]);
  // 回调 refs
  const onErrorRef = useRef<((msg: string) => void) | null>(null);
  const onFinishRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    playingTextRef.current = null;
    speakingRef.current = false;
    // 中止所有 SSE 连接
    for (const abort of abortFnsRef.current) abort();
    abortFnsRef.current = [];
    // 断开所有已调度的 AudioBufferSourceNode
    for (const src of allSourcesRef.current) {
      try { src.stop(); } catch { /* ok */ }
      try { src.disconnect(); } catch { /* ok */ }
    }
    allSourcesRef.current = [];
    // 停止缓存 Audio 元素
    for (const state of sentenceStatesRef.current) {
      if (state.cachedAudio) {
        state.cachedAudio.pause();
        state.cachedAudio.src = '';
      }
    }
    // 停止系统 TTS
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    nextTimeRef.current = 0;
    sentenceStatesRef.current = [];
    playingSentenceRef.current = 0;
    playedChunksRef.current = [];
    onFinishRef.current = null;
  }, []);

  /**
   * 调度播放：从当前句子开始，依次播放已缓冲的 chunk
   * - 当前句子的 chunk 到达即播放
   * - 当前句子所有 chunk 接收完毕（done=true）后，切到下一句
   */
  const schedulePlayback = useCallback((audioCtx: AudioContext, text: string) => {
    if (playingTextRef.current !== text) return;

    const states = sentenceStatesRef.current;
    const played = playedChunksRef.current;

    while (playingSentenceRef.current < states.length) {
      const idx = playingSentenceRef.current;
      const state = states[idx];

      // 缓存命中的句子：用 Audio 元素播放
      if (state.cachedUrl && !state.cachedAudio) {
        const audio = new Audio(state.cachedUrl);
        state.cachedAudio = audio;
        audio.onended = () => {
          state.done = true;
          schedulePlayback(audioCtx, text);
        };
        audio.onerror = () => {
          state.done = true;
          state.error = true;
          schedulePlayback(audioCtx, text);
        };
        audio.play().catch(() => {
          state.done = true;
          state.error = true;
          schedulePlayback(audioCtx, text);
        });
        break; // 等 Audio 播完再调度下一句
      }

      // 缓存句子正在播放中，等待
      if (state.cachedAudio && !state.done) break;

      // 流式句子：播放尚未播放的 chunk
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
        } catch { /* skip bad chunk */ }

        played[idx] = i + 1;
      }

      // 如果当前句子的 SSE 流已结束，切到下一句
      if (state.done || state.error) {
        playingSentenceRef.current = idx + 1;
      } else {
        break; // 等待更多 chunk
      }
    }

    // 所有句子播放完毕？（缓存句子 Audio.onended 后回到这里）
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
    // 同一文本再次点击 → toggle 停止
    if (speakingRef.current && playingTextRef.current === text) {
      stop();
      onDone?.();
      return;
    }

    // 不同文本或非播放状态 → 停掉旧的，开始新的
    stop();
    speakingRef.current = true;
    onErrorRef.current = onError || null;

    // ── Free 用户：系统 TTS ──
    if (!isPremiumTier()) {
      playingTextRef.current = text;
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(preprocessForTTS(text));
        utterance.lang = 'ja-JP';
        utterance.onend = () => {
          playingTextRef.current = null;
          speakingRef.current = false;
          onDone?.();
        };
        utterance.onerror = (e) => {
          playingTextRef.current = null;
          speakingRef.current = false;
          onError?.('音声の再生に失敗しました');
          onDone?.();
        };
        window.speechSynthesis.speak(utterance);
      } else {
        playingTextRef.current = null;
        speakingRef.current = false;
        onError?.('このブラウザは音声合成に対応していません');
        onDone?.();
      }
      return;
    }

    // ── Premium：分句并发 SSE + 顺序播放队列 ──
    const audioCtx = ensureAudioContextResumed();
    playingTextRef.current = text;
    nextTimeRef.current = audioCtx.currentTime;

    // 预处理：去掉中文括号翻译、emoji、テキスト表現
    const cleanText = preprocessForTTS(text);
    if (!cleanText) {
      speakingRef.current = false;
      playingTextRef.current = null;
      onDone?.();
      return;
    }
    const sentences = splitSentences(cleanText);

    // 初始化每个句子的状态
    const states: SentenceState[] = sentences.map(() => ({
      chunks: [],
      sampleRate: 24000,
      headerParsed: false,
      done: false,
      error: false,
    }));
    sentenceStatesRef.current = states;
    playingSentenceRef.current = 0;
    playedChunksRef.current = new Array(sentences.length).fill(0);

    let completedCount = 0;

    let finished = false;
    const finishPlayback = () => {
      if (finished) return;
      if (playingTextRef.current !== text) return;
      finished = true;
      playingTextRef.current = null;
      speakingRef.current = false;
      onDone?.();
    };
    onFinishRef.current = finishPlayback;

    const checkAllDone = () => {
      completedCount++;
      if (completedCount < sentences.length) return;

      // 所有 SSE 流结束。检查是否有缓存句子仍在播放
      const hasCachedPlaying = states.some(s => s.cachedUrl && !s.done && !s.error);
      if (hasCachedPlaying) {
        // 缓存句子的 Audio.onended 会设 done=true 并推进调度器
        // 最后一个缓存句子播完时通过 schedulePlayback → 检测全部完成 → 清理
        return;
      }

      // 纯流式路径：用 Web Audio 时间计算剩余播放时间
      const remaining = nextTimeRef.current - audioCtx.currentTime;
      if (remaining > 0.05) {
        // 还有音频在排队，等它播完
        setTimeout(finishPlayback, remaining * 1000 + 200);
      } else {
        finishPlayback();
      }
    };

    // 检查是否全部出错
    const checkAllError = () => {
      if (states.every(s => s.error)) {
        playingTextRef.current = null;
        speakingRef.current = false;
        onError?.('音声の生成に失敗しました');
        onDone?.();
      }
    };

    // 并发发出所有句子的 TTS 请求
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

          // 检查 WAV 头
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

          // 尝试调度播放（只有当前句子或之前句子的 chunk 会被播放）
          schedulePlayback(audioCtx, text);
        },
        // onDone — SSE 流结束
        () => {
          // 缓存句子的 done 由 Audio.onended 设置，这里不设
          if (!states[sentIdx].cachedUrl) {
            states[sentIdx].done = true;
          }
          schedulePlayback(audioCtx, text);
          checkAllDone();
        },
        // onError
        (err) => {
          states[sentIdx].error = true;
          states[sentIdx].done = true;
          schedulePlayback(audioCtx, text);
          checkAllError();
          checkAllDone();
        },
        // onCachedUrl — 服务端缓存命中，直接拿 URL
        (url) => {
          states[sentIdx].cachedUrl = url;
          // 不设 done=true，让 schedulePlayback 的 Audio.onended 来设
          schedulePlayback(audioCtx, text);
        },
      );
      aborts.push(abort);
    });

    abortFnsRef.current = aborts;
  }, [stop, schedulePlayback]);

  return { speak, stop };
}
