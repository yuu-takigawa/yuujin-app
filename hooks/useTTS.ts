/**
 * useTTS — 朗読 hook
 *
 * Pro/Max/Admin: SSE 流式 TTS — 服务端逐片转发 DashScope WAV/PCM 数据，
 *               客户端 Web Audio API 实时播放，首片即出声。
 * Free: 浏览器系统 TTS（Web Speech API）。
 */

import { useRef, useCallback } from 'react';
import { ttsStream } from '../services/http';
import { useCreditStore } from '../stores/creditStore';

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

/**
 * 解析 WAV 头部，返回 { sampleRate, channels, bitsPerSample, dataOffset }
 * 如果不是 WAV 返回 null
 */
function parseWavHeader(buf: Uint8Array): { sampleRate: number; channels: number; bitsPerSample: number; dataOffset: number } | null {
  if (buf.length < 44) return null;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // RIFF magic
  if (view.getUint32(0, false) !== 0x52494646) return null; // "RIFF"
  // WAVE magic
  if (view.getUint32(8, false) !== 0x57415645) return null; // "WAVE"
  const channels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);
  // 找 "data" 子块
  let offset = 36;
  while (offset + 8 <= buf.length) {
    const chunkId = view.getUint32(offset, false);
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === 0x64617461) { // "data"
      return { sampleRate, channels, bitsPerSample, dataOffset: offset + 8 };
    }
    offset += 8 + chunkSize;
  }
  return { sampleRate, channels, bitsPerSample, dataOffset: 44 }; // fallback
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

// 全局复用 AudioContext（iOS 限制数量）
let sharedAudioCtx: AudioContext | null = null;
function getAudioContext(sampleRate: number): AudioContext {
  if (sharedAudioCtx && sharedAudioCtx.state !== 'closed') {
    return sharedAudioCtx;
  }
  sharedAudioCtx = new AudioContext({ sampleRate });
  return sharedAudioCtx;
}

export function useTTS() {
  const nextTimeRef = useRef(0);
  const abortRef = useRef<(() => void) | null>(null);
  const playingTextRef = useRef<string | null>(null);
  const speakingRef = useRef(false);
  const sampleRateRef = useRef(24000);
  const headerParsedRef = useRef(false);
  const lastSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stop = useCallback(() => {
    playingTextRef.current = null;
    speakingRef.current = false;
    // 停止 SSE
    abortRef.current?.();
    abortRef.current = null;
    // 停止 Web Audio（suspend，不 close — iOS 复用）
    if (sharedAudioCtx && sharedAudioCtx.state === 'running') {
      sharedAudioCtx.suspend().catch(() => {});
    }
    // 停止系统 TTS
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    nextTimeRef.current = 0;
    headerParsedRef.current = false;
    lastSourceRef.current = null;
  }, []);

  const speak = useCallback(async (
    text: string,
    voice?: string,
    onDone?: () => void,
  ) => {
    // 防重叠
    if (speakingRef.current) {
      if (playingTextRef.current === text) {
        stop();
        onDone?.();
      }
      return;
    }

    stop();
    speakingRef.current = true;

    // ── Free 用户：系统 TTS ──
    if (!isPremiumTier()) {
      playingTextRef.current = text;
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.onend = () => { playingTextRef.current = null; speakingRef.current = false; onDone?.(); };
        utterance.onerror = () => { playingTextRef.current = null; speakingRef.current = false; onDone?.(); };
        window.speechSynthesis.speak(utterance);
      } else {
        playingTextRef.current = null;
        speakingRef.current = false;
        onDone?.();
      }
      return;
    }

    // ── Premium：SSE 流式 TTS + Web Audio ──
    playingTextRef.current = text;
    headerParsedRef.current = false;
    sampleRateRef.current = 24000;
    let audioCtx: AudioContext | null = null;
    let firstChunkResolved = false;
    let resolveFirstChunk: (() => void) | null = null;

    const firstChunkPromise = new Promise<void>((resolve) => {
      resolveFirstChunk = resolve;
      // 超时 8 秒
      setTimeout(() => { if (!firstChunkResolved) { firstChunkResolved = true; resolve(); } }, 8000);
    });

    const abort = ttsStream(
      text,
      voice,
      // onChunk
      (base64) => {
        if (playingTextRef.current !== text) return;
        const bytes = base64ToBytes(base64);
        if (bytes.length === 0) return;

        let pcmBytes: Uint8Array;

        // 检查每个 chunk 是否含 WAV 头（RIFF 魔数 0x52494646）
        const hasWavHeader = bytes.length >= 44 &&
          bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;

        if (hasWavHeader) {
          const header = parseWavHeader(bytes);
          if (header) {
            sampleRateRef.current = header.sampleRate;
            pcmBytes = bytes.slice(header.dataOffset);
          } else {
            pcmBytes = bytes;
          }
          if (!headerParsedRef.current) {
            headerParsedRef.current = true;
            audioCtx = getAudioContext(sampleRateRef.current);
            if (audioCtx.state === 'suspended') audioCtx.resume();
            nextTimeRef.current = audioCtx.currentTime;
          }
        } else if (!headerParsedRef.current) {
          // 首个 chunk 无 WAV 头，当 raw PCM，用默认采样率
          headerParsedRef.current = true;
          audioCtx = getAudioContext(sampleRateRef.current);
          if (audioCtx.state === 'suspended') audioCtx.resume();
          nextTimeRef.current = audioCtx.currentTime;
          pcmBytes = bytes;
        } else {
          pcmBytes = bytes;
        }

        if (!audioCtx || pcmBytes.length < 2) return;

        try {
          const float32 = pcm16ToFloat32(pcmBytes);
          if (float32.length === 0) return;
          const buffer = audioCtx.createBuffer(1, float32.length, sampleRateRef.current);
          buffer.getChannelData(0).set(float32);

          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(audioCtx.destination);

          const startAt = Math.max(audioCtx.currentTime, nextTimeRef.current);
          source.start(startAt);
          nextTimeRef.current = startAt + buffer.duration;
          lastSourceRef.current = source;

          // 首片出声
          if (!firstChunkResolved) {
            firstChunkResolved = true;
            resolveFirstChunk?.();
          }
        } catch { /* skip bad chunk */ }
      },
      // onDone
      () => {
        if (lastSourceRef.current) {
          lastSourceRef.current.onended = () => {
            if (playingTextRef.current === text) {
              playingTextRef.current = null;
              speakingRef.current = false;
              onDone?.();
            }
          };
        } else {
          playingTextRef.current = null;
          speakingRef.current = false;
          onDone?.();
        }
        if (!firstChunkResolved) {
          firstChunkResolved = true;
          resolveFirstChunk?.();
        }
      },
      // onError
      () => {
        playingTextRef.current = null;
        speakingRef.current = false;
        if (!firstChunkResolved) {
          firstChunkResolved = true;
          resolveFirstChunk?.();
        }
        onDone?.();
      },
    );

    abortRef.current = abort;

    // 等首片出声后 resolve（让 tooltip 关闭）
    await firstChunkPromise;
  }, [stop]);

  return { speak, stop };
}
