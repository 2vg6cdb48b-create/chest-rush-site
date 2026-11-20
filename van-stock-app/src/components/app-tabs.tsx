import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/constants/theme';
import { useStock } from '@/lib/store';
import { needsRestock } from '@/lib/stock';

export default function AppTabs() {
  const c = useTheme();
  const { items } = useStock();
  const toRestock = items.filter(needsRestock).length;

  return (
    <NativeTabs tintColor={c.primary}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Stock</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'shippingbox', selected: 'shippingbox.fill' }} md="inventory_2" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="restock">
        <NativeTabs.Trigger.Label>Restock</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'cart', selected: 'cart.fill' }} md="shopping_cart" />
        {toRestock > 0 && (
          <NativeTabs.Trigger.Badge>{toRestock > 99 ? '99+' : String(toRestock)}</NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" md="history" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
