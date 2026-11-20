import * as Haptics from 'expo-haptics';
import { Alert, Platform, Share } from 'react-native';

export type DialogRequest = {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  /** When false there is only an OK button. */
  ask: boolean;
  resolve: (ok: boolean) => void;
};

// In a browser, system dialogs can be blocked (for example in an embedded preview),
// so web dialogs are drawn by <DialogHost /> inside the app instead.
let showDialog: ((req: DialogRequest) => void) | null = null;

export function setDialogHandler(handler: ((req: DialogRequest) => void) | null) {
  showDialog = handler;
}

/** Asks a yes/no question. Resolves true if the person confirms. */
export function confirm(title: string, message: string, confirmLabel = 'OK', destructive = false) {
  if (Platform.OS === 'web') {
    return new Promise<boolean>((resolve) => {
      if (!showDialog) return resolve(true);
      showDialog({ title, message, confirmLabel, destructive, ask: true, resolve });
    });
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
    showDialog?.({ title, message: message ?? '', ask: false, resolve: () => {} });
    return;
  }
  Alert.alert(title, message);
}

/** Shares text with the share sheet. In a browser it copies the text instead. */
export async function shareText(text: string) {
  if (Platform.OS === 'web') {
    try {
      const clip = (globalThis as any).navigator?.clipboard;
      if (!clip) throw new Error('no clipboard');
      await clip.writeText(text);
      notify('Copied', 'Paste it into a message or email.');
    } catch {
      notify('Message', text);
    }
    return;
  }
  await Share.share({ message: text });
}

export function tap() {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => {});
}

export function success() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
