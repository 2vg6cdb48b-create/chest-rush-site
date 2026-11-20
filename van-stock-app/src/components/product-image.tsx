import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';

import { Radius, useTheme } from '@/constants/theme';

import { Icon } from './icon';

/** A product picture, or a box icon when there is none or it can't load (e.g. offline). */
export function ProductImage({ uri, size }: { uri: string; size: number }) {
  const c = useTheme();
  const [failed, setFailed] = useState<string | null>(null);
  const show = !!uri && failed !== uri;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Radius.sm,
        backgroundColor: show ? '#FFFFFF' : c.field,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {show ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          contentFit="contain"
          cachePolicy="disk"
          transition={150}
          accessibilityIgnoresInvertColors
          onError={() => setFailed(uri)}
        />
      ) : (
        <Icon ios="shippingbox" md="inventory_2" size={size * 0.45} color={c.textSecondary} />
      )}
    </View>
  );
}
