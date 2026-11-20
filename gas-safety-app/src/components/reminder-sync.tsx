import { useEffect, useEffectEvent, useMemo } from 'react';

import { useDueSummary } from '@/lib/due';
import { syncReminders } from '@/lib/reminders';
import { useStore } from '@/lib/store';

/** Keeps the phone's scheduled alerts in step with each property's next due date. */
export function ReminderSync() {
  const { loaded, engineer } = useStore();
  const { list } = useDueSummary();

  // Only reschedule when something an alert depends on has changed, not on every keystroke.
  const key = useMemo(
    () =>
      list
        .map((d) =>
          [d.record.id, d.record.nextDueDate, d.record.property.line1, d.record.property.postcode, d.record.landlordName, d.renewalDraft ? 1 : 0].join('|'),
        )
        .join(';'),
    [list],
  );

  const sync = useEffectEvent(() => {
    syncReminders(list, engineer.remindersOn).catch((e) => console.warn('Could not schedule reminders', e));
  });

  useEffect(() => {
    if (loaded) sync();
  }, [loaded, key, engineer.remindersOn]);

  return null;
}
