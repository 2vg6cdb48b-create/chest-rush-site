import * as Notifications from 'expo-notifications';

import type { DueItem } from './due';
import { formatLongDate } from './records';

/** Days before the due date that your phone alerts you. */
export const REMINDER_DAYS = [30, 7];
// iPhones keep at most 64 scheduled alerts per app; leave some room.
const MAX_SCHEDULED = 60;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const remindersSupported = true;

/** Whether alerts are allowed. With `ask`, shows the iPhone permission prompt if it hasn't been answered. */
export async function remindersAllowed(ask: boolean): Promise<'granted' | 'denied' | 'undetermined'> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!ask || !current.canAskAgain) return current.status === 'undetermined' ? 'undetermined' : 'denied';
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted ? 'granted' : 'denied';
}

function alertTime(dueIso: string, daysBefore: number): Date {
  const [y, m, d] = dueIso.split('-').map(Number);
  // 9am on the day, so it arrives during the working day.
  return new Date(y, m - 1, d - daysBefore, 9, 0, 0);
}

/** Replaces all scheduled alerts with ones for the current list of due properties. */
export async function syncReminders(items: DueItem[], enabled: boolean) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return;
  if ((await remindersAllowed(false)) !== 'granted') return;
  const now = Date.now();
  const plans: { at: Date; item: DueItem; daysBefore: number }[] = [];
  for (const item of items) {
    // Already started next year's record: no need to nag.
    if (item.renewalDraft) continue;
    for (const daysBefore of REMINDER_DAYS) {
      const at = alertTime(item.record.nextDueDate, daysBefore);
      if (at.getTime() > now) plans.push({ at, item, daysBefore });
    }
  }
  plans.sort((a, b) => a.at.getTime() - b.at.getTime());
  for (const { at, item, daysBefore } of plans.slice(0, MAX_SCHEDULED)) {
    const r = item.record;
    const who = r.landlordName.trim() || 'the landlord';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Gas safety check due in ${daysBefore} days`,
        body: `${[r.property.line1, r.property.postcode].filter(Boolean).join(', ')}, due by ${formatLongDate(r.nextDueDate)}. Tap to email ${who}.`,
        data: { action: 'remind', recordId: r.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  }
}

