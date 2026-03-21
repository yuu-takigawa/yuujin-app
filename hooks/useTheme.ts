import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';
import { lightColors, darkColors, type ThemeColors } from '../constants/theme';

export function useTheme(): ThemeColors {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const systemScheme = useColorScheme();

  if (themeMode === 'dark') return darkColors;
  if (themeMode === 'light') return lightColors;
  // system
  return systemScheme === 'dark' ? darkColors : lightColors;
}
