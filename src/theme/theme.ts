import { useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

export type Theme = {
  bg: string;
  bgCard: string;
  bgHero: string;
  bgStrip: string;
  bgInput: string;
  border: string;
  text: string;
  textSub: string;
  textMuted: string;
  accent: string;
  accentLight: string;
  danger: string;
  dangerLight: string;
  amber: string;
  amberLight: string;
  success: string;
  successLight: string;
  tabBar: string;
  tabBarBorder: string;
};

const light: Theme = {
  bg: '#f0f2f5',
  bgCard: '#ffffff',
  bgHero: '#17212b',
  bgStrip: '#ffffff',
  bgInput: '#f4f6f8',
  border: '#e5e9ef',
  text: '#17212b',
  textSub: '#5d6875',
  textMuted: '#8fa3b8',
  accent: '#1f6f5b',
  accentLight: '#e7f6ef',
  danger: '#b42318',
  dangerLight: '#fff5f5',
  amber: '#a15c00',
  amberLight: '#fffbeb',
  success: '#15803d',
  successLight: '#f0fdf4',
  tabBar: '#ffffff',
  tabBarBorder: '#e5e9ef',
};

const dark: Theme = {
  bg: '#0d1117',
  bgCard: '#161b22',
  bgHero: '#0d1117',
  bgStrip: '#161b22',
  bgInput: '#21262d',
  border: '#30363d',
  text: '#e6edf3',
  textSub: '#8b949e',
  textMuted: '#6e7681',
  accent: '#3fb950',
  accentLight: '#122620',
  danger: '#f85149',
  dangerLight: '#2d1117',
  amber: '#d29922',
  amberLight: '#2d2015',
  success: '#3fb950',
  successLight: '#122620',
  tabBar: '#161b22',
  tabBarBorder: '#30363d',
};

export function useTheme(mode: ThemeMode): Theme {
  const systemScheme = useColorScheme();
  const resolved = mode === 'system' ? (systemScheme ?? 'light') : mode;
  return resolved === 'dark' ? dark : light;
}
