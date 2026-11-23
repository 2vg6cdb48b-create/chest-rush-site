import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApplianceIcon } from '@/components/appliance-icon';
import { Button, Choice } from '@/components/controls';
import {
  AddressFields,
  CheckRow,
  DateField,
  Field,
  Input,
  Suggestions,
  TextField,
  formStyles,
} from '@/components/form';
import { Icon } from '@/components/icon';
import { SignatureField } from '@/components/signature';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/constants/theme';
import { recordHtml } from '@/lib/record-html';
import {
  applianceHasFault,
  applianceProblems,
  engineerDetailsOf,
  formatAddress,
  formatLongDate,
  installationHasFault,
  issueProblems,
  newAppliance,
  nextDueDate,
  recordHasFault,
  sectionStatus,
  type SectionKey,
} from '@/lib/records';
import { remindersAllowed, remindersSupported } from '@/lib/reminders';
import { shareRecordPdf } from '@/lib/share-record';
import { useStore } from '@/lib/store';
import type { Appliance, Classification, GasRecord } from '@/lib/types';
import { confirm, notify, success } from '@/lib/ui';

const CLASSIFICATIONS: { value: Classification; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'AR', label: 'At Risk' },
  { value: 'ID', label: 'Imm. Dangerous' },
];

type IconPair = { ios: Parameters<typeof Icon>[0]['ios']; md: Parameters<typeof Icon>[0]['md'] };

const SECTIONS: Record<SectionKey | 'notes', { title: string; icon: IconPair }> = {
  date: { title: 'Check date', icon: { ios: 'calendar', md: 'event' } },
  property: { title: 'Property', icon: { ios: 'house', md: 'home' } },
  landlord: { title: 'Landlord / agent', icon: { ios: 'person', md: 'person' } },
  appliances: { title: 'Appliances', icon: { ios: 'flame', md: 'local_fire_department' } },
  installation: { title: 'Installation checks', icon: { ios: 'gauge.with.dots.needle.33percent', md: 'speed' } },
  notes: { title: 'Notes', icon: { ios: 'note.text', md: 'notes' } },
  signatures: { title: 'Signatures', icon: { ios: 'signature', md: 'draw' } },
};

function pdfName(r: GasRecord) {
  const where = [r.property.line1, r.property.postcode].filter(Boolean).join(' ');
  return `Gas Safety Record ${r.number}${where ? ` - ${where}` : ''}.pdf`.replace(/[\\/:*?"<>|]/g, '-');
}

function readings(a: Appliance) {
  return [
    a.operatingPressure && `${a.operatingPressure} mbar`,
    a.heatInput && `${a.heatInput} kW`,
    a.ratioLow.trim() && `low ${a.ratioLow.trim()}`,
    a.ratioHigh.trim() && `high ${a.ratioHigh.trim()}`,
    a.flueType === 'FL' && 'flueless',
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function RecordScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useStore();
  const record = store.getRecord(id);
  const [showProblems, setShowProblems] = useState(false);
  const [sharing, setSharing] = useState(false);
  // Open the first part still to do; finished parts start folded away.
  const [open, setOpen] = useState<Set<string>>(() => {
    const first = record ? sectionStatus(record).find((s) => !s.done) : undefined;
    return new Set(first ? [first.key] : []);
  });

  const previousLandlords = useMemo(() => {
    const seen = new Map<string, GasRecord>();
    for (const r of [...store.records].sort((a, b) => b.updatedAt - a.updatedAt)) {
      const name = r.landlordName.trim();
      if (name && r.id !== id && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), r);
    }
    return [...seen.values()].slice(0, 8);
  }, [store.records, id]);

  if (!record) {
    return (
      <View style={[styles.missing, { backgroundColor: c.background }]}>
        <Text style={{ color: c.textSecondary, fontSize: 17 }}>This record has been deleted.</Text>
        <Button label="Back to records" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const r = record;
  const engineer = store.engineer;
  const patch = (p: Partial<GasRecord>) => store.updateRecord(r.id, (cur) => ({ ...cur, ...p }));
  const setDates = (checkDate: string, previousDueDate: string) =>
    patch({ checkDate, previousDueDate, nextDueDate: nextDueDate(checkDate, previousDueDate).date });
  const due = nextDueDate(r.checkDate, r.previousDueDate);
  const problems = issueProblems(r, engineer);
  const issued = r.status === 'issued';
  const who = r.landlordIsAgent ? 'Agent' : 'Landlord';
  const sections = sectionStatus(r);
  const doneCount = sections.filter((s) => s.done).length;
  const isDone = (k: SectionKey) => sections.find((s) => s.key === k)!.done;
  const toggle = (k: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  // `asIssued` lets the PDF made straight after issuing show as issued, before the screen updates.
  const share = async (asIssued = false) => {
    setSharing(true);
    try {
      const doc = asIssued
        ? { ...r, status: 'issued' as const, engineerDetails: engineerDetailsOf(engineer) }
        : r;
      await shareRecordPdf(recordHtml(doc, engineer), pdfName(doc));
    } catch (e) {
      notify('Could not create the PDF', e instanceof Error ? e.message : String(e));
    } finally {
      setSharing(false);
    }
  };

  const issue = async () => {
    if (problems.length) {
      setShowProblems(true);
      const firstTodo = sections.find((s) => !s.done);
      if (firstTodo) setOpen((prev) => new Set(prev).add(firstTodo.key));
      return;
    }
    const ok = await confirm(
      'Issue this record?',
      recordHasFault(r)
        ? 'It records gas safety defects. Make sure the responsible person has been told and any warning notices given.'
        : 'It will be marked as issued and you can share the PDF.',
      'Issue',
    );
    if (!ok) return;
    store.issueRecord(r.id);
    success();
    await share(true);
    // First issued record: ask once for permission to send due-date alerts.
    if (remindersSupported && engineer.remindersOn) remindersAllowed(true).catch(() => {});
  };

  const reopen = async () => {
    const ok = await confirm(
      'Edit this record?',
      'It goes back to a draft. Issue it again when you’ve finished, and send the landlord the new copy.',
      'Edit',
    );
    if (ok) patch({ status: 'draft', issuedAt: null, engineerDetails: null });
  };

  const remove = async () => {
    const ok = await confirm(
      'Delete this record?',
      issued
        ? 'Gas Safe Register asks registered businesses to keep work records for at least six years. Only delete it if it was made by mistake.'
        : 'This draft will be removed.',
      'Delete',
      true,
    );
    if (!ok) return;
    store.deleteRecord(r.id);
    router.back();
  };

  const openAppliance = (applianceId: string) =>
    router.push({ pathname: '/appliance/[recordId]/[applianceId]', params: { recordId: r.id, applianceId } });
  const addAppliance = () => {
    const a = newAppliance();
    store.updateRecord(r.id, (cur) => ({ ...cur, appliances: [...cur.appliances, a] }));
    openAppliance(a.id);
  };

  const todo = sections.length - doneCount;
  const cta = issued
    ? { label: sharing ? 'Creating PDF…' : 'Share PDF', onPress: () => share() }
    : todo > 0 || problems.length
      ? { label: todo > 0 ? `Finish ${todo} section${todo === 1 ? '' : 's'} to issue` : 'Check what’s missing', onPress: issue }
      : { label: 'Issue record', onPress: issue };

  const summaries: Record<SectionKey | 'notes', string> = {
    date: r.checkDate ? `${formatLongDate(r.checkDate)} · next due ${formatLongDate(r.nextDueDate)}` : 'Not set',
    property: formatAddress(r.property) || 'Address and postcode',
    landlord: r.landlordName.trim() || `${who} name and address`,
    appliances: r.appliances.length
      ? `${r.appliances.length} appliance${r.appliances.length === 1 ? '' : 's'}${r.appliances.some(applianceHasFault) ? ' · defects recorded' : ''}`
      : 'Add each appliance you check',
    installation: isDone('installation')
      ? installationHasFault(r)
        ? 'Defect recorded'
        : 'All satisfactory'
      : 'Tightness test, ECV, bonding, pipework',
    notes: r.notes.trim() || 'Optional',
    signatures: r.engineerSignature
      ? r.receivedBySignature
        ? 'Signed by you and ' + (r.receivedByName.trim() || 'the customer')
        : 'Signed by you'
      : 'Your signature',
  };

  const section = (k: SectionKey | 'notes', body: ReactNode, opts?: { optional?: boolean }) => (
    <Section
      key={k}
      title={SECTIONS[k].title}
      icon={SECTIONS[k].icon}
      summary={summaries[k]}
      done={k === 'notes' ? !!r.notes.trim() : isDone(k)}
      optional={opts?.optional}
      open={open.has(k)}
      onToggle={() => toggle(k)}>
      <View pointerEvents={issued ? 'none' : 'auto'} style={issued ? { opacity: 0.75 } : undefined}>
        {body}
      </View>
    </Section>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: r.number,
          headerStyle: { backgroundColor: c.band },
          headerTintColor: c.bandText,
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share PDF"
              hitSlop={10}
              onPress={() => share()}
              style={{ paddingHorizontal: Spacing.xs }}>
              <Icon ios="square.and.arrow.up" md="share" size={22} color={c.bandText} />
            </Pressable>
          ),
        }}
      />
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets>
          <View style={[styles.band, { backgroundColor: c.band }]}>
            <View style={styles.inner}>
              <Text style={[styles.address, { color: c.bandText }]} numberOfLines={2}>
                {r.property.line1.trim() || 'New record'}
              </Text>
              <Text style={[styles.bandSub, { color: c.bandMuted }]} numberOfLines={1}>
                {[r.property.postcode, r.landlordName, issued ? 'Issued' : 'Draft'].filter(Boolean).join(' · ')}
              </Text>
              {issued ? (
                <View style={[styles.issued, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <Icon ios="checkmark.seal.fill" md="verified" size={22} color={c.ok} />
                  <Text style={[styles.issuedText, { color: c.bandText }]}>
                    Issued {r.issuedAt ? new Date(r.issuedAt).toLocaleDateString('en-GB') : ''} · next due{' '}
                    {formatLongDate(r.nextDueDate)}
                  </Text>
                  <Pressable onPress={reopen} hitSlop={8}>
                    <Text style={{ color: c.brand, fontWeight: '700', fontSize: 14 }}>Edit</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.progressText}>
                    <Text style={{ color: c.bandMuted, fontSize: 13 }}>
                      {doneCount} of {sections.length} sections done
                    </Text>
                    <Text style={{ color: c.bandMuted, fontSize: 13 }}>
                      {Math.round((doneCount / sections.length) * 100)}%
                    </Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                    <View
                      style={[styles.fill, { backgroundColor: c.brand, width: `${(doneCount / sections.length) * 100}%` }]}
                    />
                  </View>
                </>
              )}
            </View>
          </View>

          <View style={[styles.inner, styles.list]}>
            {section(
              'date',
              <View style={formStyles.group}>
                <DateField label="Date of check" todayButton value={r.checkDate} onChange={(d) => setDates(d, r.previousDueDate)} />
                <DateField
                  label="Previous record's due date (optional)"
                  value={r.previousDueDate}
                  allowEmpty
                  onChange={(d) => setDates(r.checkDate, d)}
                  hint="From last year's record. A check done up to 2 months early keeps the same anniversary date (Regulation 36A)."
                />
                <DateField
                  label="Next check due by"
                  value={r.nextDueDate}
                  onChange={(d) => patch({ nextDueDate: d })}
                  hint={
                    due.date && r.nextDueDate !== due.date
                      ? `Changed by hand. Worked out from the dates above it would be ${formatLongDate(due.date)}.`
                      : due.keptAnniversary
                        ? 'Checked within 2 months of the previous due date, so the anniversary date is kept.'
                        : '12 months from the date of this check.'
                  }
                />
              </View>,
            )}

            {section(
              'property',
              <View style={formStyles.group}>
                <AddressFields value={r.property} onChange={(property) => patch({ property })} />
                <TextField
                  label="Tenant or occupier (optional)"
                  value={r.tenantName}
                  onChange={(tenantName) => patch({ tenantName })}
                  autoCapitalize="words"
                />
              </View>,
            )}

            {section(
              'landlord',
              <View style={formStyles.group}>
                <Choice
                  options={[
                    { value: 'landlord', label: 'Landlord' },
                    { value: 'agent', label: 'Managing agent' },
                  ]}
                  value={r.landlordIsAgent ? 'agent' : 'landlord'}
                  onChange={(v) => patch({ landlordIsAgent: v === 'agent' })}
                />
                <Field label={`${who} name`}>
                  <Input value={r.landlordName} onChangeText={(landlordName) => patch({ landlordName })} autoCapitalize="words" />
                  <Suggestions
                    options={previousLandlords.map((p) => p.landlordName.trim())}
                    value={r.landlordName}
                    onPick={(name) => {
                      const from = previousLandlords.find((p) => p.landlordName.trim() === name);
                      if (!from) return;
                      patch({
                        landlordName: from.landlordName,
                        landlordIsAgent: from.landlordIsAgent,
                        landlordAddress: { ...from.landlordAddress },
                        landlordPhone: from.landlordPhone,
                        landlordEmail: from.landlordEmail,
                      });
                    }}
                  />
                </Field>
                <AddressFields value={r.landlordAddress} onChange={(landlordAddress) => patch({ landlordAddress })} />
                <TextField label="Phone" value={r.landlordPhone} onChange={(landlordPhone) => patch({ landlordPhone })} keyboardType="phone-pad" />
                <TextField
                  label="Email"
                  value={r.landlordEmail}
                  onChange={(landlordEmail) => patch({ landlordEmail })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  hint="Used for the reminder when next year's check is due."
                />
              </View>,
            )}

            <Section
              title={SECTIONS.appliances.title}
              icon={SECTIONS.appliances.icon}
              summary={summaries.appliances}
              done={isDone('appliances')}
              open={open.has('appliances')}
              onToggle={() => toggle('appliances')}>
              <View style={{ gap: Spacing.sm }}>
                {r.appliances.map((a) => {
                  const missing = applianceProblems(a);
                  const fault = applianceHasFault(a);
                  const [pill, pillColor] = fault
                    ? [a.safeToUse === 'no' ? 'Not safe' : 'Defect', c.out]
                    : missing.length
                      ? [`${missing.length} to do`, c.low]
                      : ['Safe', c.ok];
                  const line = readings(a);
                  return (
                    <Pressable
                      key={a.id}
                      accessibilityRole="button"
                      onPress={() => openAppliance(a.id)}
                      style={({ pressed }) => [styles.applianceRow, { borderTopColor: c.border, opacity: pressed ? 0.6 : 1 }]}>
                      <ApplianceIcon type={a.type} size={40} color={c.text} background={c.field} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.applianceTitle, { color: c.text }]} numberOfLines={1}>
                          {[a.type || 'Appliance', a.location].filter(Boolean).join(' · ')}
                        </Text>
                        {!!(a.make || a.model) && (
                          <Text style={[styles.applianceSub, { color: c.textSecondary }]} numberOfLines={1}>
                            {[a.make, a.model].filter(Boolean).join(' ')}
                          </Text>
                        )}
                        {!!line && (
                          <Text style={[styles.applianceSub, { color: c.textSecondary }]} numberOfLines={1}>
                            {line}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.pill, { backgroundColor: c.background }]}>
                        <Text style={[styles.pillText, { color: pillColor }]}>{pill}</Text>
                      </View>
                    </Pressable>
                  );
                })}
                {!issued && (
                  <Button label="Add appliance" variant="secondary" icon={{ ios: 'plus', md: 'add' }} onPress={addAppliance} />
                )}
              </View>
            </Section>

            {section(
              'installation',
              <View style={formStyles.group}>
                <CheckRow
                  label="Gas tightness test"
                  kind="passFail"
                  value={r.tightnessTest}
                  onChange={(tightnessTest) => patch({ tightnessTest })}
                  hint="Recommended by Gas Safe Register, though not a legal requirement."
                />
                <CheckRow
                  label="Emergency control valve accessible and labelled"
                  kind="yesNo"
                  value={r.ecvAccessible}
                  onChange={(ecvAccessible) => patch({ ecvAccessible })}
                />
                <CheckRow
                  label="Protective equipotential bonding satisfactory"
                  kind="yesNoNa"
                  value={r.bonding}
                  onChange={(bonding) => patch({ bonding })}
                />
                <CheckRow
                  label="Installation pipework visual inspection"
                  kind="passFail"
                  value={r.pipeworkVisual}
                  onChange={(pipeworkVisual) => patch({ pipeworkVisual })}
                />
                {(installationHasFault(r) || !!r.installationDefects) && (
                  <>
                    <TextField
                      label="Installation defect"
                      value={r.installationDefects}
                      onChange={(installationDefects) => patch({ installationDefects })}
                      multiline
                      style={{ minHeight: 70, textAlignVertical: 'top' }}
                    />
                    <Field label="Classification">
                      <Choice
                        options={CLASSIFICATIONS}
                        value={r.installationClassification}
                        onChange={(installationClassification) => patch({ installationClassification })}
                      />
                    </Field>
                    <TextField
                      label="Remedial action taken"
                      value={r.installationRemedial}
                      onChange={(installationRemedial) => patch({ installationRemedial })}
                      multiline
                      style={{ minHeight: 70, textAlignVertical: 'top' }}
                    />
                  </>
                )}
              </View>,
            )}

            {section(
              'notes',
              <Input
                value={r.notes}
                onChangeText={(notes) => patch({ notes })}
                placeholder="Anything else the landlord should know"
                multiline
                style={{ minHeight: 70, textAlignVertical: 'top' }}
              />,
              { optional: true },
            )}

            {section(
              'signatures',
              <View style={formStyles.group}>
                <Field label="Engineer">
                  <SignatureField value={r.engineerSignature} onChange={(engineerSignature) => patch({ engineerSignature })} />
                  {!r.engineerSignature && engineer.signature && (
                    <Button
                      label="Use my saved signature"
                      variant="plain"
                      compact
                      onPress={() => patch({ engineerSignature: engineer.signature })}
                      style={{ alignSelf: 'flex-start' }}
                    />
                  )}
                </Field>
                <TextField
                  label="Received by (optional)"
                  value={r.receivedByName}
                  onChange={(receivedByName) => patch({ receivedByName })}
                  autoCapitalize="words"
                  placeholder="Name of the person given the record"
                />
                <Choice
                  options={[
                    { value: 'Tenant', label: 'Tenant' },
                    { value: 'Landlord', label: 'Landlord' },
                    { value: 'Agent', label: 'Agent' },
                    { value: 'Homeowner', label: 'Owner' },
                  ]}
                  value={r.receivedByRole}
                  onChange={(receivedByRole) => patch({ receivedByRole })}
                />
                <SignatureField
                  value={r.receivedBySignature}
                  onChange={(receivedBySignature) => patch({ receivedBySignature })}
                  emptyLabel="Not signed (optional)"
                />
              </View>,
            )}

            {showProblems && problems.length > 0 && !issued && (
              <View style={[styles.problems, { backgroundColor: c.outSoft }]}>
                <Text style={[styles.problemsTitle, { color: c.out }]}>Fill these in before issuing</Text>
                {problems.map((p) => (
                  <Text key={p} style={[styles.problem, { color: c.text }]}>
                    • {p}
                  </Text>
                ))}
              </View>
            )}

            <View style={styles.actions}>
              {!issued && (
                <Button
                  label={sharing ? 'Creating PDF…' : 'Preview draft PDF'}
                  variant="secondary"
                  icon={{ ios: 'doc.text.magnifyingglass', md: 'preview' }}
                  onPress={() => share()}
                  disabled={sharing}
                />
              )}
              <Button label="Delete record" variant="danger" icon={{ ios: 'trash', md: 'delete' }} onPress={remove} />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + Spacing.md }]} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            onPress={cta.onPress}
            disabled={sharing}
            style={({ pressed }) => [styles.cta, { backgroundColor: c.primary, opacity: pressed || sharing ? 0.85 : 1 }]}>
            <Icon
              ios={issued ? 'square.and.arrow.up' : 'checkmark.seal'}
              md={issued ? 'share' : 'verified'}
              size={20}
              color={c.primaryText}
            />
            <Text style={[styles.ctaText, { color: c.primaryText }]}>{cta.label}</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

/** One part of the record. Shows a tick when complete and folds away when tapped. */
function Section({
  title,
  icon,
  summary,
  done,
  optional,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: IconPair;
  summary: string;
  done: boolean;
  optional?: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const c = useTheme();
  const tone = done ? { fg: c.ok, bg: c.okSoft } : optional ? { fg: c.textSecondary, bg: c.field } : { fg: c.brand, bg: c.primarySoft };
  return (
    <View
      style={[
        styles.section,
        {
          backgroundColor: c.card,
          borderColor: done || optional || open ? c.border : c.brand,
          borderStyle: done || optional || open ? 'solid' : 'dashed',
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}, ${done ? 'complete' : optional ? 'optional' : 'to do'}`}
        onPress={onToggle}
        style={({ pressed }) => [styles.sectionHead, { opacity: pressed ? 0.7 : 1 }]}>
        <View style={[styles.sectionIcon, { backgroundColor: tone.bg }]}>
          <Icon {...icon} size={20} color={tone.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
          {!open && (
            <Text style={[styles.sectionSummary, { color: c.textSecondary }]} numberOfLines={1}>
              {summary}
            </Text>
          )}
        </View>
        {done ? (
          <Icon ios="checkmark.circle.fill" md="check_circle" size={22} color={c.ok} />
        ) : (
          <Icon ios={open ? 'chevron.up' : 'chevron.down'} md={open ? 'expand_less' : 'expand_more'} size={18} color={c.textSecondary} />
        )}
      </Pressable>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.lg },
  band: { paddingTop: Spacing.xs, paddingBottom: Spacing.xl, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  address: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  bandSub: { fontSize: 14, marginTop: 2 },
  progressText: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.lg },
  track: { height: 8, borderRadius: 4, marginTop: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  issued: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.lg },
  issuedText: { flex: 1, fontSize: 14, fontWeight: '600' },
  list: { gap: Spacing.sm, marginTop: Spacing.lg },
  section: { borderRadius: Radius.lg, borderWidth: 1.5, overflow: 'hidden' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  sectionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionSummary: { fontSize: 13.5, marginTop: 1 },
  sectionBody: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg, paddingTop: Spacing.xs },
  applianceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  applianceTitle: { fontSize: 15.5, fontWeight: '700' },
  applianceSub: { fontSize: 13 },
  pill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontSize: 12, fontWeight: '700' },
  problems: { borderRadius: Radius.md, padding: Spacing.lg, gap: 4, marginTop: Spacing.md },
  problemsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  problem: { fontSize: 15, lineHeight: 21 },
  actions: { gap: Spacing.sm, marginTop: Spacing.lg },
  ctaWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  cta: {
    width: '100%',
    maxWidth: MaxContentWidth - Spacing.lg * 2,
    alignSelf: 'center',
    minHeight: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  ctaText: { fontSize: 17, fontWeight: '800' },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
});
