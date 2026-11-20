import { useMemo } from 'react';

import { daysBetween, isIsoDate, propertyKey, todayIso } from './records';
import { useStore } from './store';
import type { GasRecord } from './types';

export type DueItem = {
  record: GasRecord;
  daysLeft: number;
  bucket: 'overdue' | 'soon' | 'upcoming' | 'later';
  /** A newer draft already exists for this property. */
  renewalDraft: GasRecord | null;
};

/** The latest issued record for each property, with how long until its next check is due. */
export function dueList(records: GasRecord[], today = todayIso()): DueItem[] {
  const latest = new Map<string, GasRecord>();
  const drafts = new Map<string, GasRecord>();
  for (const r of records) {
    const key = propertyKey(r);
    if (r.status === 'draft') {
      if (!drafts.has(key) || drafts.get(key)!.createdAt < r.createdAt) drafts.set(key, r);
      continue;
    }
    if (!isIsoDate(r.nextDueDate)) continue;
    const current = latest.get(key);
    if (!current || current.checkDate < r.checkDate) latest.set(key, r);
  }
  return [...latest.entries()]
    .map(([key, record]) => {
      const daysLeft = daysBetween(today, record.nextDueDate);
      const bucket: DueItem['bucket'] =
        daysLeft < 0 ? 'overdue' : daysLeft <= 30 ? 'soon' : daysLeft <= 60 ? 'upcoming' : 'later';
      const draft = drafts.get(key);
      return {
        record,
        daysLeft,
        bucket,
        renewalDraft: draft && draft.createdAt > record.createdAt ? draft : null,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export function dueLabel(daysLeft: number): string {
  if (daysLeft < -1) return `${-daysLeft} days overdue`;
  if (daysLeft === -1) return '1 day overdue';
  if (daysLeft === 0) return 'Due today';
  if (daysLeft === 1) return 'Due tomorrow';
  if (daysLeft < 60) return `Due in ${daysLeft} days`;
  return `Due in ${Math.round(daysLeft / 30.4)} months`;
}

export function useDueSummary() {
  const { records } = useStore();
  return useMemo(() => {
    const list = dueList(records);
    return {
      list,
      needsAttention: list.filter((d) => (d.bucket === 'overdue' || d.bucket === 'soon') && !d.renewalDraft).length,
    };
  }, [records]);
}
