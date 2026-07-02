import './css/carte.css'
import './css/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useLayoutEffect, useRef, useState, useEffect, useCallback, useMemo } from 'react';
import RoutingMachine from './helper/RoutingMachine';
import ClickHandler from './helper/ClickHandler';
import FlyTo from './helper/FlyTo';
import ConvoyCard from './components/CardConvoi';
import Pin from '@shared/global_assets/pictos/Pin 2.svg'
import DownloadIcon from '@shared/global_assets/pictos/Download.svg';
import ResearchBar from './components/ResearchBar';
import RoadsTour from './components/RoadsTour';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

// Clés utilisées pour la persistance dans le localStorage du navigateur
const CONVOYS_STORAGE_KEY = 'c15tour_convoys_v1'; // liste de tous les convois enregistrés localement
const LAST_CONVOY_STORAGE_KEY = 'c15tour_last_convoy_id'; // id du dernier convoi ouvert/édité
// en dev : const BACKEND_BASE_URL = 'http://localhost:3000';
const BACKEND_BASE_URL = import.meta.env.VITE_API_URL ?? ''; // URL de l'API backend (vide = même origine)
const MAP_IMAGE_STORAGE_KEY = 'c15tour_map_image_base64'; // capture d'écran de la carte encodée en base64, utilisée pour l'export PDF

// Styles pour le popup personnalisé
const popupStyles = `
  .custom-popup {
    padding: 10px 12px;
    min-width: 230px;
    background: #f8f8f8;
    border: 2px solid #d670a8;
    border-radius: 16px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    color: #b14080;
    font-family: 'Montserrat', sans-serif;
  }
  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 6px;
  }
  .popup-title-wrap {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .popup-title {
    font-weight: 600;
    color: #BB487C;
    font-size: 16px;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .popup-subtitle {
    font-style: italic;
    color: #d28bb3;
    font-size: 14px;
    margin-top: 2px;
  }
  .popup-top-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }
  .popup-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    border: 1px solid #efc2da;
    border-radius: 999px;
    width: 24px;
    height: 24px;
    font-size: 16px;
    color: #BB487C;
    cursor: pointer;
    transition: all 0.2s;
  }
  .popup-icon-btn:hover {
    background: #f8f9fa;
    border-color: #BB487C;
  }
  .popup-line {
    color: #b14080;
    font-size: 17px;
    line-height: 1.2;
    margin-top: 3px;
  }
  .popup-coords {
    color: #b14080;
    font-size: 22px;
    line-height: 1.1;
    margin-top: 2px;
    font-weight: 500;
  }
  .popup-pin {
    color: #d670a8;
    margin-right: 4px;
  }
`;

// Composant de popup personnalisé : génère le HTML affiché quand on clique
// sur un marqueur de la carte (nom de l'étape, adresse, coordonnées, boutons d'action).
// Retourne une chaîne HTML brute car Leaflet n'utilise pas le rendu React pour ses popups.
const CustomPopup = ({ index, name, address, lat, lng }) => {
  const displayCoords = Number.isFinite(lat) && Number.isFinite(lng)
    ? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    : '';

  return `
    <div class="custom-popup">
      <div class="popup-header">
        <div class="popup-title-wrap">
          <div class="popup-title">${name || `Etape ${index + 1}`}</div>
          <div class="popup-subtitle"></div>
        </div>
        <div class="popup-top-actions">
          <button class="popup-icon-btn" onclick="event.stopPropagation(); window.configClickHandler(${index})" title="Editer">?</button>
          <button class="popup-icon-btn" onclick="event.stopPropagation(); window.detailsClickHandler(${index})" title="Ajouter">+</button>
        </div>
      </div>
      ${address ? `<div class="popup-line"><span class="popup-pin">?</span>${address}</div>` : ''}
      ${displayCoords ? `<div class="popup-coords">${displayCoords}</div>` : ''}
    </div>
  `;
};
// Composant principal de la carte interactive : gestion des étapes (waypoints),
// du calcul d'itinéraire, des convois sauvegardés localement et des exports (GPX/PDF).
function Carte() {

    // --- États liés au trajet en cours d'édition ---
    const [waypoints, setWaypoints] = useState([]); // liste des points du trajet (coordonnées)
    const [waypointNames, setWaypointNames] = useState([]); // noms affichés pour chaque point
    const [stepConfigs, setStepConfigs] = useState({}); // configuration par étape (pause, segment, etc.)
    const [searchQuery, setSearchQuery] = useState(''); // texte tapé dans la barre de recherche d'adresse
    const mapRef = useRef(); // référence vers l'instance Leaflet de la carte
    const importInputRef = useRef(); // référence vers l'input file caché pour l'import GPX
    const [editingWaypointIndex, setEditingWaypointIndex] = useState(null); // index du waypoint en cours de modification via la recherche

    // --- États liés au calcul d'itinéraire (durée, distance, tracé) ---
    const [routeDurationMinutes, setRouteDurationMinutes] = useState(null);
    const [routeLegDurationsMinutes, setRouteLegDurationsMinutes] = useState([]); // durée de chaque tronçon entre deux étapes
    const [routeLegDistancesKm, setRouteLegDistancesKm] = useState([]); // distance de chaque tronçon
    const [routeCoordinates, setRouteCoordinates] = useState([]); // ensemble des points du tracé de la route

    // --- États liés à l'écran de sélection de convoi ---
    const [showConvoySelector, setShowConvoySelector] = useState(true); // affiche l'écran de sélection au démarrage
    const [isConvoySelectorOpen, setIsConvoySelectorOpen] = useState(false); // true si l'utilisateur a explicitement rouvert le sélecteur
    const [savedConvoys, setSavedConvoys] = useState([]); // convois sauvegardés dans le localStorage
    const [currentConvoyId, setCurrentConvoyId] = useState(null); // id du convoi actuellement chargé
    const [currentConvoyName, setCurrentConvoyName] = useState('Nom du convoi');
    const [selectedConvoyId, setSelectedConvoyId] = useState(''); // convoi sélectionné dans la liste déroulante
    const [isStorageLoaded, setIsStorageLoaded] = useState(false); // évite d'écraser le localStorage avant le premier chargement

    // Réglages généraux du trajet : type de route à éviter et vitesse de calcul des durées
    const [generalSettings, setGeneralSettings] = useState({
        routeType: {
            avoidMotorway: true,
            avoidFastRoad: true,
            avoidTrack: true
        },
        speed: {
            generalSpeedKmH: 50,
            autoReductionEnabled: true,
            reductionPercent: 20
        }
    });
    const [segmentConfig, setSegmentConfig] = useState([]); // configuration des segments (couleur, rang, nombre de sections) pour l'affichage du tracé
    const [imageExportBase64, setImageExportBase64] = useState(() => {
      // On tente de récupérer une capture d'écran précédente au chargement, pour permettre un export PDF immédiat
      try { return localStorage.getItem(MAP_IMAGE_STORAGE_KEY) || null; } catch { return null; }
    });

    // Calcule la distance à vol d'oiseau (formule de Haversine) entre deux points [lat, lng]
    const haversineKm = (a, b) => {
      const toRad = (value) => (value * Math.PI) / 180;
      const lat1 = Number(a?.[0]);
      const lon1 = Number(a?.[1]);
      const lat2 = Number(b?.[0]);
      const lon2 = Number(b?.[1]);
      if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return 0;

      const earthRadiusKm = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const s1 = Math.sin(dLat / 2);
      const s2 = Math.sin(dLon / 2);
      const h =
        s1 * s1 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * s2 * s2;
      return 2 * earthRadiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    };

    // Distance totale du trajet, calculée en sommant la distance de chaque segment du tracé
    const totalDistanceKm = useMemo(() => {
      if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2) return null;
      let total = 0;
      for (let i = 1; i < routeCoordinates.length; i += 1) {
        total += haversineKm(routeCoordinates[i - 1], routeCoordinates[i]);
      }
      return total > 0 ? total : null;
    }, [routeCoordinates]);

    // Vitesse configurée par l'utilisateur (km/h), utilisée pour recalculer la durée du trajet
    const configuredSpeedKmH = useMemo(() => {
      const value = Number(generalSettings?.speed?.generalSpeedKmH);
      return Number.isFinite(value) && value > 0 ? value : null;
    }, [generalSettings]);

    // Durée totale estimée (en minutes) à partir de la distance, de la vitesse configurée,
    // d'une éventuelle réduction automatique, et des temps de pause à chaque étape.
    const totalMinutesFromSpeed = useMemo(() => {
      if (!Number.isFinite(totalDistanceKm) || !Number.isFinite(configuredSpeedKmH)) return null;
      let minutes = (totalDistanceKm / configuredSpeedKmH) * 60;
      const isReduced = Boolean(generalSettings?.speed?.autoReductionEnabled);
      if (isReduced) {
        const reduction = Math.max(0, Number(generalSettings?.speed?.reductionPercent) || 0);
        minutes *= 1 + reduction / 100;
      }
      const breakMinutes = waypoints.reduce((total, waypoint, index) => {
        const configuredBreak = Number(stepConfigs[index]?.breakTime);
        if (Number.isFinite(configuredBreak) && configuredBreak > 0) {
          return total + configuredBreak;
        }

        const hasStop = waypoint?.step_is_stop ?? waypoint?.isStop ?? false;
        const loadedBreak = Number(waypoint?.step_stop_duration ?? waypoint?.stopDuration);
        return total + (hasStop && Number.isFinite(loadedBreak) && loadedBreak > 0 ? loadedBreak : 0);
      }, 0);
      return Math.max(0, Math.round(minutes) + breakMinutes);
    }, [totalDistanceKm, configuredSpeedKmH, generalSettings, stepConfigs, waypoints]);

    // Compare deux configurations de segments pour éviter des re-rendus inutiles
    // quand le contenu est identique (même nombre de sections, rang et couleur).
    const areSegmentConfigsEqual = (a = [], b = []) => {
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i += 1) {
        const left = a[i] || {};
        const right = b[i] || {};
        if (
          Number.parseInt(left.stepNbSections, 10) !== Number.parseInt(right.stepNbSections, 10) ||
          Number.parseInt(left.segmentRank, 10) !== Number.parseInt(right.segmentRank, 10) ||
          (left.segmentColor || '') !== (right.segmentColor || '')
        ) {
          return false;
        }
      }
      return true;
    };

    const handleSegmentConfigChange = useCallback((newConfig) => {
      const normalized = Array.isArray(newConfig) ? newConfig : [];
      setSegmentConfig((prev) => (areSegmentConfigsEqual(prev, normalized) ? prev : normalized));
    }, []);

    // Déplace un élément d'un tableau de fromIndex vers toIndex (utilisé pour le glisser-déposer des étapes)
    const moveItem = (items, fromIndex, toIndex) => {
        if (!Array.isArray(items)) return items;
        const next = [...items];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
    };

    // Récupère la liste des convois sauvegardés dans le localStorage.
    // On s'assure qu'une même sauvegarde côté serveur (backendTripId / shareTrip) n'est
    // jamais partagée par deux convois locaux différents (en cas de duplication accidentelle).
    const parseStoredConvoys = () => {
      try {
        const raw = localStorage.getItem(CONVOYS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];

        const seenShareKeys = new Set();
        return parsed.map((convoy) => {
          const shareKey = convoy.backendTripId || convoy.shareTrip?.trip_id || convoy.shareTrip?.trip_user_code || null;
          if (!shareKey) return convoy;

          if (seenShareKeys.has(shareKey)) {
            return {
              ...convoy,
              backendTripId: null,
              shareTrip: null
            };
          }

          seenShareKeys.add(shareKey);
          return convoy;
        });
      } catch {
        return [];
      }
    };

    // Construit les informations de partage (codes participant/admin) à partir d'un trajet renvoyé par le backend
    const getShareTripFromBackendTrip = (trip) => {
      if (!trip?.trip_user_code || !trip?.trip_admin_code) return null;

      return {
        trip_id: trip.trip_id,
        trip_name: trip.trip_name,
        trip_user_code: trip.trip_user_code,
        trip_admin_code: trip.trip_admin_code
      };
    };

    // Chargement initial des convois sauvegardés depuis le localStorage (une seule fois au montage)
    useEffect(() => {
      const convoys = parseStoredConvoys();
      setSavedConvoys(convoys);
      setIsStorageLoaded(true);
    }, []);

    // Présélectionne le premier convoi de la liste dans le menu déroulant si aucun n'est encore choisi
    useEffect(() => {
      if (!selectedConvoyId && savedConvoys.length > 0) {
        setSelectedConvoyId(savedConvoys[0].id);
      }
    }, [savedConvoys, selectedConvoyId]);

    // Persiste la liste des convois dans le localStorage à chaque modification
    // (mais seulement après le chargement initial pour ne pas écraser les données existantes)
    useEffect(() => {
      if (!isStorageLoaded) return;
      localStorage.setItem(CONVOYS_STORAGE_KEY, JSON.stringify(savedConvoys));
    }, [savedConvoys, isStorageLoaded]);

    useEffect(() => {
      // Si un convoi est chargé, on ferme le panneau de sélection
      // pour réactiver immédiatement l'overlay principal.
      if (!showConvoySelector) return;
      if (isConvoySelectorOpen) return;
      if (currentConvoyId || waypoints.length > 0) {
        setShowConvoySelector(false);
      }
    }, [showConvoySelector, isConvoySelectorOpen, currentConvoyId, waypoints.length]);

    // Dès qu'un convoi est chargé (id défini), on masque systématiquement le sélecteur
    useEffect(() => {
      if (!currentConvoyId) return;
      setShowConvoySelector(false);
    }, [currentConvoyId]);

    // Réinitialise l'état pour démarrer un nouveau convoi vierge
    const createNewConvoy = () => {
      const now = new Date();
      setIsConvoySelectorOpen(false);
      setCurrentConvoyId(null);
      setCurrentConvoyName(`Convoi ${now.toLocaleString('fr-FR')}`);
      setWaypoints([]);
      setWaypointNames([]);
      setRouteCoordinates([]);
      setRouteDurationMinutes(null);
      setShowConvoySelector(false);
    };

    // Prend une "capture d'écran" de la carte en redessinant manuellement les tuiles,
    // le tracé de la route et les marqueurs sur un canvas (utilisé ensuite pour l'export PDF).
    // On ne peut pas utiliser une simple capture DOM car les tuiles OpenStreetMap posent
    // des soucis de CORS ; on les redessine donc nous-mêmes à partir de leurs coordonnées.
    const captureMapScreenshot = async () => {
      try {
        const map = mapRef.current;
        if (!map) return;

        const size = map.getSize();
        const canvas = document.createElement('canvas');
        canvas.width = size.x;
        canvas.height = size.y;
        const ctx = canvas.getContext('2d');

        // Fond par défaut
        ctx.fillStyle = '#e8e8e8';
        ctx.fillRect(0, 0, size.x, size.y);

        // Dessiner les tuiles en les recalculant depuis leur URL (z/x/y → lat/lng → px)
        const tileImgs = map.getContainer().querySelectorAll(
          '.leaflet-tile-pane img.leaflet-tile:not(.leaflet-tile-loading)'
        );
        await Promise.all(Array.from(tileImgs).map(imgEl => new Promise(resolve => {
          const match = imgEl.src.match(/\/(\d+)\/(\d+)\/(\d+)\.png/);
          if (!match) { resolve(); return; }
          const z = Number(match[1]), x = Number(match[2]), y = Number(match[3]);
          const n = Math.pow(2, z);
          const tileLat = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
          const tileLng = (x / n) * 360 - 180;
          const pt = map.latLngToContainerPoint(L.latLng(tileLat, tileLng));
          const tileSize = 256 * Math.pow(2, map.getZoom() - z);
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => { ctx.drawImage(img, pt.x, pt.y, tileSize, tileSize); resolve(); };
          img.onerror = resolve;
          img.src = imgEl.src;
        })));

        // Dessiner le tracé de route depuis routeCoordinates (format [[lat,lng], ...])
        if (Array.isArray(routeCoordinates) && routeCoordinates.length >= 2) {
          ctx.strokeStyle = '#4A6CF7';
          ctx.lineWidth = 4;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.beginPath();
          routeCoordinates.forEach(([lat, lng], i) => {
            const pt = map.latLngToContainerPoint(L.latLng(lat, lng));
            if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
        }

        // Dessiner les marqueurs des étapes
        waypoints.forEach((point, index) => {
          let lat, lng;
          if (Array.isArray(point)) { [lat, lng] = point; }
          else if (point?.lat !== undefined) { lat = point.lat; lng = point.lng ?? point.lon; }
          else return;
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          const pt = map.latLngToContainerPoint(L.latLng(lat, lng));
          ctx.beginPath();
          ctx.arc(pt.x, pt.y - 8, 9, 0, Math.PI * 2);
          ctx.fillStyle = '#d670a8';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(index + 1), pt.x, pt.y - 8);
        });

        const base64 = canvas.toDataURL('image/jpeg', 0.75).split(',')[1];
        setImageExportBase64(base64);
        try { localStorage.setItem(MAP_IMAGE_STORAGE_KEY, base64); } catch { /* quota */ }
      } catch (error) {
        console.warn('Capture de la carte impossible:', error);
      }
    };

    // Sauvegarde (ou met à jour) le convoi courant dans le localStorage.
    // Nécessite au moins 2 étapes pour constituer un trajet valide.
    const saveCurrentConvoyLocal = () => {
      if (!waypoints || waypoints.length < 2) return false;

      const nowIso = new Date().toISOString();

      if (currentConvoyId) {
        setSavedConvoys((prev) =>
          prev.map((convoy) =>
            convoy.id === currentConvoyId
              ? {
                  ...convoy,
                  name: currentConvoyName || convoy.name,
                  waypoints,
                  waypointNames,
                  stepConfigs,
                  generalSettings,
                  updatedAt: nowIso
                }
            : convoy
          )
        );
        captureMapScreenshot();
        return currentConvoyId;
      }

      const id = `${Date.now()}`;
      const convoy = {
        id,
        name: currentConvoyName || `Convoi ${new Date().toLocaleString('fr-FR')}`,
        waypoints,
        waypointNames,
        stepConfigs,
        generalSettings,
        updatedAt: nowIso
      };

      setSavedConvoys((prev) => [convoy, ...prev]);
      setCurrentConvoyId(id);
      setCurrentConvoyName(convoy.name);
      localStorage.setItem(LAST_CONVOY_STORAGE_KEY, id);
      captureMapScreenshot();
      return id;
    };

    // Appelé quand un trajet vient d'être enregistré côté serveur : on relie
    // le convoi local aux informations de partage (codes admin/participant) retournées.
    const handleTripPersisted = (trip, convoyId = currentConvoyId) => {
      const shareTrip = getShareTripFromBackendTrip(trip);
      if (!shareTrip || !convoyId) return;

      const nowIso = new Date().toISOString();
      setSavedConvoys((prev) =>
        prev.map((convoy) =>
          convoy.id === convoyId
            ? {
                ...convoy,
                backendTripId: shareTrip.trip_id,
                shareTrip,
                updatedAt: nowIso
              }
            : convoy
        )
      );
    };

    // Associe le convoi courant à l'id renvoyé par le backend lors de sa création
    const handlePersistConvoyOnServer = (tripId) => {
      setCurrentConvoyId(tripId);
    };

    // Charge un convoi sauvegardé (waypoints, noms, configuration) dans l'état courant
    const openConvoy = (convoy) => {
      setIsConvoySelectorOpen(false);
      setCurrentConvoyId(convoy.id);
      setCurrentConvoyName(convoy.name || 'Nom du convoi');
      setWaypoints(Array.isArray(convoy.waypoints) ? convoy.waypoints : []);
      setWaypointNames(Array.isArray(convoy.waypointNames) ? convoy.waypointNames : []);
      setStepConfigs(convoy.stepConfigs && typeof convoy.stepConfigs === 'object' ? convoy.stepConfigs : {});
      setGeneralSettings(convoy.generalSettings || generalSettings);
      localStorage.setItem(LAST_CONVOY_STORAGE_KEY, convoy.id);
      setShowConvoySelector(false);
    };

    // Ouvre directement le dernier convoi consulté (ou le premier disponible à défaut)
    const openLastConvoy = () => {
      const lastId = localStorage.getItem(LAST_CONVOY_STORAGE_KEY);
      const convoy = savedConvoys.find((c) => c.id === lastId) || savedConvoys[0];
      if (convoy) {
        openConvoy(convoy);
      }
    };

    // Réaffiche l'écran de sélection de convoi et réinitialise le trajet en cours
    const openConvoySelector = () => {
      setIsConvoySelectorOpen(true);
      setShowConvoySelector(true);
      setCurrentConvoyId(null);
      setCurrentConvoyName('Nom du convoi');
      setWaypoints([]);
      setWaypointNames([]);
      setStepConfigs({});
      setRouteCoordinates([]);
      setRouteDurationMinutes(null);
      setEditingWaypointIndex(null);
      setSearchQuery('');
    };

    // Convoi à proposer en "chargement rapide" sur l'écran de sélection
    const lastConvoyId = localStorage.getItem(LAST_CONVOY_STORAGE_KEY);
    const lastConvoy = savedConvoys.find((c) => c.id === lastConvoyId) || savedConvoys[0] || null;
    // Convoi correspondant au trajet actuellement affiché (pour retrouver ses infos de partage, etc.)
    const currentSavedConvoy = currentConvoyId
      ? savedConvoys.find((convoy) => convoy.id === currentConvoyId) || null
      : null;

    // Analyse un fichier GPX (format XML) et en extrait les étapes du trajet.
    // On utilise en priorité les points d'intérêt (<wpt>), sinon on se rabat sur le
    // premier et le dernier point de la trace GPS (<trkpt>) comme départ/arrivée.
    const parseGpxText = (gpxText, sourceFileName = '') => {
      const xml = new DOMParser().parseFromString(gpxText, 'application/xml');
      const wptNodes = Array.from(xml.querySelectorAll('wpt'));
      const trkptNodes = Array.from(xml.querySelectorAll('trkpt'));

      let importedWaypoints = wptNodes.map((wpt, index) => ({
        lat: Number(wpt.getAttribute('lat')),
        lng: Number(wpt.getAttribute('lon')),
        display_name: wpt.querySelector('name')?.textContent || `Point ${index + 1}`
      }));

      if (importedWaypoints.length < 2 && trkptNodes.length >= 2) {
        importedWaypoints = [
          {
            lat: Number(trkptNodes[0].getAttribute('lat')),
            lng: Number(trkptNodes[0].getAttribute('lon')),
            display_name: 'Départ'
          },
          {
            lat: Number(trkptNodes[trkptNodes.length - 1].getAttribute('lat')),
            lng: Number(trkptNodes[trkptNodes.length - 1].getAttribute('lon')),
            display_name: 'Arrivee'
          }
        ];
      }

      const validWaypoints = importedWaypoints.filter(
        (w) => Number.isFinite(w.lat) && Number.isFinite(w.lng)
      );
      const names = validWaypoints.map((w, i) => w.display_name || `Etape ${i + 1}`);
      const normalizeName = (value = '') => value.trim().toLowerCase().replace(/\s+/g, ' ');
      // Détecte les libellés du type "Paris, Paris" (nom dupliqué), peu utiles comme nom de convoi
      const isDuplicatedLabel = (value = '') => {
        const parts = value.split(',').map((part) => normalizeName(part)).filter(Boolean);
        return parts.length === 2 && parts[0] === parts[1];
      };

      const metadataName = xml.querySelector('metadata > name')?.textContent?.trim() || '';
      const trackName = xml.querySelector('trk > name')?.textContent?.trim() || '';
      const firstWaypointName = names[0]?.trim() || '';
      const fileBaseName = sourceFileName.replace(/\.[^/.]+$/, '').trim();

      // Le nom du convoi provient en priorité des métadonnées du GPX, sauf si ce nom
      // est en réalité le nom de la première étape ou un libellé dupliqué : dans ce
      // cas on préfère utiliser le nom du fichier importé.
      let convoyName = metadataName || trackName;
      if (
        !convoyName ||
        normalizeName(convoyName) === normalizeName(firstWaypointName) ||
        isDuplicatedLabel(convoyName)
      ) {
        convoyName = fileBaseName || convoyName;
      }

      if (validWaypoints.length < 2) return null;
      return {
        name: convoyName || `Import ${new Date().toLocaleString('fr-FR')}`,
        waypoints: validWaypoints,
        waypointNames: names
      };
    };

    // Gère la sélection d'un fichier GPX par l'utilisateur : lecture, analyse puis
    // création d'un nouveau convoi importé, directement ouvert à l'écran.
    const handleImportConvoy = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = parseGpxText(text, file.name);
        if (!parsed) return;

        const id = `${Date.now()}`;
        const convoy = {
          id,
          name: parsed.name,
          waypoints: parsed.waypoints,
          waypointNames: parsed.waypointNames,
          generalSettings,
          updatedAt: new Date().toISOString()
        };

        setSavedConvoys((prev) => [convoy, ...prev]);
        openConvoy(convoy);
      } finally {
        e.target.value = '';
      }
    };

    // Réinitialise les informations de trajet dès qu'il n'y a plus assez d'étapes pour en calculer un
    useEffect(() => {
        if (waypoints.length < 2) {
            setRouteDurationMinutes(null);
            setRouteCoordinates([]);
            setRouteLegDurationsMinutes([]);
        }
    }, [waypoints.length]);

    // Échappe les caractères spéciaux XML pour pouvoir insérer du texte libre dans le fichier GPX généré
    const escapeXml = (value = '') =>
      String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    // Normalise un waypoint (quel que soit son format d'origine) en {lat, lon, name} pour l'export GPX
    const formatWaypointForGpx = (point, index) => {
      if (Array.isArray(point) && point.length >= 2) {
        return { lat: Number(point[0]), lon: Number(point[1]), name: waypointNames[index] || `Etape ${index + 1}` };
      }
      if (point?.lat !== undefined && point?.lng !== undefined) {
        return { lat: Number(point.lat), lon: Number(point.lng), name: waypointNames[index] || `Etape ${index + 1}` };
      }
      if (point?.lat !== undefined && point?.lon !== undefined) {
        return { lat: Number(point.lat), lon: Number(point.lon), name: waypointNames[index] || `Etape ${index + 1}` };
      }
      return null;
    };

    // Génère un fichier GPX (points d'étapes + tracé complet) et déclenche son téléchargement
    const exportCurrentRouteAsGpx = () => {
      if (!routeCoordinates || routeCoordinates.length < 2) return false;

      const nowIso = new Date().toISOString();
      const convoyNameForExport = (currentConvoyName || waypointNames[0] || 'Trajet C15Tour').trim();
      const gpxWaypoints = waypoints
        .map((point, index) => formatWaypointForGpx(point, index))
        .filter((wpt) => wpt && Number.isFinite(wpt.lat) && Number.isFinite(wpt.lon));

      const wptXml = gpxWaypoints
        .map(
          (wpt) =>
            `<wpt lat="${wpt.lat}" lon="${wpt.lon}"><name>${escapeXml(wpt.name)}</name></wpt>`
        )
        .join('');

      const trkptXml = routeCoordinates
        .map(([lat, lon]) => `<trkpt lat="${lat}" lon="${lon}"></trkpt>`)
        .join('');

      const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="C15Tour" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(convoyNameForExport)}</name>
    <time>${nowIso}</time>
  </metadata>
  ${wptXml}
  <trk>
    <name>${escapeXml(convoyNameForExport)}</name>
    <trkseg>${trkptXml}</trkseg>
  </trk>
</gpx>`;

      const blob = new Blob([gpx], { type: 'application/gpx+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = nowIso.replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');
      const sanitizedBaseName = convoyNameForExport
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_+/g, '_');
      a.href = url;
      a.download = `${sanitizedBaseName || `trajet_${timestamp}`}.gpx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return true;
    };

    // Demande au backend de générer un PDF récapitulatif du trajet (avec capture de la carte)
    // et déclenche son téléchargement. Le convoi doit avoir été sauvegardé côté serveur au préalable.
    const exportCurrentRouteAsPdf = async () => {
      if (!currentConvoyId) {
        alert('Le convoi doit être sauvegardé avant d\'exporter en PDF');
        return false;
      }

      try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/trips/${currentConvoyId}/exports/pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            mapImage: imageExportBase64 || null
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Backend error:', errorText);
          alert(`Erreur lors de l'export PDF: Trajet non sauvegardé en base de données ou erreur serveur`);
          return false;
        }

        const blob = await response.blob();

        // Vérifier que c'est vraiment un PDF
        if (blob.type !== 'application/pdf') {
          console.error('Invalid content type:', blob.type);
          alert('Le serveur n\'a pas retourné un PDF valide');
          return false;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const nowIso = new Date().toISOString();
        const timestamp = nowIso.replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');
        const convoyNameForExport = (currentConvoyName || waypointNames[0] || 'Trajet C15Tour').trim();
        const sanitizedBaseName = convoyNameForExport
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/[^a-zA-Z0-9_-]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .replace(/_+/g, '_');
        a.href = url;
        a.download = `${sanitizedBaseName || `trajet_${timestamp}`}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return true;
      } catch (error) {
        console.error('Error exporting PDF:', error);
        alert(`Erreur lors de l'export PDF: ${error.message}`);
        return false;
      }
    };

    // Met à jour le nom et/ou les coordonnées d'un waypoint existant à l'index donné
    const handleUpdateWaypoint = (index, newName, newCoords = null) => {
        if (newCoords) {
            setWaypoints(prev => {
                const updated = [...prev];
                updated[index] = newCoords;
                return updated;
            });
        }
        
        if (newName !== undefined) {
            setWaypointNames(prev => {
                const updated = [...prev];
                updated[index] = newName;
                return updated;
            });
        }
    };
    const [isConvoyBelowSearch, setIsConvoyBelowSearch] = useState(false);
    const leftPanelRef = useRef(null);
    const searchLayerRef = useRef(null);

    // Icône personnalisée utilisée pour tous les marqueurs de la carte
    const pinIcon = L.icon({
        iconUrl: Pin,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -28]
    });

    useEffect(() => {
        // Injecte les styles CSS du popup personnalisé une seule fois dans le <head>
        if (!document.getElementById('popup-styles')) {
          const styleElement = document.createElement('style');
          styleElement.id = 'popup-styles';
          styleElement.innerHTML = popupStyles;
          document.head.appendChild(styleElement);
        }

        // Définit les gestionnaires d'événements globaux appelés depuis le HTML brut
        // du popup Leaflet (celui-ci n'étant pas du JSX, on ne peut pas y attacher
        // directement des gestionnaires React onClick).
        window.configClickHandler = (index) => {
          console.log('Configuration du point', index);
          // Ajoutez ici la logique pour ouvrir la configuration
        };

        window.itineraireClickHandler = (index) => {
          console.log('Itinéraire vers le point', index);
          // Ajoutez ici la logique pour l'itinéraire
        };

        window.detailsClickHandler = (index) => {
          console.log('Détails du point', index);
          // Ajoutez ici la logique pour afficher les détails
        };

        return () => {
          // Nettoyage : on supprime les gestionnaires globaux au démontage du composant
          delete window.configClickHandler;
          delete window.itineraireClickHandler;
          delete window.detailsClickHandler;
        };
    }, []);

    return (
        <div className="map-container">
            <MapContainer
                center={[47.216671, -1.55]}
                zoom={13}
                style={{ height: '100vh', width: '100%' }}
                ref={mapRef}
            >
                {/* <button onClick={() => setWaypoints([])}>
                    Réinitialiser
                </button>
                <button onClick={() =>
                    setWaypoints(prev => prev.slice(0, -1))
                }>
                    Annuler dernier point
                </button> */}

                {/* Tuiles OpenStreetMap affichées en fond de carte */}
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {/* Ajoute un nouveau waypoint à chaque clic sur la carte (sauf pendant la sélection de convoi) */}
                <ClickHandler onMapClick={(latlng) => {
                    if (showConvoySelector) return;
                    setWaypoints(prev => [...prev, latlng]);
                    setWaypointNames(prev => [...prev, '']);
                }} />
                {/* Affiche un marqueur pour chaque étape du trajet */}
                {waypoints.map((point, index) => {
                    const waypointName = waypointNames[index] || '';
                    let lat, lng, displayName;

                    // Les waypoints peuvent provenir de sources différentes (clic carte, recherche,
                    // import GPX...) d'où la gestion de plusieurs formats de données possibles
                    if (Array.isArray(point)) {
                        [lat, lng] = point;
                        displayName = point.display_name || `Point ${index + 1}`;
                    } else if (point && typeof point === 'object' && point.lat !== undefined && point.lng !== undefined) {
                        lat = point.lat;
                        lng = point.lng;
                        displayName = point.display_name || waypointName || `Point ${index + 1}`;
                    } else if (point && point.lat !== undefined && point.lon !== undefined) {
                        // Format {lat: x, lon: y}
                        lat = point.lat;
                        lng = point.lon;
                        displayName = point.display_name || waypointName || `Point ${index + 1}`;
                    } else {
                        console.warn('Format de point non reconnu:', point);
                        return null;
                    }

                    const position = [parseFloat(lat), parseFloat(lng)];
                    
                    if (isNaN(position[0]) || isNaN(position[1])) {
                        console.error('Coordonnées invalides pour le point:', point);
                        return null;
                    }
                    
                    return (
                        <Marker 
                            key={index} 
                            position={position}
                            icon={pinIcon}
                        >
                            <Popup>
                                <div 
                                    dangerouslySetInnerHTML={{ 
                                        __html: CustomPopup({ 
                                            index,
                                            name: waypointName,
                                            address: displayName,
                                            lat: position[0],
                                            lng: position[1]
                                        }) 
                                    }} 
                                />
                            </Popup>
                        </Marker>
                    );
                })}
                
                {/* Calcul et affichage automatique de l'itinéraire dès que 2 étapes valides existent */}
                {waypoints.length >= 2 && (
                  <RoutingControl 
                    waypoints={waypoints}
                    map={mapRef.current}
                    onRouteDurationChange={setRouteDurationMinutes}
                    onRouteLegDurationsChange={setRouteLegDurationsMinutes}
                    onRouteLegDistancesChange={setRouteLegDistancesKm}
                    onRouteGeometryChange={setRouteCoordinates}
                    routePreferences={generalSettings}
                    segmentConfig={segmentConfig}
                  />
                )}

                {/* Centrage automatique de la carte */}
                <FlyTo position={waypoints} mapRef={mapRef} />

            </MapContainer>
            {showConvoySelector && (
              <div className="convoy-selector-overlay">
                <div className="convoy-selector-panel">
                  <h2>SELECTION DU CONVOI</h2>

                      <div className="selector-section-title">LE DERNIER CONVOI</div>
                      <div className="last-convoy-row">
                        <div className="last-convoy-meta">
                          <span>{lastConvoy?.name || 'C15 TOUR #5'}</span>
                          <small>{lastConvoy?.updatedAt ? new Date(lastConvoy.updatedAt).toLocaleDateString('fr-FR') : '0/0/2024'}</small>
                        </div>
                        <button
                          className="convoy-selector-btn primary"
                          type="button"
                          onClick={openLastConvoy}
                          disabled={!lastConvoy}
                        >
                          CHARGER
                        </button>
                      </div>

                      <div className="selector-divider" />

                      <div className="selector-section-title">LES AUTRES CONVOIS</div>
                      <div className="other-convoy-row">
                        <select
                          className="convoy-select"
                          value={selectedConvoyId}
                          onChange={(e) => setSelectedConvoyId(e.target.value)}
                        >
                          {savedConvoys.length === 0 && <option value="">Defaut</option>}
                          {savedConvoys.map((convoy) => (
                            <option key={convoy.id} value={convoy.id}>
                              {convoy.name || 'Defaut'}
                            </option>
                          ))}
                        </select>
                        <button
                          className="convoy-selector-btn primary"
                          type="button"
                          disabled={!selectedConvoyId}
                          onClick={() => {
                            const convoy = savedConvoys.find((c) => c.id === selectedConvoyId);
                            if (convoy) openConvoy(convoy);
                          }}
                        >
                          SÉLECTIONNER
                        </button>
                      </div>

                      <div className="selector-or">OU</div>
                      <div className="create-convoy-row">
                        <button className="convoy-selector-btn primary" type="button" onClick={createNewConvoy}>
                          + CRÉER UN CONVOI
                        </button>
                        <button
                          className="convoy-selector-btn"
                          type="button"
                          onClick={() => importInputRef.current?.click()}
                          title="Importer un convoi GPX"
                        >
                          <img src={DownloadIcon} alt="" aria-hidden="true" className="convoy-import-icon" />
                        </button>
                        <input
                          ref={importInputRef}
                          type="file"
                          accept=".gpx,application/gpx+xml,application/xml,text/xml"
                          style={{ display: 'none' }}
                          onChange={handleImportConvoy}
                        />
                      </div>

                </div>
              </div>
            )}
            <div className={`overlay-container ${showConvoySelector ? 'overlay-container--inactive' : ''}`}>
                <RoadsTour />
                <div className="search-bar-layer">
                {/* Barre de recherche d'adresse : une sélection crée un nouveau waypoint,
                    ou met à jour celui en cours d'édition (via l'icône crayon de ConvoyCard) */}
                <ResearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSelect={(suggestion) => {
                        if (showConvoySelector) return;
                        const { lat, lon, display_name } = suggestion;
                        const position = {
                            lat: parseFloat(lat),
                            lng: parseFloat(lon),
                            display_name: display_name
                        };

                        mapRef.current.flyTo([position.lat, position.lng], 15);

                        // On garde les deux premiers segments de l'adresse (ex: "rue, ville") comme
                        // nom d'étape lisible, en évitant la répétition s'ils sont identiques
                        const addressParts = display_name.split(',').map((part) => part.trim()).filter(Boolean);
                        const firstPart = addressParts[0] || '';
                        const secondPart = addressParts[1] || '';
                        const cityName = secondPart && firstPart.toLowerCase() !== secondPart.toLowerCase()
                          ? `${firstPart}, ${secondPart}`
                          : firstPart;
                        
                        if (editingWaypointIndex !== null) {
                            // Mise à jour d'un waypoint existant
                            setWaypoints(prev => {
                                const updated = [...prev];
                                updated[editingWaypointIndex] = position;
                                return updated;
                            });
                            setWaypointNames(prev => {
                                const updated = [...prev];
                                updated[editingWaypointIndex] = cityName;
                                return updated;
                            });
                            setEditingWaypointIndex(null);
                        } else {
                            // Ajout d'un nouveau waypoint
                            setWaypoints(prev => [...prev, position]);
                            setWaypointNames(prev => [...prev, cityName]);
                        }
                        setSearchQuery('');
                    }}
                />
                </div>
                {!showConvoySelector && (
                  <div className="left-panel">
                  <ConvoyCard 
                      initialName={currentConvoyName}
                      waypoints={waypoints} 
                      waypointNames={waypointNames}
                      initialStepConfigs={stepConfigs}
                      initialBackendTripId={currentSavedConvoy?.backendTripId || currentSavedConvoy?.shareTrip?.trip_id || null}
                    routeDurationMinutes={routeDurationMinutes}
                    routeLegDurationsMinutes={routeLegDurationsMinutes}
                    routeLegDistancesKm={routeLegDistancesKm}
                    routeDistanceKm={totalDistanceKm}
                    generalSettings={generalSettings}
                    onUpdateWaypoint={(index, newName, newCoords = null, metadata = null) => {
                        // Mise à jour du nom 
                        setWaypointNames(prev => {
                            const updated = [...prev];
                            updated[index] = newName || `Etape ${index + 1}`;
                            return updated;
                        });
                        
                        // Si de nouvelles coordonnées sont fournies, on les met à jour
                        if (newCoords) {
                            setWaypoints(prev => {
                                const updated = [...prev];
                                updated[index] = newCoords;
                                return updated;
                            });
                        }
                        if (metadata && typeof metadata === 'object') {
                          setStepConfigs(prev => {
                            const next = { ...prev };
                            if (metadata.step_is_stop !== undefined || metadata.step_stop_duration !== undefined) {
                              next[index] = {
                                ...next[index],
                                hasBreak: Boolean(metadata.step_is_stop),
                                breakTime: metadata.step_is_stop ? Number(metadata.step_stop_duration || 0) : 0
                              };
                            }
                            return next;
                          });
                        }
                    }}
                    onDeleteWaypoint={(index) => {
                        // Supprime le waypoint et décale les index des configurations
                        // d'étape suivantes pour rester cohérent avec la nouvelle liste
                        setWaypoints(prev => {
                            const updated = [...prev];
                            updated.splice(index, 1);
                            return updated;
                        });
                        setWaypointNames(prev => {
                            const updated = [...prev];
                            updated.splice(index, 1);
                            return updated;
                        });
                        setStepConfigs(prev => {
                          const next = {};
                          Object.keys(prev).forEach((key) => {
                            const k = Number(key);
                            if (k < index) next[k] = prev[k];
                            if (k > index) next[k - 1] = prev[k];
                          });
                          return next;
                        });
                    }}
                    onReorderWaypoints={(fromIndex, toIndex) => {
                        setWaypoints(prev => moveItem(prev, fromIndex, toIndex));
                        setWaypointNames(prev => moveItem(prev, fromIndex, toIndex));
                        setStepConfigs(prev => {
                           if (Object.keys(prev).length === 0) return prev;
                           const length = Object.keys(prev).length;
                           const order = Array.from({ length: Math.max(length, waypoints.length) }, (_, i) => i);
                           const [moved] = order.splice(fromIndex, 1);
                           order.splice(toIndex, 0, moved);
                           const next = {};
                           order.forEach((oldIndex, newIndex) => {
                             if (prev[oldIndex] !== undefined) next[newIndex] = prev[oldIndex];
                           });
                           return next;
                        });
                        if (editingWaypointIndex !== null) {
                            if (editingWaypointIndex === fromIndex) {
                                setEditingWaypointIndex(toIndex);
                            } else if (fromIndex < editingWaypointIndex && toIndex >= editingWaypointIndex) {
                                setEditingWaypointIndex(editingWaypointIndex - 1);
                            } else if (fromIndex > editingWaypointIndex && toIndex <= editingWaypointIndex) {
                                setEditingWaypointIndex(editingWaypointIndex + 1);
                            }
                        }
                    }}
                    onGeneralSettingsChange={(newSettings) => {
                        setGeneralSettings(newSettings);
                    }}
                    canExportGpx={routeCoordinates.length >= 2}
                    onExportGpx={exportCurrentRouteAsGpx}
                    canExportPdf={Boolean(currentConvoyId)}
                    onExportPdf={exportCurrentRouteAsPdf}
                    canSaveConvoy={waypoints.length >= 2}
                    onSaveConvoy={saveCurrentConvoyLocal}
                    onPersistConvoy={handlePersistConvoyOnServer}
                    onBackToConvoySelector={openConvoySelector}
                    shareTrip={currentSavedConvoy?.shareTrip || null}
                    onTripPersisted={handleTripPersisted}
                    onConvoyNameChange={(newName) => {
                      setCurrentConvoyName(newName);
                      if (!currentConvoyId) return;
                      const nowIso = new Date().toISOString();
                      setSavedConvoys((prev) =>
                        prev.map((convoy) =>
                          convoy.id === currentConvoyId
                            ? { ...convoy, name: newName, updatedAt: nowIso }
                            : convoy
                        )
                      );
                    }}
                    onSegmentConfigChange={handleSegmentConfigChange}
                    onStartEditingCoords={(index) => {
                        setEditingWaypointIndex(index);
                        setSearchQuery(waypointNames[index] || '');
                        document.querySelector('.ResearchBarInput')?.focus();
                    }}
                  />
                  </div>
                )}
            </div>
            {!showConvoySelector && (
              <div className="route-total-card">
                <div className="route-total-title">TOTAL</div>
                <div className="route-total-values">
                  <span>{Number.isFinite(totalDistanceKm) ? `${totalDistanceKm.toFixed(1)} KM` : '-- KM'}</span>
                  <span>{Number.isFinite(configuredSpeedKmH) ? `${Math.round(configuredSpeedKmH)} KM/H` : '-- KM/H'}</span>
                  <span>{Number.isFinite(totalMinutesFromSpeed) ? `${totalMinutesFromSpeed} MIN` : '-- MIN'}</span>
                </div>
              </div>
            )}
        </div>

    );
}

// Décode une polyligne encodée en "precision 6" (format utilisé par Valhalla/OSRM)
// en une liste de coordonnées [lat, lon]. Chaque point est encodé comme un delta
// par rapport au point précédent, sur des caractères ASCII décalés de 63.
const decodePolyline6 = (encoded) => {
  if (!encoded || typeof encoded !== 'string') return [];
  let index = 0;
  let lat = 0;
  let lon = 0;
  const coordinates = [];

  while (index < encoded.length) {
    let result = 1;
    let shift = 0;
    let b;
    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    result = 1;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lon += (result & 1) ? ~(result >> 1) : (result >> 1);

    coordinates.push([lat / 1e6, lon / 1e6]);
  }

  return coordinates;
};

// Calcule la longueur totale (en km) d'un tracé, en sommant la distance
// à vol d'oiseau entre chaque paire de points consécutifs
const measurePathDistanceKm = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const toRad = (value) => (value * Math.PI) / 180;
  let total = 0;

  for (let i = 1; i < coordinates.length; i += 1) {
    const lat1 = Number(coordinates[i - 1]?.[0]);
    const lon1 = Number(coordinates[i - 1]?.[1]);
    const lat2 = Number(coordinates[i]?.[0]);
    const lon2 = Number(coordinates[i]?.[1]);
    if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) continue;

    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const s1 = Math.sin(dLat / 2);
    const s2 = Math.sin(dLon / 2);
    const h =
      s1 * s1 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * s2 * s2;
    total += 2 * earthRadiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  return total > 0 ? total : null;
};

// Composant sans rendu visuel qui gère le calcul et l'affichage du routage sur la carte.
// Il appelle l'API Valhalla (backend), avec un repli sur l'API publique OSRM en cas d'échec,
// et dessine le tracé sous forme de sections colorées correspondant aux segments configurés.
const RoutingControl = ({
  waypoints,
  map,
  onRouteDurationChange,
  onRouteLegDurationsChange,
  onRouteLegDistancesChange,
  onRouteGeometryChange,
  routePreferences,
  segmentConfig = []
}) => {
  useEffect(() => {
    if (!map || waypoints.length < 2) return;

    // Normalise tous les formats de waypoints possibles en {lat, lon}
    const waypointCoords = waypoints
      .map((point) => {
        if (Array.isArray(point)) return { lat: Number(point[0]), lon: Number(point[1]) };
        if (point?.lat !== undefined && point?.lng !== undefined) return { lat: Number(point.lat), lon: Number(point.lng) };
        if (point?.lat !== undefined && point?.lon !== undefined) return { lat: Number(point.lat), lon: Number(point.lon) };
        return null;
      })
      .filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon));

    if (waypointCoords.length < 2) return;

    // Traduit les préférences utilisateur (éviter autoroute/voie rapide) en paramètres
    // de coût pour le moteur de routage (0 = éviter, 0.5 = pas de préférence)
    const routeTypePrefs = routePreferences?.routeType || {};
    const useHighways = routeTypePrefs.avoidMotorway === false ? 0 : 0.5;
    const useTolls = routeTypePrefs.avoidFastRoad === false ? 0 : 0.5;

    const abortController = new AbortController();
    const routeLayers = [];
    const defaultPalette = ['#4A6CF7', '#2AA876', '#FF9F1C', '#E63946', '#7B61FF', '#0096C7'];
    const transitionColor = '#111111';

    // Renvoie le rang de segment configuré pour l'étape à l'index donné (ou null si non défini)
    const getRankAtIndex = (index) => {
      const value = Number.parseInt(segmentConfig[index]?.segmentRank, 10);
      if (!Number.isFinite(value) || value < 1) return null;
      return value;
    };

    // Dessine le tracé sur la carte tronçon par tronçon (leg), en le découpant en
    // sections colorées selon le segment auquel appartient chaque étape. Un tronçon
    // qui relie deux segments différents ("tronçon de transition") est affiché en noir.
    const drawColoredSections = (legCoordinates) => {
      if (!Array.isArray(legCoordinates) || legCoordinates.length < 1) return;

      legCoordinates.forEach((legLatLngs, legIndex) => {
        if (!Array.isArray(legLatLngs) || legLatLngs.length < 2) return;
        const segmentRank = getRankAtIndex(legIndex) ?? 1;
        const endPointRank = getRankAtIndex(legIndex + 1) ?? segmentRank;
        const isTransitionLeg = segmentRank !== endPointRank;
        const sectionCount = isTransitionLeg
          ? 1
          : Math.max(1, Number.parseInt(segmentConfig[legIndex]?.stepNbSections, 10) || 1);
        const rankColor =
          segmentConfig.find((config) => Math.max(1, Number.parseInt(config?.segmentRank, 10) || 1) === segmentRank)?.segmentColor;
        const baseColor = isTransitionLeg
          ? transitionColor
          : (rankColor || segmentConfig[legIndex]?.segmentColor || defaultPalette[(segmentRank - 1) % defaultPalette.length]);
        const pointsPerSection = Math.max(2, Math.ceil(legLatLngs.length / sectionCount));

        for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex += 1) {
          const start = Math.max(0, sectionIndex * pointsPerSection - (sectionIndex > 0 ? 1 : 0));
          const end = Math.min(legLatLngs.length, (sectionIndex + 1) * pointsPerSection);
          const sectionPoints = legLatLngs.slice(start, end);
          if (sectionPoints.length < 2) continue;
          const polyline = L.polyline(sectionPoints, {
            color: baseColor,
            weight: isTransitionLeg ? 5 : 4 + (sectionIndex % 2),
            opacity: isTransitionLeg ? 0.9 : 0.7 + (sectionIndex % 2) * 0.2,
            lineCap: 'butt',
            lineJoin: 'round',
            className: 'animate-route'
          }).addTo(map);
          routeLayers.push(polyline);
        }
      });
    };

    // Interroge le moteur de routage pour calculer l'itinéraire : essaie d'abord
    // Valhalla (auto-hébergé via le backend), puis se rabat sur l'API publique OSRM
    // en cas d'échec (service indisponible, erreur réseau, etc.)
    const fetchRoute = async () => {
      try {
        const payload = {
          locations: waypointCoords,
          costing: 'auto',
          units: 'kilometers',
          shape_format: 'geojson',
          directions_type: 'none',
          costing_options: {
            auto: {
              use_highways: useHighways,
              use_tolls: useTolls
            }
          }
        };

        const response = await fetch('/api/valhalla/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: abortController.signal
        });

        if (response.ok) {
          const data = await response.json();
          const legs = data?.trip?.legs || [];
          const summary = data?.trip?.summary;
          const legDurations = legs.map((leg) => {
            const seconds = leg?.summary?.time;
            if (typeof seconds === 'number' && !Number.isNaN(seconds)) {
              return Math.max(0, Math.round(seconds / 60));
            }
            return null;
          });

          const legLatLngs = legs.map((leg) => {
            const shape = leg?.shape;

            if (Array.isArray(shape)) {
              return shape
                .map((coord) => (Array.isArray(coord) && coord.length >= 2 ? [coord[1], coord[0]] : null))
                .filter(Boolean);
            }

            return decodePolyline6(shape);
          });
          const latLngs = legLatLngs.flat();

          if (latLngs.length > 1) {
            drawColoredSections(legLatLngs);
          }
          onRouteLegDurationsChange?.(legDurations);
          onRouteLegDistancesChange?.(legLatLngs.map(measurePathDistanceKm));
          onRouteGeometryChange?.(latLngs);

          const totalTimeSeconds = summary?.time;
          if (typeof totalTimeSeconds === 'number' && !Number.isNaN(totalTimeSeconds)) {
            onRouteDurationChange?.(Math.round(totalTimeSeconds / 60));
          } else {
            onRouteDurationChange?.(null);
          }
          return;
        }

        // Repli sur l'API publique OSRM si Valhalla est indisponible
        const osrmCoords = waypointCoords.map((p) => `${p.lon},${p.lat}`).join(';');
        const osrmResponse = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=false&geometries=polyline6&alternatives=false&steps=true`,
          { signal: abortController.signal }
        );

        if (!osrmResponse.ok) {
          onRouteDurationChange?.(null);
          onRouteLegDurationsChange?.([]);
          onRouteLegDistancesChange?.([]);
          onRouteGeometryChange?.([]);
          return;
        }

        const osrmData = await osrmResponse.json();
        const route = osrmData?.routes?.[0];
        const osrmLegs = route?.legs || [];
        const legDurations = osrmLegs.map((leg) => {
          const seconds = leg?.duration;
          if (typeof seconds === 'number' && !Number.isNaN(seconds)) {
            return Math.max(0, Math.round(seconds / 60));
          }
          return null;
        });

        // Reconstruit les coordonnées de chaque tronçon à partir de la géométrie de ses
        // étapes (steps), ce qui donne des limites de tronçon exactement alignées sur les waypoints
        const legLatLngs = osrmLegs.map((leg) => {
          const steps = leg?.steps || [];
          const coords = [];
          steps.forEach((step, stepIdx) => {
            const stepCoords = decodePolyline6(step?.geometry || '');
            // On saute le premier point de chaque étape (sauf la toute première) pour éviter les doublons
            const start = stepIdx > 0 ? 1 : 0;
            for (let k = start; k < stepCoords.length; k++) {
              coords.push(stepCoords[k]);
            }
          });
          return coords;
        }).filter((coords) => coords.length >= 2);

        const latLngs = legLatLngs.flat();

        if (latLngs.length > 1) {
          if (legLatLngs.length > 0) {
            drawColoredSections(legLatLngs);
          } else {
            const fallbackLayer = L.polyline(latLngs, {
              color: '#4A6CF7',
              weight: 4,
              opacity: 0.8,
              lineCap: 'butt',
              lineJoin: 'round',
              className: 'animate-route'
            }).addTo(map);
            routeLayers.push(fallbackLayer);
          }
        }
        onRouteLegDurationsChange?.(legDurations);
        onRouteLegDistancesChange?.(legLatLngs.map(measurePathDistanceKm));
        onRouteGeometryChange?.(latLngs);

        const totalTimeSeconds = route?.duration;
        if (typeof totalTimeSeconds === 'number' && !Number.isNaN(totalTimeSeconds)) {
          onRouteDurationChange?.(Math.round(totalTimeSeconds / 60));
        } else {
          onRouteDurationChange?.(null);
        }
      } catch (error) {
        if (error?.name !== 'AbortError') {
          onRouteDurationChange?.(null);
          onRouteLegDurationsChange?.([]);
          onRouteLegDistancesChange?.([]);
          onRouteGeometryChange?.([]);
        }
      }
    };

    fetchRoute();

    // Nettoyage : on annule toute requête en cours et on retire les tracés dessinés
    // avant de recalculer l'itinéraire (changement de waypoints ou de préférences)
    return () => {
      abortController.abort();
      onRouteDurationChange?.(null);
      onRouteLegDurationsChange?.([]);
      onRouteLegDistancesChange?.([]);
      onRouteGeometryChange?.([]);
      routeLayers.forEach((layer) => {
        if (layer && map.hasLayer(layer)) map.removeLayer(layer);
      });
    };
  }, [
    map,
    waypoints,
    onRouteDurationChange,
    onRouteLegDurationsChange,
    onRouteLegDistancesChange,
    onRouteGeometryChange,
    routePreferences,
    segmentConfig
  ]);

  return null;
};

export default Carte;


