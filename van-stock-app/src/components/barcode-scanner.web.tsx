import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Radius, Spacing, useTheme } from '@/constants/theme';
import { decodeBarcodeFromImage, decodeVideoFrame } from '@/lib/decode-barcode.web';
import { success } from '@/lib/ui';

import { Button } from './controls';
import { Icon } from './icon';

type Props = {
  visible: boolean;
  onScanned: (code: string) => void;
  onClose: () => void;
  hint?: string;
};

/**
 * Browser version of the scanner. Where the browser allows the camera it scans live,
 * like the iPhone app. Where it doesn't (some embedded pages), it falls back to taking
 * a photo of the barcode, or typing the number.
 */
export function BarcodeScanner({ visible, onScanned, onClose }: Props) {
  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {visible && <ScannerBody onScanned={onScanned} onClose={onClose} />}
    </Modal>
  );
}

type Mode = 'starting' | 'live' | 'manual';

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

function ScannerBody({ onScanned, onClose }: Omit<Props, 'visible'>) {
  const [mode, setMode] = useState<Mode>('starting');
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const found = useEffectEvent((code: string) => {
    success();
    onScanned(code);
  });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const media = (globalThis as any).navigator?.mediaDevices as MediaDevices | undefined;

    if (!media?.getUserMedia) {
      Promise.resolve().then(() => {
        if (cancelled) return;
        setCameraBlocked(true);
        setMode('manual');
      });
      return () => {
        cancelled = true;
      };
    }

    media
      .getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      .then((stream) => {
        if (cancelled) return stopStream(stream);
        streamRef.current = stream;
        setMode('live');
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.play().catch(() => {});
        let frame = 0;
        timer = setInterval(() => {
          if (video.readyState < 2) return;
          frame += 1;
          // Mostly quick reads; every third frame takes a more careful look.
          const code = decodeVideoFrame(video, frame % 3 === 0);
          if (code) {
            clearInterval(timer);
            stopStream(stream);
            found(code);
          }
        }, 150);
      })
      .catch(() => {
        if (cancelled) return;
        setCameraBlocked(true);
        setMode('manual');
      });

    return () => {
      cancelled = true;
      clearInterval(timer);
      stopStream(streamRef.current);
    };
  }, []);

  const switchToManual = () => {
    stopStream(streamRef.current);
    setMode('manual');
  };

  return (
    <>
      <LiveView
        hidden={mode === 'manual'}
        videoRef={videoRef}
        starting={mode === 'starting'}
        onClose={onClose}
        onManual={switchToManual}
      />
      {mode === 'manual' && (
        <ManualEntry cameraBlocked={cameraBlocked} onScanned={onScanned} onClose={onClose} />
      )}
    </>
  );
}

function LiveView({
  hidden,
  videoRef,
  starting,
  onClose,
  onManual,
}: {
  hidden: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  starting: boolean;
  onClose: () => void;
  onManual: () => void;
}) {
  return (
    <View style={[styles.live, hidden && { display: 'none' }]}>
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <View pointerEvents="none" style={styles.frameWrap}>
        <View style={styles.frame} />
      </View>
      {starting && (
        <View style={styles.startingWrap}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.startingText}>Starting camera…</Text>
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close scanner"
        onPress={onClose}
        hitSlop={10}
        style={styles.close}>
        <Icon ios="xmark" md="close" size={20} color="#fff" />
      </Pressable>
      <View style={styles.bottom}>
        <Text style={styles.hint}>Point the camera at a barcode</Text>
        <Pressable accessibilityRole="button" onPress={onManual} hitSlop={8}>
          <Text style={styles.manualLink}>Type the number instead</Text>
        </Pressable>
      </View>
    </View>
  );
}

type PhotoStatus = { kind: 'idle' } | { kind: 'reading' } | { kind: 'failed'; message: string };

function ManualEntry({
  cameraBlocked,
  onScanned,
  onClose,
}: {
  cameraBlocked: boolean;
  onScanned: (code: string) => void;
  onClose: () => void;
}) {
  const c = useTheme();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<PhotoStatus>({ kind: 'idle' });

  const submit = () => {
    const value = code.trim();
    if (value) onScanned(value);
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
        if (found) {
          success();
          onScanned(found);
        } else {
          setStatus({
            kind: 'failed',
            message:
              'No barcode found in that photo. Fill the frame with the barcode, hold steady in good light, or type the number below.',
          });
        }
      } catch (e) {
        setStatus({ kind: 'failed', message: e instanceof Error ? e.message : String(e) });
      }
    });
    doc.body.appendChild(input);
    input.click();
  };

  return (
    <View style={styles.backdrop}>
      <View style={[styles.box, { backgroundColor: c.card, borderColor: c.border }]}>
        <Icon ios="barcode.viewfinder" md="barcode_scanner" size={36} color={c.primary} />
        <Text style={[styles.title, { color: c.text }]}>Scan a barcode</Text>
        <Text style={[styles.message, { color: c.textSecondary }]}>
          {cameraBlocked
            ? 'Live scanning isn’t available in this view. Take a close-up photo of the barcode instead and the app reads the number from it.'
            : 'Take a close-up photo of the barcode and the app reads the number from it.'}
        </Text>

        {status.kind === 'reading' ? (
          <View style={[styles.reading, { backgroundColor: c.primarySoft }]}>
            <ActivityIndicator color={c.primary} />
            <Text style={{ color: c.primary, fontSize: 16, fontWeight: '600' }}>
              Reading barcode…
            </Text>
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
          <Button label="Cancel" variant="secondary" onPress={onClose} style={styles.button} />
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
  );
}

const styles = StyleSheet.create({
  live: { flex: 1, backgroundColor: '#000' },
  frameWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: '85%',
    maxWidth: 420,
    aspectRatio: 1.6,
    borderRadius: Radius.lg,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  startingWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  startingText: { color: '#fff', fontSize: 16 },
  close: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.lg,
  },
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
  manualLink: { color: '#fff', fontSize: 15, textDecorationLine: 'underline' },
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
