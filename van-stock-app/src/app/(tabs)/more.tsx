import Constants from 'expo-constants';
import type { ComponentProps } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, SectionLabel } from '@/components/controls';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { MaxContentWidth, Spacing, useTheme } from '@/constants/theme';
import { PRIVACY_URL, SUPPORT_URL } from '@/constants/links';
import { pickTextFile, shareTextFile } from '@/lib/files';
import { parseStockData, toCsv } from '@/lib/stock';
import { useStock } from '@/lib/store';
import { confirm, notify, success } from '@/lib/ui';

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function MoreScreen() {
  const c = useTheme();
  const stock = useStock();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const exportCsv = async () => {
    if (stock.items.length === 0) {
      notify('Nothing to export', 'Add some items first.');
      return;
    }
    try {
      await shareTextFile(`van-stock-${today()}.csv`, toCsv(stock.items), 'text/csv');
    } catch (e) {
      notify('Could not export', e instanceof Error ? e.message : String(e));
    }
  };

  const backup = async () => {
    try {
      await shareTextFile(
        `van-stock-backup-${today()}.json`,
        JSON.stringify({ ...stock.data, exportedAt: new Date().toISOString() }, null, 1),
        'application/json',
      );
    } catch (e) {
      notify('Could not back up', e instanceof Error ? e.message : String(e));
    }
  };

  const restore = async () => {
    try {
      const text = await pickTextFile();
      if (text === null) return;
      const data = parseStockData(JSON.parse(text));
      const ok = await confirm(
        'Restore backup?',
        `This replaces everything currently in the app with the ${data.items.length} item${data.items.length === 1 ? '' : 's'} in the backup.`,
        'Restore',
        true,
      );
      if (!ok) return;
      stock.replaceAll(data);
      success();
      notify('Backup restored', `${data.items.length} items loaded.`);
    } catch (e) {
      notify(
        'Could not restore',
        e instanceof SyntaxError ? 'That file is not a Van Stock backup.' : e instanceof Error ? e.message : String(e),
      );
    }
  };

  const clearHistory = async () => {
    if (await confirm('Clear history?', 'Your stock levels stay as they are. Only the history log is cleared.', 'Clear', true)) {
      stock.clearHistory();
    }
  };

  const deleteAll = async () => {
    if (
      await confirm(
        'Delete everything?',
        'All items and history will be removed from this phone. Make a backup first if you might want them back.',
        'Delete all',
        true,
      )
    ) {
      stock.clearAll();
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScreenHeader title="More" />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <SectionLabel>Share & back up</SectionLabel>
        <Card style={styles.group}>
          <Row
            icon={{ ios: 'tablecells', md: 'table_view' }}
            title="Export stock list"
            detail="Spreadsheet (CSV) for Excel, Numbers or email"
            onPress={exportCsv}
          />
          <Row
            icon={{ ios: 'externaldrive.badge.icloud', md: 'backup' }}
            title="Back up"
            detail="Save a backup file to Files, iCloud Drive or email"
            onPress={backup}
          />
          <Row
            icon={{ ios: 'arrow.clockwise.icloud', md: 'restore' }}
            title="Restore from backup"
            detail="Load a backup file, e.g. on a new phone"
            onPress={restore}
            last
          />
        </Card>

        <SectionLabel>Data</SectionLabel>
        <Card style={styles.group}>
          <Row
            icon={{ ios: 'wand.and.stars', md: 'auto_awesome' }}
            title="Add example items"
            detail="A few sample parts to try the app with"
            onPress={() => {
              stock.addSamples();
              success();
            }}
          />
          <Row
            icon={{ ios: 'clock.badge.xmark', md: 'history_toggle_off' }}
            title="Clear history"
            onPress={clearHistory}
          />
          <Row
            icon={{ ios: 'trash', md: 'delete' }}
            title="Delete everything"
            danger
            onPress={deleteAll}
            last
          />
        </Card>

        <SectionLabel>About</SectionLabel>
        <Card style={styles.group}>
          <Row
            icon={{ ios: 'questionmark.circle', md: 'help' }}
            title="Help & support"
            onPress={() => Linking.openURL(SUPPORT_URL)}
          />
          <Row
            icon={{ ios: 'hand.raised', md: 'privacy_tip' }}
            title="Privacy policy"
            onPress={() => Linking.openURL(PRIVACY_URL)}
            last
          />
        </Card>
        <Text style={[styles.footer, { color: c.textSecondary }]}>
          Van Stock {version}
          {'\n'}Your stock is saved only on this phone. Nothing is sent anywhere.
          {'\n'}{stock.items.length} items · {stock.movements.length} history entries
        </Text>
      </ScrollView>
    </View>
  );
}

function Row({
  icon,
  title,
  detail,
  onPress,
  danger,
  last,
}: {
  icon: Pick<ComponentProps<typeof Icon>, 'ios' | 'md'>;
  title: string;
  detail?: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const c = useTheme();
  const color = danger ? c.out : c.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
        { opacity: pressed ? 0.5 : 1 },
      ]}>
      <Icon {...icon} size={22} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: danger ? c.out : c.text }]}>{title}</Text>
        {!!detail && <Text style={[styles.rowDetail, { color: c.textSecondary }]}>{detail}</Text>}
      </View>
      <Icon ios="chevron.right" md="chevron_right" size={14} color={c.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  group: { paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 14 },
  rowTitle: { fontSize: 17 },
  rowDetail: { fontSize: 13, marginTop: 2 },
  footer: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: Spacing.xl },
});
