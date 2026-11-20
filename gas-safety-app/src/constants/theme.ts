import { Platform } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const Colors = {
  light: {
    text: '#14181F',
    textSecondary: '#5B6472',
    background: '#F1F4F4',
    card: '#FFFFFF',
    border: '#E1E5EB',
    field: '#F2F4F7',
    primary: '#0B6E69',
    primaryText: '#FFFFFF',
    primarySoft: '#DDF1EF',
    low: '#B45309',
    lowSoft: '#FDF0DC',
    out: '#C62828',
    outSoft: '#FBE4E4',
    ok: '#1E7D45',
    okSoft: '#DFF3E7',
  },
  dark: {
    text: '#F2F4F7',
    textSecondary: '#9AA3B2',
    background: '#0B0D11',
    card: '#171A21',
    border: '#272C36',
    field: '#21252E',
    primary: '#3CC3B8',
    primaryText: '#0B0D11',
    primarySoft: '#10332F',
    low: '#F2A93B',
    lowSoft: '#3A2A10',
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
