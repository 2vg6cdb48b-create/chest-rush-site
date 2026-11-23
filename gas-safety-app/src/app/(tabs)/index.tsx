import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApplianceIcon } from '@/components/appliance-icon';
import { Button, EmptyState, SearchField } from '@/components/controls';
import { Icon } from '@/components/icon';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/constants/theme';
import { useDueSummary } from '@/lib/due';
import {
  defectSummary,
  formatAddress,
  formatLongDate,
  recordHasFault,
  sectionStatus,
  todayIso,
} from '@/lib/records';
import { useStore } from '@/lib/store';
import type { GasRecord } from '@/lib/types';

type Filter = 'all' | 'draft' | 'issued';

function matches(r: GasRecord, q: string) {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  return [r.number, formatAddress(r.property), r.landlordName, r.tenantName]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

function greeting(hour: number) {
  return hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
}

export default function RecordsScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { records, loaded, createRecord, addExample, engineer } = useStore();
  const { needsAttention } = useDueSummary();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [now] = useState(() => new Date());

  const year = todayIso().slice(0, 4);
  const drafts = records.filter((r) => r.status === 'draft').length;
  const issuedThisYear = records.filter((r) => r.status === 'issued' && r.checkDate.startsWith(year)).length;

  const visible = useMemo(
    () =>
      records
        .filter((r) => matches(r, query))
        .filter((r) => (filter === 'all' ? true : r.status === filter))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [records, query, filter],
  );

  const open = (id: string) => router.push({ pathname: '/record/[id]', params: { id } });
  const create = () => open(createRecord());
  const firstName = engineer.name.trim().split(/\s+/)[0];
  const setupNeeded = loaded && (!engineer.name.trim() || !engineer.gasSafeNumber.trim());
  const backupDue =
    loaded &&
    records.some((r) => r.status === 'issued') &&
    (!engineer.lastBackupAt || now.getTime() - engineer.lastBackupAt > 30 * 86400000);
  const top = Platform.OS === 'web' ? 0 : insets.top;

  const header = (
    <>
      <View style={[styles.band, { backgroundColor: c.band, paddingTop: top + Spacing.md }]}>
        <View style={styles.inner}>
          <View style={styles.brandRow}>
            <Image source={require('@/assets/images/icon.png')} style={styles.logo} accessibilityIgnoresInvertColors />
            <View style={{ flex: 1 }}>
              <Text style={[styles.brandName, { color: c.bandText }]}>NG Gas Records</Text>
              <Text style={[styles.brandSub, { color: c.bandMuted }]} numberOfLines={1}>
                {engineer.companyName.trim() || 'NG Plumbing & Heating'}
              </Text>
            </View>
          </View>
          <Text style={[styles.hello, { color: c.bandText }]} accessibilityRole="header">
            {firstName ? `${greeting(now.getHours())}, ${firstName}` : 'Gas safety records'}
          </Text>
          <Text style={[styles.helloSub, { color: c.bandMuted }]}>
            {!loaded
              ? ' '
              : needsAttention
                ? `${needsAttention} check${needsAttention === 1 ? '' : 's'} to book soon`
                : drafts
                  ? `${drafts} draft${drafts === 1 ? '' : 's'} on the go`
                  : 'All caught up'}
          </Text>
        </View>
      </View>

      <View style={[styles.inner, styles.tiles]}>
        <StatTile
          value={drafts}
          label="Drafts"
          icon={{ ios: 'pencil', md: 'edit' }}
          color={c.brand}
          active={filter === 'draft'}
          onPress={() => setFilter(filter === 'draft' ? 'all' : 'draft')}
        />
        <StatTile
          value={needsAttention}
          label="Due soon"
          icon={{ ios: 'calendar', md: 'event' }}
          color={c.low}
          onPress={() => router.navigate('/due')}
        />
        <StatTile
          value={issuedThisYear}
          label={`Issued ${year}`}
          icon={{ ios: 'checkmark', md: 'check' }}
          color={c.ok}
          active={filter === 'issued'}
          onPress={() => setFilter(filter === 'issued' ? 'all' : 'issued')}
        />
      </View>

      <View style={[styles.inner, styles.searchRow]}>
        <View style={{ flex: 1 }}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Search address, landlord…" />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New record"
          onPress={create}
          style={({ pressed }) => [styles.newButton, { backgroundColor: c.primary, opacity: pressed ? 0.8 : 1 }]}>
          <Icon ios="plus" md="add" size={24} color={c.primaryText} />
        </Pressable>
      </View>

      <View style={[styles.inner, { gap: Spacing.sm }]}>
        {setupNeeded && (
          <Banner
            icon={{ ios: 'person.badge.key', md: 'badge' }}
            text="Add your name and Gas Safe number in Settings. They go on every record."
          />
        )}
        {backupDue && (
          <Banner
            icon={{ ios: 'externaldrive.badge.exclamationmark', md: 'backup' }}
            text={
              engineer.lastBackupAt
                ? `Last backup ${new Date(engineer.lastBackupAt).toLocaleDateString('en-GB')}. Records only live on this phone, so back up regularly.`
                : 'Your records only live on this phone. Back them up to iCloud Drive or Files in Settings.'
            }
          />
        )}
      </View>

      {records.length > 0 && (
        <View style={[styles.inner, styles.listHead]}>
          <Text style={[styles.listLabel, { color: c.textSecondary }]}>
            {filter === 'draft' ? 'DRAFTS' : filter === 'issued' ? 'ISSUED' : 'RECENT RECORDS'}
          </Text>
          {filter !== 'all' && (
            <Pressable onPress={() => setFilter('all')} hitSlop={8}>
              <Text style={{ color: c.primary, fontWeight: '600', fontSize: 14 }}>Show all</Text>
            </Pressable>
          )}
        </View>
      )}
    </>
  );

  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      data={visible}
      keyExtractor={(r) => r.id}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      // The navy band runs up under the status bar, so iOS shouldn't add its own top gap.
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <View style={styles.inner}>
          <RecordCard record={item} onPress={() => open(item.id)} />
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      ListEmptyComponent={
        !loaded ? undefined : records.length === 0 ? (
          <View style={styles.inner}>
            <EmptyState
              icon={{ ios: 'doc.badge.plus', md: 'note_add' }}
              title="No records yet"
              message="Create a landlord gas safety record (CP12) for each property you check. It's saved on your phone and shared as a PDF.">
              <View style={{ alignSelf: 'stretch', gap: Spacing.sm }}>
                <Button label="New record" icon={{ ios: 'plus', md: 'add' }} onPress={create} />
                <Button label="Look at an example record" variant="plain" onPress={() => open(addExample())} />
              </View>
            </EmptyState>
          </View>
        ) : (
          <View style={styles.inner}>
            <EmptyState icon={{ ios: 'magnifyingglass', md: 'search' }} title="No matches" message="Nothing matches that search." />
          </View>
        )
      }
    />
  );
}

type IconPair = { ios: Parameters<typeof Icon>[0]['ios']; md: Parameters<typeof Icon>[0]['md'] };

function StatTile({
  value,
  label,
  icon,
  color,
  active,
  onPress,
}: {
  value: number;
  label: string;
  icon: IconPair;
  color: string;
  active?: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: c.card,
          borderColor: active ? color : c.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      <Icon {...icon} size={18} color={color} />
      <Text style={[styles.tileValue, { color: c.text }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: c.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function Banner({ icon, text }: { icon: IconPair; text: string }) {
  const c = useTheme();
  return (
    <Pressable onPress={() => router.navigate('/settings')} style={[styles.banner, { backgroundColor: c.lowSoft }]}>
      <Icon {...icon} size={22} color={c.low} />
      <Text style={[styles.bannerText, { color: c.text }]}>{text}</Text>
      <Icon ios="chevron.right" md="chevron_right" size={14} color={c.textSecondary} />
    </Pressable>
  );
}

function RecordCard({ record: r, onPress }: { record: GasRecord; onPress: () => void }) {
  const c = useTheme();
  const fault = recordHasFault(r);
  const [label, color] = fault ? ['Defects', c.out] : r.status === 'issued' ? ['Issued', c.ok] : ['Draft', c.brand];
  const done = sectionStatus(r).filter((s) => s.done).length;
  const detail = fault
    ? defectSummary(r)
    : r.status === 'issued'
      ? `Next due ${formatLongDate(r.nextDueDate)}`
      : `${done} of 6 sections done`;
  const sub = [r.property.postcode, r.landlordName].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.strip, { backgroundColor: color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>
            {r.property.line1.trim() || 'New record (no address yet)'}
          </Text>
          <View style={[styles.pill, { backgroundColor: c.background }]}>
            <Text style={[styles.pillText, { color }]}>{label}</Text>
          </View>
        </View>
        {!!sub && (
          <Text style={[styles.cardSub, { color: c.textSecondary }]} numberOfLines={1}>
            {sub}
          </Text>
        )}
        <View style={styles.cardFoot}>
          {r.appliances.slice(0, 4).map((a) => (
            <ApplianceIcon key={a.id} type={a.type} color={c.text} background={c.field} />
          ))}
          <Text style={[styles.cardDetail, { color: fault ? c.out : c.textSecondary }]} numberOfLines={1}>
            {detail}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.lg },
  band: { paddingBottom: 58, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  logo: { width: 44, height: 44, borderRadius: 11 },
  brandName: { fontSize: 19, fontWeight: '800' },
  brandSub: { fontSize: 13 },
  hello: { fontSize: 27, fontWeight: '800', marginTop: Spacing.lg, letterSpacing: -0.3 },
  helloSub: { fontSize: 15, marginTop: 2 },
  tiles: { flexDirection: 'row', gap: Spacing.sm, marginTop: -42 },
  tile: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    gap: 2,
    shadowColor: '#0B1730',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  tileValue: { fontSize: 26, fontWeight: '800', marginTop: 2, fontVariant: ['tabular-nums'] },
  tileLabel: { fontSize: 12.5 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  newButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.md },
  bannerText: { flex: 1, fontSize: 15, lineHeight: 21 },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.sm },
  listLabel: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.8 },
  card: { flexDirection: 'row', borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  strip: { width: 6 },
  cardBody: { flex: 1, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, gap: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: '700' },
  pill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontSize: 12, fontWeight: '700' },
  cardSub: { fontSize: 14 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm },
  cardDetail: { flex: 1, fontSize: 13, marginLeft: 4 },
});
