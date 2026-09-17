import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { colors, radius, spacing, TAP_TARGET } from '@/lib/theme';

type Props = {
  visible: boolean;
  onScanned: (barcode: string) => void;
  onClose: () => void;
};

/** Full-screen camera that reports the first product barcode it sees. Used on phones only. */
export function BarcodeScanner({ visible, onScanned, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  // The camera fires many times a second; only act on the first read.
  const handled = useRef(false);

  function handleScan(result: BarcodeScanningResult) {
    if (handled.current) return;
    handled.current = true;
    onScanned(result.data);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={() => (handled.current = false)}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan a barcode</Text>
          <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.close}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
        </View>

        {!permission ? null : permission.granted ? (
          <View style={styles.cameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
              onBarcodeScanned={visible ? handleScan : undefined}
            />
            <View style={styles.frame} pointerEvents="none" />
            <Text style={styles.hint}>Point the camera at the barcode on the packet.</Text>
          </View>
        ) : (
          <View style={styles.permission}>
            <Text style={styles.permissionText}>The camera is only used to read barcodes, and nothing is recorded.</Text>
            <Button label="Allow camera" onPress={requestPermission} />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  close: { width: TAP_TARGET, height: TAP_TARGET, alignItems: 'center', justifyContent: 'center' },
  cameraWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: '80%',
    height: 180,
    borderWidth: 3,
    borderColor: colors.accent,
    borderRadius: radius.lg,
  },
  hint: {
    position: 'absolute',
    bottom: spacing.xxl,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  permission: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  permissionText: { color: colors.textDim, fontSize: 16, textAlign: 'center', lineHeight: 22 },
});
