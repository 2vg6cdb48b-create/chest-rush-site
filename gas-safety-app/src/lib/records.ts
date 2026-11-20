import type { Address, AppData, Appliance, Engineer, GasRecord, Signature } from './types';

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const emptyAddress = (): Address => ({ line1: '', line2: '', town: '', postcode: '' });

export function emptyEngineer(): Engineer {
  return {
    name: '',
    companyName: '',
    address: emptyAddress(),
    phone: '',
    email: '',
    gasSafeNumber: '',
    licenceNumber: '',
    signature: null,
    recordPrefix: 'LGSR-',
    nextRecordNumber: 1,
    lastBackupAt: null,
  };
}

export function emptyData(): AppData {
  return { version: 1, engineer: emptyEngineer(), records: [] };
}

// ---------- Dates (stored as YYYY-MM-DD, shown as DD/MM/YYYY) ----------

const pad = (n: number) => String(n).padStart(2, '0');

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** "07/03/2027" or "7/3/27" -> "2027-03-07", or null if it isn't a real date. */
export function parseUkDate(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{2}|\d{4})$/);
  if (!m) return null;
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const iso = `${year}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
  return isIsoDate(iso) ? iso : null;
}

export function formatUkDate(iso: string): string {
  if (!isIsoDate(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function formatLongDate(iso: string): string {
  if (!isIsoDate(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Adds whole months, keeping the day where possible (29 Feb + 12 months -> 28 Feb). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(Math.min(d, lastDay))}`;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const [a, b] = [fromIso, toIso].map((s) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  });
  return Math.round((b - a) / 86400000);
}

/**
 * When the next check is due. Regulation 36A: a check done in the 2 months before
 * the deadline is treated as done on the deadline, so the anniversary date is kept.
 * Otherwise the 12 months start again from this check.
 */
export function nextDueDate(checkDate: string, previousDueDate: string): {
  date: string;
  keptAnniversary: boolean;
} {
  if (!isIsoDate(checkDate)) return { date: '', keptAnniversary: false };
  if (isIsoDate(previousDueDate)) {
    const windowStart = addMonths(previousDueDate, -2);
    if (checkDate >= windowStart && checkDate <= previousDueDate) {
      return { date: addMonths(previousDueDate, 12), keptAnniversary: true };
    }
  }
  return { date: addMonths(checkDate, 12), keptAnniversary: false };
}

// ---------- Records ----------

export function newAppliance(): Appliance {
  return {
    id: newId(),
    location: '',
    type: '',
    make: '',
    model: '',
    landlordsAppliance: 'yes',
    inspected: 'yes',
    flueType: '',
    operatingPressure: '',
    heatInput: '',
    coPpm: '',
    co2Percent: '',
    safetyDevices: '',
    ventilation: '',
    flueVisual: '',
    fluePerformance: '',
    serviced: '',
    coAlarmFitted: '',
    coAlarmTested: '',
    safeToUse: '',
    defects: '',
    classification: 'none',
    warningNoticeIssued: '',
    warningLabelAttached: '',
    remedialAction: '',
  };
}

export function recordNumber(engineer: Engineer): string {
  return `${engineer.recordPrefix}${String(engineer.nextRecordNumber).padStart(4, '0')}`;
}

export function newRecord(number: string): GasRecord {
  const now = Date.now();
  const checkDate = todayIso();
  return {
    id: newId(),
    number,
    status: 'draft',
    checkDate,
    nextDueDate: nextDueDate(checkDate, '').date,
    previousDueDate: '',
    property: emptyAddress(),
    tenantName: '',
    landlordIsAgent: false,
    landlordName: '',
    landlordAddress: emptyAddress(),
    landlordPhone: '',
    landlordEmail: '',
    appliances: [],
    tightnessTest: '',
    ecvAccessible: '',
    bonding: '',
    pipeworkVisual: '',
    installationDefects: '',
    installationRemedial: '',
    installationClassification: 'none',
    notes: '',
    engineerSignature: null,
    receivedByName: '',
    receivedByRole: '',
    receivedBySignature: null,
    issuedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Next year's record for the same property: same landlord and appliances, fresh checks. */
export function renewalOf(old: GasRecord, number: string): GasRecord {
  const fresh = newRecord(number);
  const previousDueDate = old.nextDueDate;
  return {
    ...fresh,
    previousDueDate,
    nextDueDate: nextDueDate(fresh.checkDate, previousDueDate).date,
    property: { ...old.property },
    tenantName: old.tenantName,
    landlordIsAgent: old.landlordIsAgent,
    landlordName: old.landlordName,
    landlordAddress: { ...old.landlordAddress },
    landlordPhone: old.landlordPhone,
    landlordEmail: old.landlordEmail,
    appliances: old.appliances.map((a) => ({
      ...newAppliance(),
      location: a.location,
      type: a.type,
      make: a.make,
      model: a.model,
      landlordsAppliance: a.landlordsAppliance,
      inspected: a.inspected,
      flueType: a.flueType,
    })),
  };
}

export function formatAddress(a: Address, separator = ', '): string {
  return [a.line1, a.line2, a.town, a.postcode].map((s) => s.trim()).filter(Boolean).join(separator);
}

/** Groups records for the same property, e.g. to find the latest one. */
export function propertyKey(r: GasRecord): string {
  return `${r.property.line1}|${r.property.postcode}`.toLowerCase().replace(/[^a-z0-9|]/g, '');
}

/** CO/CO2 ratio from analyser readings, e.g. 0.0012, or '' if it can't be worked out. */
export function coRatio(coPpm: string, co2Percent: string): string {
  const co = Number(coPpm);
  const co2 = Number(co2Percent);
  if (!coPpm.trim() || !co2Percent.trim() || !Number.isFinite(co) || !Number.isFinite(co2) || co2 <= 0) {
    return '';
  }
  return (co / (co2 * 10000)).toFixed(4);
}

export function applianceHasFault(a: Appliance): boolean {
  return (
    a.safeToUse === 'no' ||
    [a.safetyDevices, a.flueVisual, a.fluePerformance].includes('fail') ||
    a.ventilation === 'no' ||
    a.classification !== 'none'
  );
}

export function installationHasFault(r: GasRecord): boolean {
  return (
    r.tightnessTest === 'fail' ||
    r.pipeworkVisual === 'fail' ||
    r.ecvAccessible === 'no' ||
    r.installationClassification !== 'none'
  );
}

export function recordHasFault(r: GasRecord): boolean {
  return r.appliances.some(applianceHasFault) || installationHasFault(r);
}

export function applianceTitle(a: Appliance, index: number): string {
  const what = [a.type, a.make].filter(Boolean).join(' · ') || 'Appliance';
  return `${index + 1}. ${what}${a.location ? ` – ${a.location}` : ''}`;
}

/** Problems with one appliance that stop the record being issued. */
export function applianceProblems(a: Appliance): string[] {
  const p: string[] = [];
  if (!a.location.trim()) p.push('location');
  if (!a.type.trim()) p.push('appliance type');
  const fullCheck = a.landlordsAppliance === 'yes' && a.inspected === 'yes';
  if (fullCheck) {
    // Gas Safe Register's Registration Policy asks for make, model and location on work records.
    if (!a.make.trim()) p.push('make');
    if (!a.model.trim()) p.push('model');
    if (!a.flueType) p.push('flue type');
    if (!a.operatingPressure.trim() && !a.heatInput.trim() && !(a.coPpm.trim() && a.co2Percent.trim())) {
      p.push('operating pressure, heat input or combustion readings');
    }
    if (!a.safetyDevices) p.push('safety devices');
    if (!a.ventilation) p.push('ventilation');
    if (!a.flueVisual) p.push('flue visual condition');
    if (!a.fluePerformance) p.push('flue performance test');
  }
  if (!a.safeToUse) p.push('safe to use');
  const faulty = applianceHasFault(a);
  if (faulty && !a.defects.trim()) p.push('defects identified');
  if (a.safeToUse === 'no' && a.classification === 'none') p.push('classification (AR or ID)');
  if (a.defects.trim() && !a.remedialAction.trim()) p.push('remedial action taken');
  if (a.classification !== 'none' && !a.warningNoticeIssued) p.push('warning notice issued');
  return p;
}

/** Everything that must be filled in before the record can be issued, in plain words. */
export function issueProblems(r: GasRecord, engineer: Engineer): string[] {
  const p: string[] = [];
  if (!engineer.name.trim()) p.push('Your name (Settings)');
  if (!engineer.gasSafeNumber.trim()) p.push('Your Gas Safe registration number (Settings)');
  if (!isIsoDate(r.checkDate)) p.push('Date of the check');
  if (!r.property.line1.trim() || !r.property.postcode.trim()) p.push('Property address and postcode');
  if (!r.landlordName.trim()) p.push(`${r.landlordIsAgent ? 'Agent' : 'Landlord'} name`);
  if (!r.landlordAddress.line1.trim()) p.push(`${r.landlordIsAgent ? 'Agent' : 'Landlord'} address`);
  if (r.appliances.length === 0) p.push('At least one appliance');
  r.appliances.forEach((a, i) => {
    const missing = applianceProblems(a);
    if (missing.length) p.push(`Appliance ${i + 1}: ${missing.join(', ')}`);
  });
  const installation: [string, string][] = [
    ['gas tightness test', r.tightnessTest],
    ['emergency control valve', r.ecvAccessible],
    ['equipotential bonding', r.bonding],
    ['pipework visual inspection', r.pipeworkVisual],
  ];
  const unanswered = installation.filter(([, v]) => !v).map(([label]) => label);
  if (unanswered.length) p.push(`Installation: ${unanswered.join(', ')}`);
  if (installationHasFault(r) && !r.installationDefects.trim()) {
    p.push('Installation: describe the defect');
  }
  if (r.installationDefects.trim() && !r.installationRemedial.trim()) {
    p.push('Installation: remedial action taken');
  }
  if (!r.engineerSignature) p.push('Your signature');
  return p;
}

// ---------- Loading and backups ----------

function text(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function address(v: unknown): Address {
  const a = (v ?? {}) as Record<string, unknown>;
  return { line1: text(a.line1), line2: text(a.line2), town: text(a.town), postcode: text(a.postcode) };
}

function signature(v: unknown): Signature | null {
  const s = v as Signature | null;
  if (!s || !Array.isArray(s.paths) || !s.width || !s.height) return null;
  return { paths: s.paths.filter((p) => typeof p === 'string'), width: Number(s.width), height: Number(s.height) };
}

/** Checks and fills in data loaded from storage or a backup file. Throws if it isn't one of ours. */
export function parseAppData(raw: unknown): AppData {
  const src = raw as Partial<AppData>;
  if (!src || typeof src !== 'object' || !Array.isArray(src.records)) {
    throw new Error('This file is not a Gas Safety Records backup.');
  }
  const e = (src.engineer ?? {}) as Partial<Engineer>;
  const engineer: Engineer = {
    ...emptyEngineer(),
    ...e,
    address: address(e.address),
    signature: signature(e.signature),
    nextRecordNumber: Math.max(1, Number(e.nextRecordNumber) || 1),
    lastBackupAt: typeof e.lastBackupAt === 'number' ? e.lastBackupAt : null,
    recordPrefix: typeof e.recordPrefix === 'string' ? e.recordPrefix : 'LGSR-',
  };
  const records = src.records
    .filter((r) => r && typeof r === 'object')
    .map((r) => {
      const base = newRecord(text(r.number));
      return {
        ...base,
        ...r,
        id: text(r.id) || newId(),
        property: address(r.property),
        landlordAddress: address(r.landlordAddress),
        appliances: Array.isArray(r.appliances)
          ? r.appliances.map((a) => ({ ...newAppliance(), ...a, id: text(a?.id) || newId() }))
          : [],
        engineerSignature: signature(r.engineerSignature),
        receivedBySignature: signature(r.receivedBySignature),
      } as GasRecord;
    });
  return { version: 1, engineer, records };
}

/** An example record to try the app with. Clearly marked as an example. */
export function exampleRecord(number: string): GasRecord {
  const r = newRecord(number);
  const boiler: Appliance = {
    ...newAppliance(),
    location: 'Kitchen',
    type: 'Boiler',
    make: 'Example',
    model: 'Combi 30',
    flueType: 'RS',
    operatingPressure: '10.2',
    heatInput: '',
    coPpm: '24',
    co2Percent: '8.9',
    safetyDevices: 'pass',
    ventilation: 'na',
    flueVisual: 'pass',
    fluePerformance: 'pass',
    serviced: 'yes',
    coAlarmFitted: 'yes',
    coAlarmTested: 'yes',
    safeToUse: 'yes',
  };
  const hob: Appliance = {
    ...newAppliance(),
    location: 'Kitchen',
    type: 'Hob',
    make: 'Example',
    model: 'H60',
    flueType: 'FL',
    operatingPressure: '20.0',
    safetyDevices: 'pass',
    ventilation: 'yes',
    flueVisual: 'na',
    fluePerformance: 'na',
    serviced: 'no',
    coAlarmFitted: 'na',
    coAlarmTested: 'na',
    safeToUse: 'yes',
  };
  return {
    ...r,
    property: { line1: '12 Example Street (example)', line2: '', town: 'Sampletown', postcode: 'AB1 2CD' },
    tenantName: 'Example tenant',
    landlordName: 'Example Landlord',
    landlordAddress: { line1: '1 Sample Road', line2: '', town: 'Sampletown', postcode: 'AB1 9ZZ' },
    landlordPhone: '',
    appliances: [boiler, hob],
    tightnessTest: 'pass',
    ecvAccessible: 'yes',
    bonding: 'yes',
    pipeworkVisual: 'pass',
  };
}

/** The area a signature's strokes cover (with a little margin), so it can be drawn as large as possible. */
export function signatureViewBox(sig: Signature): string {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const d of sig.paths) {
    const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      minX = Math.min(minX, nums[i]);
      maxX = Math.max(maxX, nums[i]);
      minY = Math.min(minY, nums[i + 1]);
      maxY = Math.max(maxY, nums[i + 1]);
    }
  }
  if (!Number.isFinite(minX)) return `0 0 ${sig.width} ${sig.height}`;
  const pad = 6;
  return `${minX - pad} ${minY - pad} ${Math.max(1, maxX - minX) + pad * 2} ${Math.max(1, maxY - minY) + pad * 2}`;
}
