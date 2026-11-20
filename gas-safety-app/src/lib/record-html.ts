import {
  applianceHasFault,
  coRatio,
  formatAddress,
  formatUkDate,
  installationHasFault,
  signatureViewBox,
} from './records';
import type { Appliance, Engineer, GasRecord, Signature } from './types';

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const answer = (v: string) =>
  ({ pass: 'Pass', fail: 'Fail', na: 'N/A', yes: 'Yes', no: 'No' })[v] ?? '';

/** A table cell for an answer, highlighted when it's a failure. */
function ans(v: string) {
  const bad = v === 'fail' || v === 'no';
  return `<td class="c${bad ? ' bad' : ''}">${esc(answer(v))}</td>`;
}

/** A table cell for a yes/no fact where "No" isn't a failure (e.g. serviced, inspected). */
function fact(v: string) {
  return `<td class="c">${esc(answer(v))}</td>`;
}

function signatureSvg(sig: Signature | null) {
  if (!sig) return '';
  const paths = sig.paths
    .map(
      (d) =>
        `<path d="${esc(d)}" fill="none" stroke="#1B2A4A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('');
  return `<svg viewBox="${signatureViewBox(sig)}" preserveAspectRatio="xMinYMax meet" class="sig">${paths}</svg>`;
}

function lines(...parts: string[]) {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .map(esc)
    .join('<br>');
}

function field(label: string, value: string) {
  return `<div class="f"><span class="l">${esc(label)}</span><span class="v">${value || '&nbsp;'}</span></div>`;
}

const FLUE: Record<string, string> = { RS: 'RS', OF: 'OF', FL: 'FL', na: 'N/A' };

/** The record as a printable A4 landscape page, laid out like a paper landlord's gas safety record. */
export function recordHtml(r: GasRecord, engineer: Engineer): string {
  const minRows = 2;
  const rows: (Appliance | null)[] = [...r.appliances];
  while (rows.length < minRows) rows.push(null);

  const detailRows = rows
    .map((a, i) =>
      a
        ? `<tr><td class="c n">${i + 1}</td><td>${esc(a.location)}</td><td>${esc(a.type)}</td><td>${esc(a.make)}</td><td>${esc(a.model)}</td>${fact(a.landlordsAppliance)}${fact(a.inspected)}<td class="c">${esc(FLUE[a.flueType] ?? '')}</td></tr>`
        : `<tr><td class="c n">${i + 1}</td><td colspan="7">&nbsp;</td></tr>`,
    )
    .join('');

  const checkRows = rows
    .map((a, i) =>
      a
        ? `<tr><td class="c n">${i + 1}</td><td class="c">${esc(a.operatingPressure)}</td><td class="c">${esc(a.heatInput)}</td>${ans(a.safetyDevices)}${ans(a.ventilation)}${ans(a.flueVisual)}${ans(a.fluePerformance)}<td class="c">${esc(a.coPpm)}</td><td class="c">${esc(a.co2Percent)}</td><td class="c">${esc(coRatio(a.coPpm, a.co2Percent))}</td>${fact(a.serviced)}${ans(a.coAlarmFitted)}${ans(a.coAlarmTested)}${ans(a.safeToUse)}</tr>`
        : `<tr><td class="c n">${i + 1}</td><td colspan="13">&nbsp;</td></tr>`,
    )
    .join('');

  const defectRows: string[] = [];
  r.appliances.forEach((a, i) => {
    if (!applianceHasFault(a) && !a.defects.trim() && !a.remedialAction.trim()) return;
    defectRows.push(
      `<tr><td class="c n">${i + 1}</td><td>${esc(a.defects)}</td><td class="c${a.classification !== 'none' ? ' bad' : ''}">${a.classification === 'none' ? '' : a.classification}</td>${fact(a.warningNoticeIssued)}${fact(a.warningLabelAttached)}<td>${esc(a.remedialAction)}</td></tr>`,
    );
  });
  if (installationHasFault(r) || r.installationDefects.trim()) {
    defectRows.push(
      `<tr><td class="c n">Inst.</td><td>${esc(r.installationDefects)}</td><td class="c${r.installationClassification !== 'none' ? ' bad' : ''}">${r.installationClassification === 'none' ? '' : r.installationClassification}</td><td class="c"></td><td class="c"></td><td>${esc(r.installationRemedial)}</td></tr>`,
    );
  }
  if (defectRows.length === 0) {
    defectRows.push(`<tr><td colspan="6" class="none">No gas safety defects identified.</td></tr>`);
  }

  const who = r.landlordIsAgent ? 'Agent' : 'Landlord';
  const draft = r.status !== 'issued';

  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Landlord Gas Safety Record ${esc(r.number)}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font: 8.4pt/1.25 -apple-system, "Helvetica Neue", Arial, sans-serif; color: #15202B; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 281mm; margin: 0 auto; position: relative; }
  .top { display: flex; align-items: stretch; gap: 3mm; margin-bottom: 2mm; }
  .title { flex: 1; background: #0B6E69; color: #fff; padding: 2mm 4mm; border-radius: 1.5mm; }
  .title h1 { margin: 0; font-size: 16pt; letter-spacing: .04em; font-weight: 800; }
  .title p { margin: .8mm 0 0; font-size: 8pt; opacity: .92; }
  .meta { width: 74mm; border: .3mm solid #0B6E69; border-radius: 1.5mm; padding: 1.5mm 3mm; display: grid; grid-template-columns: auto 1fr; gap: .6mm 3mm; align-content: center; }
  .meta b { font-size: 9.5pt; }
  .meta span { color: #47525E; }
  .boxes { display: grid; grid-template-columns: 1.1fr 1fr 1fr; gap: 2.5mm; margin-bottom: 2mm; }
  .box { border: .3mm solid #9FB4B2; border-radius: 1.5mm; overflow: hidden; }
  .box h2, .sec h2 { margin: 0; background: #DDF1EF; color: #0B4F4B; font-size: 7.6pt; text-transform: uppercase; letter-spacing: .06em; padding: 1mm 2.5mm; font-weight: 800; }
  .box .in { padding: 1mm 2.5mm; }
  .f { display: flex; gap: 2mm; padding: .2mm 0; border-bottom: .2mm dotted #C5D2D1; }
  .f:last-child { border-bottom: 0; }
  .l { color: #47525E; width: 26mm; flex: none; }
  .v { font-weight: 600; }
  .sec { border: .3mm solid #9FB4B2; border-radius: 1.5mm; overflow: hidden; margin-bottom: 2mm; break-inside: avoid; page-break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #F1F6F6; color: #2B3742; font-size: 6.8pt; font-weight: 700; padding: .8mm 1mm; border: .2mm solid #C5D2D1; vertical-align: bottom; line-height: 1.15; }
  td { border: .2mm solid #C5D2D1; padding: .6mm 1.2mm; height: 5mm; vertical-align: middle; }
  td.c { text-align: center; }
  td.n { width: 7mm; color: #47525E; font-weight: 700; }
  td.bad { color: #B42318; font-weight: 800; }
  td.none { color: #47525E; font-style: italic; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5mm; }
  .inst td { width: 25%; }
  .inst .l2 { color: #47525E; display: block; font-size: 6.8pt; }
  .inst b { font-size: 9pt; }
  .decl { font-size: 7.2pt; color: #2B3742; padding: 1mm 2.5mm 0; }
  .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5mm; padding: 1mm 2.5mm 1.5mm; }
  .sigbox { border: .2mm solid #C5D2D1; border-radius: 1mm; padding: 1mm 2mm; }
  .sigline { height: 12mm; border-bottom: .2mm solid #8A99A8; display: flex; align-items: flex-end; overflow: hidden; }
  .sig { display: block; height: 11.5mm; width: 60mm; }
  .small { font-size: 6.6pt; color: #47525E; margin-top: 1mm; display: flex; justify-content: space-between; gap: 4mm; }
  .notes { padding: 1.5mm 2.5mm; white-space: pre-wrap; }
  .draft { position: absolute; top: 60mm; left: 0; right: 0; text-align: center; font-size: 70pt; font-weight: 900; color: rgba(180, 35, 24, .12); transform: rotate(-12deg); pointer-events: none; letter-spacing: .1em; }
  @media screen { body { background: #E9EEEE; padding: 6mm 0; } .page { background: #fff; padding: 6mm; box-shadow: 0 1mm 4mm rgba(0,0,0,.15); width: 297mm; } }
</style></head>
<body><div class="page">
${draft ? '<div class="draft">DRAFT</div>' : ''}
<div class="top">
  <div class="title">
    <h1>LANDLORD GAS SAFETY RECORD</h1>
    <p>Gas Safety (Installation and Use) Regulations 1998 — Regulation 36(3)</p>
  </div>
  <div class="meta">
    <span>Record no.</span><b>${esc(r.number)}</b>
    <span>Date of check</span><b>${esc(formatUkDate(r.checkDate))}</b>
    <span>Next check due by</span><b>${esc(formatUkDate(r.nextDueDate))}</b>
  </div>
</div>

<div class="boxes">
  <div class="box"><h2>Gas Safe registered engineer</h2><div class="in">
    ${field('Business', esc(engineer.companyName))}
    ${field('Engineer', esc(engineer.name))}
    ${field('Address', lines(formatAddress(engineer.address)))}
    ${field('Phone / email', lines([engineer.phone, engineer.email].filter(Boolean).join('  ·  ')))}
    ${field('Gas Safe reg. no.', esc(engineer.gasSafeNumber))}
    ${field('Licence / ID no.', esc(engineer.licenceNumber))}
  </div></div>
  <div class="box"><h2>Property checked (site address)</h2><div class="in">
    ${field('Address', lines(r.property.line1, r.property.line2))}
    ${field('Town', esc(r.property.town))}
    ${field('Postcode', esc(r.property.postcode))}
    ${field('Tenant / occupier', esc(r.tenantName))}
  </div></div>
  <div class="box"><h2>${who} details</h2><div class="in">
    ${field('Name', esc(r.landlordName))}
    ${field('Address', lines(formatAddress(r.landlordAddress)))}
    ${field('Phone', esc(r.landlordPhone))}
    ${field('Email', esc(r.landlordEmail))}
  </div></div>
</div>

<div class="sec"><h2>Appliance details</h2>
<table><thead><tr>
  <th>No.</th><th style="width:16%">Location</th><th style="width:15%">Appliance type</th><th style="width:15%">Make</th><th style="width:15%">Model</th>
  <th>Landlord's appliance</th><th>Appliance inspected</th><th>Flue type<br>(RS / OF / FL)</th>
</tr></thead><tbody>${detailRows}</tbody></table></div>

<div class="sec"><h2>Inspection details</h2>
<table><thead><tr>
  <th>No.</th><th>Operating pressure (mbar)</th><th>Heat input (kW)</th><th>Safety device(s) correct operation</th><th>Ventilation satisfactory</th>
  <th>Visual condition of flue / termination satisfactory</th><th>Flue performance checks (spillage / flue flow)</th>
  <th>Combustion CO (ppm)</th><th>CO₂ (%)</th><th>CO/CO₂ ratio</th><th>Appliance serviced</th><th>CO alarm fitted</th><th>CO alarm tested</th><th>Appliance safe to use</th>
</tr></thead><tbody>${checkRows}</tbody></table></div>

<div class="sec"><h2>Gas safety defects identified and remedial action</h2>
<table><thead><tr>
  <th>No.</th><th style="width:36%">Defect(s) identified</th><th>Classification<br>(AR / ID)</th><th>Warning notice issued</th><th>Warning label attached</th><th style="width:30%">Remedial action taken</th>
</tr></thead><tbody>${defectRows.join('')}</tbody></table></div>

<div class="sec inst"><h2>Installation checks</h2>
<table><tbody><tr>
  <td><span class="l2">Gas tightness test</span><b>${esc(answer(r.tightnessTest))}</b></td>
  <td><span class="l2">Emergency control valve accessible and labelled</span><b>${esc(answer(r.ecvAccessible))}</b></td>
  <td><span class="l2">Protective equipotential bonding satisfactory</span><b>${esc(answer(r.bonding))}</b></td>
  <td><span class="l2">Installation pipework visual inspection</span><b>${esc(answer(r.pipeworkVisual))}</b></td>
</tr></tbody></table></div>

${r.notes.trim() ? `<div class="sec"><h2>Notes</h2><div class="notes">${esc(r.notes)}</div></div>` : ''}

<div class="sec"><h2>Declaration and signatures</h2>
  <div class="decl">The appliances and flues listed above have been checked for safety in accordance with Regulation 36(3) of the Gas Safety (Installation and Use) Regulations 1998. The check included an examination of the matters in Regulation 26(9): the effectiveness of any flue, the supply of combustion air, the operating pressure and/or heat input (or combustion performance), and the operation of each appliance to ensure its safe functioning.</div>
  <div class="signs">
    <div class="sigbox">
      <div class="sigline">${signatureSvg(r.engineerSignature)}</div>
      <div class="small"><span>Engineer: <b>${esc(engineer.name)}</b></span><span>Gas Safe reg. no. <b>${esc(engineer.gasSafeNumber)}</b></span><span>Date: <b>${esc(formatUkDate(r.checkDate))}</b></span></div>
    </div>
    <div class="sigbox">
      <div class="sigline">${signatureSvg(r.receivedBySignature)}</div>
      <div class="small"><span>Received by: <b>${esc(r.receivedByName)}</b></span><span>${esc(r.receivedByRole)}</span><span>Date: <b>${esc(formatUkDate(r.checkDate))}</b></span></div>
    </div>
  </div>
</div>

<div class="small">
  <span>Key: RS room sealed · OF open flue · FL flueless · AR At Risk · ID Immediately Dangerous (IGEM/G/11) · N/A not applicable.</span>
  <span>Landlord: give a copy to each existing tenant within 28 days of the check, and to new tenants before they move in. Keep this record until two further checks have been made.</span>
</div>
</div></body></html>`;
}
