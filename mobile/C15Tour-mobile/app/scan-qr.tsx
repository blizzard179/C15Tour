import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ShareRole = 'participant' | 'leader';

type ParsedQrCode = {
  role: ShareRole;
  code: string;
};

// Décode une valeur de query string (gère aussi le "+" comme espace, convention historique des URL)
function decodeQueryValue(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

// Extrait les paramètres "?role=...&code=..." du contenu brut du QR code, sans
// dépendre d'un parseur d'URL complet (le payload scanné n'est pas forcément une URL valide)
function extractQueryParams(payload: string) {
  const queryStart = payload.indexOf('?');
  const query = queryStart >= 0 ? payload.slice(queryStart + 1) : payload;

  return query.split('&').reduce<Record<string, string>>((params, part) => {
    const [rawKey, ...rawValueParts] = part.split('=');
    const key = decodeQueryValue(rawKey || '').trim().toLowerCase();

    if (!key) {
      return params;
    }

    params[key] = decodeQueryValue(rawValueParts.join('=') || '').trim();
    return params;
  }, {});
}

function normalizeRole(value: string | undefined): ShareRole | null {
  if (value === 'participant' || value === 'leader') {
    return value;
  }

  if (value === 'organisateur' || value === 'organizer') {
    return 'leader';
  }

  return null;
}

// Valide et normalise le contenu scanné en {role, code} exploitables, ou null si invalide
function parseQrPayload(payload: string): ParsedQrCode | null {
  const params = extractQueryParams(payload.trim());
  const role = normalizeRole(params.role?.toLowerCase());
  const code = params.code?.trim().toUpperCase();

  if (!role || !code) {
    return null;
  }

  return { role, code };
}

// Écran de scan du QR code de partage d'un convoi (affiché dans la popup de
// partage du frontend web). Une fois un QR code valide détecté, redirige vers
// l'écran /join avec les mêmes paramètres qu'un lien profond classique.
export default function ScanQrScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [canScan, setCanScan] = useState(true); // évite de traiter plusieurs scans en rafale

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (!canScan) {
      return;
    }

    setCanScan(false);

    const parsed = parseQrPayload(data);

    if (!parsed) {
      Alert.alert('QR code invalide', 'Ce QR code ne contient pas les informations du convoi.', [
        { text: 'Reessayer', onPress: () => setCanScan(true) },
        { text: 'Retour', onPress: () => router.back(), style: 'cancel' },
      ]);
      return;
    }

    router.replace({
      pathname: '/join',
      params: parsed,
    });
  };

  // La permission caméra est encore en cours de résolution
  if (!permission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Verification de la camera...</Text>
      </View>
    );
  }

  // Permission refusée : on affiche un écran explicatif avec un bouton pour la redemander
  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { paddingTop: insets.top + 24 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#BB487C" />
        </TouchableOpacity>

        <View style={styles.permissionContent}>
          <MaterialIcons name="qr-code-scanner" size={48} color="#BB487C" />
          <Text style={styles.title}>Scanner un QR code</Text>
          <Text style={styles.permissionText}>
            {"L'application a besoin de la camera pour lire le QR code du convoi."}
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>AUTORISER LA CAMERA</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={canScan ? handleBarcodeScanned : undefined}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.scanTitle}>Scanner le convoi</Text>
        <View style={styles.iconButtonPlaceholder} />
      </View>

      <View style={styles.scanOverlay}>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
        </View>
        <Text style={styles.scanHint}>Place le QR code au centre</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  message: {
    color: '#BB487C',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    color: '#BB487C',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionText: {
    color: '#333',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 8,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#BB487C',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  iconButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  scanTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  scanOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  scanFrame: {
    width: '100%',
    maxWidth: 280,
    aspectRatio: 1,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderColor: '#fff',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
  },
  scanHint: {
    marginTop: 24,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
