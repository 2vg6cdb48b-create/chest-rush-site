import { router } from 'expo-router';
import { SectionList, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, EmptyState } from '@/components/controls';
import { ScreenHeader } from '@/components/screen-header';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/constants/theme';
import { dueLabel, useDueSummary, type DueItem } from '@/lib/due';
import { formatAddress, formatLongDate } from '@/lib/records';
import { useStore } from '@/lib/store';
import { shareText } from '@/lib/ui';

const TITLES: Record<DueItem['bucket'], string> = {
  overdue: 'Overdue',
  soon: 'Due within 30 days',
  upcoming: 'Due in 1–2 months',
  later: 'Later',
};

export default function DueScreen() {
  const c = useTheme();
  const { loaded, renewRecord, engineer } = useStore();
  const { list, needsAttention } = useDueSummary();

  const sections = (['overdue', 'soon', 'upcoming', 'later'] as const)
    .map((bucket) => ({ title: TITLES[bucket], bucket, data: list.filter((d) => d.bucket === bucket) }))
    .filter((s) => s.data.length > 0);

  const renew = (item: DueItem) => {
    if (item.renewalDraft) {
      router.push({ pathname: '/record/[id]', params: { id: item.renewalDraft.id } });
      return;
    }
    const id = renewRecord(item.record.id);
    if (id) router.push({ pathname: '/record/[id]', params: { id } });
  };

  const remind = (item: DueItem) => {
    const r = item.record;
    const greeting = r.landlordName.trim() ? `Hi ${r.landlordName.trim().split(' ')[0]},` : 'Hello,';
    const from = [engineer.name, engineer.companyName].filter(Boolean).join(', ');
    shareText(
      `${greeting}\n\nThe annual gas safety check for ${formatAddress(r.property)} is due by ${formatLongDate(r.nextDueDate)}. Let me know a good day to book it in.\n\nThanks${from ? `,\n${from}` : ''}`,
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScreenHeader
        title="Due"
        subtitle={
          !loaded
            ? ' '
            : list.length === 0
              ? 'Next checks for each property'
              : needsAttention
                ? `${needsAttention} need${needsAttention === 1 ? 's' : ''} booking soon`
                : 'Nothing due in the next 30 days'
        }
      />
      <SectionList
        sections={sections}
        keyExtractor={(d) => d.record.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text
            style={[
              styles.sectionHeader,
              { color: section.bucket === 'overdue' ? c.out : c.textSecondary },
            ]}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => <DueRow item={item} onRenew={() => renew(item)} onRemind={() => remind(item)} />}
        ListEmptyComponent={
          loaded ? (
            <EmptyState
              icon={{ ios: 'calendar', md: 'event' }}
              title="Nothing to show yet"
              message="Once you issue a record, the property appears here with the date its next check is due."
            />
          ) : undefined
        }
      />
    </View>
  );
}

function DueRow({ item, onRenew, onRemind }: { item: DueItem; onRenew: () => void; onRemind: () => void }) {
  const c = useTheme();
  const r = item.record;
  const tone = item.bucket === 'overdue' ? 'bad' : item.bucket === 'soon' ? 'warn' : 'info';
  return (
    <View style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={{ gap: 3 }}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
          {r.property.line1 || 'No address'}
        </Text>
        <Text style={[styles.sub, { color: c.textSecondary }]} numberOfLines={1}>
          {[r.property.postcode, r.landlordName].filter(Boolean).join(' · ')}
        </Text>
        <View style={styles.badges}>
          <Badge label={dueLabel(item.daysLeft)} tone={tone} />
          <Text style={[styles.sub, { color: c.textSecondary }]}>by {formatLongDate(r.nextDueDate)}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button
          label={item.renewalDraft ? 'Open draft' : 'Start next record'}
          compact
          icon={{ ios: 'arrow.clockwise', md: 'autorenew' }}
          onPress={onRenew}
        />
        <Button label="Remind landlord" compact variant="secondary" onPress={onRemind} />
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
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  row: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  title: { fontSize: 17, fontWeight: '600' },
  sub: { fontSize: 14 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap', marginTop: 2 },
  actions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
});
