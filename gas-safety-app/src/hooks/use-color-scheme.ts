import { useSyncExternalStore } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type Appearance = 'system' | 'light' | 'dark';

// The Appearance setting (Settings tab) can pin light or dark; otherwise the phone's setting is used.
let override: 'light' | 'dark' | null = null;
const listeners = new Set<() => void>();

export function setAppearance(appearance: Appearance) {
  const next = appearance === 'system' ? null : appearance;
  if (next === override) return;
  override = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useColorScheme(): 'light' | 'dark' {
  const system = useSystemColorScheme();
  const pinned = useSyncExternalStore(subscribe, () => override, () => override);
  return pinned ?? (system === 'dark' ? 'dark' : 'light');
}
