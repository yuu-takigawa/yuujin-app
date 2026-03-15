import { useSettingsStore } from '../stores/settingsStore';
import { lightColors, darkColors, type ThemeColors } from '../constants/theme';

export function useTheme(): ThemeColors {
  const isDark = useSettingsStore((s) => s.darkMode);
  return isDark ? darkColors : lightColors;
}
