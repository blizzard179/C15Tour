import { useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import HomeButton from '@/components/ui/HomeButton';
import MicButton from '@/components/ui/MicButton';
import ConvoyName from '@/components/ui/ConvoyName';
import MicIcon from '../../../../shared/global_assets/pictos/Mic.svg';
import MicMutedIcon from '../../../../shared/global_assets/pictos/MicMuted.svg';
import CursorVehicule from '../../../../shared/global_assets/pictos/CursorVehicule.svg';
import CursorVehiculeLeader from '../../../../shared/global_assets/pictos/CursorVehiculeLeader.svg';
import checkAudioPermission from '../services/permissions/microphonePermissionService';
import checkLocationPermission from '../services/permissions/locationPermissionService';

const urlOpenStreetView =
  'https://www.openstreetmap.org/export/embed.html?bbox=-1.595%2C47.196%2C-1.505%2C47.237&layer=mapnik';
const MIC_STATUS_COLORS = {
  idle: '#CCCCCC',
  live: '#1DAD63',
  muted: '#D64545',
} as const;

type CallStatus = 'idle' | 'live' | 'muted';

export default function ExploreScreen() {
  const [isMicActive, setIsMicActive] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');

  // Demander la permission de localisation au chargement de la page
  useEffect(() => {
    checkLocationPermission();
  }, []);

  const handleMicPress = async () => {
    const nextStatus = !isMicActive;

    // Si on veut activer le micro, vérifier la permission
    if (nextStatus) {
      const hasPermission = await checkAudioPermission();
      if (!hasPermission) {
        return;
      }
    }

    setIsMicActive(nextStatus);

    if (!nextStatus) {
      setCallStatus('idle');
    }
  };

  const handleCallToggle = () => {
    setCallStatus((prev) => {
      if (prev === 'idle') {
        return 'live';
      }

      if (prev === 'live') {
        return 'muted';
      }

      return 'live';
    });
  };

  const statusContent = {
    idle: {
      status: 'MICRO INACTIF',
      label: "Appuie sur le micro pour lancer l'appel.",
    },
    live: {
      status: 'MICRO OUVERT',
      label: 'Les participants peuvent vous entendre.',
    },
    muted: {
      status: 'MICRO COUPE',
      label: 'On ne vous entend plus.',
    },
  }[callStatus];

  const RoundMicIcon = callStatus === 'muted' ? MicMutedIcon : MicIcon;
  const isCallLive = callStatus === 'live';

  return (
    <View style={styles.container}>
      <WebView source={{ uri: urlOpenStreetView }} style={styles.webview} />

      <View style={styles.cursorVehicule}>
        <CursorVehicule width={40} height={40} />
      </View>
      <View style={styles.cursorVehiculeLeader}>
        <CursorVehiculeLeader width={40} height={40} />
      </View>

      <View style={styles.topBar}>
        <View style={styles.topBarSide}>
          <HomeButton />
        </View>

        <View style={styles.topBarCenter}>
          <ConvoyName />
        </View>

        <View style={styles.topBarSide}>
          <MicButton isActive={isMicActive} onPress={handleMicPress} />
        </View>
      </View>

      {isMicActive && (
        <View style={styles.micPanel}>
          <View
            style={[
              styles.roundMicButtonOuter,
              { borderColor: MIC_STATUS_COLORS[callStatus] },
            ]}>
            <Pressable
              style={[styles.roundMicButton, isCallLive && styles.roundMicButtonActive]}
              onPress={handleCallToggle}>
              <RoundMicIcon
                width={28}
                height={28}
                color={isCallLive ? '#FFFFFF' : '#BB487C'}
              />
            </Pressable>
          </View>

          <View style={styles.statusColumn}>
            <View style={styles.statusRow}>
              <Text style={styles.statusMic}>{statusContent.status}</Text>
            </View>
            <Text style={styles.confirmationText}>{statusContent.label}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  cursorVehicule: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  cursorVehiculeLeader: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  topBar: {
    position: 'absolute',
    top: 40,
    left: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  topBarSide: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  micPanel: {
    position: 'absolute',
    bottom: 30,
    left: 15,
    right: 15,
    zIndex: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#BB487C',
    padding: 16,
    gap: 12,
  },
  statusColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusMic: {
    color: '#BB487C',
    fontSize: 14,
    fontWeight: '600',
  },
  roundMicButtonOuter: {
    alignSelf: 'center',
    padding: 4,
    borderRadius: 999,
    borderWidth: 6,
  },
  roundMicButton: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: 72,
    height: 72,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#BB487C',
    elevation: 4,
  },
  roundMicButtonActive: {
    backgroundColor: '#BB487C',
    borderColor: '#FFFFFF',
  },
  confirmationText: {
    color: '#BB487C',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
