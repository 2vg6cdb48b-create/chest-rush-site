import { invoiceTotals, linePence, money, parseAmount, percentLabel, vatPercent, discountPercentOf } from './invoices';
import { LOGO } from './record-html';
import { classicInvoiceHtml } from './invoice-html-classic';
import { formatAddress, formatUkDate } from './records';
import type { Engineer, Invoice } from './types';

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const lines = (...parts: string[]) =>
  parts
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, i) => (i === 0 ? `<b>${esc(p)}</b>` : esc(p)))
    .join('<br>');

const qtyLabel = (q: string) => (q.trim() === '' ? '1' : String(Number(parseAmount(q).toFixed(3))));

/** The invoice as a printable A4 portrait page, in the style chosen in Settings. */
export function invoiceHtml(inv: Invoice, e: Engineer): string {
  return e.invoiceStyle === 'classic' ? classicInvoiceHtml(inv, e) : customInvoiceHtml(inv, e);
}

/** Custom: the branded navy and orange layout, matching the gas safety record. */
function customInvoiceHtml(inv: Invoice, e: Engineer): string {
  const t = invoiceTotals(inv);
  const vat = inv.vatRate !== 'none';
  const rate = vatPercent(inv.vatRate);
  const business = e.companyName.trim() || e.name.trim();
  const items = inv.items.filter((it) => it.description.trim() || parseAmount(it.unitPrice));
  const job = formatAddress(inv.jobAddress);
  const showJob = !!job && job !== formatAddress(inv.customerAddress);
  const pct = discountPercentOf(inv);

  const meta = [
    ['Invoice no.', inv.number],
    ['Invoice date', formatUkDate(inv.invoiceDate)],
    // For VAT, the date the work was done is the tax point.
    [vat ? 'Work done (tax point)' : 'Work done', formatUkDate(inv.workDate)],
    ['Payment due', formatUkDate(inv.dueDate)],
    ...(inv.reference.trim() ? [['Reference', inv.reference.trim()]] : []),
  ]
    .map(([l, v]) => `<span>${esc(l)}</span><b>${esc(v)}</b>`)
    .join('');

  const from = lines(
    business,
    e.companyName.trim() && e.name.trim() !== e.companyName.trim() ? e.name : '',
    formatAddress(e.address),
    [e.phone, e.email].map((s) => s.trim()).filter(Boolean).join(' · '),
    vat && e.vatNumber.trim() ? `VAT reg. no. ${e.vatNumber.trim()}` : '',
  );

  const billTo =
    lines(inv.customerName || ' ', formatAddress(inv.customerAddress)) +
    (showJob ? `<div class="job"><span>Job address</span><br>${esc(job)}</div>` : '');

  const rows = items
    .map(
      (it) =>
        `<tr><td>${esc(it.description)}</td><td class="r">${esc(qtyLabel(it.quantity))}</td><td class="r">${money(Math.round(parseAmount(it.unitPrice) * 100))}</td>${vat ? `<td class="r">${percentLabel(rate)}</td>` : ''}<td class="r">${money(linePence(it))}</td></tr>`,
    )
    .join('');

  const sums = [
    `<div class="s"><span>${vat ? 'Subtotal (excl. VAT)' : 'Subtotal'}</span><span>${money(t.subtotal)}</span></div>`,
    t.discount > 0 ? `<div class="s"><span>Discount ${percentLabel(pct)}</span><span>-${money(t.discount)}</span></div>` : '',
    t.discount > 0 && vat ? `<div class="s"><span>Total excl. VAT</span><span>${money(t.net)}</span></div>` : '',
    vat
      ? `<div class="s"><span>VAT at ${percentLabel(rate)}</span><span>${money(t.vat)}</span></div>`
      : '<div class="s"><span>VAT</span><span class="muted">Not VAT registered</span></div>',
    `<div class="total"><b>${inv.status === 'paid' ? 'Total paid' : 'Total due'}</b><b>${money(t.total)}</b></div>`,
  ].join('');

  const bank = [e.bankAccountName, e.bankSortCode, e.bankAccountNumber].some((s) => s.trim());
  const pay = bank
    ? `Bank transfer to <b>${esc(e.bankAccountName.trim() || business)}</b><br>` +
      [e.bankSortCode.trim() && `Sort code <b>${esc(e.bankSortCode.trim())}</b>`, e.bankAccountNumber.trim() && `Account <b>${esc(e.bankAccountNumber.trim())}</b>`]
        .filter(Boolean)
        .join(' · ') +
      `<br>Reference: <b>${esc(inv.number)}</b>` +
      '<div class="small">Please use the invoice number as the payment reference.</div>'
    : '';

  const bottom = [
    pay && `<div class="box"><h2>How to pay</h2><div class="in">${pay}</div></div>`,
    inv.notes.trim() && `<div class="box"><h2>Notes</h2><div class="in notes">${esc(inv.notes.trim())}</div></div>`,
  ].filter(Boolean);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${esc(inv.number)}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font: 10pt/1.4 -apple-system, "Helvetica Neue", Arial, sans-serif; color: #15202B; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 186mm; margin: 0 auto; position: relative; }
  .top { display: flex; gap: 4mm; align-items: stretch; }
  .title { flex: 1; background: #13294B; color: #fff; border-radius: 2mm; border-bottom: 1.4mm solid #E4501A; padding: 4mm 5mm; display: flex; gap: 4mm; align-items: center; }
  .logo { width: 15mm; height: 15mm; border-radius: 3.5mm; flex: none; display: block; }
  .title h1 { margin: 0; font-size: 21pt; letter-spacing: .06em; font-weight: 800; }
  .title p { margin: .5mm 0 0; opacity: .88; }
  .meta { width: 66mm; border: .35mm solid #E4501A; border-radius: 2mm; padding: 3mm 4mm; display: grid; grid-template-columns: auto 1fr; gap: 1mm 4mm; align-content: center; font-size: 9pt; }
  .meta span { color: #5B6472; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 6mm; }
  .box { border: .3mm solid #D5DCE4; border-radius: 2mm; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
  .box h2 { margin: 0; background: #EEF2F7; border-left: 1.3mm solid #E4501A; color: #13294B; padding: 1.4mm 3mm; font-size: 8pt; letter-spacing: .08em; text-transform: uppercase; font-weight: 800; }
  .box .in { padding: 2.5mm 3mm; line-height: 1.55; }
  .job { margin-top: 2mm; }
  .job span { color: #5B6472; }
  .notes { white-space: pre-wrap; }
  .small { color: #5B6472; font-size: 8.5pt; margin-top: 1.5mm; line-height: 1.4; }
  table { width: 100%; border-collapse: collapse; margin-top: 7mm; }
  th { text-align: left; background: #F5F7FA; color: #3B4654; font-size: 8pt; letter-spacing: .05em; text-transform: uppercase; padding: 2.4mm 2.5mm; border-bottom: .5mm solid #13294B; }
  td { padding: 2.8mm 2.5mm; border-bottom: .25mm solid #E3E7EE; vertical-align: top; }
  .r { text-align: right; white-space: nowrap; }
  th.r { text-align: right; }
  .sums { width: 78mm; margin: 4mm 0 0 auto; }
  .s { display: flex; justify-content: space-between; padding: 1.4mm 2.5mm; }
  .s span:first-child, .muted { color: #5B6472; }
  .total { display: flex; justify-content: space-between; background: #13294B; color: #fff; border-radius: 2mm; padding: 2.8mm 3mm; margin-top: 1.5mm; font-size: 12.5pt; }
  .foot { margin-top: 10mm; text-align: center; color: #8A94A3; font-size: 8pt; }
  .paid { position: absolute; top: 72mm; right: 8mm; border: 1mm solid #1E7D45; color: #1E7D45; border-radius: 2mm; padding: 1mm 4mm; font-size: 22pt; font-weight: 900; letter-spacing: .12em; transform: rotate(-10deg); opacity: .8; }
  @media screen { body { background: #E9EEEE; padding: 6mm 0; } .page { background: #fff; padding: 12mm; box-shadow: 0 1mm 4mm rgba(0,0,0,.15); width: 210mm; min-height: 297mm; } }
</style></head><body><div class="page">
  <div class="top">
    <div class="title">${LOGO}<div><h1>INVOICE</h1><p>${esc(business || 'Your business name')}</p></div></div>
    <div class="meta">${meta}</div>
  </div>
  ${inv.status === 'paid' ? '<div class="paid">PAID</div>' : ''}
  <div class="two">
    <div class="box"><h2>From</h2><div class="in">${from || '&nbsp;'}</div></div>
    <div class="box"><h2>Bill to</h2><div class="in">${billTo}</div></div>
  </div>
  <table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th>${vat ? '<th class="r">VAT</th>' : ''}<th class="r">Amount</th></tr></thead>
  <tbody>${rows || `<tr><td colspan="${vat ? 5 : 4}">&nbsp;</td></tr>`}</tbody></table>
  <div class="sums">${sums}</div>
  ${bottom.length ? `<div class="two">${bottom.join('')}</div>` : ''}
  <div class="foot">Thank you for your business${business ? ` · ${esc(business)}` : ''}</div>
</div></body></html>`;
}
