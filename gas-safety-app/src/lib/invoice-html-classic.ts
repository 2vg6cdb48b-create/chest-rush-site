import { discountPercentOf, invoiceTotals, linePence, money, parseAmount, percentLabel, vatPercent } from './invoices';
import { formatAddress, formatLongDate } from './records';
import type { Address, Engineer, Invoice } from './types';

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Each non-empty part on its own line, like an address on an envelope. */
const stack = (...parts: string[]) =>
  parts
    .map((p) => p.trim())
    .filter(Boolean)
    .map(esc)
    .join('<br>');

const addressLines = (a: Address) => [a.line1, a.line2, a.town, a.postcode];

const qtyLabel = (q: string) => (q.trim() === '' ? '1' : String(Number(parseAmount(q).toFixed(3))));

/** Classic: a plain black and white document, like a bank or accountant's invoice. */
export function classicInvoiceHtml(inv: Invoice, e: Engineer): string {
  const t = invoiceTotals(inv);
  const vat = inv.vatRate !== 'none';
  const rate = vatPercent(inv.vatRate);
  const business = e.companyName.trim() || e.name.trim();
  const items = inv.items.filter((it) => it.description.trim() || parseAmount(it.unitPrice));
  const job = formatAddress(inv.jobAddress);
  const showJob = !!job && job !== formatAddress(inv.customerAddress);
  const workDate = formatLongDate(inv.workDate);

  const from = stack(
    business && e.name.trim() && e.name.trim() !== business ? e.name : '',
    ...addressLines(e.address),
    e.phone,
    e.email,
    vat && e.vatNumber.trim() ? `VAT reg. no. ${e.vatNumber.trim()}` : '',
  );

  const meta = [
    ['Invoice number', inv.number, true],
    ['Invoice date', formatLongDate(inv.invoiceDate)],
    ...(vat ? [['Tax point', workDate]] : []),
    ['Due date', formatLongDate(inv.dueDate)],
    ...(inv.reference.trim() ? [['Your reference', inv.reference.trim()]] : []),
    ...(inv.status === 'paid' && inv.paidAt ? [['Paid', new Date(inv.paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), true]] : []),
  ]
    .map(([l, v, bold]) => `<tr><th>${esc(l)}</th><td${bold ? ' class="b"' : ''}>${esc(v)}</td></tr>`)
    .join('');

  const rows = items
    .map(
      (it, i) =>
        `<tr><td>${i + 1}</td><td class="nw">${esc(workDate)}</td><td class="d">${esc(it.description)}</td><td class="r">${esc(qtyLabel(it.quantity))}</td><td class="r">${money(Math.round(parseAmount(it.unitPrice) * 100))}</td><td class="r">${vat ? percentLabel(rate) : 'No VAT'}</td><td class="r">${money(linePence(it))}</td></tr>`,
    )
    .join('');

  const sums = [
    ['Subtotal', money(t.subtotal)],
    ...(t.discount > 0 ? [[`Discount ${percentLabel(discountPercentOf(inv))}`, `-${money(t.discount)}`]] : []),
    ...(vat ? [[`VAT at ${percentLabel(rate)}`, money(t.vat)]] : []),
  ]
    .map(([l, v]) => `<tr><th>${esc(l)}</th><td>${esc(v)}</td></tr>`)
    .join('');

  const bankRows = [
    ['Account name', e.bankAccountName],
    ['Account number', e.bankAccountNumber],
    ['Sort code', e.bankSortCode],
  ].filter(([, v]) => v.trim());
  const payment = bankRows.length
    ? `<div class="col"><h2>Payment details</h2><table class="kv">${[...bankRows, ['Payment reference', inv.number]]
        .map(([l, v]) => `<tr><th>${esc(l)}</th><td>${esc(v.trim())}</td></tr>`)
        .join('')}</table><p>If paying by bank transfer, please use the invoice number as the payment reference.</p></div>`
    : '';
  const notes = inv.notes.trim()
    ? `<div class="col"><h2>Additional information</h2><p class="notes">${esc(inv.notes.trim())}</p></div>`
    : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${esc(inv.number)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font: 9.5pt/1.45 "Helvetica Neue", Helvetica, Arial, sans-serif; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 182mm; margin: 0 auto; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8mm; }
  .biz { font-size: 13pt; font-weight: 700; margin: 0 0 3mm; }
  .doc { font-size: 20pt; font-weight: 600; margin: 0 0 3mm; text-align: right; }
  .meta { border-collapse: collapse; margin-left: auto; }
  .meta th { text-align: right; font-weight: 400; color: #333; padding: .3mm 6mm .3mm 0; white-space: nowrap; }
  .meta th:first-child { font-weight: 400; }
  .meta td { text-align: right; padding: .3mm 0; white-space: nowrap; }
  .b { font-weight: 700; }
  h2 { font-size: 10pt; font-weight: 700; margin: 0 0 2mm; padding-bottom: 1.5mm; border-bottom: .4mm solid #E6E6E6; }
  .to { margin-top: 9mm; }
  .to .cols { display: flex; gap: 14mm; }
  .label { color: #555; }
  .items { width: 100%; border-collapse: collapse; margin-top: 9mm; }
  .items th { text-align: left; font-weight: 700; padding: 1.6mm 1.8mm; border-bottom: .4mm solid #E6E6E6; white-space: nowrap; }
  .items td { padding: 2mm 1.8mm; border-bottom: .4mm solid #E6E6E6; vertical-align: top; }
  .items .r { text-align: right; white-space: nowrap; }
  .items .nw { white-space: nowrap; }
  .items .d { width: 100%; }
  .sums { border-collapse: collapse; margin: 5mm 0 0 auto; min-width: 70mm; }
  .sums th { text-align: right; font-weight: 400; color: #333; padding: 1.4mm 8mm 1.4mm 0; }
  .sums td { text-align: right; padding: 1.4mm 1.8mm; white-space: nowrap; }
  .sums tr.total th, .sums tr.total td { font-weight: 700; color: #111; padding-top: 2.5mm; }
  .bottom { display: flex; gap: 8mm; margin-top: 16mm; }
  .col { flex: 1; break-inside: avoid; page-break-inside: avoid; }
  .kv { border-collapse: collapse; }
  .kv th { text-align: left; font-weight: 400; padding: .4mm 10mm .4mm 0; white-space: nowrap; }
  .kv td { padding: .4mm 0; }
  .col p { margin: 3mm 0 0; }
  .notes { white-space: pre-wrap; margin-top: 0 !important; }
  @media screen { body { background: #EEE; padding: 6mm 0; } .page { background: #fff; padding: 14mm; box-shadow: 0 1mm 4mm rgba(0,0,0,.15); width: 210mm; min-height: 297mm; } }
</style></head><body><div class="page">
  <div class="head">
    <div><p class="biz">${esc(business || 'Your business name')}</p><div>${from}</div></div>
    <div><p class="doc">Invoice</p><table class="meta">${meta}</table></div>
  </div>
  <div class="to"><h2>Invoice to</h2><div class="cols">
    <div>${stack(inv.customerName, ...addressLines(inv.customerAddress)) || '&nbsp;'}</div>
    ${showJob ? `<div><span class="label">Job address</span><br>${stack(...addressLines(inv.jobAddress))}</div>` : ''}
  </div></div>
  <table class="items"><thead><tr><th>Number</th><th>Date</th><th>Details</th><th class="r">Quantity</th><th class="r">Price/Rate</th><th class="r">VAT</th><th class="r">Subtotal</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="7">&nbsp;</td></tr>'}</tbody></table>
  <table class="sums">${sums}<tr class="total"><th>${inv.status === 'paid' ? 'Invoice total (paid)' : 'Invoice total'}</th><td>${money(t.total)}</td></tr></table>
  ${payment || notes ? `<div class="bottom">${payment}${notes}</div>` : ''}
</div></body></html>`;
}
