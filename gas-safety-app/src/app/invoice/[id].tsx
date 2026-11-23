import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Choice } from '@/components/controls';
import { AddressFields, DateField, Field, Input, Suggestions, TextField, formStyles } from '@/components/form';
import { Icon } from '@/components/icon';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/constants/theme';
import { invoiceHtml } from '@/lib/invoice-html';
import {
  QUICK_ITEMS,
  STATE_LABEL,
  VAT_OPTIONS,
  addDays,
  daysOverdue,
  discountPercentOf,
  invoicePdfName,
  invoiceProblems,
  invoiceState,
  invoiceTotals,
  linePence,
  money,
  newItem,
  percentLabel,
  stateColor,
  vatPercent,
} from '@/lib/invoices';
import { daysBetween, emptyAddress, formatAddress, formatLongDate, isIsoDate } from '@/lib/records';
import { shareRecordPdf } from '@/lib/share-record';
import { useStore } from '@/lib/store';
import type { Address, Invoice, InvoiceItem } from '@/lib/types';
import { confirm, notify, success, tap } from '@/lib/ui';

type IconPair = { ios: Parameters<typeof Icon>[0]['ios']; md: Parameters<typeof Icon>[0]['md'] };

/** Keeps a typed amount to digits and one decimal point. */
const cleanNumber = (t: string) => {
  const s = t.replace(',', '.').replace(/[^0-9.]/g, '');
  const [whole, ...rest] = s.split('.');
  return rest.length ? `${whole}.${rest.join('')}` : whole;
};

type Customer = Pick<Invoice, 'customerName' | 'customerAddress' | 'customerEmail' | 'customerPhone'>;

export default function InvoiceScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useStore();
  const invoice = store.getInvoice(id);
  const [sharing, setSharing] = useState(false);
  const [showJob, setShowJob] = useState(() => !!invoice && !!formatAddress(invoice.jobAddress));

  // People you've invoiced or done gas safety records for, newest first.
  const customers = useMemo(() => {
    const seen = new Map<string, Customer>();
    const add = (name: string, cust: Customer) => {
      const key = name.trim().toLowerCase();
      if (key && !seen.has(key)) seen.set(key, cust);
    };
    const others = store.invoices.filter((i) => i.id !== id);
    const sources = [
      ...others.map((i) => ({ at: i.updatedAt, cust: i as Customer })),
      ...store.records.map((r) => ({
        at: r.updatedAt,
        cust: {
          customerName: r.landlordName,
          customerAddress: r.landlordAddress,
          customerEmail: r.landlordEmail,
          customerPhone: r.landlordPhone,
        },
      })),
    ].sort((a, b) => b.at - a.at);
    for (const s of sources) add(s.cust.customerName, s.cust);
    return [...seen.values()].slice(0, 8);
  }, [store.invoices, store.records, id]);

  // Items you've charged for before, with the price you used last.
  const pastItems = useMemo(() => {
    const seen = new Map<string, InvoiceItem>();
    for (const inv of [...store.invoices].sort((a, b) => b.updatedAt - a.updatedAt)) {
      if (inv.id === id) continue;
      for (const it of inv.items) {
        const key = it.description.trim().toLowerCase();
        if (key && !seen.has(key)) seen.set(key, it);
      }
    }
    return [...seen.values()];
  }, [store.invoices, id]);

  if (!invoice) {
    return (
      <View style={[styles.missing, { backgroundColor: c.background }]}>
        <Text style={{ color: c.textSecondary, fontSize: 17 }}>This invoice has been deleted.</Text>
        <Button label="Back to invoices" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const inv = invoice;
  const engineer = store.engineer;
  const patch = (p: Partial<Invoice>) => store.updateInvoice(inv.id, (cur) => ({ ...cur, ...p }));
  const setItem = (itemId: string, p: Partial<InvoiceItem>) =>
    store.updateInvoice(inv.id, (cur) => ({
      ...cur,
      items: cur.items.map((it) => (it.id === itemId ? { ...it, ...p } : it)),
    }));
  const addItem = (description = '', unitPrice = '') => {
    tap();
    store.updateInvoice(inv.id, (cur) => {
      // Fill the first empty line rather than adding another blank one.
      const blank = cur.items.find((it) => !it.description.trim() && !it.unitPrice.trim());
      if (blank && description) {
        return { ...cur, items: cur.items.map((it) => (it.id === blank.id ? { ...it, description, unitPrice } : it)) };
      }
      return { ...cur, items: [...cur.items, newItem(description, unitPrice)] };
    });
  };
  const removeItem = (itemId: string) =>
    store.updateInvoice(inv.id, (cur) => ({ ...cur, items: cur.items.filter((it) => it.id !== itemId) }));

  const t = invoiceTotals(inv);
  const state = invoiceState(inv);
  const stateTone = stateColor(c, state);
  const vat = inv.vatRate !== 'none';
  const problems = invoiceProblems(inv, engineer);
  const record = inv.recordId ? store.getRecord(inv.recordId) : undefined;
  const terms = isIsoDate(inv.invoiceDate) && isIsoDate(inv.dueDate) ? daysBetween(inv.invoiceDate, inv.dueDate) : null;

  const quick = [
    { label: 'Gas safety record (CP12)', price: engineer.gasSafetyPrice },
    ...QUICK_ITEMS.map((label) => ({ label, price: '' })),
  ];
  for (const p of pastItems) {
    if (quick.length >= 12) break;
    if (!quick.some((q) => q.label.toLowerCase() === p.description.trim().toLowerCase())) {
      quick.push({ label: p.description.trim(), price: p.unitPrice });
    }
  }
  // A past price is used for a quick item when there is one.
  const priceFor = (label: string, fallback: string) =>
    pastItems.find((p) => p.description.trim().toLowerCase() === label.toLowerCase())?.unitPrice || fallback;

  const share = async (asSent: boolean) => {
    setSharing(true);
    try {
      const doc = asSent && inv.status === 'draft' ? { ...inv, status: 'sent' as const } : inv;
      await shareRecordPdf(invoiceHtml(doc, engineer), invoicePdfName(inv), 'portrait');
      if (asSent) store.markInvoiceSent(inv.id);
    } catch (e) {
      notify('Could not create the PDF', e instanceof Error ? e.message : String(e));
    } finally {
      setSharing(false);
    }
  };

  const send = async () => {
    if (problems.length) {
      const ok = await confirm(
        'Some details are missing',
        `${problems.map((p) => `• ${p}`).join('\n')}\n\nSend it anyway?`,
        'Send anyway',
      );
      if (!ok) return;
    }
    success();
    await share(true);
  };

  const setStatus = (s: Invoice['status']) =>
    patch({
      status: s,
      sentAt: s === 'draft' ? null : (inv.sentAt ?? Date.now()),
      paidAt: s === 'paid' ? (inv.paidAt ?? Date.now()) : null,
    });

  const remove = async () => {
    const ok = await confirm(
      'Delete this invoice?',
      inv.status === 'draft'
        ? 'This draft will be removed.'
        : 'Keep invoices you have sent for your tax records (HMRC asks for at least 5 years after the tax return deadline). Only delete it if it was made by mistake.',
      'Delete',
      true,
    );
    if (!ok) return;
    store.deleteInvoice(inv.id);
    router.back();
  };

  const pickCustomer = (name: string) => {
    const from = customers.find((x) => x.customerName.trim() === name);
    if (!from) return;
    patch({
      customerName: from.customerName.trim(),
      customerAddress: { ...from.customerAddress },
      customerEmail: from.customerEmail,
      customerPhone: from.customerPhone,
    });
  };

  const ctaLabel = sharing
    ? 'Creating PDF…'
    : inv.status === 'draft'
      ? 'Send invoice'
      : inv.status === 'paid'
        ? 'Share paid invoice'
        : 'Send again';

  const detail =
    state === 'paid'
      ? `Paid ${inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('en-GB') : ''}`
      : state === 'overdue'
        ? `${daysOverdue(inv)} days overdue`
        : state === 'unpaid'
          ? `Due ${formatLongDate(inv.dueDate)}`
          : 'Not sent yet';

  return (
    <>
      <Stack.Screen
        options={{
          title: inv.number,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Preview PDF"
              hitSlop={10}
              onPress={() => share(false)}
              style={{ paddingHorizontal: Spacing.xs }}>
              <Text style={{ color: c.brand, fontWeight: '700', fontSize: 16 }}>Preview</Text>
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
            <View style={[styles.inner, styles.bandRow]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.bandMuted, fontSize: 14 }}>{state === 'paid' ? 'Total paid' : 'Total to pay'}</Text>
                <Text style={[styles.total, { color: c.bandText }]} numberOfLines={1} adjustsFontSizeToFit>
                  {money(t.total)}
                </Text>
                <Text style={{ color: c.bandMuted, fontSize: 14 }} numberOfLines={1}>
                  {[inv.customerName.trim(), detail].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <View style={[styles.statePill, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                <Text style={{ color: state === 'draft' ? c.bandText : stateTone, fontWeight: '800', fontSize: 13 }}>
                  {STATE_LABEL[state]}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.inner, styles.list]}>
            {record && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/record/[id]', params: { id: record.id } })}
                style={({ pressed }) => [styles.link, { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}>
                <Icon ios="doc.text" md="description" size={20} color={c.primary} />
                <Text style={{ flex: 1, color: c.text, fontSize: 15 }} numberOfLines={1}>
                  For gas safety record {record.number}
                </Text>
                <Icon ios="chevron.right" md="chevron_right" size={14} color={c.textSecondary} />
              </Pressable>
            )}

            <Block title="Customer" icon={{ ios: 'person', md: 'person' }}>
              <Field label="Name">
                <Input
                  value={inv.customerName}
                  onChangeText={(customerName) => patch({ customerName })}
                  autoCapitalize="words"
                  placeholder="Who the invoice is for"
                />
                <Suggestions options={customers.map((x) => x.customerName.trim())} value={inv.customerName} onPick={pickCustomer} />
              </Field>
              <AddressFields value={inv.customerAddress} onChange={(customerAddress) => patch({ customerAddress })} />
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Email (optional)"
                    value={inv.customerEmail}
                    onChange={(customerEmail) => patch({ customerEmail })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Phone (optional)"
                    value={inv.customerPhone}
                    onChange={(customerPhone) => patch({ customerPhone })}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
              {showJob ? (
                <View style={[styles.sub, { borderTopColor: c.border }]}>
                  <View style={styles.subHead}>
                    <Text style={[styles.subTitle, { color: c.text }]}>Job address</Text>
                    <Pressable
                      hitSlop={8}
                      onPress={() => {
                        setShowJob(false);
                        patch({ jobAddress: emptyAddress() });
                      }}>
                      <Text style={{ color: c.primary, fontWeight: '600' }}>Remove</Text>
                    </Pressable>
                  </View>
                  <AddressFields value={inv.jobAddress} onChange={(jobAddress: Address) => patch({ jobAddress })} />
                </View>
              ) : (
                <Button
                  label="Add a different job address"
                  variant="plain"
                  compact
                  icon={{ ios: 'plus', md: 'add' }}
                  onPress={() => setShowJob(true)}
                  style={{ alignSelf: 'flex-start' }}
                />
              )}
            </Block>

            <Block title="Dates" icon={{ ios: 'calendar', md: 'event' }}>
              <DateField
                label="Invoice date"
                todayButton
                value={inv.invoiceDate}
                onChange={(invoiceDate) =>
                  patch({
                    invoiceDate,
                    dueDate: terms !== null && isIsoDate(invoiceDate) ? addDays(invoiceDate, terms) : inv.dueDate,
                  })
                }
              />
              <DateField
                label="Date the work was done"
                todayButton
                value={inv.workDate}
                onChange={(workDate) => patch({ workDate })}
                hint={vat ? 'For VAT this is the tax point.' : undefined}
              />
              <DateField
                label="Payment due"
                value={inv.dueDate}
                onChange={(dueDate) => patch({ dueDate })}
                hint={terms !== null ? (terms === 0 ? 'Due on the invoice date.' : `${terms} days after the invoice date.`) : undefined}
              />
              <View style={styles.chips}>
                {[0, 7, 14, 30].map((d) => {
                  const active = terms === d;
                  return (
                    <Pressable
                      key={d}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => isIsoDate(inv.invoiceDate) && patch({ dueDate: addDays(inv.invoiceDate, d) })}
                      style={[styles.chip, { backgroundColor: active ? c.primary : c.primarySoft }]}>
                      <Text style={{ color: active ? c.primaryText : c.primary, fontWeight: '600', fontSize: 14 }}>
                        {d === 0 ? 'On receipt' : `${d} days`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Block>

            <Block title="Items" icon={{ ios: 'list.bullet', md: 'list' }}>
              {inv.items.map((it, i) => (
                <View key={it.id} style={[styles.item, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
                  <View style={styles.itemTop}>
                    <Input
                      value={it.description}
                      onChangeText={(description) => setItem(it.id, { description })}
                      placeholder="Description, e.g. Boiler service"
                      multiline
                      style={{ flex: 1, minWidth: 0 }}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Remove item"
                      hitSlop={8}
                      onPress={() => removeItem(it.id)}
                      style={styles.remove}>
                      <Icon ios="xmark.circle.fill" md="cancel" size={22} color={c.textSecondary} />
                    </Pressable>
                  </View>
                  <View style={styles.itemNums}>
                    <Small label="Qty">
                      <TextInput
                        value={it.quantity}
                        onChangeText={(q) => setItem(it.id, { quantity: cleanNumber(q) })}
                        keyboardType="decimal-pad"
                        placeholder="1"
                        placeholderTextColor={c.textSecondary}
                        style={[styles.numInput, { color: c.text, backgroundColor: c.field }]}
                      />
                    </Small>
                    <Small label="Price each" flex={2}>
                      <View style={[styles.moneyWrap, { backgroundColor: c.field }]}>
                        <Text style={{ color: c.textSecondary, fontSize: 17 }}>£</Text>
                        <TextInput
                          value={it.unitPrice}
                          onChangeText={(p) => setItem(it.id, { unitPrice: cleanNumber(p) })}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          placeholderTextColor={c.textSecondary}
                          style={[styles.moneyInput, { color: c.text }]}
                        />
                      </View>
                    </Small>
                    <Small label="Amount" flex={2} right>
                      <Text style={[styles.amount, { color: c.text }]}>{money(linePence(it))}</Text>
                    </Small>
                  </View>
                </View>
              ))}
              <Button label="Add item" variant="secondary" icon={{ ios: 'plus', md: 'add' }} onPress={() => addItem()} />
              <View>
                <Text style={[styles.quickLabel, { color: c.textSecondary }]}>Quick add</Text>
                <View style={styles.chips}>
                  {quick.map((q) => (
                    <Pressable
                      key={q.label}
                      accessibilityRole="button"
                      onPress={() => addItem(q.label, priceFor(q.label, q.price))}
                      style={({ pressed }) => [styles.chip, { backgroundColor: c.primarySoft, opacity: pressed ? 0.6 : 1 }]}>
                      <Text style={{ color: c.primary, fontWeight: '600', fontSize: 14 }}>+ {q.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </Block>

            <Block title="Discount and VAT" icon={{ ios: 'percent', md: 'percent' }}>
              <Field label="Discount">
                <View style={styles.inline}>
                  <View style={[styles.moneyWrap, { backgroundColor: c.field, flex: 1 }]}>
                    <TextInput
                      value={inv.discountPercent}
                      onChangeText={(p) => {
                        const v = cleanNumber(p);
                        patch({ discountPercent: Number(v) > 100 ? '100' : v });
                      }}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={c.textSecondary}
                      style={[styles.moneyInput, { color: c.text }]}
                    />
                    <Text style={{ color: c.textSecondary, fontSize: 17 }}>%</Text>
                  </View>
                  {[0, 5, 10].map((d) => (
                    <Pressable
                      key={d}
                      onPress={() => patch({ discountPercent: d ? String(d) : '' })}
                      style={[styles.chip, styles.chipTall, { backgroundColor: discountPercentOf(inv) === d ? c.primary : c.primarySoft }]}>
                      <Text style={{ color: discountPercentOf(inv) === d ? c.primaryText : c.primary, fontWeight: '600' }}>{d}%</Text>
                    </Pressable>
                  ))}
                </View>
              </Field>
              <Field
                label="VAT"
                hint={
                  !vat
                    ? 'No VAT is added. The invoice says “Not VAT registered”.'
                    : engineer.vatNumber.trim()
                      ? `VAT at ${percentLabel(vatPercent(inv.vatRate))} is added after any discount. Your VAT number ${engineer.vatNumber.trim()} goes on the invoice.`
                      : undefined
                }
                error={vat && !engineer.vatNumber.trim() ? 'Add your VAT registration number in Settings. It must be on a VAT invoice.' : undefined}>
                <Choice options={VAT_OPTIONS} value={inv.vatRate} onChange={(vatRate) => patch({ vatRate })} />
              </Field>
              <View style={[styles.sums, { borderTopColor: c.border }]}>
                <Sum label={vat ? 'Subtotal (excl. VAT)' : 'Subtotal'} value={money(t.subtotal)} />
                {t.discount > 0 && <Sum label={`Discount ${percentLabel(discountPercentOf(inv))}`} value={`-${money(t.discount)}`} />}
                {vat ? (
                  <Sum label={`VAT at ${percentLabel(vatPercent(inv.vatRate))}`} value={money(t.vat)} />
                ) : (
                  <Sum label="VAT" value="Not VAT registered" muted />
                )}
                <View style={[styles.totalRow, { borderTopColor: c.border }]}>
                  <Text style={[styles.totalLabel, { color: c.text }]}>Total</Text>
                  <Text style={[styles.totalLabel, { color: c.text }]}>{money(t.total)}</Text>
                </View>
              </View>
            </Block>

            <Block title="Extras (optional)" icon={{ ios: 'note.text', md: 'notes' }}>
              <TextField
                label="Reference or order number"
                value={inv.reference}
                onChange={(reference) => patch({ reference })}
                placeholder="e.g. the customer's PO number"
              />
              <TextField
                label="Notes"
                value={inv.notes}
                onChange={(notes) => patch({ notes })}
                placeholder="e.g. Payment within 14 days, please."
                multiline
                style={{ minHeight: 70, textAlignVertical: 'top' }}
                hint="Your bank details are added from Settings."
              />
            </Block>

            <Block title="Status" icon={{ ios: 'checkmark.circle', md: 'check_circle' }}>
              <Choice
                options={[
                  { value: 'draft', label: 'Not sent' },
                  { value: 'sent', label: 'Sent' },
                  { value: 'paid', label: 'Paid' },
                ]}
                value={inv.status}
                onChange={setStatus}
                tone={(v) => (v === 'paid' ? 'good' : 'neutral')}
              />
              <Text style={{ color: c.textSecondary, fontSize: 13, lineHeight: 18 }}>
                {inv.status === 'paid'
                  ? `Marked as paid on ${inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('en-GB') : ''}.`
                  : inv.status === 'sent'
                    ? 'Mark it as paid when the money arrives.'
                    : 'Sending it marks it as sent.'}
              </Text>
            </Block>

            <View style={styles.actions}>
              <Button
                label={sharing ? 'Creating PDF…' : 'Preview PDF'}
                variant="secondary"
                icon={{ ios: 'doc.text.magnifyingglass', md: 'preview' }}
                onPress={() => share(false)}
                disabled={sharing}
              />
              <Button label="Delete invoice" variant="danger" icon={{ ios: 'trash', md: 'delete' }} onPress={remove} />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + Spacing.md }]} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            onPress={send}
            disabled={sharing}
            style={({ pressed }) => [styles.cta, { backgroundColor: c.primary, opacity: pressed || sharing ? 0.85 : 1 }]}>
            <Icon ios="paperplane.fill" md="send" size={20} color={c.primaryText} />
            <Text style={[styles.ctaText, { color: c.primaryText }]}>{ctaLabel}</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

function Block({ title, icon, children }: { title: string; icon: IconPair; children: ReactNode }) {
  const c = useTheme();
  return (
    <View style={[styles.block, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.blockHead}>
        <View style={[styles.blockIcon, { backgroundColor: c.primarySoft }]}>
          <Icon {...icon} size={20} color={c.primary} />
        </View>
        <Text style={[styles.blockTitle, { color: c.text }]}>{title}</Text>
      </View>
      <View style={formStyles.group}>{children}</View>
    </View>
  );
}

function Small({ label, children, flex = 1, right }: { label: string; children: ReactNode; flex?: number; right?: boolean }) {
  const c = useTheme();
  return (
    <View style={{ flex, gap: 4, alignItems: right ? 'flex-end' : 'stretch' }}>
      <Text style={{ color: c.textSecondary, fontSize: 12.5, fontWeight: '600' }}>{label}</Text>
      {children}
    </View>
  );
}

function Sum({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  const c = useTheme();
  return (
    <View style={styles.sumRow}>
      <Text style={{ color: c.textSecondary, fontSize: 15 }}>{label}</Text>
      <Text style={{ color: muted ? c.textSecondary : c.text, fontSize: 15, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.lg },
  band: { paddingTop: Spacing.xs, paddingBottom: Spacing.xl, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  bandRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.md },
  total: { fontSize: 38, fontWeight: '800', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  statePill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 4 },
  list: { gap: Spacing.sm, marginTop: Spacing.lg },
  link: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.md },
  block: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.md, paddingBottom: Spacing.lg, gap: Spacing.md },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  blockIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  blockTitle: { fontSize: 17, fontWeight: '700' },
  twoCol: { flexDirection: 'row', gap: Spacing.sm },
  sub: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.lg, gap: Spacing.md },
  subHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subTitle: { fontSize: 16, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: 7 },
  chipTall: { minHeight: 46, justifyContent: 'center' },
  quickLabel: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: Spacing.sm },
  item: { gap: Spacing.sm, paddingTop: Spacing.sm },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  remove: { paddingTop: 12 },
  itemNums: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  numInput: { borderRadius: Radius.sm, paddingHorizontal: Spacing.md, minHeight: 46, fontSize: 17, textAlign: 'center' },
  moneyWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, minHeight: 46 },
  moneyInput: { flex: 1, minWidth: 0, fontSize: 17, paddingVertical: Spacing.sm },
  amount: { fontSize: 17, fontWeight: '700', lineHeight: 46, fontVariant: ['tabular-nums'] },
  inline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sums: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md, gap: 2 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 6, paddingTop: 10 },
  totalLabel: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
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
