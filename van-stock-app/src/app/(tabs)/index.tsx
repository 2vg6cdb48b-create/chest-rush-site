import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { BarcodeScanner } from '@/components/barcode-scanner';
import {
  Button,
  Chips,
  EmptyState,
  IconButton,
  SearchField,
  StatusBadge,
  Stepper,
} from '@/components/controls';
import { ProductImage } from '@/components/product-image';
import { ScreenHeader } from '@/components/screen-header';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/constants/theme';
import { compareItems, locationsOf, matchesSearch, needsRestock, statusOf } from '@/lib/stock';
import { useStock } from '@/lib/store';
import type { StockItem } from '@/lib/types';

const ALL = '__all';
const LOW = '__low';

export default function StockScreen() {
  const c = useTheme();
  const { items, loaded, adjust, findByBarcode, addSamples } = useStock();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(ALL);
  const [scanning, setScanning] = useState(false);

  const locations = useMemo(() => locationsOf(items), [items]);
  const lowCount = useMemo(() => items.filter(needsRestock).length, [items]);
  const showImages = useMemo(() => items.some((it) => !!it.imageUrl), [items]);
  const activeFilter =
    filter === ALL || filter === LOW || locations.includes(filter) ? filter : ALL;

  const visible = useMemo(
    () =>
      items
        .filter((it) => matchesSearch(it, query))
        .filter((it) =>
          activeFilter === ALL
            ? true
            : activeFilter === LOW
              ? needsRestock(it)
              : it.location.trim() === activeFilter,
        )
        .sort(compareItems),
    [items, query, activeFilter],
  );

  const chipOptions = [
    { key: ALL, label: `All ${items.length}` },
    ...(lowCount > 0 ? [{ key: LOW, label: `Low ${lowCount}` }] : []),
    ...locations.map((loc) => ({ key: loc, label: loc })),
  ];

  const onScanned = (code: string) => {
    setScanning(false);
    const match = findByBarcode(code);
    if (match) {
      router.push({ pathname: '/item/[id]', params: { id: match.id } });
      return;
    }
    // Not in the van yet: open a new item, which looks the product up online.
    router.push({ pathname: '/item/[id]', params: { id: 'new', barcode: code } });
  };

  const subtitle = !loaded
    ? ' '
    : items.length === 0
      ? 'Nothing added yet'
      : `${items.length} item${items.length === 1 ? '' : 's'}${lowCount ? ` · ${lowCount} to restock` : ' · all stocked'}`;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScreenHeader
        title="Van Stock"
        subtitle={subtitle}
        right={
          <>
            <IconButton
              label="Scan a barcode"
              icon={{ ios: 'barcode.viewfinder', md: 'barcode_scanner' }}
              onPress={() => setScanning(true)}
            />
            <IconButton
              label="Add item"
              filled
              icon={{ ios: 'plus', md: 'add' }}
              onPress={() => router.push({ pathname: '/item/[id]', params: { id: 'new' } })}
            />
          </>
        }>
        {items.length > 0 && (
          <>
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder="Search name, part no, location"
            />
            {chipOptions.length > 1 && (
              <Chips options={chipOptions} value={activeFilter} onChange={setFilter} />
            )}
          </>
        )}
      </ScreenHeader>

      <FlatList
        data={visible}
        keyExtractor={(it) => it.id}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <StockRow item={item} showImage={showImages} onAdjust={(d) => adjust(item.id, d)} />
        )}
        ListEmptyComponent={
          !loaded ? undefined : items.length === 0 ? (
            <EmptyState
              icon={{ ios: 'shippingbox', md: 'inventory_2' }}
              title="Add your van stock"
              message="Tap + to add each part or material you carry. Then use − and + as you use and restock things.">
              <View style={styles.emptyButtons}>
                <Button
                  label="Add first item"
                  icon={{ ios: 'plus', md: 'add' }}
                  onPress={() => router.push({ pathname: '/item/[id]', params: { id: 'new' } })}
                />
                <Button label="Try with example items" variant="plain" onPress={addSamples} />
              </View>
            </EmptyState>
          ) : (
            <EmptyState
              icon={{ ios: 'magnifyingglass', md: 'search' }}
              title="No matches"
              message="Nothing matches that search or filter."
            />
          )
        }
      />

      <BarcodeScanner visible={scanning} onScanned={onScanned} onClose={() => setScanning(false)} />
    </View>
  );
}

function StockRow({
  item,
  showImage,
  onAdjust,
}: {
  item: StockItem;
  showImage: boolean;
  onAdjust: (delta: number) => void;
}) {
  const c = useTheme();
  const status = statusOf(item);
  const meta = [item.partNumber, item.location].filter(Boolean).join(' · ');
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: c.card,
          borderColor: status === 'out' ? c.out : status === 'low' ? c.low : c.border,
          borderWidth: status === 'ok' ? StyleSheet.hairlineWidth : 1.5,
        },
      ]}>
      <Pressable
        style={({ pressed }) => [styles.rowMain, { opacity: pressed ? 0.6 : 1 }]}
        accessibilityRole="button"
        accessibilityHint="Opens the item to edit it"
        onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}>
        {showImage && <ProductImage uri={item.imageUrl} size={44} />}
        <View style={styles.rowText}>
          <View style={styles.nameLine}>
            <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>
              {item.name}
            </Text>
            <StatusBadge status={status} />
          </View>
          {!!meta && (
            <Text style={[styles.meta, { color: c.textSecondary }]} numberOfLines={1}>
              {meta}
            </Text>
          )}
        </View>
      </Pressable>
      <Stepper value={item.quantity} unit={item.unit} name={item.name} onChange={onAdjust} />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.md,
    gap: Spacing.sm,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rowText: { flex: 1, gap: 2 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  name: { fontSize: 17, fontWeight: '600', flexShrink: 1 },
  meta: { fontSize: 14 },
  emptyButtons: { alignSelf: 'stretch', gap: Spacing.sm },
});
