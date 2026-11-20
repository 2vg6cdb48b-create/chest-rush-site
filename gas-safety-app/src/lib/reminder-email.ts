import * as MailComposer from 'expo-mail-composer';
import { Linking, Platform } from 'react-native';

import { formatAddress, formatLongDate, todayIso } from './records';
import type { Engineer, GasRecord } from './types';

export function reminderEmail(r: GasRecord, engineer: Engineer) {
  const first = r.landlordName.trim().split(/\s+/)[0];
  const where = formatAddress(r.property);
  const signOff = [
    engineer.name,
    engineer.companyName,
    engineer.phone,
    engineer.gasSafeNumber ? `Gas Safe reg. no. ${engineer.gasSafeNumber}` : '',
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n');
  const overdue = r.nextDueDate < todayIso();
  const due = formatLongDate(r.nextDueDate);
  return {
    to: r.landlordEmail.trim() ? [r.landlordEmail.trim()] : [],
    cc: engineer.email.trim() ? [engineer.email.trim()] : [],
    subject: `${overdue ? 'Gas safety check overdue' : `Gas safety check due by ${due}`} – ${r.property.line1}`.trim(),
    body: [
      first ? `Hi ${first},` : 'Hello,',
      '',
      overdue
        ? `The annual landlord gas safety check for ${where} was due by ${due}, so it is now overdue.`
        : `The annual landlord gas safety check for ${where} is due by ${due}.`,
      `The current record (${r.number}) was done on ${formatLongDate(r.checkDate)}.`,
      '',
      overdue
        ? 'Please let me know as soon as possible when I can get in, and I’ll book it in.'
        : 'Please let me know a day and time that suits you and the tenant, and I’ll book it in.',
      '',
      'Thanks,',
      signOff,
    ].join('\n'),
  };
}

/**
 * Opens a ready-written email to the landlord, copied to you, from your own email account.
 * Resolves true if it was sent or saved (or opened in another mail app, where we can't tell).
 */
export async function sendReminderEmail(r: GasRecord, engineer: Engineer): Promise<boolean> {
  const mail = reminderEmail(r, engineer);
  if (Platform.OS !== 'web' && (await MailComposer.isAvailableAsync())) {
    const result = await MailComposer.composeAsync({
      recipients: mail.to,
      ccRecipients: mail.cc,
      subject: mail.subject,
      body: mail.body,
    });
    return (
      result.status === MailComposer.MailComposerStatus.SENT ||
      result.status === MailComposer.MailComposerStatus.SAVED
    );
  }
  // No Mail app set up (e.g. Gmail only): use the phone's default email app.
  const addr = (list: string[]) => list.map((a) => encodeURIComponent(a).replace(/%40/g, '@')).join(',');
  const params = [
    mail.cc.length ? `cc=${addr(mail.cc)}` : '',
    `subject=${encodeURIComponent(mail.subject)}`,
    `body=${encodeURIComponent(mail.body)}`,
  ].filter(Boolean);
  await Linking.openURL(`mailto:${addr(mail.to)}?${params.join('&')}`);
  return true;
}
