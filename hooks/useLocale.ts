import { getLocales } from 'expo-localization';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';
import translations, { type Locale } from '../constants/i18n';

/**
 * Locale hook: determines UI language based on jpLevel.
 *
 * - N4 and above (N4/N3/N2/N1/native): forced 'ja'
 * - none / N5: follows system language (zh/en/ja)
 */
export function useLocale() {
  const storeLevel = useSettingsStore((s) => s.jpLevel);
  const userLevel = useAuthStore((s) => s.user?.jpLevel);
  const jpLevel = userLevel || storeLevel || 'N4';

  const locale = getEffectiveLocale(jpLevel);
  const t = (key: string): string => translations[locale]?.[key] ?? translations.ja[key] ?? key;

  return { locale, t };
}

/**
 * Get effective locale without hooks (for non-component contexts).
 */
export function getEffectiveLocale(jpLevel: string): Locale {
  const forceJa = !['none', 'N5'].includes(jpLevel);
  if (forceJa) return 'ja';

  try {
    const locales = getLocales();
    const systemLang = locales[0]?.languageCode || 'en';
    if (systemLang === 'zh') return 'zh';
    if (systemLang === 'ja') return 'ja';
    return 'en';
  } catch {
    return 'en';
  }
}
