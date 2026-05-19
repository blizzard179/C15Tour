import { useState, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAppTheme } from '@/context/theme';
import HomeButton from '@/components/ui/HomeButton';
import MicButton from '@/components/ui/MicButton';
import ConvoyName from '@/components/ui/ConvoyName';
import MicIcon from '../../../../shared/global_assets/pictos/Mic.svg';
import MicMutedIcon from '../../../../shared/global_assets/pictos/MicMuted.svg';
import CursorVehiculeLeader from '../../../../shared/global_assets/pictos/CursorVehiculeLeader.svg';
import { getLocation, startTracking, stopTracking } from '../services/locations/locationService';


const MIC_STATUS_COLORS = {
  idle: '#CCCCCC',
  live: '#1DAD63',
  muted: '#D64545',
} as const;

const mapHtmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"><\/script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body, #map { width: 100%; height: 100%; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        const map = L.map('map').setView([47.2165, -1.550], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);
        
        // Créer une icône personnalisée avec le SVG du CursorVehicule
        const vehicleIcon = L.icon({
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTIiIGhlaWdodD0iNDciIHZpZXdCb3g9IjAgMCA1MiA0NyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjUuNTI4MyAyLjE3Mjg1QzM4LjYxMyAyLjE3Mjk0IDQ4Ljg4MzcgMTEuODM0NCA0OC44ODM4IDIzLjM1NTVDNDguODgzOCAzNC44NzY2IDM4LjYxMzEgNDQuNTM4IDI1LjUyODMgNDQuNTM4MUMxMi40NDM1IDQ0LjUzODEgMi4xNzI4NSAzNC44NzY2IDIuMTcyODUgMjMuMzU1NUMyLjE3MjkgMTEuODM0MyAxMi40NDM1IDIuMTcyODUgMjUuNTI4MyAyLjE3Mjg1WiIgZmlsbD0iI0JCNDg3QyIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI0LjM0NTIxIi8+PHBhdGggZD0iTTIzLjE5ODUgOS43NTA1OUMyMy45Njk0IDguMDQ5MzggMjYuMzg1NSA4LjA0OTM4IDI3LjE1NjQgOS43NTA1OUwzNy4wODY4IDMxLjY2NkMzOC4wMzU1IDMzLjc1OTcgMzUuNTA3OCAzNS43MDAyIDMzLjczMDMgMzQuMjQyOEwyNS44NjYyIDI3Ljc5NDhDMjUuNDY1NyAyNy40NjY1IDI0Ljg4OTEgMjcuNDY2NSAyNC40ODg3IDI3Ljc5NDhMMTYuNjI0NSAzNC4yNDI4QzE0Ljg0NyAzNS43MDAyIDEyLjMxOTQgMzMuNzU5NyAxMy4yNjgxIDMxLjY2NkwyMy4xOTg1IDkuNzUwNTlaIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==',
            iconSize: [32, 28],
            iconAnchor: [16, 28],
            popupAnchor: [0, -28]
        });
        
        const userMarker = L.marker([47.2165, -1.550], {
            icon: vehicleIcon,
            title: 'Ma position'
        }).addTo(map);

        window.addEventListener('message', (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'SET_LOCATION') {
                    const { latitude, longitude } = data;
                    userMarker.setLatLng([latitude, longitude]);
                    map.setView([latitude, longitude], 13);
                    console.log('Map updated:', latitude, longitude);
                }
            } catch(e) {}
        });
    <\/script>
</body>
</html>
`;


type CallStatus = 'idle' | 'live' | 'muted';

export default function ExploreScreen() {
  const [isMicActive, setIsMicActive] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const webViewRef = useRef<WebView>(null);

  // Récupérer la position actuelle au chargement
  useEffect(() => {
    const initializePosition = async () => {
      try {
        // Attendre 1.5 secondes pour laisser le GPS se stabiliser
        console.log('⏳ Stabilisation du GPS en cours...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const location = await getLocation();
        if (location && webViewRef.current) {
          console.log(`📍 Position GPS stable: lat=${location.coords.latitude}, lon=${location.coords.longitude}`);
          
          // Envoyer la position à la carte Leaflet
          webViewRef.current.postMessage(
            JSON.stringify({
              type: 'SET_LOCATION',
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            })
          );
        }

        // Démarrer le suivi continu pour mettre à jour la position en temps réel
        await startTracking((latitude, longitude) => {
          if (webViewRef.current) {
            webViewRef.current.postMessage(
              JSON.stringify({
                type: 'SET_LOCATION',
                latitude,
                longitude,
              })
            );
          }
        });
      } catch (error) {
        console.error('Erreur lors du positionnement du curseur:', error);
      }
    };

    initializePosition();

    // Nettoyage au déchargement
    return () => {
      stopTracking();
    };
  }, []);

  const handleMicPress = () => {
    setIsMicActive((prev: boolean) => {
      const next = !prev;
      if (!next) {
        setCallStatus('idle');
      }
      return next;
    });
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
      <WebView
        ref={webViewRef}
        source={{ html: mapHtmlContent }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
      />

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
        <View style={[styles.micPanel, { backgroundColor: isDark ? 'rgba(28,28,30,0.96)' : 'rgba(255,255,255,0.96)' }]}>
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
