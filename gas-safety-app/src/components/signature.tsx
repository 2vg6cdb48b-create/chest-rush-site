import { useState } from 'react';
import { Modal, PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Radius, Spacing, useTheme } from '@/constants/theme';
import { signatureViewBox } from '@/lib/records';
import type { Signature } from '@/lib/types';

import { Button } from './controls';

const INK = '#1B2A4A';

/** Draws a saved signature at the given height. */
export function SignatureView({ signature, height }: { signature: Signature; height: number }) {
  return (
    <Svg
      width="100%"
      height={height}
      viewBox={signatureViewBox(signature)}
      preserveAspectRatio="xMidYMid meet">
      {signature.paths.map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={INK}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}

/** A signature box with Sign / Clear buttons. Signing opens a large pad. */
export function SignatureField({
  value,
  onChange,
  emptyLabel = 'Not signed yet',
}: {
  value: Signature | null;
  onChange: (sig: Signature | null) => void;
  emptyLabel?: string;
}) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: Spacing.sm }}>
      <View style={[styles.preview, { borderColor: c.border, backgroundColor: '#FFFFFF' }]}>
        {value ? (
          <SignatureView signature={value} height={90} />
        ) : (
          <Text style={{ color: '#8A93A0', fontSize: 15 }}>{emptyLabel}</Text>
        )}
      </View>
      <View style={styles.row}>
        <Button
          label={value ? 'Sign again' : 'Sign'}
          variant="secondary"
          icon={{ ios: 'signature', md: 'draw' }}
          onPress={() => setOpen(true)}
          style={{ flex: 1 }}
        />
        {value && (
          <Button label="Clear" variant="plain" onPress={() => onChange(null)} style={{ flex: 1 }} />
        )}
      </View>
      <SignaturePadModal
        visible={open}
        onCancel={() => setOpen(false)}
        onDone={(sig) => {
          setOpen(false);
          onChange(sig);
        }}
      />
    </View>
  );
}

function SignaturePadModal({
  visible,
  onCancel,
  onDone,
}: {
  visible: boolean;
  onCancel: () => void;
  onDone: (sig: Signature | null) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      {visible && <SignaturePad onCancel={onCancel} onDone={onDone} />}
    </Modal>
  );
}

function SignaturePad({
  onCancel,
  onDone,
}: {
  onCancel: () => void;
  onDone: (sig: Signature | null) => void;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  // Each stroke is one SVG path; the last one grows while the finger moves.
  const [paths, setPaths] = useState<string[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const [responder] = useState(() => {
    const round = (n: number) => Math.round(n * 10) / 10;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const x = round(e.nativeEvent.locationX);
        const y = round(e.nativeEvent.locationY);
        // A tiny second point so a tap still shows as a dot.
        setPaths((p) => [...p, `M${x} ${y} L${x + 0.1} ${y + 0.1}`]);
      },
      onPanResponderMove: (e) => {
        const x = round(e.nativeEvent.locationX);
        const y = round(e.nativeEvent.locationY);
        setPaths((p) => (p.length ? [...p.slice(0, -1), `${p[p.length - 1]} L${x} ${y}`] : p));
      },
      onPanResponderTerminationRequest: () => false,
    });
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width: Math.round(width), height: Math.round(height) });
  };


  return (
    <View style={[styles.backdrop, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.lg }]}>
      <View style={[styles.sheet, { backgroundColor: c.card }]}>
        <Text style={[styles.title, { color: c.text }]}>Sign in the box</Text>
        <View
          style={[styles.pad, { borderColor: c.border }]}
          onLayout={onLayout}
          {...responder.panHandlers}>
          <Svg width="100%" height="100%" pointerEvents="none">
            {paths.map((d, i) => (
              <Path
                key={i}
                d={d}
                stroke={INK}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
          </Svg>
          <View pointerEvents="none" style={styles.line} />
        </View>
        <View style={styles.row}>
          <Button label="Cancel" variant="plain" onPress={onCancel} style={{ flex: 1 }} />
          <Button
            label="Clear"
            variant="secondary"
            onPress={() => setPaths([])}
            disabled={paths.length === 0}
            style={{ flex: 1 }}
          />
          <Button
            label="Done"
            disabled={paths.length === 0}
            onPress={() =>
              onDone(paths.length ? { paths, width: size.width, height: size.height } : null)
            }
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: {
    height: 100,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xs,
  },
  row: { flexDirection: 'row', gap: Spacing.sm },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  sheet: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  title: { fontSize: 18, fontWeight: '700' },
  pad: {
    height: 240,
    borderRadius: Radius.md,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  line: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 56,
    height: 1,
    backgroundColor: '#C9D0D8',
  },
});
