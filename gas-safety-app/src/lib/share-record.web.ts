import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import { notify } from './ui';

const A4_W_MM = 297;
const A4_H_MM = 210;
const MARGIN_MM = 8;
const CONTENT_W_MM = A4_W_MM - MARGIN_MM * 2;
const CONTENT_H_MM = A4_H_MM - MARGIN_MM * 2;
const PAGE_PX = 1123; // A4 landscape width at 96 dpi

/** Lays the record out in an off-screen frame, the way it prints. */
async function renderFrame(html: string): Promise<{ frame: HTMLIFrameElement; page: HTMLElement }> {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${PAGE_PX}px`,
    height: '800px',
    border: '0',
  });
  document.body.appendChild(frame);
  const printLike =
    '<style>body{background:#fff!important;padding:0!important;margin:0!important}' +
    '.page{box-shadow:none!important;padding:0!important;width:281mm!important;margin:0!important}</style>';
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(html.replace('</head>', `${printLike}</head>`));
  doc.close();
  await new Promise((r) => setTimeout(r, 150));
  if (doc.fonts?.ready) await doc.fonts.ready.catch(() => {});
  return { frame, page: (doc.querySelector('.page') as HTMLElement | null) ?? doc.body };
}

/** Turns the record's HTML into an A4 landscape PDF. */
async function htmlToPdf(html: string): Promise<Blob> {
  const { frame, page: content } = await renderFrame(html);
  try {
    const canvas = await html2canvas(content, {
      scale: 2.5,
      backgroundColor: '#ffffff',
      windowWidth: PAGE_PX,
      useCORS: true,
      logging: false,
    });
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    const pxPerMm = canvas.width / CONTENT_W_MM;
    const contentHeightMm = canvas.height / pxPerMm;
    const jpeg = (c: HTMLCanvasElement) => c.toDataURL('image/jpeg', 0.92);

    if (contentHeightMm <= CONTENT_H_MM * 1.4) {
      // Normal records: always one page. A slightly tall one is shrunk to fit and centred.
      const scale = Math.min(1, CONTENT_H_MM / contentHeightMm);
      const w = CONTENT_W_MM * scale;
      pdf.addImage(jpeg(canvas), 'JPEG', MARGIN_MM + (CONTENT_W_MM - w) / 2, MARGIN_MM, w, contentHeightMm * scale);
      return pdf.output('blob');
    }

    // Very long records (many appliances): one A4 page per slice.
    const pageHeightPx = Math.floor(CONTENT_H_MM * pxPerMm);
    for (let y = 0, page = 0; y < canvas.height - 2 * pxPerMm; y += pageHeightPx, page++) {
      const sliceH = Math.min(pageHeightPx, canvas.height - y);
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceH;
      slice.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      if (page > 0) pdf.addPage('a4', 'landscape');
      pdf.addImage(jpeg(slice), 'JPEG', MARGIN_MM, MARGIN_MM, CONTENT_W_MM, sliceH / pxPerMm);
    }
    return pdf.output('blob');
  } finally {
    frame.remove();
  }
}

/**
 * Shows a small "PDF ready" card. Phones only open the share sheet straight from a tap,
 * so sharing happens when the Share button on this card is tapped.
 */
function offerShare(file: File) {
  return new Promise<void>((resolve) => {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(11,23,48,.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '99999',
      padding: '24px',
      font: '16px -apple-system, system-ui, sans-serif',
    });
    overlay.innerHTML = `
      <div role="dialog" aria-label="PDF ready" style="background:#fff;border-radius:18px;padding:22px;max-width:360px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.3)">
        <div style="font-weight:800;font-size:19px;color:#13294B">Your PDF is ready</div>
        <div style="color:#5B6472;font-size:15px;line-height:1.4;margin:6px 0 18px"></div>
        <button data-share style="width:100%;min-height:50px;border:0;border-radius:14px;background:#C2410C;color:#fff;font:700 17px -apple-system,system-ui,sans-serif">Share PDF</button>
        <button data-cancel style="width:100%;min-height:46px;border:0;background:none;color:#C2410C;font:600 16px -apple-system,system-ui,sans-serif;margin-top:6px">Cancel</button>
      </div>`;
    (overlay.querySelector('div div:nth-child(2)') as HTMLElement).textContent =
      `${file.name} — send it by email, WhatsApp or Messages, or save it to Files.`;
    const close = () => {
      overlay.remove();
      resolve();
    };
    overlay.querySelector('[data-cancel]')!.addEventListener('click', close);
    overlay.querySelector('[data-share]')!.addEventListener('click', () => {
      (navigator as any)
        .share({ files: [file], title: file.name })
        .catch(() => {})
        .finally(close);
    });
    document.body.appendChild(overlay);
  });
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Makes a real PDF of the record and opens the share sheet (email, WhatsApp, Files…). */
export async function shareRecordPdf(html: string, filename: string) {
  let blob: Blob;
  try {
    blob = await htmlToPdf(html);
  } catch (e) {
    notify('Could not create the PDF', e instanceof Error ? e.message : String(e));
    return;
  }
  const file = new File([blob], filename, { type: 'application/pdf' });
  const nav = navigator as any;
  if (nav.canShare?.({ files: [file] })) {
    await offerShare(file);
  } else {
    // Computers and older browsers: save the file instead.
    download(blob, filename);
  }
}

export async function printRecord(html: string) {
  return shareRecordPdf(html, 'Gas Safety Record.pdf');
}
