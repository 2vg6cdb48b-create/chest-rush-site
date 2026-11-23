import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, EmptyState, SearchField } from '@/components/controls';
import { Icon } from '@/components/icon';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/constants/theme';
import {
  STATE_LABEL,
  daysOverdue,
  invoiceState,
  invoiceTotals,
  money,
  moneyShort,
  stateColor,
} from '@/lib/invoices';
import { formatAddress, formatLongDate, todayIso } from '@/lib/records';
import { useStore } from '@/lib/store';
import type { Invoice } from '@/lib/types';

type Filter = 'all' | 'unpaid' | 'overdue' | 'paid';

function matches(inv: Invoice, q: string) {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  return [inv.number, inv.customerName, formatAddress(inv.customerAddress), formatAddress(inv.jobAddress), inv.reference, ...inv.items.map((i) => i.description)]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

export default function InvoicesScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { invoices, loaded, createInvoice, engineer } = useStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const today = todayIso();
  const month = today.slice(0, 7);

  const summary = useMemo(() => {
    let unpaid = 0;
    let overdue = 0;
    let overdueCount = 0;
    let paidMonth = 0;
    for (const inv of invoices) {
      const s = invoiceState(inv, today);
      const { total } = invoiceTotals(inv);
      if (s === 'unpaid' || s === 'overdue') unpaid += total;
      if (s === 'overdue') {
        overdue += total;
        overdueCount++;
      }
      if (s === 'paid' && inv.paidAt && new Date(inv.paidAt).toISOString().slice(0, 7) === month) paidMonth += total;
    }
    return { unpaid, overdue, overdueCount, paidMonth };
  }, [invoices, today, month]);

  const visible = useMemo(
    () =>
      invoices
        .filter((inv) => matches(inv, query))
        .filter((inv) => {
          const s = invoiceState(inv, today);
          return filter === 'all' ? true : filter === 'unpaid' ? s === 'unpaid' || s === 'overdue' : s === filter;
        })
        .sort((a, b) => b.createdAt - a.createdAt),
    [invoices, query, filter, today],
  );

  const open = (id: string) => router.push({ pathname: '/invoice/[id]', params: { id } });
  const create = () => open(createInvoice());
  const top = Platform.OS === 'web' ? 0 : insets.top;
  const monthName = new Date(`${today}T12:00:00`).toLocaleDateString('en-GB', { month: 'short' });
  const toggle = (f: Filter) => setFilter(filter === f ? 'all' : f);

  const header = (
    <>
      <View style={[styles.band, { backgroundColor: c.band, paddingTop: top + Spacing.md }]}>
        <View style={styles.inner}>
          <View style={styles.brandRow}>
            <Image source={require('@/assets/images/icon.png')} style={styles.logo} accessibilityIgnoresInvertColors />
            <View style={{ flex: 1 }}>
              <Text style={[styles.brandName, { color: c.bandText }]} accessibilityRole="header">
                Invoices
              </Text>
              <Text style={[styles.brandSub, { color: c.bandMuted }]} numberOfLines={1}>
                {engineer.companyName.trim() || 'NG Plumbing & Heating'}
              </Text>
            </View>
          </View>
          <Text style={[styles.owed, { color: c.bandText }]}>
            {!loaded ? ' ' : summary.unpaid > 0 ? `${money(summary.unpaid)} owed to you` : 'Nothing owed to you'}
          </Text>
          <Text style={[styles.owedSub, { color: c.bandMuted }]}>
            {summary.overdueCount
              ? `${summary.overdueCount} invoice${summary.overdueCount === 1 ? '' : 's'} overdue`
              : invoices.length
                ? 'Nothing overdue'
                : 'Invoice any job, not just gas safety records'}
          </Text>
        </View>
      </View>

      <View style={[styles.inner, styles.tiles]}>
        <Tile value={moneyShort(summary.unpaid)} label="Unpaid" icon={{ ios: 'clock', md: 'schedule' }} color={c.brand} active={filter === 'unpaid'} onPress={() => toggle('unpaid')} />
        <Tile value={moneyShort(summary.overdue)} label="Overdue" icon={{ ios: 'exclamationmark.triangle', md: 'warning' }} color={c.out} active={filter === 'overdue'} onPress={() => toggle('overdue')} />
        <Tile value={moneyShort(summary.paidMonth)} label={`Paid ${monthName}`} icon={{ ios: 'checkmark', md: 'check' }} color={c.ok} active={filter === 'paid'} onPress={() => toggle('paid')} />
      </View>

      <View style={[styles.inner, styles.searchRow]}>
        <View style={{ flex: 1 }}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Search customer, invoice no…" />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New invoice"
          onPress={create}
          style={({ pressed }) => [styles.newButton, { backgroundColor: c.primary, opacity: pressed ? 0.8 : 1 }]}>
          <Icon ios="plus" md="add" size={24} color={c.primaryText} />
        </Pressable>
      </View>

      {invoices.length > 0 && (
        <View style={[styles.inner, styles.listHead]}>
          <Text style={[styles.listLabel, { color: c.textSecondary }]}>
            {{ all: 'RECENT INVOICES', unpaid: 'UNPAID', overdue: 'OVERDUE', paid: 'PAID' }[filter]}
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
      keyExtractor={(i) => i.id}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <View style={styles.inner}>
          <InvoiceCard invoice={item} today={today} onPress={() => open(item.id)} />
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      ListEmptyComponent={
        !loaded ? undefined : invoices.length === 0 ? (
          <View style={styles.inner}>
            <EmptyState
              icon={{ ios: 'sterlingsign.circle', md: 'receipt_long' }}
              title="No invoices yet"
              message="Invoice any job: services, repairs, installs or gas safety records. You can also invoice a finished gas safety record straight from the record.">
              <Button label="New invoice" icon={{ ios: 'plus', md: 'add' }} onPress={create} style={{ alignSelf: 'stretch' }} />
            </EmptyState>
          </View>
        ) : (
          <View style={styles.inner}>
            <EmptyState icon={{ ios: 'magnifyingglass', md: 'search' }} title="No matches" message="No invoices match." />
          </View>
        )
      }
    />
  );
}

type IconPair = { ios: Parameters<typeof Icon>[0]['ios']; md: Parameters<typeof Icon>[0]['md'] };

function Tile({
  value,
  label,
  icon,
  color,
  active,
  onPress,
}: {
  value: string;
  label: string;
  icon: IconPair;
  color: string;
  active: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: c.card, borderColor: active ? color : c.border, opacity: pressed ? 0.8 : 1 },
      ]}>
      <Icon {...icon} size={18} color={color} />
      <Text style={[styles.tileValue, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.tileLabel, { color: c.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function InvoiceCard({ invoice: inv, today, onPress }: { invoice: Invoice; today: string; onPress: () => void }) {
  const c = useTheme();
  const s = invoiceState(inv, today);
  const color = stateColor(c, s);
  const { total } = invoiceTotals(inv);
  const where = inv.jobAddress.line1.trim() || inv.customerAddress.line1.trim();
  const what = inv.items.find((i) => i.description.trim())?.description.trim();
  const extra = inv.items.filter((i) => i.description.trim()).length - 1;
  const sub = [where, what && `${what}${extra > 0 ? ` + ${extra} more` : ''}`].filter(Boolean).join(' · ');
  const days = daysOverdue(inv, today);
  const detail =
    s === 'paid'
      ? `Paid ${inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}`
      : s === 'overdue'
        ? `${days} day${days === 1 ? '' : 's'} overdue`
        : s === 'unpaid'
          ? `Due ${formatLongDate(inv.dueDate)}`
          : 'Not sent yet';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.strip, { backgroundColor: color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>
            {inv.customerName.trim() || 'New invoice (no customer yet)'}
          </Text>
          <Text style={[styles.cardAmount, { color: c.text }]}>{money(total)}</Text>
        </View>
        {!!sub && (
          <Text style={[styles.cardSub, { color: c.textSecondary }]} numberOfLines={1}>
            {sub}
          </Text>
        )}
        <View style={styles.cardFoot}>
          <Text style={[styles.cardDetail, { color: s === 'overdue' ? c.out : c.textSecondary }]} numberOfLines={1}>
            {inv.number} · {detail}
          </Text>
          <View style={[styles.pill, { backgroundColor: c.background }]}>
            <Text style={[styles.pillText, { color }]}>{STATE_LABEL[s]}</Text>
          </View>
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
  owed: { fontSize: 27, fontWeight: '800', marginTop: Spacing.lg, letterSpacing: -0.3 },
  owedSub: { fontSize: 15, marginTop: 2 },
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
  tileValue: { fontSize: 20, fontWeight: '800', marginTop: 2, fontVariant: ['tabular-nums'] },
  tileLabel: { fontSize: 12.5 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  newButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.sm },
  listLabel: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.8 },
  card: { flexDirection: 'row', borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  strip: { width: 6 },
  cardBody: { flex: 1, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, gap: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: '700' },
  cardAmount: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  cardSub: { fontSize: 14 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm },
  cardDetail: { flex: 1, fontSize: 13 },
  pill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontSize: 12, fontWeight: '700' },
});
