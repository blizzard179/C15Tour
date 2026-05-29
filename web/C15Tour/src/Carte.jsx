import './css/carte.css'
import './css/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useRef, useState, useEffect } from 'react';
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

const CONVOYS_STORAGE_KEY = 'c15tour_convoys_v1';
const LAST_CONVOY_STORAGE_KEY = 'c15tour_last_convoy_id';
const BACKEND_BASE_URL = 'http://localhost:3000';

// Styles pour le popup personnalisé
const popupStyles = `
  .custom-popup {
    padding: 12px;
    min-width: 200px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  }
  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #f0f0f0;
  }
  .popup-title {
    font-weight: 600;
    color: #333;
    font-size: 14px;
  }
  .popup-actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }
  .popup-action-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 12px;
    color: #4A6CF7;
    cursor: pointer;
    transition: all 0.2s;
  }
  .popup-action-btn:hover {
    background: #f8f9fa;
    border-color: #4A6CF7;
  }
  .popup-config-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #6c757d;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  .popup-config-btn:hover {
    color: #4A6CF7;
    background-color: #f8f9fa;
  }
`;

// Composant de popup personnalisé
const CustomPopup = ({ index, name, address }) => {
  return `
    <div class="custom-popup">
      <div class="popup-header">
        <div>
          <div class="popup-title">${name || `Etape ${index + 1}`}</div>
          ${address ? `<div class="popup-address">${address}</div>` : ''}
        </div>
        <button class="popup-config-btn" onclick="event.stopPropagation(); window.configClickHandler(${index})">
          <img src="${Pin}" alt="Configurer" width="16" height="16" />
        </button>
      </div>
      <div class="popup-actions">
        <button class="popup-action-btn" onclick="event.stopPropagation(); window.itineraireClickHandler(${index})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="#4A6CF7"/>
            <path d="M13 7H11V13H17V11H13V7Z" fill="#4A6CF7"/>
          </svg>
          Itinéraire
        </button>
        <button class="popup-action-btn" onclick="event.stopPropagation(); window.detailsClickHandler(${index})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="#4A6CF7"/>
            <path d="M12.31 11.14C10.54 10.28 9.5 9.8 9.5 8.5C9.5 7.4 10.4 6.5 11.5 6.5C12.6 6.5 13.5 7.4 13.5 8.5H15.5C15.5 6.3 13.7 4.5 11.5 4.5C9.3 4.5 7.5 6.3 7.5 8.5C7.5 10.92 9.5 11.86 11.19 12.61C13.12 13.47 14.5 14.1 14.5 15.5C14.5 16.6 13.6 17.5 12.5 17.5C11.4 17.5 10.5 16.6 10.5 15.5H8.5C8.5 17.7 10.3 19.5 12.5 19.5C14.7 19.5 16.5 17.7 16.5 15.5C16.5 13.08 14.5 12.14 12.81 11.39L12.31 11.14Z" fill="#4A6CF7"/>
          </svg>
          Détails
        </button>
      </div>
    </div>
  `;
};

function Carte() {

    const [waypoints, setWaypoints] = useState([]);
    const [waypointNames, setWaypointNames] = useState([]);
    const [stepConfigs, setStepConfigs] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const mapRef = useRef();
    const importInputRef = useRef();
    const [editingWaypointIndex, setEditingWaypointIndex] = useState(null);
    const [routeDurationMinutes, setRouteDurationMinutes] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [showConvoySelector, setShowConvoySelector] = useState(true);
    const [isConvoySelectorOpen, setIsConvoySelectorOpen] = useState(false);
    const [savedConvoys, setSavedConvoys] = useState([]);
    const [currentConvoyId, setCurrentConvoyId] = useState(null);
    const [currentConvoyName, setCurrentConvoyName] = useState('Nom du convoi');
    const [selectedConvoyId, setSelectedConvoyId] = useState('');
    const [isStorageLoaded, setIsStorageLoaded] = useState(false);
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

    const moveItem = (items, fromIndex, toIndex) => {
        if (!Array.isArray(items)) return items;
        const next = [...items];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
    };

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

    const getShareTripFromBackendTrip = (trip) => {
      if (!trip?.trip_user_code || !trip?.trip_admin_code) return null;

      return {
        trip_id: trip.trip_id,
        trip_name: trip.trip_name,
        trip_user_code: trip.trip_user_code,
        trip_admin_code: trip.trip_admin_code
      };
    };

    useEffect(() => {
      const convoys = parseStoredConvoys();
      setSavedConvoys(convoys);
      setIsStorageLoaded(true);
    }, []);

    useEffect(() => {
      if (!selectedConvoyId && savedConvoys.length > 0) {
        setSelectedConvoyId(savedConvoys[0].id);
      }
    }, [savedConvoys, selectedConvoyId]);

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

    useEffect(() => {
      if (!currentConvoyId) return;
      setShowConvoySelector(false);
    }, [currentConvoyId]);

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
      return id;
    };

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

    const handlePersistConvoyOnServer = (tripId) => {
      setCurrentConvoyId(tripId);
    };

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

    const openLastConvoy = () => {
      const lastId = localStorage.getItem(LAST_CONVOY_STORAGE_KEY);
      const convoy = savedConvoys.find((c) => c.id === lastId) || savedConvoys[0];
      if (convoy) {
        openConvoy(convoy);
      }
    };

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

    const lastConvoyId = localStorage.getItem(LAST_CONVOY_STORAGE_KEY);
    const lastConvoy = savedConvoys.find((c) => c.id === lastConvoyId) || savedConvoys[0] || null;
    const currentSavedConvoy = currentConvoyId
      ? savedConvoys.find((convoy) => convoy.id === currentConvoyId) || null
      : null;

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
            display_name: 'Depart'
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
      const isDuplicatedLabel = (value = '') => {
        const parts = value.split(',').map((part) => normalizeName(part)).filter(Boolean);
        return parts.length === 2 && parts[0] === parts[1];
      };

      const metadataName = xml.querySelector('metadata > name')?.textContent?.trim() || '';
      const trackName = xml.querySelector('trk > name')?.textContent?.trim() || '';
      const firstWaypointName = names[0]?.trim() || '';
      const fileBaseName = sourceFileName.replace(/\.[^/.]+$/, '').trim();

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

    useEffect(() => {
        if (waypoints.length < 2) {
            setRouteDurationMinutes(null);
            setRouteCoordinates([]);
        }
    }, [waypoints.length]);

    const escapeXml = (value = '') =>
      String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

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

    const exportCurrentRouteAsPdf = async () => {
      if (!currentConvoyId) {
        alert('Le convoi doit être sauvegardé avant d\'exporter en PDF');
        return false;
      }

      try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/trips/${currentConvoyId}/exports/pdf`);

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

    const pinIcon = L.icon({
        iconUrl: Pin,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -28]
    });

    useEffect(() => {
        // Ajout des styles
        if (!document.getElementById('popup-styles')) {
          const styleElement = document.createElement('style');
          styleElement.id = 'popup-styles';
          styleElement.innerHTML = popupStyles;
          document.head.appendChild(styleElement);
        }

        // Définir les gestionnaires d'événements globaux
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
          // Nettoyage
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

                {/* Tuile openstreetmap */}
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {/* Gestion des clics sur la carte */}
                <ClickHandler setWaypoints={setWaypoints} />
                {waypoints.map((point, index) => {
                    const waypointName = waypointNames[index] || '';
                    let lat, lng, displayName;

                    // Gestion des différents formats de points
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
                                            address: displayName
                                        }) 
                                    }} 
                                />
                            </Popup>
                        </Marker>
                    );
                })}
                
                {/* Gestion du routage avec des coordonnées valides - s'affiche automatiquement dès 2 points */}
                {waypoints.length >= 2 && (
                  <RoutingControl 
                    waypoints={waypoints}
                    map={mapRef.current}
                    onRouteDurationChange={setRouteDurationMinutes}
                    onRouteGeometryChange={setRouteCoordinates}
                    routePreferences={generalSettings}
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
                          SELECTIONNER
                        </button>
                      </div>

                      <div className="selector-or">OU</div>
                      <div className="create-convoy-row">
                        <button className="convoy-selector-btn primary" type="button" onClick={createNewConvoy}>
                          + CREER UN CONVOI
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
                <ResearchBar 
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSelect={(suggestion) => {
                        const { lat, lon, display_name } = suggestion;
                        const position = {
                            lat: parseFloat(lat),
                            lng: parseFloat(lon),
                            display_name: display_name
                        };
                        
                        mapRef.current.flyTo([position.lat, position.lng], 15);
                        
                        const addressParts = display_name.split(',');
                        const cityName = addressParts[0] + (addressParts[1] ? `, ${addressParts[1]}` : '');
                        
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
                      generalSettings={generalSettings}
                    onUpdateWaypoint={(index, newName, newCoords = null, metadata = {}) => {
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
                    onStartEditingCoords={(index) => {
                        setEditingWaypointIndex(index);
                        setSearchQuery(waypointNames[index] || '');
                        document.querySelector('.ResearchBarInput')?.focus();
                    }}
                  />
                  </div>
                )}
            </div>
        </div>

    );
}

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

// Composant pour gerer le routage 
const RoutingControl = ({ waypoints, map, onRouteDurationChange, onRouteGeometryChange, routePreferences }) => {
  useEffect(() => {
    if (!map || waypoints.length < 2) return;

    const waypointCoords = waypoints
      .map((point) => {
        if (Array.isArray(point)) return { lat: Number(point[0]), lon: Number(point[1]) };
        if (point?.lat !== undefined && point?.lng !== undefined) return { lat: Number(point.lat), lon: Number(point.lng) };
        if (point?.lat !== undefined && point?.lon !== undefined) return { lat: Number(point.lat), lon: Number(point.lon) };
        return null;
      })
      .filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon));

    if (waypointCoords.length < 2) return;

    const routeTypePrefs = routePreferences?.routeType || {};
    const useHighways = routeTypePrefs.avoidMotorway === false ? 0 : 0.5;
    const useTolls = routeTypePrefs.avoidFastRoad === false ? 0 : 0.5;

    const abortController = new AbortController();
    let routeLayer = null;

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

          const latLngs = legs.flatMap((leg) => {
            const shape = leg?.shape;

            if (Array.isArray(shape)) {
              return shape
                .map((coord) => (Array.isArray(coord) && coord.length >= 2 ? [coord[1], coord[0]] : null))
                .filter(Boolean);
            }

            return decodePolyline6(shape);
          });

          if (latLngs.length > 1) {
            routeLayer = L.polyline(latLngs, {
              color: '#4A6CF7',
              weight: 4,
              opacity: 0.8,
              className: 'animate-route'
            }).addTo(map);
          }
          onRouteGeometryChange?.(latLngs);

          const totalTimeSeconds = summary?.time;
          if (typeof totalTimeSeconds === 'number' && !Number.isNaN(totalTimeSeconds)) {
            onRouteDurationChange?.(Math.round(totalTimeSeconds / 60));
          } else {
            onRouteDurationChange?.(null);
          }
          return;
        }

        // Fallback OSRM si Valhalla indisponible
        const osrmCoords = waypointCoords.map((p) => `${p.lon},${p.lat}`).join(';');
        const osrmResponse = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=full&geometries=polyline6&alternatives=false&steps=false`,
          { signal: abortController.signal }
        );

        if (!osrmResponse.ok) {
          onRouteDurationChange?.(null);
          onRouteGeometryChange?.([]);
          return;
        }

        const osrmData = await osrmResponse.json();
        const route = osrmData?.routes?.[0];
        const latLngs = decodePolyline6(route?.geometry || '');

        if (latLngs.length > 1) {
          routeLayer = L.polyline(latLngs, {
            color: '#4A6CF7',
            weight: 4,
            opacity: 0.8,
            className: 'animate-route'
          }).addTo(map);
        }
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
          onRouteGeometryChange?.([]);
        }
      }
    };

    fetchRoute();

    return () => {
      abortController.abort();
      onRouteDurationChange?.(null);
      onRouteGeometryChange?.([]);
      if (routeLayer && map.hasLayer(routeLayer)) {
        map.removeLayer(routeLayer);
      }
    };
  }, [map, waypoints, onRouteDurationChange, onRouteGeometryChange, routePreferences]);

  return null;
};

export default Carte;
