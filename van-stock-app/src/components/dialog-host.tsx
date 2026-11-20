import { useEffect, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, useTheme } from '@/constants/theme';
import { setDialogHandler, type DialogRequest } from '@/lib/ui';

import { Button } from './controls';

/** Draws confirm and message dialogs in the browser version. On iPhone the system alerts are used. */
export function DialogHost() {
  const c = useTheme();
  const [queue, setQueue] = useState<DialogRequest[]>([]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    setDialogHandler((req) => setQueue((q) => [...q, req]));
    return () => setDialogHandler(null);
  }, []);

  const current = queue[0];
  if (!current) return null;

  const close = (ok: boolean) => {
    current.resolve(ok);
    setQueue((q) => q.slice(1));
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={() => close(false)}>
      <View style={styles.backdrop}>
        <View style={[styles.box, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.title, { color: c.text }]}>{current.title}</Text>
          {!!current.message && (
            <ScrollView style={styles.messageScroll}>
              <Text selectable style={[styles.message, { color: c.textSecondary }]}>
                {current.message}
              </Text>
            </ScrollView>
          )}
          <View style={styles.buttons}>
            {current.ask && (
              <Button label="Cancel" variant="secondary" onPress={() => close(false)} style={styles.button} />
            )}
            <Button
              label={current.ask ? (current.confirmLabel ?? 'OK') : 'OK'}
              variant={current.destructive ? 'danger' : 'primary'}
              onPress={() => close(true)}
              style={styles.button}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  box: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  title: { fontSize: 19, fontWeight: '700' },
  messageScroll: { maxHeight: 320 },
  message: { fontSize: 16, lineHeight: 22 },
  buttons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  button: { flex: 1 },
});
