import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, IconButton, StatusBadge, Stepper } from '@/components/controls';
import { ScreenHeader } from '@/components/screen-header';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/constants/theme';
import {
  compareItems,
  formatQty,
  needsRestock,
  restockText,
  statusOf,
  suggestedOrder,
} from '@/lib/stock';
import { useStock } from '@/lib/store';
import type { StockItem } from '@/lib/types';
import { notify, success } from '@/lib/ui';

export default function RestockScreen() {
  const c = useTheme();
  const { items, loaded, adjust, restock } = useStock();

  const list = useMemo(
    () =>
      items.filter(needsRestock).sort((a, b) => {
        // Out of stock first, then by name.
        const sa = statusOf(a) === 'out' ? 0 : 1;
        const sb = statusOf(b) === 'out' ? 0 : 1;
        return sa - sb || compareItems(a, b);
      }),
    [items],
  );

  const share = async () => {
    try {
      await Share.share({ message: restockText(list) });
    } catch {
      notify('Could not share', 'Sharing is not available here.');
    }
  };

  const outCount = list.filter((it) => statusOf(it) === 'out').length;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScreenHeader
        title="Restock"
        subtitle={
          !loaded
            ? ' '
            : list.length === 0
              ? 'Nothing needed'
              : `${list.length} to restock${outCount ? ` · ${outCount} run out` : ''}`
        }
        right={
          list.length > 0 ? (
            <IconButton
              label="Share restock list"
              icon={{ ios: 'square.and.arrow.up', md: 'share' }}
              onPress={share}
            />
          ) : undefined
        }
      />
      <FlatList
        data={list}
        keyExtractor={(it) => it.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          list.length > 0 ? (
            <Text style={[styles.intro, { color: c.textSecondary }]}>
              Share the list to send it to your merchant or the office. When you&apos;ve bought
              things, tap Restocked or use + to add them back.
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <RestockRow
            item={item}
            onAdjust={(d) => adjust(item.id, d)}
            onRestocked={() => {
              restock(item.id);
              success();
            }}
          />
        )}
        ListFooterComponent={
          list.length > 0 ? (
            <Button
              label="Share restock list"
              icon={{ ios: 'square.and.arrow.up', md: 'share' }}
              onPress={share}
              style={{ marginTop: Spacing.md }}
            />
          ) : undefined
        }
        ListEmptyComponent={
          loaded ? (
            <EmptyState
              icon={{ ios: 'checkmark.circle', md: 'check_circle' }}
              title={items.length ? 'Van is fully stocked' : 'Nothing to restock yet'}
              message={
                items.length
                  ? 'Items show up here when they drop to their restock level.'
                  : 'Add items on the Stock tab and set a restock level for each one.'
              }
            />
          ) : undefined
        }
      />
    </View>
  );
}

function RestockRow({
  item,
  onAdjust,
  onRestocked,
}: {
  item: StockItem;
  onAdjust: (delta: number) => void;
  onRestocked: () => void;
}) {
  const c = useTheme();
  const order = suggestedOrder(item);
  const detail =
    order !== null
      ? `Get ${formatQty(order, item.unit)} to fill up to ${formatQty(item.fullLevel, item.unit)}`
      : `Restock at ${formatQty(item.minLevel, item.unit)} · set a full amount to see how many to get`;
  return (
    <View style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.rowTop}>
        <Pressable
          style={({ pressed }) => [styles.rowMain, { opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}>
          <View style={styles.nameLine}>
            <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>
              {item.name}
            </Text>
            <StatusBadge status={statusOf(item)} />
          </View>
          {!!(item.partNumber || item.location) && (
            <Text style={[styles.meta, { color: c.textSecondary }]} numberOfLines={1}>
              {[item.partNumber, item.location].filter(Boolean).join(' · ')}
            </Text>
          )}
        </Pressable>
        <Stepper value={item.quantity} unit={item.unit} name={item.name} onChange={onAdjust} />
      </View>
      <View style={[styles.rowBottom, { borderTopColor: c.border }]}>
        <Text style={[styles.detail, { color: c.textSecondary }]}>{detail}</Text>
        {order !== null && order > 0 && (
          <Button
            label="Restocked"
            compact
            variant="secondary"
            icon={{ ios: 'checkmark', md: 'check' }}
            onPress={onRestocked}
          />
        )}
      </View>
    </View>
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
    gap: Spacing.sm,
  },
  intro: { fontSize: 15, lineHeight: 21, marginBottom: Spacing.sm },
  row: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowMain: { flex: 1, gap: 2 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  name: { fontSize: 17, fontWeight: '600', flexShrink: 1 },
  meta: { fontSize: 14 },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detail: { flex: 1, fontSize: 14, lineHeight: 19 },
});
