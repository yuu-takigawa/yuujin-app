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
  { id: 'Cherry',      gender: 'female', labelKey: 'voice.Cherry',      demoUrl: `${OSS_BASE}/Cherry.mp3` },
  { id: 'Serena',      gender: 'female', labelKey: 'voice.Serena',      demoUrl: `${OSS_BASE}/Serena.mp3` },
  { id: 'Chelsie',     gender: 'female', labelKey: 'voice.Chelsie',     demoUrl: `${OSS_BASE}/Chelsie.mp3` },
  { id: 'Momo',        gender: 'female', labelKey: 'voice.Momo',        demoUrl: `${OSS_BASE}/Momo.mp3` },
  { id: 'Vivian',      gender: 'female', labelKey: 'voice.Vivian',      demoUrl: `${OSS_BASE}/Vivian.mp3` },
  { id: 'Maia',        gender: 'female', labelKey: 'voice.Maia',        demoUrl: `${OSS_BASE}/Maia.mp3` },
  { id: 'Bella',       gender: 'female', labelKey: 'voice.Bella',       demoUrl: `${OSS_BASE}/Bella.mp3` },
  { id: 'Mia',         gender: 'female', labelKey: 'voice.Mia',         demoUrl: `${OSS_BASE}/Mia.mp3` },
  { id: 'Bellona',     gender: 'female', labelKey: 'voice.Bellona',     demoUrl: `${OSS_BASE}/Bellona.mp3` },
  { id: 'Bunny',       gender: 'female', labelKey: 'voice.Bunny',       demoUrl: `${OSS_BASE}/Bunny.mp3` },
  { id: 'Nini',        gender: 'female', labelKey: 'voice.Nini',        demoUrl: `${OSS_BASE}/Nini.mp3` },
  { id: 'Ebona',       gender: 'female', labelKey: 'voice.Ebona',       demoUrl: `${OSS_BASE}/Ebona.mp3` },
  { id: 'Seren',       gender: 'female', labelKey: 'voice.Seren',       demoUrl: `${OSS_BASE}/Seren.mp3` },
  { id: 'Stella',      gender: 'female', labelKey: 'voice.Stella',      demoUrl: `${OSS_BASE}/Stella.mp3` },
  { id: 'Elias',       gender: 'female', labelKey: 'voice.Elias',       demoUrl: `${OSS_BASE}/Elias.mp3` },
  // ── 男声 ──
  { id: 'Ethan',       gender: 'male',   labelKey: 'voice.Ethan',       demoUrl: `${OSS_BASE}/Ethan.mp3` },
  { id: 'Moon',        gender: 'male',   labelKey: 'voice.Moon',        demoUrl: `${OSS_BASE}/Moon.mp3` },
  { id: 'Kai',         gender: 'male',   labelKey: 'voice.Kai',         demoUrl: `${OSS_BASE}/Kai.mp3` },
  { id: 'Nofish',      gender: 'male',   labelKey: 'voice.Nofish',      demoUrl: `${OSS_BASE}/Nofish.mp3` },
  { id: 'Eldric Sage', gender: 'male',   labelKey: 'voice.Eldric Sage', demoUrl: `${OSS_BASE}/Eldric_Sage.mp3` },
  { id: 'Mochi',       gender: 'male',   labelKey: 'voice.Mochi',       demoUrl: `${OSS_BASE}/Mochi.mp3` },
  { id: 'Vincent',     gender: 'male',   labelKey: 'voice.Vincent',     demoUrl: `${OSS_BASE}/Vincent.mp3` },
  { id: 'Neil',        gender: 'male',   labelKey: 'voice.Neil',        demoUrl: `${OSS_BASE}/Neil.mp3` },
  { id: 'Arthur',      gender: 'male',   labelKey: 'voice.Arthur',      demoUrl: `${OSS_BASE}/Arthur.mp3` },
  { id: 'Pip',         gender: 'male',   labelKey: 'voice.Pip',         demoUrl: `${OSS_BASE}/Pip.mp3` },
];

/** 按性别筛选 */
export const FEMALE_VOICES = VOICES.filter(v => v.gender === 'female');
export const MALE_VOICES = VOICES.filter(v => v.gender === 'male');

/** 根据性别获取默认音色 */
export function getDefaultVoice(gender?: string): string {
  return gender === '男性' || gender === 'male' ? 'Ethan' : 'Cherry';
}
