import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/constants/theme';
import { useDueSummary } from '@/lib/due';
import { useOverdueInvoices } from '@/lib/invoices-summary';

export default function AppTabs() {
  const c = useTheme();
  const { needsAttention } = useDueSummary();
  const overdue = useOverdueInvoices();

  return (
    <NativeTabs
      tintColor={c.primary}
      backgroundColor={c.card}
      labelStyle={{ default: { color: c.textSecondary }, selected: { color: c.primary } }}
      iconColor={{ default: c.textSecondary, selected: c.primary }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Records</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'doc.text', selected: 'doc.text.fill' }} md="description" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="invoices">
        <NativeTabs.Trigger.Label>Invoices</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'sterlingsign.circle', selected: 'sterlingsign.circle.fill' }} md="receipt_long" />
        {overdue > 0 && <NativeTabs.Trigger.Badge>{overdue > 99 ? '99+' : String(overdue)}</NativeTabs.Trigger.Badge>}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="due">
        <NativeTabs.Trigger.Label>Due</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'calendar', selected: 'calendar' }} md="event" />
        {needsAttention > 0 && (
          <NativeTabs.Trigger.Badge>{needsAttention > 99 ? '99+' : String(needsAttention)}</NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
