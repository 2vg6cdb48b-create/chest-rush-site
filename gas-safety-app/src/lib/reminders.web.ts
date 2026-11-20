import type { DueItem } from './due';

/** Browsers can't reliably alert you on a future date, so reminders are an iPhone app feature. */
export const REMINDER_DAYS = [30, 7];
export const remindersSupported = false;

export async function remindersAllowed(_ask: boolean): Promise<'granted' | 'denied' | 'undetermined'> {
  return 'denied';
}

export async function syncReminders(_items: DueItem[], _enabled: boolean) {}
