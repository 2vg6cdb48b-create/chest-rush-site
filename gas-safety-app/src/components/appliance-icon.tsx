import { View } from 'react-native';

import { Radius } from '@/constants/theme';
import { kindOf } from '@/data/appliances';

import { Icon } from './icon';

const ICONS = {
  boiler: { ios: 'heater.vertical', md: 'water_heater' },
  fire: { ios: 'fireplace', md: 'fireplace' },
  cooker: { ios: 'cooktop', md: 'cooking' },
  water: { ios: 'drop', md: 'water_drop' },
  warmAir: { ios: 'wind', md: 'air' },
  other: { ios: 'flame', md: 'local_fire_department' },
} as const;

/** A small square tile with an icon for the appliance type (boiler, fire, hob…). */
export function ApplianceIcon({
  type,
  size = 26,
  color,
  background,
}: {
  type: string;
  size?: number;
  color: string;
  background: string;
}) {
  const icon = ICONS[kindOf(type)];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Radius.sm,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon ios={icon.ios} md={icon.md} size={Math.round(size * 0.6)} color={color} />
    </View>
  );
}
