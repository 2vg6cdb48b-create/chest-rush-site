import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

type SymbolName = ComponentProps<typeof SymbolView>['name'];
type IosName = Extract<SymbolName, string>;
type MdName = NonNullable<Exclude<SymbolName, string>['web']>;

/** An SF Symbol on iPhone, with a Material Symbol used on Android and web. */
export function Icon({
  ios,
  md,
  size = 22,
  color,
  style,
}: {
  ios: IosName;
  md: MdName;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SymbolView
      name={{ ios, android: md, web: md }}
      size={size}
      tintColor={color}
      style={[{ width: size, height: size }, style]}
    />
  );
}
