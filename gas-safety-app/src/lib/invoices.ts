import type { Palette } from '@/constants/theme';

import { daysBetween, emptyAddress, isIsoDate, newId, todayIso } from './records';
import type { Engineer, GasRecord, Invoice, InvoiceItem, VatRate } from './types';

export const VAT_OPTIONS: { value: VatRate; label: string }[] = [
  { value: 'none', label: 'No VAT' },
  { value: '20', label: '20%' },
  { value: '5', label: '5%' },
  { value: '0', label: '0%' },
];

/** Common jobs offered as one-tap items. */
export const QUICK_ITEMS = ['Boiler service', 'Labour', 'Call-out', 'Parts'];

export function invoiceNumber(engineer: Engineer): string {
  return `${engineer.invoicePrefix}${String(engineer.nextInvoiceNumber).padStart(4, '0')}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

export function newItem(description = '', unitPrice = ''): InvoiceItem {
  return { id: newId(), description, quantity: '1', unitPrice };
}

export function newInvoice(number: string, engineer: Engineer): Invoice {
  const now = Date.now();
  const today = todayIso();
  return {
    id: newId(),
    number,
    status: 'draft',
    customerName: '',
    customerAddress: emptyAddress(),
    customerEmail: '',
    customerPhone: '',
    jobAddress: emptyAddress(),
    reference: '',
    recordId: null,
    invoiceDate: today,
    workDate: today,
    dueDate: addDays(today, engineer.paymentDays),
    items: [newItem()],
    discountPercent: '',
    vatRate: engineer.defaultVatRate,
    notes: engineer.invoiceNote,
    sentAt: null,
    paidAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** An invoice for a gas safety record: the landlord or agent is billed and the property is the job address. */
export function invoiceFromRecord(r: GasRecord, number: string, engineer: Engineer): Invoice {
  const inv = newInvoice(number, engineer);
  return {
    ...inv,
    recordId: r.id,
    customerName: r.landlordName,
    customerAddress: { ...r.landlordAddress },
    customerEmail: r.landlordEmail,
    customerPhone: r.landlordPhone,
    jobAddress: { ...r.property },
    workDate: isIsoDate(r.checkDate) ? r.checkDate : inv.workDate,
    items: [newItem(`Landlord gas safety record (CP12), ${r.number}`, engineer.gasSafetyPrice)],
  };
}

// ---------- Money (worked out in pence so totals always add up) ----------

/** Reads a typed amount like "18.5" or "£1,240.00". Blank or invalid is 0. */
export function parseAmount(text: string): number {
  const n = Number(String(text).replace(/[£,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function linePence(item: InvoiceItem): number {
  const qty = item.quantity.trim() === '' ? 1 : parseAmount(item.quantity);
  return Math.round(qty * parseAmount(item.unitPrice) * 100);
}

export function vatPercent(rate: VatRate): number {
  return rate === 'none' ? 0 : Number(rate);
}

export function discountPercentOf(inv: Pick<Invoice, 'discountPercent'>): number {
  return Math.min(100, Math.max(0, parseAmount(inv.discountPercent)));
}

export type Totals = {
  subtotal: number;
  discount: number;
  /** After discount, before VAT. */
  net: number;
  vat: number;
  total: number;
};

/** All in pence. VAT is charged on the amount after the discount. */
export function invoiceTotals(inv: Pick<Invoice, 'items' | 'discountPercent' | 'vatRate'>): Totals {
  const subtotal = inv.items.reduce((sum, it) => sum + linePence(it), 0);
  const discount = Math.round((subtotal * discountPercentOf(inv)) / 100);
  const net = subtotal - discount;
  const vat = Math.round((net * vatPercent(inv.vatRate)) / 100);
  return { subtotal, discount, net, vat, total: net + vat };
}

/** £1,240.00 from 124000 pence. */
export function money(pence: number): string {
  const sign = pence < 0 ? '-' : '';
  const abs = Math.abs(pence);
  const pounds = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}£${pounds}.${String(abs % 100).padStart(2, '0')}`;
}

/** £1,240 when there are no pence, for tiles. */
export function moneyShort(pence: number): string {
  return pence % 100 === 0 ? money(pence).slice(0, -3) : money(pence);
}

/** The percentage with any trailing zeros dropped, e.g. "12.5%". */
export function percentLabel(n: number): string {
  return `${Number(n.toFixed(2))}%`;
}

// ---------- Status ----------

export type InvoiceState = 'draft' | 'unpaid' | 'overdue' | 'paid';

export const STATE_LABEL: Record<InvoiceState, string> = { draft: 'Draft', unpaid: 'Unpaid', overdue: 'Overdue', paid: 'Paid' };

export function stateColor(c: Palette, s: InvoiceState): string {
  return { draft: c.textSecondary, unpaid: c.brand, overdue: c.out, paid: c.ok }[s];
}

export function invoiceState(inv: Invoice, today = todayIso()): InvoiceState {
  if (inv.status === 'paid') return 'paid';
  if (inv.status === 'draft') return 'draft';
  return isIsoDate(inv.dueDate) && inv.dueDate < today ? 'overdue' : 'unpaid';
}

export function daysOverdue(inv: Invoice, today = todayIso()): number {
  return isIsoDate(inv.dueDate) ? daysBetween(inv.dueDate, today) : 0;
}

/** Things worth fixing before sending. These are warnings: the invoice can still be sent. */
export function invoiceProblems(inv: Invoice, engineer: Engineer): string[] {
  const out: string[] = [];
  if (!inv.customerName.trim()) out.push("Customer's name");
  if (!inv.customerAddress.line1.trim()) out.push("Customer's address");
  const items = inv.items.filter((it) => it.description.trim() || parseAmount(it.unitPrice));
  if (!items.length) out.push('At least one item');
  if (items.some((it) => !it.description.trim())) out.push('A description for every item');
  if (!(engineer.companyName.trim() || engineer.name.trim())) out.push('Your business name (in Settings)');
  if (!engineer.address.line1.trim()) out.push('Your business address (in Settings)');
  if (inv.vatRate !== 'none' && !engineer.vatNumber.trim()) out.push('Your VAT registration number (in Settings)');
  return out;
}

export function invoicePdfName(inv: Invoice): string {
  return `Invoice ${inv.number}${inv.customerName.trim() ? ` - ${inv.customerName.trim()}` : ''}.pdf`.replace(
    /[\\/:*?"<>|]/g,
    '-',
  );
}
