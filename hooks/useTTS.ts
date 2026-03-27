/**
 * useTTS — 服务端 TTS 朗读 hook
 *
 * 调用 POST /voice/tts 获取音频 URL，用 expo-av 播放。
 * 替代 expo-speech 的系统 TTS。
 */

import { useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { tts } from '../services/http';

export function useTTS() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const playingTextRef = useRef<string | null>(null);

  const stop = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch { /* ignore */ }
      soundRef.current = null;
      playingTextRef.current = null;
    }
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
