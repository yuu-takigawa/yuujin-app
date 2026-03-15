export const lightColors = {
  background: '#F7F7F7',
  surface: '#FFFFFF',
  inputBg: '#F0F0F0',
  text: '#212121',
  textSecondary: '#666666',
  brand: '#E85B3A',
  brandLight: '#FFF0EB',
  bubbleAI: '#F0F0F0',
  border: '#EBEBEB',
  white: '#FFFFFF',
  error: '#DC3545',
  success: '#28A745',
  overlay: 'rgba(0,0,0,0.4)',
  cardBackground: '#FFFFFF',
  dateBadge: '#EEEEEE',
} as const;

export const darkColors = {
  background: '#121212',
  surface: '#1E1E1E',
  inputBg: '#2A2A2A',
  text: '#F0F0F0',
  textSecondary: '#999999',
  brand: '#E85B3A',
  brandLight: '#3A2520',
  bubbleAI: '#2A2A2A',
  border: '#333333',
  white: '#FFFFFF',
  error: '#FF6B6B',
  success: '#51CF66',
  overlay: 'rgba(0,0,0,0.6)',
  cardBackground: '#1E1E1E',
  dateBadge: '#333333',
} as const;

export type ThemeColors = typeof lightColors;

// Keep backward-compatible default export
export const colors = lightColors;

export const radii = {
  xs: 4,
  sm: 8,
  xl: 20,
  lg: 16,
  md: 12,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const fontSize = {
  title: 24,
  subtitle: 18,
  body: 16,
  caption: 13,
  small: 11,
} as const;
