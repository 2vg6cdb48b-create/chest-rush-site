import { notify } from './ui';

/**
 * In a browser the record opens in a new tab, ready to print or save as a PDF
 * (Share → Print on iPhone, or Ctrl/Cmd+P on a computer).
 */
export async function shareRecordPdf(html: string, _filename: string) {
  const w = (globalThis as any).open?.('', '_blank');
  if (!w) {
    notify(
      'Couldn’t open the record',
      'This page isn’t allowed to open a new tab. The PDF works in the iPhone app and on the Gas Safety Records website.',
    );
    return;
  }
  const bar = `<div class="no-print" style="position:sticky;top:0;z-index:5;display:flex;gap:8px;justify-content:center;padding:10px;background:#0B6E69;font:600 15px -apple-system,Arial,sans-serif">
    <button onclick="window.print()" style="font:inherit;padding:8px 16px;border-radius:8px;border:0;background:#fff;color:#0B6E69">Print or save as PDF</button>
    <button onclick="window.close()" style="font:inherit;padding:8px 16px;border-radius:8px;border:1px solid #fff;background:transparent;color:#fff">Close</button>
  </div><style>@media print { .no-print { display: none !important; } }</style>`;
  w.document.open();
  w.document.write(html.replace('<body>', `<body>${bar}`));
  w.document.close();
}

export async function printRecord(html: string) {
  return shareRecordPdf(html, '');
}
