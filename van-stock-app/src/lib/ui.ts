import * as Haptics from 'expo-haptics';
import { Alert, Platform } from 'react-native';

/** Asks a yes/no question. Resolves true if the person confirms. */
export function confirm(title: string, message: string, confirmLabel = 'OK', destructive = false) {
  if (Platform.OS === 'web') {
    const w = globalThis as unknown as { confirm?: (msg: string) => boolean };
    return Promise.resolve(w.confirm ? w.confirm(`${title}\n\n${message}`) : true);
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    const w = globalThis as unknown as { alert?: (msg: string) => void };
    w.alert?.(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function tap() {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => {});
}

export function success() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
