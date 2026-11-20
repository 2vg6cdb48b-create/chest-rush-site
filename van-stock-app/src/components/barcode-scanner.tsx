import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useEffect, useRef } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing } from '@/constants/theme';
import { success } from '@/lib/ui';

import { Button } from './controls';
import { Icon } from './icon';

/** Full-screen camera that reports the first barcode it sees. */
export function BarcodeScanner({
  visible,
  onScanned,
  onClose,
  hint = 'Point the camera at a barcode',
}: {
  visible: boolean;
  onScanned: (code: string) => void;
  onClose: () => void;
  hint?: string;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      {visible && <ScannerBody onScanned={onScanned} onClose={onClose} hint={hint} />}
    </Modal>
  );
}

function ScannerBody({
  onScanned,
  onClose,
  hint,
}: {
  onScanned: (code: string) => void;
  onClose: () => void;
  hint: string;
}) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleScan = (result: BarcodeScanningResult) => {
    if (handled.current || !result.data) return;
    handled.current = true;
    success();
    onScanned(result.data.trim());
  };

  const closeButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close scanner"
      onPress={onClose}
      hitSlop={10}
      style={[styles.close, { top: insets.top + Spacing.md }]}>
      <Icon ios="xmark" md="close" size={20} color="#fff" />
    </Pressable>
  );

  if (!permission || !permission.granted) {
    return (
      <View style={[styles.root, styles.centered]}>
        {closeButton}
        <Icon ios="camera.fill" md="photo_camera" size={44} color="#fff" />
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permText}>
          Van Stock uses the camera only to read barcodes. Nothing is recorded or sent anywhere.
        </Text>
        {permission && !permission.canAskAgain ? (
          <Button label="Open Settings" onPress={() => Linking.openSettings()} />
        ) : (
          <Button label="Allow camera" onPress={requestPermission} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: [
            'ean13',
            'ean8',
            'upc_a',
            'upc_e',
            'code128',
            'code39',
            'code93',
            'itf14',
            'codabar',
            'qr',
            'datamatrix',
          ],
        }}
        onBarcodeScanned={handleScan}
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.centered]}>
        <View style={styles.frame} />
      </View>
      {closeButton}
      <View style={[styles.hintWrap, { bottom: insets.bottom + Spacing.xxl }]}>
        <Text style={styles.hint}>{hint}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  centered: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  close: {
    position: 'absolute',
    right: Spacing.lg,
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  frame: {
    width: '78%',
    maxWidth: 360,
    aspectRatio: 1.6,
    borderRadius: Radius.lg,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  hintWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  hint: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  permTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  permText: { color: '#ccc', fontSize: 16, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.sm },
});
