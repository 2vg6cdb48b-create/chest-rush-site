import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/constants/theme';
import { useDueSummary } from '@/lib/due';

export default function AppTabs() {
  const c = useTheme();
  const { needsAttention } = useDueSummary();

  return (
    <NativeTabs tintColor={c.primary}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Records</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'doc.text', selected: 'doc.text.fill' }} md="description" />
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
