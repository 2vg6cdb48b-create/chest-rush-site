import { formatQty } from './stock';
import type { Movement } from './types';

export function describeMovement(m: Movement, withName = false): string {
  const amount = formatQty(Math.abs(m.change), m.unit);
  const name = withName ? ` ${m.itemName}` : '';
  switch (m.reason) {
    case 'used':
      return `Used ${amount}${name}`;
    case 'added':
      return `Added ${amount}${name}`;
    case 'restocked':
      return `Restocked ${amount}${name}`;
    case 'created':
      return withName ? `New item${name} (${formatQty(m.newQuantity, m.unit)})` : `Added to van with ${formatQty(m.newQuantity, m.unit)}`;
    case 'deleted':
      return withName ? `Deleted${name}` : 'Deleted';
    case 'counted':
    default:
      return `Counted${name}: ${m.change > 0 ? '+' : '−'}${amount}, now ${formatQty(m.newQuantity, m.unit)}`;
  }
}

export function timeAgo(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d} days ago`;
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function timeOfDay(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function dayLabel(at: number, now = Date.now()): string {
  const day = new Date(at);
  const today = new Date(now);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(day)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return day.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

export type DaySection = { title: string; data: Movement[] };

export function groupByDay(movements: Movement[]): DaySection[] {
  const sections: DaySection[] = [];
  for (const m of movements) {
    const title = dayLabel(m.at);
    const last = sections[sections.length - 1];
    if (last && last.title === title) last.data.push(m);
    else sections.push({ title, data: [m] });
  }
  return sections;
}
