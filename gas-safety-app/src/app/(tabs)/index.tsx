import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Chips, EmptyState, IconButton, SearchField } from '@/components/controls';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/constants/theme';
import { formatAddress, formatLongDate, recordHasFault } from '@/lib/records';
import { useStore } from '@/lib/store';
import type { GasRecord } from '@/lib/types';

type Filter = 'all' | 'draft' | 'issued' | 'defects';

function matches(r: GasRecord, q: string) {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  return [r.number, formatAddress(r.property), r.landlordName, r.tenantName]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

export default function RecordsScreen() {
  const c = useTheme();
  const { records, loaded, createRecord, addExample, engineer } = useStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(
    () =>
      records
        .filter((r) => matches(r, query))
        .filter((r) =>
          filter === 'all'
            ? true
            : filter === 'defects'
              ? recordHasFault(r)
              : r.status === filter,
        )
        .sort((a, b) => (b.checkDate + b.createdAt).localeCompare(a.checkDate + a.createdAt)),
    [records, query, filter],
  );

  const drafts = records.filter((r) => r.status === 'draft').length;
  const open = (id: string) => router.push({ pathname: '/record/[id]', params: { id } });
  const create = () => open(createRecord());
  const setupNeeded = loaded && (!engineer.name.trim() || !engineer.gasSafeNumber.trim());

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScreenHeader
        title="Records"
        subtitle={
          !loaded
            ? ' '
            : records.length === 0
              ? 'Landlord gas safety records'
              : `${records.length} record${records.length === 1 ? '' : 's'}${drafts ? ` · ${drafts} draft${drafts === 1 ? '' : 's'}` : ''}`
        }
        right={<IconButton label="New record" filled icon={{ ios: 'plus', md: 'add' }} onPress={create} />}>
        {records.length > 0 && (
          <>
            <SearchField value={query} onChangeText={setQuery} placeholder="Search address, landlord, record no." />
            <Chips
              options={[
                { key: 'all', label: 'All' },
                { key: 'draft', label: 'Drafts' },
                { key: 'issued', label: 'Issued' },
                { key: 'defects', label: 'With defects' },
              ]}
              value={filter}
              onChange={(k) => setFilter(k as Filter)}
            />
          </>
        )}
      </ScreenHeader>
      <FlatList
        data={visible}
        keyExtractor={(r) => r.id}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          setupNeeded ? (
            <Pressable
              onPress={() => router.navigate('/settings')}
              style={[styles.setup, { backgroundColor: c.lowSoft }]}>
              <Icon ios="person.badge.key" md="badge" size={22} color={c.low} />
              <Text style={[styles.setupText, { color: c.text }]}>
                Add your name and Gas Safe number in Settings. They go on every record.
              </Text>
              <Icon ios="chevron.right" md="chevron_right" size={14} color={c.textSecondary} />
            </Pressable>
          ) : undefined
        }
        renderItem={({ item }) => <RecordRow record={item} onPress={() => open(item.id)} />}
        ListEmptyComponent={
          !loaded ? undefined : records.length === 0 ? (
            <EmptyState
              icon={{ ios: 'doc.badge.plus', md: 'note_add' }}
              title="No records yet"
              message="Create a landlord gas safety record (CP12) for each property you check. It's saved on your phone and shared as a PDF.">
              <View style={{ alignSelf: 'stretch', gap: Spacing.sm }}>
                <Button label="New record" icon={{ ios: 'plus', md: 'add' }} onPress={create} />
                <Button label="Look at an example record" variant="plain" onPress={() => open(addExample())} />
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
    </View>
  );
}

function RecordRow({ record: r, onPress }: { record: GasRecord; onPress: () => void }) {
  const c = useTheme();
  const fault = recordHasFault(r);
  const title = r.property.line1.trim() || 'New record (no address yet)';
  const sub = [r.property.postcode, r.landlordName].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.6 : 1 },
      ]}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>
          {title}
        </Text>
        {!!sub && (
          <Text style={[styles.rowSub, { color: c.textSecondary }]} numberOfLines={1}>
            {sub}
          </Text>
        )}
        <View style={styles.badges}>
          <Badge label={r.status === 'issued' ? 'Issued' : 'Draft'} tone={r.status === 'issued' ? 'good' : 'info'} />
          {fault && <Badge label="Defects" tone="bad" />}
          <Text style={[styles.rowMeta, { color: c.textSecondary }]}>
            {r.number} · {formatLongDate(r.checkDate)}
          </Text>
        </View>
      </View>
      <Icon ios="chevron.right" md="chevron_right" size={14} color={c.textSecondary} />
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
    gap: Spacing.sm,
  },
  setup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  setupText: { flex: 1, fontSize: 15, lineHeight: 21 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
  },
  rowTitle: { fontSize: 17, fontWeight: '600' },
  rowSub: { fontSize: 14 },
  rowMeta: { fontSize: 13 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap', marginTop: 2 },
});
