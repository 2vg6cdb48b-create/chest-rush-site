import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, Choice, SectionLabel } from '@/components/controls';
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
  applianceTitle,
  formatLongDate,
  installationHasFault,
  issueProblems,
  newAppliance,
  nextDueDate,
  recordHasFault,
} from '@/lib/records';
import { shareRecordPdf } from '@/lib/share-record';
import { useStore } from '@/lib/store';
import type { Classification, GasRecord } from '@/lib/types';
import { confirm, notify, success } from '@/lib/ui';

const CLASSIFICATIONS: { value: Classification; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'AR', label: 'At Risk' },
  { value: 'ID', label: 'Imm. Dangerous' },
];

function pdfName(r: GasRecord) {
  const where = [r.property.line1, r.property.postcode].filter(Boolean).join(' ');
  return `Gas Safety Record ${r.number}${where ? ` - ${where}` : ''}.pdf`.replace(/[\\/:*?"<>|]/g, '-');
}

export default function RecordScreen() {
  const c = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useStore();
  const record = store.getRecord(id);
  const [showProblems, setShowProblems] = useState(false);
  const [sharing, setSharing] = useState(false);

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

  // `asIssued` lets the PDF made straight after issuing show as issued, before the screen updates.
  const share = async (asIssued = false) => {
    setSharing(true);
    try {
      const doc = asIssued ? { ...r, status: 'issued' as const } : r;
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
  };

  const reopen = async () => {
    const ok = await confirm(
      'Edit this record?',
      'It goes back to a draft. Issue it again when you’ve finished, and send the landlord the new copy.',
      'Edit',
    );
    if (ok) patch({ status: 'draft', issuedAt: null });
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

  const addAppliance = () => {
    const a = newAppliance();
    store.updateRecord(r.id, (cur) => ({ ...cur, appliances: [...cur.appliances, a] }));
    router.push({ pathname: '/appliance/[recordId]/[applianceId]', params: { recordId: r.id, applianceId: a.id } });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: r.number,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share PDF"
              hitSlop={10}
              onPress={() => share()}
              style={{ paddingHorizontal: Spacing.xs }}>
              <Icon ios="square.and.arrow.up" md="share" size={22} color={c.primary} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic">
        <StatusCard record={r} onReopen={reopen} />

        <Locked locked={issued}>
          <SectionLabel>Check</SectionLabel>
          <Card style={formStyles.group}>
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
          </Card>

          <SectionLabel>Property checked</SectionLabel>
          <Card style={formStyles.group}>
            <AddressFields value={r.property} onChange={(property) => patch({ property })} />
            <TextField label="Tenant or occupier (optional)" value={r.tenantName} onChange={(tenantName) => patch({ tenantName })} autoCapitalize="words" />
          </Card>

          <SectionLabel>{who}</SectionLabel>
          <Card style={formStyles.group}>
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
            />
          </Card>
        </Locked>

        <SectionLabel>Appliances</SectionLabel>
        <View style={{ gap: Spacing.sm }}>
          {r.appliances.map((a, i) => {
            const missing = applianceProblems(a);
            const fault = applianceHasFault(a);
            return (
              <Pressable
                key={a.id}
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: '/appliance/[recordId]/[applianceId]', params: { recordId: r.id, applianceId: a.id } })
                }
                style={({ pressed }) => [
                  styles.applianceRow,
                  { backgroundColor: c.card, borderColor: fault ? c.out : c.border, opacity: pressed ? 0.6 : 1 },
                ]}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.applianceTitle, { color: c.text }]}>{applianceTitle(a, i)}</Text>
                  <View style={styles.badges}>
                    {a.safeToUse === 'yes' && !fault && <Badge label="Safe to use" tone="good" />}
                    {a.safeToUse === 'no' && <Badge label="Not safe to use" tone="bad" />}
                    {a.classification !== 'none' && <Badge label={a.classification} tone="bad" />}
                    {missing.length > 0 && <Badge label={`${missing.length} to fill in`} tone="warn" />}
                  </View>
                </View>
                <Icon ios="chevron.right" md="chevron_right" size={14} color={c.textSecondary} />
              </Pressable>
            );
          })}
          {!issued && (
            <Button label="Add appliance" variant="secondary" icon={{ ios: 'plus', md: 'add' }} onPress={addAppliance} />
          )}
        </View>

        <Locked locked={issued}>
          <SectionLabel>Installation</SectionLabel>
          <Card style={formStyles.group}>
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
          </Card>

          <SectionLabel>Notes (optional)</SectionLabel>
          <Card>
            <Input
              value={r.notes}
              onChangeText={(notes) => patch({ notes })}
              placeholder="Anything else the landlord should know"
              multiline
              style={{ minHeight: 70, textAlignVertical: 'top' }}
            />
          </Card>

          <SectionLabel>Signatures</SectionLabel>
          <Card style={formStyles.group}>
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
          </Card>
        </Locked>

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
          {issued ? (
            <Button
              label={sharing ? 'Creating PDF…' : 'Share PDF'}
              icon={{ ios: 'square.and.arrow.up', md: 'share' }}
              onPress={() => share()}
              disabled={sharing}
            />
          ) : (
            <>
              <Button label="Issue record" icon={{ ios: 'checkmark.seal', md: 'verified' }} onPress={issue} />
              <Button
                label={sharing ? 'Creating PDF…' : 'Preview draft PDF'}
                variant="secondary"
                onPress={() => share()}
                disabled={sharing}
              />
            </>
          )}
          <Button label="Delete record" variant="danger" icon={{ ios: 'trash', md: 'delete' }} onPress={remove} />
        </View>
      </ScrollView>
    </>
  );
}

/** Stops changes to an issued record until it's reopened. Scrolling still works. */
function Locked({ locked, children }: { locked: boolean; children: ReactNode }) {
  return (
    <View pointerEvents={locked ? 'none' : 'auto'} style={locked ? { opacity: 0.75 } : undefined}>
      {children}
    </View>
  );
}

function StatusCard({ record: r, onReopen }: { record: GasRecord; onReopen: () => void }) {
  const c = useTheme();
  const fault = recordHasFault(r);
  if (r.status === 'issued') {
    return (
      <View style={[styles.status, { backgroundColor: c.okSoft }]}>
        <Icon ios="checkmark.seal.fill" md="verified" size={26} color={c.ok} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.statusTitle, { color: c.text }]}>
            Issued {r.issuedAt ? new Date(r.issuedAt).toLocaleDateString('en-GB') : ''}
          </Text>
          <Text style={[styles.statusText, { color: c.textSecondary }]}>
            {fault ? 'Records gas safety defects. ' : ''}Next check due by {formatLongDate(r.nextDueDate)}.
          </Text>
          <Button label="Edit record" variant="plain" compact onPress={onReopen} style={{ alignSelf: 'flex-start', marginLeft: -Spacing.md }} />
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.status, { backgroundColor: c.primarySoft }]}>
      <Icon ios="pencil.and.list.clipboard" md="edit_note" size={26} color={c.primary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.statusTitle, { color: c.text }]}>Draft</Text>
        <Text style={[styles.statusText, { color: c.textSecondary }]}>
          Saved as you go. Issue it when every check is filled in.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.lg,
    paddingBottom: 80,
  },
  status: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.md, alignItems: 'flex-start' },
  statusTitle: { fontSize: 17, fontWeight: '700' },
  statusText: { fontSize: 14, lineHeight: 20 },
  applianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  applianceTitle: { fontSize: 16, fontWeight: '600' },
  badges: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  problems: { borderRadius: Radius.md, padding: Spacing.lg, gap: 4, marginTop: Spacing.xl },
  problemsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  problem: { fontSize: 15, lineHeight: 21 },
  actions: { gap: Spacing.sm, marginTop: Spacing.xl },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
});
