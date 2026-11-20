import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';

import { Spacing, useTheme } from '@/constants/theme';
import { useDueSummary } from '@/lib/due';


import { Icon } from './icon';

type TabDef = { name: string; href: '/' | '/due' | '/settings'; label: string; md: ComponentProps<typeof Icon>['md'] };

const TABS: TabDef[] = [
  { name: 'index', href: '/', label: 'Records', md: 'description' },
  { name: 'due', href: '/due', label: 'Due', md: 'event' },
  { name: 'settings', href: '/settings', label: 'Settings', md: 'settings' },
];

/** Bottom tab bar for the browser preview. On iPhone the native tab bar in app-tabs.tsx is used. */
export default function AppTabs() {
  const c = useTheme();
  const { needsAttention } = useDueSummary();
  return (
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList style={[styles.bar, { backgroundColor: c.card, borderTopColor: c.border }]}>
        {TABS.map((t) => (
          <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
            <TabButton label={t.label} md={t.md} badge={t.name === 'due' ? needsAttention : 0} />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

function TabButton({
  label,
  md,
  badge,
  isFocused,
  ...props
}: TabTriggerSlotProps & { label: string; md: TabDef['md']; badge: number }) {
  const c = useTheme();
  const color = isFocused ? c.primary : c.textSecondary;
  return (
    <Pressable {...(props as PressableProps)} style={styles.tab}>
      <View>
        <Icon ios="circle" md={md} size={24} color={color} />
        {badge > 0 && (
          <View style={[styles.badge, { backgroundColor: c.out }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  label: { fontSize: 11, fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
