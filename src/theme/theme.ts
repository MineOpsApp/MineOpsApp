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
  info: string;
  infoLight: string;
  tabBar: string;
  tabBarBorder: string;
};

const light: Theme = {
  bg: '#f7f1e8',
  bgCard: '#ffffff',
  bgHero: '#3d2817',
  bgStrip: '#ffffff',
  bgInput: '#f2ebe0',
  border: '#e6d9c7',
  text: '#2b2016',
  textSub: '#6b5a47',
  textMuted: '#a08b73',
  accent: '#b8722e',
  accentLight: '#f6e8d5',
  danger: '#b3261e',
  dangerLight: '#fbeae8',
  amber: '#96650a',
  amberLight: '#fbf1de',
  success: '#3f6c2e',
  successLight: '#eef4e6',
  info: '#3c6e71',
  infoLight: '#e7f0ef',
  tabBar: '#ffffff',
  tabBarBorder: '#e6d9c7',
};

const dark: Theme = {
  bg: '#1a140d',
  bgCard: '#241b12',
  bgHero: '#140d08',
  bgStrip: '#241b12',
  bgInput: '#2e2216',
  border: '#3d2f20',
  text: '#f2e6d3',
  textSub: '#c2ac8e',
  textMuted: '#8a7660',
  accent: '#e0a83a',
  accentLight: '#332616',
  danger: '#e5534b',
  dangerLight: '#3a1c17',
  amber: '#d99a2b',
  amberLight: '#382a13',
  success: '#7fb069',
  successLight: '#1f2e17',
  info: '#6fb3b8',
  infoLight: '#16292a',
  tabBar: '#241b12',
  tabBarBorder: '#3d2f20',
};

export function useTheme(mode: ThemeMode): Theme {
  const systemScheme = useColorScheme();
  const resolved = mode === 'system' ? (systemScheme ?? 'light') : mode;
  return resolved === 'dark' ? dark : light;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: '900' as const, letterSpacing: -0.5 },
  h1: { fontSize: 26, fontWeight: '900' as const, letterSpacing: -0.4 },
  h2: { fontSize: 20, fontWeight: '800' as const, letterSpacing: -0.2 },
  h3: { fontSize: 16, fontWeight: '800' as const },
  body: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
  bodyBold: { fontSize: 14, fontWeight: '700' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },
  label: { fontSize: 11, fontWeight: '800' as const, letterSpacing: 0.6, textTransform: 'uppercase' as const },
} as const;
