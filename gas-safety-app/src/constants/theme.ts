import { Platform } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const Colors = {
  light: {
    text: '#13213A',
    textSecondary: '#5B6472',
    background: '#F2F4F8',
    card: '#FFFFFF',
    border: '#E3E7EE',
    field: '#F2F4F8',
    primary: '#C2410C',
    primaryText: '#FFFFFF',
    primarySoft: '#FDEBDD',
    /** Bright logo orange, for progress bars and highlights (not text). */
    brand: '#E4501A',
    /** The navy band at the top of screens, like the PDF header. */
    band: '#13294B',
    bandText: '#FFFFFF',
    bandMuted: '#B9C6DB',
    /** Text on a solid green, red or orange answer. */
    onStatus: '#FFFFFF',
    low: '#8A5A00',
    lowSoft: '#FDF3C8',
    out: '#C62828',
    outSoft: '#FBE4E4',
    ok: '#1E7D45',
    okSoft: '#DFF3E7',
  },
  dark: {
    text: '#F3F6FB',
    textSecondary: '#93A3C0',
    background: '#0B1730',
    card: '#13254A',
    border: '#22365E',
    field: '#1A2E57',
    primary: '#FF7A2E',
    primaryText: '#0B1730',
    primarySoft: '#3A2A2C',
    brand: '#FF7A2E',
    band: '#132A52',
    bandText: '#F3F6FB',
    bandMuted: '#93A3C0',
    onStatus: '#0B1730',
    low: '#F2C94C',
    lowSoft: '#3A3622',
    out: '#FF6B5E',
    outSoft: '#3D2232',
    ok: '#3DD68C',
    okSoft: '#163E42',
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
