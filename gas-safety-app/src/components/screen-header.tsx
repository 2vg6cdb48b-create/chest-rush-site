import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing, useTheme } from '@/constants/theme';

/** The navy band at the top of each tab, matching the header on the PDF. */
export function ScreenHeader({
  title,
  subtitle,
  right,
  children,
  extraBottom = 0,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
  /** Extra navy below the content, for cards that overlap the band. */
  extraBottom?: number;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  // On the web the page itself is already padded clear of the phone's status bar.
  const top = Platform.OS === 'web' ? 0 : insets.top;
  return (
    <View
      style={[
        styles.band,
        { backgroundColor: c.band, paddingTop: top + Spacing.md, paddingBottom: Spacing.lg + extraBottom },
      ]}>
      <View style={styles.inner}>
        <View style={styles.row}>
          <View style={styles.titles}>
            <Text style={[styles.title, { color: c.bandText }]} accessibilityRole="header">
              {title}
            </Text>
            {!!subtitle && <Text style={[styles.subtitle, { color: c.bandMuted }]}>{subtitle}</Text>}
          </View>
          {right && <View style={styles.right}>{right}</View>}
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  titles: { flex: 1 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 2 },
  right: { flexDirection: 'row', gap: Spacing.sm },
});
