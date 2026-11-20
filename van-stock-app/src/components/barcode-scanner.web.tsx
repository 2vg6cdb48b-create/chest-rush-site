import { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, View } from 'react-native';

import { Radius, Spacing, useTheme } from '@/constants/theme';
import { decodeBarcodeFromImage } from '@/lib/decode-barcode.web';

import { Button } from './controls';
import { Icon } from './icon';

type Status = { kind: 'idle' } | { kind: 'reading' } | { kind: 'failed'; message: string };

/**
 * Browser version of the scanner. A live camera feed isn't available in every browser
 * (or inside an embedded page), so this takes a photo with the phone's camera and reads
 * the barcode from it, with typing the number as a fallback.
 */
export function BarcodeScanner({
  visible,
  onScanned,
  onClose,
}: {
  visible: boolean;
  onScanned: (code: string) => void;
  onClose: () => void;
  hint?: string;
}) {
  const c = useTheme();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const finish = (value: string) => {
    setCode('');
    setStatus({ kind: 'idle' });
    onScanned(value);
  };

  const close = () => {
    setStatus({ kind: 'idle' });
    onClose();
  };

  const submit = () => {
    const value = code.trim();
    if (value) finish(value);
  };

  // Must run straight from the tap so the browser lets it open the camera.
  const takePhoto = () => {
    const doc = (globalThis as any).document;
    if (!doc) return;
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.style.display = 'none';
    input.addEventListener('change', async () => {
      const file: Blob | undefined = input.files?.[0];
      input.remove();
      if (!file) return;
      setStatus({ kind: 'reading' });
      try {
        const found = await decodeBarcodeFromImage(file);
        if (found) finish(found);
        else
          setStatus({
            kind: 'failed',
            message:
              'No barcode found in that photo. Fill the frame with the barcode, hold steady in good light, or type the number below.',
          });
      } catch (e) {
        setStatus({ kind: 'failed', message: e instanceof Error ? e.message : String(e) });
      }
    });
    doc.body.appendChild(input);
    input.click();
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={[styles.box, { backgroundColor: c.card, borderColor: c.border }]}>
          <Icon ios="barcode.viewfinder" md="barcode_scanner" size={36} color={c.primary} />
          <Text style={[styles.title, { color: c.text }]}>Scan a barcode</Text>
          <Text style={[styles.message, { color: c.textSecondary }]}>
            Take a close-up photo of the barcode and the app reads the number from it.
          </Text>

          {status.kind === 'reading' ? (
            <View style={[styles.reading, { backgroundColor: c.primarySoft }]}>
              <ActivityIndicator color={c.primary} />
              <Text style={{ color: c.primary, fontSize: 16, fontWeight: '600' }}>Reading barcode…</Text>
            </View>
          ) : (
            <Button
              label="Take photo of barcode"
              icon={{ ios: 'camera.fill', md: 'photo_camera' }}
              onPress={takePhoto}
            />
          )}
          {status.kind === 'failed' && (
            <Text style={[styles.error, { color: c.out }]}>{status.message}</Text>
          )}

          <Text style={[styles.or, { color: c.textSecondary }]}>or type the number under it</Text>
          <TextInput
            id="barcode-entry"
            value={code}
            onChangeText={setCode}
            onSubmitEditing={submit}
            placeholder="e.g. 5012345678900"
            placeholderTextColor={c.textSecondary}
            inputMode="numeric"
            style={[styles.input, { backgroundColor: c.field, color: c.text }]}
          />
          <View style={styles.buttons}>
            <Button label="Cancel" variant="secondary" onPress={close} style={styles.button} />
            <Button
              label="Find"
              variant="secondary"
              onPress={submit}
              disabled={!code.trim()}
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
  message: { fontSize: 15, lineHeight: 21 },
  reading: {
    minHeight: 50,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  error: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  or: { fontSize: 14, textAlign: 'center', marginTop: Spacing.xs },
  input: { borderRadius: Radius.sm, padding: Spacing.md, fontSize: 18 },
  buttons: { flexDirection: 'row', gap: Spacing.sm },
  button: { flex: 1 },
});
