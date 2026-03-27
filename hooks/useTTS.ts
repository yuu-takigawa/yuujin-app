/**
 * useTTS — 朗読 hook
 *
 * Pro/Max/Admin: 调用 POST /voice/tts 获取音频 URL，用 expo-av 播放（25种高品质音色）。
 * Free: 使用浏览器系统 TTS（Web Speech API）。
 */

import { useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { tts } from '../services/http';
import { useCreditStore } from '../stores/creditStore';

function isPremiumTier(): boolean {
  const membership = useCreditStore.getState().membership;
  return membership === 'pro' || membership === 'max' || membership === 'admin';
}

export function useTTS() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const playingTextRef = useRef<string | null>(null);

  const stop = useCallback(async () => {
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
    playingTextRef.current = null;
  }, []);

  const speak = useCallback(async (
    text: string,
    voice?: string,
    onDone?: () => void,
  ) => {
    // 如果正在播放同一段文本，停止
    if (playingTextRef.current === text) {
      await stop();
      onDone?.();
      return;
    }

    // 停止之前的播放
    await stop();

    // Free 用户：系统 TTS
    if (!isPremiumTier()) {
      playingTextRef.current = text;
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.onend = () => { playingTextRef.current = null; onDone?.(); };
        utterance.onerror = () => { playingTextRef.current = null; onDone?.(); };
        window.speechSynthesis.speak(utterance);
      } else {
        playingTextRef.current = null;
        onDone?.();
      }
      return;
    }

    // Pro/Max/Admin：服务端 TTS
    try {
      playingTextRef.current = text;
      const url = await tts(text, voice);

      // 可能在请求期间被 stop 了
      if (playingTextRef.current !== text) return;

      const { sound } = await Audio.Sound.createAsync({ uri: url });
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
          playingTextRef.current = null;
          onDone?.();
        }
      });

      await sound.playAsync();
    } catch {
      playingTextRef.current = null;
      onDone?.();
    }
  }, [stop]);

  return { speak, stop };
}
