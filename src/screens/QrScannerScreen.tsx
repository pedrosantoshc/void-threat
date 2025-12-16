import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Button, Text } from 'react-native-paper';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';

import { NavigationStackParamList } from '../types';
import { darkTheme, spacing } from '../constants/theme';

type Props = {
  navigation: StackNavigationProp<NavigationStackParamList, 'QrScanner'>;
  route: RouteProp<NavigationStackParamList, 'QrScanner'>;
};

function extractGameCode(data: string): string | null {
  const trimmed = (data || '').trim();
  // URL like https://void.app/join/VOIDABC
  const joinMatch = trimmed.match(/\/join\/([A-Z0-9]{4,10})/i);
  if (joinMatch?.[1]) return joinMatch[1].toUpperCase();
  // Raw code
  const codeMatch = trimmed.match(/\bVOID[A-Z0-9]{3,6}\b/i);
  if (codeMatch) return codeMatch[0].toUpperCase();
  return null;
}

export default function QrScannerScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const onBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (scanned) return;
      setScanned(true);

      const code = extractGameCode(result.data || '');
      if (!code) {
        Alert.alert('Invalid QR', 'Could not find a Void Threat game code in that QR.');
        setScanned(false);
        return;
      }

      navigation.replace('JoinGame', { prefillCode: code, autoJoin: true });
    },
    [scanned, navigation]
  );

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>QR Scanner</Text>
          <Text style={styles.subtitle}>Loading camera permissions…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Camera Permission</Text>
          <Text style={styles.subtitle}>We need camera access to scan a QR code.</Text>
          <Button mode="contained" onPress={requestPermission} style={styles.primaryBtn}>
            Allow Camera
          </Button>
          <Button mode="text" onPress={() => navigation.goBack()}>
            Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={onBarcodeScanned}
        />
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>Scan QR Code</Text>
          <Text style={styles.overlaySubtitle}>Point your camera at the game QR code.</Text>
          <View style={styles.overlayActions}>
            <Button mode="outlined" onPress={() => setScanned(false)} disabled={!scanned}>
              Scan Again
            </Button>
            <Button mode="text" onPress={() => navigation.goBack()}>
              Cancel
            </Button>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkTheme.colors.background },
  content: { flex: 1, justifyContent: 'center', padding: spacing.md, gap: spacing.md },
  title: { fontSize: 24, fontWeight: '800', color: darkTheme.colors.primary, textAlign: 'center' },
  subtitle: { color: darkTheme.colors.onSurfaceVariant, textAlign: 'center' },
  primaryBtn: { backgroundColor: darkTheme.colors.primary },
  cameraWrap: { flex: 1 },
  overlay: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
    backgroundColor: 'rgba(10,14,39,0.7)',
    padding: spacing.md,
    borderRadius: 12,
  },
  overlayTitle: { color: '#fff', fontWeight: '800', fontSize: 18, marginBottom: 4 },
  overlaySubtitle: { color: '#fff', opacity: 0.85 },
  overlayActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
});


