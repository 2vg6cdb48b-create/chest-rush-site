import type { Movement, StockData, StockItem, StockStatus } from './types';

export const MAX_MOVEMENTS = 1000;

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function emptyData(): StockData {
  return { version: 1, items: [], movements: [] };
}

export function statusOf(item: Pick<StockItem, 'quantity' | 'minLevel'>): StockStatus {
  if (item.quantity <= 0) return 'out';
  if (item.quantity <= item.minLevel) return 'low';
  return 'ok';
}

export function needsRestock(item: StockItem): boolean {
  return statusOf(item) !== 'ok';
}

/** How many to buy to get back to the full level, or null if no full level is set. */
export function suggestedOrder(item: StockItem): number | null {
  if (item.fullLevel <= 0) return null;
  return Math.max(0, item.fullLevel - item.quantity);
}

/** "rolls" -> "roll", "boxes" -> "box", for when there's exactly one. */
export function singularUnit(unit: string): string {
  if (/(x|ch|sh)es$/i.test(unit)) return unit.slice(0, -2);
  if (/[^s]s$/i.test(unit) && unit.length > 3) return unit.slice(0, -1);
  return unit;
}

export function formatQty(n: number, unit: string): string {
  const num = Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  if (!unit || unit === 'pcs') return num;
  return `${num} ${n === 1 ? singularUnit(unit) : unit}`;
}

export function compareItems(a: StockItem, b: StockItem): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
}

export function matchesSearch(item: StockItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [item.name, item.partNumber, item.barcode, item.location, item.notes].some((field) =>
    field.toLowerCase().includes(q),
  );
}

export function locationsOf(items: StockItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    const loc = item.location.trim();
    if (loc) set.add(loc);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function makeMovement(
  item: StockItem,
  change: number,
  reason: Movement['reason'],
  newQuantity: number,
): Movement {
  return {
    id: newId(),
    itemId: item.id,
    itemName: item.name,
    unit: item.unit,
    change,
    newQuantity,
    reason,
    at: Date.now(),
  };
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

/** Checks and cleans data loaded from storage or a backup file. Throws if it isn't van stock data. */
export function parseStockData(raw: unknown): StockData {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as StockData).items)) {
    throw new Error('This file is not a Van Stock backup.');
  }
  const source = raw as { items: unknown[]; movements?: unknown[] };
  const now = Date.now();
  const items: StockItem[] = source.items
    .filter((it): it is Record<string, unknown> => !!it && typeof it === 'object')
    .map((it) => ({
      id: toText(it.id) || newId(),
      name: toText(it.name).trim() || 'Unnamed item',
      partNumber: toText(it.partNumber),
      barcode: toText(it.barcode),
      location: toText(it.location),
      unit: toText(it.unit) || 'pcs',
      quantity: Math.max(0, toNumber(it.quantity)),
      minLevel: Math.max(0, toNumber(it.minLevel)),
      fullLevel: Math.max(0, toNumber(it.fullLevel)),
      notes: toText(it.notes),
      createdAt: toNumber(it.createdAt, now),
      updatedAt: toNumber(it.updatedAt, now),
    }));
  const movements: Movement[] = (Array.isArray(source.movements) ? source.movements : [])
    .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
    .map((m) => ({
      id: toText(m.id) || newId(),
      itemId: toText(m.itemId),
      itemName: toText(m.itemName),
      unit: toText(m.unit),
      change: toNumber(m.change),
      newQuantity: toNumber(m.newQuantity),
      reason: (['used', 'added', 'restocked', 'counted', 'created', 'deleted'] as const).includes(
        m.reason as Movement['reason'],
      )
        ? (m.reason as Movement['reason'])
        : 'counted',
      at: toNumber(m.at, now),
    }))
    .slice(0, MAX_MOVEMENTS);
  return { version: 1, items, movements };
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(items: StockItem[]): string {
  const header = [
    'Name',
    'Part number',
    'Barcode',
    'Location',
    'Quantity',
    'Unit',
    'Restock at',
    'Full level',
    'Status',
    'Notes',
  ];
  const rows = [...items].sort(compareItems).map((it) => [
    it.name,
    it.partNumber,
    it.barcode,
    it.location,
    it.quantity,
    it.unit,
    it.minLevel,
    it.fullLevel || '',
    { ok: 'OK', low: 'Low', out: 'Out' }[statusOf(it)],
    it.notes,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function restockText(items: StockItem[]): string {
  const lines = items.map((it) => {
    const order = suggestedOrder(it);
    const part = it.partNumber ? ` (${it.partNumber})` : '';
    const detail =
      order !== null
        ? `order ${formatQty(order, it.unit)}`
        : `have ${formatQty(it.quantity, it.unit)}, restock at ${formatQty(it.minLevel, it.unit)}`;
    return `• ${it.name}${part}: ${detail}`;
  });
  const date = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return [`Van restock list (${date})`, '', ...lines].join('\n');
}

export function sampleItems(): StockItem[] {
  const now = Date.now();
  const make = (
    name: string,
    partNumber: string,
    location: string,
    quantity: number,
    minLevel: number,
    fullLevel: number,
    unit = 'pcs',
  ): StockItem => ({
    id: newId(),
    name,
    partNumber,
    barcode: '',
    location,
    unit,
    quantity,
    minLevel,
    fullLevel,
    notes: '',
    createdAt: now,
    updatedAt: now,
  });
  return [
    make('15mm copper elbow', 'CE15', 'Shelf 1', 18, 10, 30),
    make('22mm copper elbow', 'CE22', 'Shelf 1', 6, 8, 20),
    make('15mm push-fit tee', 'PFT15', 'Shelf 1', 12, 5, 15),
    make('PTFE tape', 'PTFE12', 'Front drawer', 0, 3, 10, 'rolls'),
    make('Silicone sealant (white)', 'SIL-W', 'Front drawer', 4, 2, 6, 'tubes'),
    make('Wood screws 4x40', 'WS440', 'Bin 3', 2, 1, 4, 'boxes'),
    make('2.5mm twin & earth cable', 'TE25', 'Back racking', 35, 20, 50, 'm'),
    make('13A fused spur', 'FS13', 'Bin 2', 3, 2, 6),
  ];
}
