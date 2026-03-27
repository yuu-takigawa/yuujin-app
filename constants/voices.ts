/** Qwen3-TTS 可用音色列表 */

export interface VoiceOption {
  id: string;
  gender: 'female' | 'male';
  /** i18n key: voice.{id} */
  labelKey: string;
  /** OSS 上的试听 demo URL */
  demoUrl: string;
}

const OSS_BASE = 'https://yuujin-assets.oss-cn-hangzhou.aliyuncs.com/tts-demos';

export const VOICES: VoiceOption[] = [
  // ── 女声 ──
  { id: 'Cherry',      gender: 'female', labelKey: 'voice.Cherry',      demoUrl: `${OSS_BASE}/Cherry.wav` },
  { id: 'Serena',      gender: 'female', labelKey: 'voice.Serena',      demoUrl: `${OSS_BASE}/Serena.wav` },
  { id: 'Chelsie',     gender: 'female', labelKey: 'voice.Chelsie',     demoUrl: `${OSS_BASE}/Chelsie.wav` },
  { id: 'Momo',        gender: 'female', labelKey: 'voice.Momo',        demoUrl: `${OSS_BASE}/Momo.wav` },
  { id: 'Vivian',      gender: 'female', labelKey: 'voice.Vivian',      demoUrl: `${OSS_BASE}/Vivian.wav` },
  { id: 'Maia',        gender: 'female', labelKey: 'voice.Maia',        demoUrl: `${OSS_BASE}/Maia.wav` },
  { id: 'Bella',       gender: 'female', labelKey: 'voice.Bella',       demoUrl: `${OSS_BASE}/Bella.wav` },
  { id: 'Mia',         gender: 'female', labelKey: 'voice.Mia',         demoUrl: `${OSS_BASE}/Mia.wav` },
  { id: 'Bellona',     gender: 'female', labelKey: 'voice.Bellona',     demoUrl: `${OSS_BASE}/Bellona.wav` },
  { id: 'Bunny',       gender: 'female', labelKey: 'voice.Bunny',       demoUrl: `${OSS_BASE}/Bunny.wav` },
  { id: 'Nini',        gender: 'female', labelKey: 'voice.Nini',        demoUrl: `${OSS_BASE}/Nini.wav` },
  { id: 'Ebona',       gender: 'female', labelKey: 'voice.Ebona',       demoUrl: `${OSS_BASE}/Ebona.wav` },
  { id: 'Seren',       gender: 'female', labelKey: 'voice.Seren',       demoUrl: `${OSS_BASE}/Seren.wav` },
  { id: 'Stella',      gender: 'female', labelKey: 'voice.Stella',      demoUrl: `${OSS_BASE}/Stella.wav` },
  { id: 'Elias',       gender: 'female', labelKey: 'voice.Elias',       demoUrl: `${OSS_BASE}/Elias.wav` },
  // ── 男声 ──
  { id: 'Ethan',       gender: 'male',   labelKey: 'voice.Ethan',       demoUrl: `${OSS_BASE}/Ethan.wav` },
  { id: 'Moon',        gender: 'male',   labelKey: 'voice.Moon',        demoUrl: `${OSS_BASE}/Moon.wav` },
  { id: 'Kai',         gender: 'male',   labelKey: 'voice.Kai',         demoUrl: `${OSS_BASE}/Kai.wav` },
  { id: 'Nofish',      gender: 'male',   labelKey: 'voice.Nofish',      demoUrl: `${OSS_BASE}/Nofish.wav` },
  { id: 'Eldric Sage', gender: 'male',   labelKey: 'voice.Eldric Sage', demoUrl: `${OSS_BASE}/Eldric_Sage.wav` },
  { id: 'Mochi',       gender: 'male',   labelKey: 'voice.Mochi',       demoUrl: `${OSS_BASE}/Mochi.wav` },
  { id: 'Vincent',     gender: 'male',   labelKey: 'voice.Vincent',     demoUrl: `${OSS_BASE}/Vincent.wav` },
  { id: 'Neil',        gender: 'male',   labelKey: 'voice.Neil',        demoUrl: `${OSS_BASE}/Neil.wav` },
  { id: 'Arthur',      gender: 'male',   labelKey: 'voice.Arthur',      demoUrl: `${OSS_BASE}/Arthur.wav` },
  { id: 'Pip',         gender: 'male',   labelKey: 'voice.Pip',         demoUrl: `${OSS_BASE}/Pip.wav` },
];

/** 按性别筛选 */
export const FEMALE_VOICES = VOICES.filter(v => v.gender === 'female');
export const MALE_VOICES = VOICES.filter(v => v.gender === 'male');

/** 根据性别获取默认音色 */
export function getDefaultVoice(gender?: string): string {
  return gender === '男性' || gender === 'male' ? 'Ethan' : 'Cherry';
}
