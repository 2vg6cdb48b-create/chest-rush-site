import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { Chips, EmptyState } from '@/components/controls';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/constants/theme';
import { describeMovement, groupByDay, timeOfDay } from '@/lib/history';
import { formatQty } from '@/lib/stock';
import { useStock } from '@/lib/store';
import type { Movement } from '@/lib/types';

type Filter = 'all' | 'used' | 'in';

export default function HistoryScreen() {
  const c = useTheme();
  const { movements, getItem, loaded } = useStock();
  const [filter, setFilter] = useState<Filter>('all');

  const sections = useMemo(() => {
    const list = movements.filter((m) =>
      filter === 'all'
        ? true
        : filter === 'used'
          ? m.reason === 'used'
          : m.reason === 'added' || m.reason === 'restocked',
    );
    return groupByDay(list);
  }, [movements, filter]);

  // Totals used today, for a quick end-of-day summary.
  const usedToday = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const totals = new Map<string, { name: string; unit: string; qty: number }>();
    for (const m of movements) {
      if (m.at < start.getTime()) break;
      if (m.reason !== 'used') continue;
      const t = totals.get(m.itemId) ?? { name: m.itemName, unit: m.unit, qty: 0 };
      t.qty += Math.abs(m.change);
      totals.set(m.itemId, t);
    }
    return [...totals.values()].sort((a, b) => b.qty - a.qty);
  }, [movements]);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScreenHeader title="History" subtitle="Every change to your van stock">
        {movements.length > 0 && (
          <Chips
            options={[
              { key: 'all', label: 'All' },
              { key: 'used', label: 'Used' },
              { key: 'in', label: 'Added & restocked' },
            ]}
            value={filter}
            onChange={(k) => setFilter(k as Filter)}
          />
        )}
      </ScreenHeader>
      <SectionList
        sections={sections}
        keyExtractor={(m) => m.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          usedToday.length > 0 && filter !== 'in' ? (
            <View style={[styles.summary, { backgroundColor: c.primarySoft }]}>
              <Text style={[styles.summaryTitle, { color: c.primary }]}>Used today</Text>
              <Text style={[styles.summaryText, { color: c.text }]}>
                {usedToday
                  .slice(0, 6)
                  .map((t) => `${formatQty(t.qty, t.unit)} × ${t.name}`)
                  .join('\n')}
                {usedToday.length > 6 ? `\n+ ${usedToday.length - 6} more` : ''}
              </Text>
            </View>
          ) : undefined
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionHeader, { color: c.textSecondary }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <HistoryRow
            movement={item}
            exists={!!getItem(item.itemId)}
            onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.itemId } })}
          />
        )}
        ListEmptyComponent={
          loaded ? (
            <EmptyState
              icon={{ ios: 'clock', md: 'schedule' }}
              title="No history yet"
              message="Each time you use, add or restock something it's logged here, so you can see what went on each job."
            />
          ) : undefined
        }
      />
    </View>
  );
}

function HistoryRow({
  movement: m,
  exists,
  onPress,
}: {
  movement: Movement;
  exists: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  const down = m.change < 0 || m.reason === 'deleted';
  const icon =
    m.reason === 'used'
      ? ({ ios: 'minus.circle.fill', md: 'do_not_disturb_on' } as const)
      : m.reason === 'deleted'
        ? ({ ios: 'trash.circle.fill', md: 'delete' } as const)
        : m.reason === 'counted'
          ? ({ ios: 'pencil.circle.fill', md: 'edit' } as const)
          : ({ ios: 'plus.circle.fill', md: 'add_circle' } as const);
  return (
    <Pressable
      disabled={!exists}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.6 : 1 },
      ]}>
      <Icon {...icon} size={24} color={down ? c.low : c.ok} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowName, { color: c.text }]} numberOfLines={1}>
          {m.itemName}
        </Text>
        <Text style={[styles.rowText, { color: c.textSecondary }]}>{describeMovement(m)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.rowTime, { color: c.textSecondary }]}>{timeOfDay(m.at)}</Text>
        {m.reason !== 'deleted' && (
          <Text style={[styles.rowTime, { color: c.textSecondary }]}>
            now {formatQty(m.newQuantity, m.unit)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
    gap: Spacing.xs,
  },
  summary: { borderRadius: Radius.md, padding: Spacing.lg, gap: Spacing.xs, marginBottom: Spacing.sm },
  summaryTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  summaryText: { fontSize: 16, lineHeight: 23 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowName: { fontSize: 16, fontWeight: '600' },
  rowText: { fontSize: 14, marginTop: 1 },
  rowTime: { fontSize: 13, fontVariant: ['tabular-nums'] },
});
