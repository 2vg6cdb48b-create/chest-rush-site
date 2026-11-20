import { Platform } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const Colors = {
  light: {
    text: '#13213A',
    textSecondary: '#5B6472',
    background: '#F3F4F7',
    card: '#FFFFFF',
    border: '#E1E5EB',
    field: '#F2F4F7',
    primary: '#C2410C',
    primaryText: '#FFFFFF',
    primarySoft: '#FDEBDD',
    low: '#8A5A00',
    lowSoft: '#FDF3C8',
    out: '#C62828',
    outSoft: '#FBE4E4',
    ok: '#1E7D45',
    okSoft: '#DFF3E7',
  },
  dark: {
    text: '#F2F4F7',
    textSecondary: '#9AA3B2',
    background: '#0A0F1A',
    card: '#151C2B',
    border: '#272C36',
    field: '#21252E',
    primary: '#FF8A4C',
    primaryText: '#1A0E06',
    primarySoft: '#3A1E0E',
    low: '#F2C94C',
    lowSoft: '#33290C',
    out: '#F26B6B',
    outSoft: '#3D1717',
    ok: '#4CC27E',
    okSoft: '#123222',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.light]: string };

export function useTheme(): Palette {
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const MaxContentWidth = 720;

export const Mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
