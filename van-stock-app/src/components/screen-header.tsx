import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing, useTheme } from '@/constants/theme';

/** Large title header used at the top of each tab. */
export function ScreenHeader({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: c.background, paddingTop: insets.top + Spacing.sm }}>
      <View style={styles.inner}>
        <View style={styles.row}>
          <View style={styles.titles}>
            <Text style={[styles.title, { color: c.text }]} accessibilityRole="header">
              {title}
            </Text>
            {!!subtitle && (
              <Text style={[styles.subtitle, { color: c.textSecondary }]}>{subtitle}</Text>
            )}
          </View>
          {right && <View style={styles.right}>{right}</View>}
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  titles: { flex: 1 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 2 },
  right: { flexDirection: 'row', gap: Spacing.sm },
});
