/**
 * useTTS — 朗読 hook
 *
 * Pro/Max/Admin: 服务端 TTS（分句并行预取 + 流水线播放，低延迟）。
 * Free: 浏览器系统 TTS（Web Speech API）。
 */

import { useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { tts } from '../services/http';
import { useCreditStore } from '../stores/creditStore';

function isPremiumTier(): boolean {
  const membership = useCreditStore.getState().membership;
  return membership === 'pro' || membership === 'max' || membership === 'admin';
}

/** 按句号/问号/感叹号/顿号/换行切分，保留标点 */
function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[。！？、\n!?])/g).map(s => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [text];
}

/** 带重试的 TTS 请求 */
async function ttsWithRetry(text: string, voice?: string, retries = 2): Promise<string> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await tts(text, voice);
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw new Error('TTS failed');
}

export function useTTS() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const playingTextRef = useRef<string | null>(null);
  const speakingRef = useRef(false);

  const stop = useCallback(async () => {
    playingTextRef.current = null;
    speakingRef.current = false;
    // 停止系统 TTS
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    // 停止服务端 TTS
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch { /* ignore */ }
      soundRef.current = null;
    }
  }, []);

  const speak = useCallback(async (
    text: string,
    voice?: string,
    onDone?: () => void,
  ) => {
    // 防止重叠：正在朗读中不允许新的朗读
    if (speakingRef.current) {
      // 如果是同一段文本，停止；否则忽略
      if (playingTextRef.current === text) {
        await stop();
        onDone?.();
      }
      return;
    }

    await stop();
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

    // ── Premium：服务端 TTS（分句流水线）──
    playingTextRef.current = text;
    const sentences = splitSentences(text);

    try {
      // 并行预取所有分句的音频 URL
      const urlPromises = sentences.map(s => ttsWithRetry(s, voice));

      // 等待第一句
      const firstUrl = await urlPromises[0];
      if (playingTextRef.current !== text) { speakingRef.current = false; return; }

      // 播放第一句
      const { sound } = await Audio.Sound.createAsync({ uri: firstUrl });
      soundRef.current = sound;
      await sound.playAsync();
      // ← speak() 在此 resolve，tooltip 关闭，第一句已在播放

      // 后续句子：当前句播完 → 播下一句（后台进行）
      const playNext = async (idx: number) => {
        if (idx >= sentences.length || playingTextRef.current !== text) {
          soundRef.current = null;
          playingTextRef.current = null;
          speakingRef.current = false;
          onDone?.();
          return;
        }
        try {
          const url = await urlPromises[idx];
          if (playingTextRef.current !== text) { speakingRef.current = false; return; }
          const { sound: next } = await Audio.Sound.createAsync({ uri: url });
          soundRef.current = next;
          next.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              next.unloadAsync();
              playNext(idx + 1);
            }
          });
          await next.playAsync();
        } catch {
          soundRef.current = null;
          playingTextRef.current = null;
          speakingRef.current = false;
          onDone?.();
        }
      };

      // 第一句播完后触发后续
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          playNext(1);
        }
      });
    } catch {
      // TTS 失败，不 fallback 到系统 TTS — 静默失败
      playingTextRef.current = null;
      speakingRef.current = false;
      onDone?.();
    }
  }, [stop]);

  return { speak, stop };
}
