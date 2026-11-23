import Constants from 'expo-constants';
import type { ComponentProps } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Choice, SectionLabel } from '@/components/controls';
import { AddressFields, Field, Input, TextField, formStyles } from '@/components/form';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { SignatureField } from '@/components/signature';
import { PRIVACY_URL, SUPPORT_URL } from '@/constants/links';
import { MaxContentWidth, Spacing, useTheme } from '@/constants/theme';
import { pickTextFile, shareTextFile } from '@/lib/files';
import { VAT_OPTIONS, invoiceNumber } from '@/lib/invoices';
import { parseAppData, recordNumber, todayIso } from '@/lib/records';
import { REMINDER_DAYS, remindersAllowed, remindersSupported } from '@/lib/reminders';
import { useStore } from '@/lib/store';
import type { Engineer } from '@/lib/types';
import { confirm, notify } from '@/lib/ui';

export default function SettingsScreen() {
  const c = useTheme();
  const store = useStore();
  const e = store.engineer;
  const set = <K extends keyof Engineer>(key: K) => (value: Engineer[K]) =>
    store.saveEngineer({ ...store.engineer, [key]: value });
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const backup = async () => {
    try {
      await shareTextFile(
        `ng-gas-records-backup-${todayIso()}.json`,
        JSON.stringify({ ...store.data, exportedAt: new Date().toISOString() }),
        'application/json',
      );
      store.markBackedUp();
    } catch (err) {
      notify('Could not back up', err instanceof Error ? err.message : String(err));
    }
  };

  const restore = async () => {
    try {
      const text = await pickTextFile();
      if (text === null) return;
      const data = parseAppData(JSON.parse(text));
      const ok = await confirm(
        'Restore backup?',
        `This replaces everything in the app, including your details, with the ${data.records.length} record${data.records.length === 1 ? '' : 's'} and ${data.invoices.length} invoice${data.invoices.length === 1 ? '' : 's'} in the backup.`,
        'Restore',
        true,
      );
      if (!ok) return;
      store.replaceAll(data);
      notify('Backup restored', `${data.records.length} records and ${data.invoices.length} invoices loaded.`);
    } catch (err) {
      notify(
        'Could not restore',
        err instanceof SyntaxError ? 'That file is not an NG Gas Records backup.' : err instanceof Error ? err.message : String(err),
      );
    }
  };

  const deleteAll = async () => {
    const ok = await confirm(
      'Delete all records and invoices?',
      'Every record and invoice will be removed from this device. Your own details stay. Gas Safe Register asks registered businesses to keep work records for at least six years, and HMRC asks you to keep invoices too, so back up first.',
      'Delete all',
      true,
    );
    if (ok) store.clearAll();
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScreenHeader title="Settings" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}>
        <SectionLabel>Your details (printed on every record and invoice)</SectionLabel>
        <Card style={formStyles.group}>
          <TextField label="Engineer name" value={e.name} onChange={set('name')} autoCapitalize="words" textContentType="name" />
          <TextField
            label="Gas Safe registration number"
            value={e.gasSafeNumber}
            onChange={set('gasSafeNumber')}
            keyboardType="number-pad"
            hint="The business registration number."
          />
          <TextField
            label="Licence / ID card number"
            value={e.licenceNumber}
            onChange={set('licenceNumber')}
            keyboardType="number-pad"
            hint="The number on your Gas Safe ID card."
          />
          <TextField label="Business name" value={e.companyName} onChange={set('companyName')} autoCapitalize="words" />
          <AddressFields value={e.address} onChange={set('address')} />
          <TextField label="Phone" value={e.phone} onChange={set('phone')} keyboardType="phone-pad" textContentType="telephoneNumber" />
          <TextField
            label="Email"
            value={e.email}
            onChange={set('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
          />
        </Card>

        <SectionLabel>Your signature</SectionLabel>
        <Card style={formStyles.group}>
          <Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 20 }}>
            Added to every new record automatically, so you only sign once.
          </Text>
          <SignatureField value={e.signature} onChange={set('signature')} />
        </Card>

        <SectionLabel>Appearance</SectionLabel>
        <Card style={formStyles.group}>
          <Choice
            options={[
              { value: 'system', label: 'Automatic' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            value={e.appearance}
            onChange={set('appearance')}
          />
          <Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 20 }}>
            Automatic follows your phone: light in the day, dark navy when your phone is in dark mode.
          </Text>
        </Card>

        <SectionLabel>Due-date reminders</SectionLabel>
        <Card style={formStyles.group}>
          {remindersSupported ? (
            <>
              <Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 20 }}>
                Your phone alerts you {REMINDER_DAYS.join(' and ')} days before each property&apos;s next check is due. Tap the alert to
                email the landlord a ready-written reminder from your own email, copied to you.
              </Text>
              <Choice
                options={[
                  { value: 'on', label: 'On' },
                  { value: 'off', label: 'Off' },
                ]}
                value={e.remindersOn ? 'on' : 'off'}
                onChange={async (v) => {
                  if (v === 'on' && (await remindersAllowed(true)) === 'denied') {
                    notify(
                      'Alerts are switched off',
                      'Allow notifications for NG Gas Records in your iPhone Settings, under Notifications.',
                    );
                  }
                  set('remindersOn')(v === 'on');
                }}
              />
            </>
          ) : (
            <Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 20 }}>
              Reminder alerts work in the iPhone app. On the website, check the Due tab, where you can email each landlord.
            </Text>
          )}
          {!e.email.trim() && (
            <Text style={{ color: c.low, fontSize: 14, lineHeight: 20 }}>
              Add your email above to get a copy of each reminder you send.
            </Text>
          )}
        </Card>

        <SectionLabel>Record numbers</SectionLabel>
        <Card style={formStyles.group}>
          <Field label="Prefix" hint={`The next record will be ${recordNumber(e)}.`}>
            <Input value={e.recordPrefix} onChangeText={set('recordPrefix')} autoCapitalize="characters" />
          </Field>
          <Field label="Next number">
            <Input
              value={String(e.nextRecordNumber)}
              keyboardType="number-pad"
              onChangeText={(t) => {
                const n = parseInt(t.replace(/\D/g, ''), 10);
                set('nextRecordNumber')(Number.isFinite(n) && n > 0 ? n : 1);
              }}
            />
          </Field>
        </Card>

        <SectionLabel>Invoices</SectionLabel>
        <Card style={formStyles.group}>
          <Field
            label="Invoice style"
            hint={
              e.invoiceStyle === 'classic'
                ? 'Classic: a plain black and white document, like a bank or accountant’s invoice.'
                : 'Custom: navy and orange with your logo, matching your gas safety records.'
            }>
            <Choice
              options={[
                { value: 'custom', label: 'Custom' },
                { value: 'classic', label: 'Classic' },
              ]}
              value={e.invoiceStyle}
              onChange={set('invoiceStyle')}
            />
          </Field>
          <Field label="VAT on new invoices">
            <Choice options={VAT_OPTIONS} value={e.defaultVatRate} onChange={set('defaultVatRate')} />
          </Field>
          <TextField
            label={e.defaultVatRate === 'none' ? 'VAT registration number (if registered)' : 'VAT registration number'}
            value={e.vatNumber}
            onChange={set('vatNumber')}
            autoCapitalize="characters"
            hint="Printed on invoices that charge VAT. You can still pick No VAT or a rate on each invoice."
          />
          <TextField
            label="Your price for a gas safety record (£)"
            value={e.gasSafetyPrice}
            onChange={(v) => set('gasSafetyPrice')(v.replace(',', '.').replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            placeholder="e.g. 70"
            hint="Filled in when you invoice a finished record."
          />
          <Field label="Days to pay" hint="Payment due date on new invoices.">
            <Input
              value={String(e.paymentDays)}
              keyboardType="number-pad"
              onChangeText={(t) => {
                const n = parseInt(t.replace(/\D/g, ''), 10);
                set('paymentDays')(Number.isFinite(n) ? Math.min(365, n) : 0);
              }}
            />
          </Field>
          <Text style={[styles.subhead, { color: c.text }]}>Bank details (printed under “How to pay”)</Text>
          <TextField label="Account name" value={e.bankAccountName} onChange={set('bankAccountName')} autoCapitalize="words" />
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField label="Sort code" value={e.bankSortCode} onChange={set('bankSortCode')} keyboardType="numbers-and-punctuation" placeholder="00-00-00" />
            </View>
            <View style={{ flex: 1.3 }}>
              <TextField label="Account number" value={e.bankAccountNumber} onChange={set('bankAccountNumber')} keyboardType="number-pad" />
            </View>
          </View>
          <TextField
            label="Note on new invoices (optional)"
            value={e.invoiceNote}
            onChange={set('invoiceNote')}
            multiline
            placeholder="e.g. Payment within 14 days, please."
            style={{ minHeight: 60, textAlignVertical: 'top' }}
          />
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Field label="Invoice prefix">
                <Input value={e.invoicePrefix} onChangeText={set('invoicePrefix')} autoCapitalize="characters" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Next number">
                <Input
                  value={String(e.nextInvoiceNumber)}
                  keyboardType="number-pad"
                  onChangeText={(t) => {
                    const n = parseInt(t.replace(/\D/g, ''), 10);
                    set('nextInvoiceNumber')(Number.isFinite(n) && n > 0 ? n : 1);
                  }}
                />
              </Field>
            </View>
          </View>
          <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: -Spacing.sm }}>The next invoice will be {invoiceNumber(e)}.</Text>
        </Card>

        <SectionLabel>Backup</SectionLabel>
        {Platform.OS === 'web' && (
          <View style={[styles.webNote, { backgroundColor: c.lowSoft }]}>
            <Text style={{ color: c.text, fontSize: 14, lineHeight: 20 }}>
              On the website, your details and records are saved in this browser only. On an iPhone, Safari, a Home
              Screen icon and links opened inside other apps (like Claude or WhatsApp) each keep their own separate
              copy, and Private tabs keep nothing. Always open it the same way, and back up regularly.
            </Text>
          </View>
        )}
        <Card style={styles.list}>
          <Row
            icon={{ ios: 'externaldrive.badge.icloud', md: 'backup' }}
            title="Back up"
            detail={
              e.lastBackupAt
                ? `Last backup ${new Date(e.lastBackupAt).toLocaleDateString('en-GB')}. Save all records to Files, iCloud Drive or email.`
                : 'Never backed up. Save all records to Files, iCloud Drive or email.'
            }
            onPress={backup}
          />
          <Row
            icon={{ ios: 'arrow.clockwise.icloud', md: 'restore' }}
            title="Restore from backup"
            detail="Load a backup file, e.g. on a new phone"
            onPress={restore}
          />
          <Row icon={{ ios: 'trash', md: 'delete' }} title="Delete all records and invoices" danger onPress={deleteAll} last />
        </Card>

        <SectionLabel>About</SectionLabel>
        <Card style={styles.list}>
          <Row icon={{ ios: 'questionmark.circle', md: 'help' }} title="Help & support" onPress={() => Linking.openURL(SUPPORT_URL)} />
          <Row icon={{ ios: 'hand.raised', md: 'privacy_tip' }} title="Privacy policy" onPress={() => Linking.openURL(PRIVACY_URL)} last />
        </Card>
        <Text style={[styles.footer, { color: c.textSecondary }]}>
          NG Gas Records {version}
          {'\n'}Records are saved only on this device. Nothing is sent anywhere unless you share it.
          {'\n'}Keep your records for at least six years (Gas Safe Register Registration Policy).
          {'\n'}You are responsible for the checks and what each record says.
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
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
        { opacity: pressed ? 0.5 : 1 },
      ]}>
      <Icon {...icon} size={22} color={danger ? c.out : c.primary} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, color: danger ? c.out : c.text }}>{title}</Text>
        {!!detail && <Text style={{ fontSize: 13, marginTop: 2, color: c.textSecondary }}>{detail}</Text>}
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
  list: { paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 14 },
  webNote: { borderRadius: 12, padding: 14, marginBottom: 8 },
  subhead: { fontSize: 16, fontWeight: '700', marginTop: Spacing.xs },
  footer: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: Spacing.xl },
});
