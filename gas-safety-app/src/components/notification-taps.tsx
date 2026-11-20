import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useEffectEvent } from 'react';

import { sendReminderEmail } from '@/lib/reminder-email';
import { useStore } from '@/lib/store';

/** Tapping a "check due" alert opens the Due tab and a ready-written email to the landlord. */
export function NotificationTaps() {
  const response = Notifications.useLastNotificationResponse();
  const store = useStore();

  const handle = useEffectEvent((res: Notifications.NotificationResponse) => {
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
    if (res.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const data = res.notification.request.content.data as { action?: string; recordId?: string } | undefined;
    if (data?.action !== 'remind' || !data.recordId) return;
    const record = store.getRecord(data.recordId);
    if (!record) return;
    router.navigate('/due');
    sendReminderEmail(record, store.engineer)
      .then((sent) => sent && store.markReminded(record.id))
      .catch(() => {});
  });

  useEffect(() => {
    if (store.loaded && response) handle(response);
  }, [store.loaded, response]);

  return null;
}
