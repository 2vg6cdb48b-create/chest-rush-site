import { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';

import { Radius, Spacing, useTheme } from '@/constants/theme';

import { Button } from './controls';
import { Icon } from './icon';

/** Browser preview: the camera isn't available, so the barcode is typed in instead. */
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
  const submit = () => {
    const value = code.trim();
    if (!value) return;
    setCode('');
    onScanned(value);
  };
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.box, { backgroundColor: c.card, borderColor: c.border }]}>
          <Icon ios="barcode.viewfinder" md="barcode_scanner" size={36} color={c.primary} />
          <Text style={[styles.title, { color: c.text }]}>Enter a barcode</Text>
          <Text style={[styles.message, { color: c.textSecondary }]}>
            The camera scanner works in the iPhone app. In the browser preview, type the number
            under the barcode.
          </Text>
          <TextInput
            id="barcode-entry"
            value={code}
            onChangeText={setCode}
            onSubmitEditing={submit}
            placeholder="e.g. 5012345678900"
            placeholderTextColor={c.textSecondary}
            autoFocus
            inputMode="numeric"
            style={[styles.input, { backgroundColor: c.field, color: c.text }]}
          />
          <View style={styles.buttons}>
            <Button label="Cancel" variant="secondary" onPress={onClose} style={styles.button} />
            <Button label="Find" onPress={submit} disabled={!code.trim()} style={styles.button} />
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
  input: { borderRadius: Radius.sm, padding: Spacing.md, fontSize: 18 },
  buttons: { flexDirection: 'row', gap: Spacing.sm },
  button: { flex: 1 },
});
