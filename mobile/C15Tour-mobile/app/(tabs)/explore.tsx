import { useState, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAppTheme } from '@/context/theme';
import { useAuth } from '@/context/auth';
import HomeButton from '@/components/ui/HomeButton';
import MicButton from '@/components/ui/MicButton';
import ConvoyName from '@/components/ui/ConvoyName';
import MicIcon from '../../../../shared/global_assets/pictos/Mic.svg';
import MicMutedIcon from '../../../../shared/global_assets/pictos/MicMuted.svg';
import CursorVehiculeLeader from '../../../../shared/global_assets/pictos/CursorVehiculeLeader.svg';
import { getLocation, startTracking, stopTracking } from '../services/locations/locationService';
import ScrollUpItinerary from '@/components/ui/scroll-up-itinerary';
import {
  computeDistanceToStart,
  computeGuidance,
  computeTripRoute,
  Coordinates,
  fetchTripSteps,
  GuidanceResult,
  reverseGeocodeStreetName,
  RouteGeometry,
  RouteSummary,
  TripStep
} from '../services/itinerary/ItineraryService';


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
        
        const pinSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12C15.0376 12 17.5 9.53757 17.5 6.5C17.5 3.46243 15.0376 1 12 1C8.96243 1 6.5 3.46243 6.5 6.5C6.5 9.53757 8.96243 12 12 12ZM12 12V23" stroke="#BB487C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        const pinSvgStartEnd = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.155 0.0843026C9.1425 -0.541559 5.04413 2.39304 4.58995 6.37422C3.84251 12.9353 7.9087 15.7413 11.0308 23.2064C11.2275 23.6793 11.7281 24.0722 12.1394 23.9888C12.4326 23.9296 12.776 23.6063 12.9619 23.0534C15.7049 14.8546 19.417 14.4513 19.4993 7.82761C19.5458 3.97856 17.2785 0.72755 13.155 0.0843026ZM11.9069 20.5743L7.75134 13.3352C6.24217 10.8283 5.80587 7.94583 6.73927 5.17465C7.57968 3.24838 9.37138 2.10792 11.349 1.86106C13.4304 1.60376 15.5511 2.36522 16.8314 4.19413C18.3585 7.19827 17.9114 10.7066 16.0089 13.4743C14.4496 15.6891 13.248 17.8205 11.9034 20.5709L11.9069 20.5743Z" fill="#A53075"/><path d="M16.8351 4.19417C15.5548 2.36179 13.4341 1.60032 11.3527 1.8611C9.37506 2.10797 7.58336 3.24843 6.74295 5.17469C5.80955 7.94587 6.24585 10.8283 7.75502 13.3352L11.9106 20.5744C13.2553 17.8241 14.4533 15.6926 16.0161 13.4778C17.9187 10.7101 18.3657 7.20179 16.8387 4.19765L16.8351 4.19417ZM14.2852 9.88256C13.2016 11.2003 11.5244 11.5828 10.2906 11.0022C8.692 10.2511 8.36298 8.52305 9.02101 6.93753C9.80063 5.06343 11.8284 4.38541 13.4305 5.19903C15.2937 6.14825 15.7193 8.14058 14.2852 9.88604V9.88256Z" fill="#D1518B"/><path d="M13.4305 5.19903C11.8284 4.38193 9.79706 5.06343 9.02101 6.93753C8.36298 8.52305 8.692 10.2511 10.2906 11.0022C11.5244 11.5828 13.2016 11.2038 14.2852 9.88256C15.7193 8.1371 15.2936 6.14473 13.4304 5.19551L13.4305 5.19903ZM12.6794 9.02022C12.3361 9.42703 11.3991 9.85123 10.8591 9.30534C10.0544 8.48824 10.6803 6.96531 11.7138 6.58631C12.2467 6.3916 13.0335 6.80884 13.2731 7.39993C13.5735 8.15097 12.9727 8.67252 12.683 9.02022H12.6794Z" fill="#A53075"/></svg>';
        const pinIcon = L.icon({
          iconUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(pinSvg),
          iconSize: [30, 30],
          iconAnchor: [15, 29],
          popupAnchor: [0, -24]
        });
        const pinStartEndIcon = L.icon({
          iconUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(pinSvgStartEnd),
          iconSize: [30, 30],
          iconAnchor: [15, 29],
          popupAnchor: [0, -24]
        });

        const userMarker = L.marker([47.2165, -1.550], {
            icon: vehicleIcon,
            title: 'Ma position'
        }).addTo(map);

        const stepsLayer = L.layerGroup().addTo(map);
        const routeLine = L.polyline([], {
          color: '#BB487C',
          weight: 4,
          opacity: 0.9
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
                if (data.type === 'SET_STEPS') {
                  const { steps } = data;
                  stepsLayer.clearLayers();
                  if (Array.isArray(steps) && steps.length > 0) {
                    const bounds = [];
                    steps.forEach((step, index) => {
                      if (typeof step.latitude !== 'number' || typeof step.longitude !== 'number') return;
                      const isEdge = index === 0 || index === steps.length - 1;
                      const marker = L.marker([step.latitude, step.longitude], {
                        icon: isEdge ? pinStartEndIcon : pinIcon
                      });
                      if (step.name) {
                        marker.bindPopup(step.name);
                      }
                      marker.addTo(stepsLayer);
                      bounds.push([step.latitude, step.longitude]);
                    });
                    if (bounds.length > 0) {
                      map.fitBounds(bounds, { padding: [24, 24] });
                    }
                  }
                }
                if (data.type === 'SET_ROUTE') {
                  const { coordinates } = data;
                  routeLine.setLatLngs([]);
                  if (Array.isArray(coordinates) && coordinates.length > 1) {
                    const latLngs = coordinates
                      .map((coord) => Array.isArray(coord) ? [coord[1], coord[0]] : null)
                      .filter((coord) => Array.isArray(coord));
                    if (latLngs.length > 1) {
                      routeLine.setLatLngs(latLngs);
                    }
                  }
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
  const [tripSteps, setTripSteps] = useState<TripStep[]>([]);
  const [routeGeometry, setRouteGeometry] = useState<RouteGeometry | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [distanceToStartKm, setDistanceToStartKm] = useState<number | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [guidance, setGuidance] = useState<GuidanceResult | null>(null);
  const [userStreetName, setUserStreetName] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const lastGeocodeLocationRef = useRef<Coordinates | null>(null);
  const geocodeMinMoveMeters = 50;
  const { trip } = useAuth();
  const { colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const fetchSteps = async () => {
      if (!trip?.trip_id) {
        setTripSteps([]);
        setRouteGeometry(null);
        return;
      }

      try {
        const data = await fetchTripSteps(trip.trip_id);
        setTripSteps(data);
      } catch (error) {
        console.error('Erreur reseau lors de la recuperation des etapes:', error);
        setTripSteps([]);
      }
    };

    fetchSteps();
  }, [trip?.trip_id]);

  useEffect(() => {
    const fetchRoute = async () => {
      if (!trip?.trip_id) {
        setRouteGeometry(null);
        setRouteSummary(null);
        return;
      }

      try {
        const result = await computeTripRoute(trip.trip_id);
        setRouteGeometry(result.geometry);
        setRouteSummary(result.summary);
      } catch (error) {
        console.error('Erreur reseau lors du calcul de l\'itineraire:', error);
        setRouteGeometry(null);
        setRouteSummary(null);
      }
    };

    fetchRoute();
  }, [trip?.trip_id]);

  useEffect(() => {
    if (!isMapReady || !webViewRef.current) return;

    const stepsPayload = tripSteps
      .map((step) => ({
        latitude: Number(step.step_latitude),
        longitude: Number(step.step_longitude),
        name: step.step_name ?? undefined,
      }))
      .filter((step) => Number.isFinite(step.latitude) && Number.isFinite(step.longitude));

    webViewRef.current.postMessage(
      JSON.stringify({
        type: 'SET_STEPS',
        steps: stepsPayload,
      })
    );
  }, [tripSteps, isMapReady]);

  useEffect(() => {
    if (!isMapReady || !webViewRef.current) return;

    webViewRef.current.postMessage(
      JSON.stringify({
        type: 'SET_ROUTE',
        coordinates: routeGeometry?.coordinates ?? []
      })
    );
  }, [routeGeometry, isMapReady]);

  useEffect(() => {
    if (tripSteps.length === 0) {
      setCurrentStepIndex(0);
    } else if (currentStepIndex >= tripSteps.length) {
      setCurrentStepIndex(tripSteps.length - 1);
    }
  }, [tripSteps, currentStepIndex]);

  useEffect(() => {
    const fetchStreetName = async () => {
      if (!currentLocation) {
        setUserStreetName(null);
        return;
      }

      const lastGeocodeLocation = lastGeocodeLocationRef.current;
      if (lastGeocodeLocation) {
        const toRadians = (value: number) => (value * Math.PI) / 180;
        const lat1 = toRadians(lastGeocodeLocation.latitude);
        const lat2 = toRadians(currentLocation.latitude);
        const deltaLat = toRadians(currentLocation.latitude - lastGeocodeLocation.latitude);
        const deltaLon = toRadians(currentLocation.longitude - lastGeocodeLocation.longitude);
        const a = Math.sin(deltaLat / 2) ** 2
          + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const meters = 6371000 * c;
        if (meters < geocodeMinMoveMeters) {
          return;
        }
      }

      try {
        const street = await reverseGeocodeStreetName(currentLocation);
        setUserStreetName(street);
        lastGeocodeLocationRef.current = currentLocation;
      } catch (error) {
        console.error('Erreur reseau reverse geocode:', error);
        setUserStreetName(null);
      }
    };

    fetchStreetName();
  }, [currentLocation]);

  useEffect(() => {
    const fetchDistanceToStart = async () => {
      try {
        const distance = await computeDistanceToStart(currentLocation, tripSteps);
        setDistanceToStartKm(distance);
      } catch (error) {
        console.error('Erreur reseau OSRM distance:', error);
        setDistanceToStartKm(null);
      }
    };

    fetchDistanceToStart();
  }, [currentLocation, tripSteps]);

  useEffect(() => {
    const updateGuidance = async () => {
      if (!currentLocation || tripSteps.length === 0) {
        setGuidance(null);
        return;
      }

      const targetIndex = Math.min(currentStepIndex + 1, tripSteps.length - 1);
      const target = tripSteps[targetIndex];
      if (!target) {
        setGuidance(null);
        return;
      }

      const targetCoords = {
        latitude: Number(target.step_latitude),
        longitude: Number(target.step_longitude)
      };

      if (!Number.isFinite(targetCoords.latitude) || !Number.isFinite(targetCoords.longitude)) {
        setGuidance(null);
        return;
      }

      try {
        const result = await computeGuidance(currentLocation, targetCoords);
        setGuidance(result);

        if (typeof result.distanceToTargetMeters === 'number' && result.distanceToTargetMeters <= 50) {
          setCurrentStepIndex((prev) => Math.min(prev + 1, tripSteps.length - 1));
        }
      } catch (error) {
        console.error('Erreur reseau OSRM guidance:', error);
        setGuidance(null);
      }
    };

    updateGuidance();
  }, [currentLocation, tripSteps, currentStepIndex]);

  // Récupérer la position actuelle au chargement
  useEffect(() => {
    const initializePosition = async () => {
      try {
        // Attendre 1.5 secondes pour laisser le GPS se stabiliser
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const location = await getLocation();
        if (location && webViewRef.current) {
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });

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
          setCurrentLocation({ latitude, longitude });
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
        onLoadEnd={() => setIsMapReady(true)}
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

      <ScrollUpItinerary
        speedKmh={trip?.trip_speed}
        distanceKm={routeSummary?.distanceKm}
        durationSeconds={routeSummary?.durationSeconds}
        distanceToStartKm={distanceToStartKm}
        distanceToNextTargetMeters={guidance?.distanceToTargetMeters ?? null}
        distanceToNextManeuverMeters={guidance?.distanceToNextManeuverMeters ?? null}
        nextInstruction={guidance?.instruction ?? null}
        streetName={userStreetName}
      />


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
